import type {
  ScoutCard,
  ScoutState,
  ScoutAction,
  ScoutView,
  ScoutEvent,
  ScoutRoundResult,
} from "./types.ts";

function hash(value: string): number {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

function random(seed: string): () => number {
  let n = hash(seed);
  return () => {
    n += 0x6d2b79f5;
    let t = Math.imul(n ^ (n >>> 15), n | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const flipCard = (card: ScoutCard): ScoutCard => ({
  ...card,
  top: card.bottom,
  bottom: card.top,
});

function deckFor(count: number, seed: string): ScoutCard[] {
  const rng = random(seed),
    deck: ScoutCard[] = [];
  for (let a = 1; a < 10; a++) {
    for (let b = a + 1; b <= 10; b++) {
      if (
        (count === 3 && b === 10) ||
        ((count === 2 || count === 4) && a === 9 && b === 10)
      )
        continue;
      const card = { id: `${a}-${b}`, top: a, bottom: b };
      deck.push(rng() < 0.5 ? flipCard(card) : card);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function emit(state: ScoutState, event: Omit<ScoutEvent, "seq">) {
  state.events.push({ ...event, seq: ++state.eventSeq });
  state.events = state.events.slice(-12);
}

function deal(state: ScoutState, deck: ScoutCard[]) {
  const perHand =
    state.players.length === 3 ? 12 : state.players.length === 5 ? 9 : 11;
  state.players.forEach((p, i) => {
    p.hand = deck.slice(i * perHand, (i + 1) * perHand);
    p.handCount = perHand;
    p.orientationConfirmed = false;
    p.captured = 0;
    p.scoutChips = state.players.length === 2 ? 3 : 0;
    p.scoutShowAvailable = state.players.length > 2;
  });
  state.reserve = deck.slice(perHand * state.players.length);
  state.phase = "orienting";
  state.turnId = state.starterId;
  state.active = null;
  state.latestShowerId = null;
  state.scoutsSinceShow = 0;
  state.comboActorId = null;
  emit(state, { kind: "deal", actorId: state.starterId });
}

export function createScout(
  players: { id: string; name: string }[],
  seed: string,
): ScoutState {
  if (!Array.isArray(players) || players.length < 2 || players.length > 5)
    throw new Error("需要2–5位玩家");
  if (
    players.some(
      (p) =>
        !p ||
        typeof p.id !== "string" ||
        !p.id.trim() ||
        typeof p.name !== "string" ||
        !p.name.trim(),
    ) ||
    new Set(players.map((p) => p.id)).size !== players.length
  )
    throw new Error("玩家名称或身份无效、重复");
  if (typeof seed !== "string" || !seed) throw new Error("需要随机种子");
  const starterId =
    players[Math.floor(random(`${seed}:starter`)() * players.length)].id;
  const state: ScoutState = {
    matchId: `scout-${hash(JSON.stringify([seed, players.map((p) => p.id)])).toString(36)}`,
    phase: "orienting",
    round: 1,
    totalRounds: players.length,
    starterId,
    turnId: starterId,
    active: null,
    latestShowerId: null,
    scoutsSinceShow: 0,
    comboActorId: null,
    revision: 0,
    eventSeq: 0,
    events: [],
    history: [],
    seed,
    reserve: [],
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: [],
      handCount: 0,
      orientationConfirmed: false,
      captured: 0,
      scoutChips: 0,
      scoutShowAvailable: players.length > 2,
      total: 0,
    })),
  };
  deal(state, deckFor(players.length, `${seed}:1`));
  return state;
}

function nextSeat(state: ScoutState, id: string): string {
  return state.players[
    (state.players.findIndex((p) => p.id === id) + 1) % state.players.length
  ].id;
}

function settle(
  state: ScoutState,
  reason: ScoutRoundResult["reason"],
  actorId: string,
) {
  const leaderId = state.latestShowerId;
  const lines = state.players.map((p) => {
    const remainingPenalty =
      reason !== "emptyHand" && p.id === leaderId ? 0 : p.hand.length;
    const delta = p.captured + p.scoutChips - remainingPenalty;
    p.total += delta;
    return {
      id: p.id,
      name: p.name,
      captured: p.captured,
      scoutChips: p.scoutChips,
      remainingPenalty,
      delta,
      total: p.total,
    };
  });
  state.history.push({
    round: state.round,
    starterId: state.starterId,
    reason,
    leaderId,
    lines,
  });
  state.phase = state.round === state.totalRounds ? "finished" : "roundEnd";
  state.comboActorId = null;
  emit(state, { kind: "roundEnd", actorId });
}

function checkBlocked(state: ScoutState, actorId: string) {
  if (state.players.length !== 2) return;
  const player = state.players.find((p) => p.id === state.turnId)!;
  if (
    player.scoutChips === 0 &&
    !hasLegalShow(player.hand, state.active?.cards ?? null)
  )
    settle(state, "blocked", actorId);
}

function integer(value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error("请选择有效的整数位置或数量");
}

export function reduceScout(
  state: ScoutState,
  actorId: string,
  action: ScoutAction,
): ScoutState {
  if (!action || typeof action !== "object") throw new Error("无效动作");
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) throw new Error("玩家不在本局");
  // All edits happen on a deep copy, including failed combo validation.
  const next = structuredClone(state),
    player = next.players.find((p) => p.id === actorId)!;
  if (action.type === "next") {
    if (state.phase !== "roundEnd") throw new Error("此时不能开始下一轮");
    if (actorId !== state.players[0].id)
      throw new Error("只有房主可以开始下一轮");
    next.round++;
    next.starterId = nextSeat(next, state.starterId);
    const deck =
      next.players.length === 2
        ? next.reserve
        : deckFor(next.players.length, `${next.seed}:${next.round}`);
    deal(next, deck);
  } else if (action.type === "orient") {
    if (state.phase !== "orienting" || actor.orientationConfirmed)
      throw new Error("不能再次确认手牌方向");
    if (typeof action.flip !== "boolean") throw new Error("无效方向");
    if (action.flip) player.hand = player.hand.reverse().map(flipCard);
    player.orientationConfirmed = true;
    emit(next, { kind: "orient", actorId });
    if (next.players.every((p) => p.orientationConfirmed))
      next.phase = "playing";
  } else {
    if (state.phase !== "playing") throw new Error("当前不在出牌阶段");
    if (state.turnId !== actorId) throw new Error("尚未轮到你的回合");
    if (action.type === "show") {
      integer(action.start, 0, player.hand.length - 1);
      integer(action.count, 1, player.hand.length - action.start);
      const shown = player.hand.slice(
        action.start,
        action.start + action.count,
      );
      if (!canBeat(shown, next.active?.cards ?? null))
        throw new Error("演出必须是连续合法组合并严格超过场上组合");
      const captured = next.active?.cards ?? [];
      player.hand.splice(action.start, action.count);
      player.handCount = player.hand.length;
      player.captured += captured.length;
      next.active = { ownerId: actorId, cards: shown };
      next.latestShowerId = actorId;
      next.scoutsSinceShow = 0;
      next.comboActorId = null;
      emit(next, { kind: "show", actorId, cards: shown, captured });
      if (!player.hand.length) settle(next, "emptyHand", actorId);
      else {
        next.turnId = nextSeat(next, actorId);
        checkBlocked(next, actorId);
      }
    } else if (action.type === "scout") {
      if (state.comboActorId) throw new Error("挖角并演出必须继续演出");
      if (!next.active?.cards.length) throw new Error("场上没有可挖角的牌");
      if (action.side !== "left" && action.side !== "right")
        throw new Error("只能拿走两端的牌");
      if (typeof action.flip !== "boolean" || typeof action.combo !== "boolean")
        throw new Error("无效方向或能力选择");
      integer(action.insertIndex, 0, player.hand.length);
      const two = next.players.length === 2;
      if (two && (action.combo || player.scoutChips === 0))
        throw new Error("双人局需要挖角筹码且不能挖角并演出");
      if (action.combo && !player.scoutShowAvailable)
        throw new Error("本轮挖角并演出已使用");
      const sourceOwnerId = next.active.ownerId;
      const taken =
        action.side === "left"
          ? next.active.cards.shift()!
          : next.active.cards.pop()!;
      player.hand.splice(
        action.insertIndex,
        0,
        action.flip ? flipCard(taken) : { ...taken },
      );
      player.handCount = player.hand.length;
      if (!next.active.cards.length) next.active = null;
      if (
        action.combo &&
        !hasLegalShow(player.hand, next.active?.cards ?? null)
      )
        throw new Error("插牌后没有可用演出，不能使用挖角并演出");
      if (two) player.scoutChips--;
      else next.players.find((p) => p.id === sourceOwnerId)!.scoutChips++;
      next.scoutsSinceShow++;
      emit(next, {
        kind: "scout",
        actorId,
        cards: [taken],
        sourceOwnerId,
        insertIndex: action.insertIndex,
        flipped: action.flip,
      });
      if (action.combo) {
        player.scoutShowAvailable = false;
        next.comboActorId = actorId;
      } else if (two) checkBlocked(next, actorId);
      else if (next.scoutsSinceShow >= next.players.length - 1)
        settle(next, "unbeaten", actorId);
      else next.turnId = nextSeat(next, actorId);
    } else throw new Error("无效动作");
  }
  next.revision++;
  return next;
}

export function scoutView(state: ScoutState, viewerId: string): ScoutView {
  const me = state.players.find((p) => p.id === viewerId);
  if (!me) throw new Error("玩家不在本局");
  const view: ScoutView = {
    matchId: state.matchId,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    starterId: state.starterId,
    turnId: state.turnId,
    active: state.active,
    scoutsSinceShow: state.scoutsSinceShow,
    comboActorId: state.comboActorId,
    revision: state.revision,
    eventSeq: state.eventSeq,
    history: state.history,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      orientationConfirmed: p.orientationConfirmed,
      captured: p.captured,
      scoutChips: p.scoutChips,
      scoutShowAvailable: p.scoutShowAvailable,
      total: p.total,
    })),
    me: {
      id: me.id,
      hand: me.hand,
      orientationConfirmed: me.orientationConfirmed,
    },
    events: state.events.map((e) => {
      const { insertIndex, flipped, ...publicEvent } = e;
      return e.kind === "scout" && e.actorId === viewerId
        ? { ...publicEvent, insertIndex, flipped }
        : publicEvent;
    }),
  };
  return structuredClone(view);
}
export function classifySet(
  cards: ScoutCard[],
): { count: number; kind: "single" | "run" | "same"; min: number } | null {
  if (!cards.length) return null;
  const values = cards.map((c) => c.top);
  if (values.some((v) => !Number.isInteger(v) || v < 1 || v > 10)) return null;
  const count = cards.length,
    min = Math.min(...values);
  if (count === 1) return { count, kind: "single", min };
  if (values.every((v) => v === values[0])) return { count, kind: "same", min };
  const step = values[1] - values[0];
  if (
    Math.abs(step) === 1 &&
    values.every((v, i) => i === 0 || v - values[i - 1] === step)
  )
    return { count, kind: "run", min };
  return null;
}
export function canBeat(
  cards: ScoutCard[],
  active: ScoutCard[] | null,
): boolean {
  const candidate = classifySet(cards);
  if (!candidate) return false;
  if (!active?.length) return true;
  const current = classifySet(active);
  if (!current) return false;
  if (candidate.count !== current.count) return candidate.count > current.count;
  if (candidate.kind !== current.kind) return candidate.kind === "same";
  return candidate.min > current.min;
}
export function hasLegalShow(
  hand: ScoutCard[],
  active: ScoutCard[] | null,
): boolean {
  for (let start = 0; start < hand.length; start++)
    for (let count = 1; count <= hand.length - start; count++)
      if (canBeat(hand.slice(start, start + count), active)) return true;
  return false;
}
