import type {
  DinnerState,
  DinnerAction,
  DinnerView,
  DinnerPlayer,
} from "./types.ts";
import { SAFE_DISHES, BAD_DISHES } from "./menu.ts";
function fail(message: string): never {
  throw new Error(message);
}
function pick(length: number, random: () => number) {
  const n = random();
  if (!Number.isFinite(n) || n < 0 || n >= 1) fail("随机数必须在 0 到 1 之间");
  return Math.floor(n * length);
}
function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(i + 1, random);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
const alive = (s: DinnerState) => s.players.filter((p) => p.cards.length > 0);
function nextSeat(
  s: DinnerState,
  id: string,
  accept: (p: DinnerPlayer) => boolean = () => true,
): string {
  const start = s.players.findIndex((p) => p.id === id);
  for (let n = 1; n <= s.players.length; n++) {
    const p = s.players[(start + n) % s.players.length]!;
    if (p.cards.length && accept(p)) return p.id;
  }
  return fail("没有可行动玩家");
}
function finishIfWinner(s: DinnerState): boolean {
  const live = alive(s);
  const winner =
    s.players.find((p) => p.wins >= 2) ??
    (live.length === 1 ? live[0] : undefined);
  if (!winner) return false;
  s.phase = "finished";
  s.winner = winner.id;
  s.turn = "";
  s.message = `${winner.name} 赢得了本局！`;
  return true;
}
function takeBackStacks(s: DinnerState) {
  for (const player of s.players) player.stack = [];
}
function endRound(s: DinnerState) {
  takeBackStacks(s);
  if (!finishIfWinner(s)) {
    s.phase = "roundEnd";
    s.turn = "";
  }
}
function loseCard(
  s: DinnerState,
  challenger: DinnerPlayer,
  cardId: string,
  badOwner: string,
) {
  challenger.cards = challenger.cards.filter((c) => c.id !== cardId);
  takeBackStacks(s);
  s.message = `${challenger.name} 挑战失败，失去一道菜。`;
  if (finishIfWinner(s)) return;
  if (challenger.cards.length) {
    s.starter = challenger.id;
    endRound(s);
  } else if (badOwner !== challenger.id) {
    s.starter = badOwner;
    endRound(s);
  } else {
    s.phase = "chooseStarter";
    s.turn = challenger.id;
    s.message = `${challenger.name} 已出局，请指定下一轮起始玩家。`;
  }
}
export function createDinner(
  players: { id: string; name: string }[],
  random: () => number = Math.random,
): DinnerState {
  if (players.length < 3 || players.length > 6) fail("需要 3–6 名玩家");
  if (new Set(players.map((p) => p.id)).size !== players.length)
    fail("玩家编号不能重复");
  if (players.some((p) => !p.id.trim() || !p.name.trim()))
    fail("玩家编号和名字不能为空");
  const safe = shuffled(SAFE_DISHES, random),
    bad = shuffled(BAD_DISHES, random);
  return {
    revision: 0,
    round: 1,
    phase: "initial",
    players: players.map((p, i) => ({
      ...p,
      cards: [0, 1, 2, 3].map((j) => ({
        id: `${p.id}:dish:${j}:`,
        name: j === 3 ? bad[i]! : safe[i * 3 + j]!,
        kind: j === 3 ? "bad" : "safe",
      })),
      stack: [],
      wins: 0,
    })),
    starter: players[0]!.id,
    turn: players[1]!.id,
    bid: 0,
    challenger: null,
    passed: [],
    revealed: [],
    winner: null,
    message: "其他玩家先放一道菜，起始玩家最后放。",
  };
}
export function reduceDinner(
  state: DinnerState,
  actorId: string,
  action: DinnerAction,
  random: () => number = Math.random,
): DinnerState {
  const s = structuredClone(state),
    actor = s.players.find((p) => p.id === actorId);
  if (!actor) fail("找不到该玩家");
  if (s.phase === "finished") fail("游戏已经结束");
  if (action.type === "next") {
    if (s.phase !== "roundEnd") fail("本轮尚未结束");
    s.round++;
    s.phase = "initial";
    for (const p of s.players) p.stack = [];
    s.bid = 0;
    s.challenger = null;
    s.passed = [];
    s.revealed = [];
    s.turn = nextSeat(s, s.starter);
    s.message = "其他玩家先放一道菜，起始玩家最后放。";
  } else if (action.type === "chooseStarter") {
    if (s.phase !== "chooseStarter" || s.turn !== actorId)
      fail("现在不能指定起始玩家");
    if (!alive(s).some((p) => p.id === action.playerId))
      fail("必须选择仍在场的玩家");
    s.starter = action.playerId;
    endRound(s);
  } else if (action.type === "discard") {
    if (s.phase !== "discard" || actorId !== s.challenger) fail("现在不能弃菜");
    if (!actor.cards.some((c) => c.id === action.cardId))
      fail("请选择自己的一道菜");
    loseCard(s, actor, action.cardId, actorId);
  } else {
    if (!actor.cards.length) fail("你已经出局");
    if (s.phase !== "initial" && s.turn !== actorId) fail("尚未轮到你的回合");
    if (action.type === "place") {
      if (s.phase !== "initial" && s.phase !== "placing") fail("现在不能放菜");
      if (
        !actor.cards.some((c) => c.id === action.cardId) ||
        actor.stack.includes(action.cardId)
      )
        fail("请选择尚未放出的自己的菜");
      if (s.phase === "initial") {
        if (actor.stack.length) fail("初始只能放一道菜");
        if (
          actorId === s.starter &&
          alive(s).some((p) => p.id !== actorId && !p.stack.length)
        )
          fail("起始玩家必须最后放菜");
      }
      actor.stack.push(action.cardId);
      if (s.phase === "initial") {
        const waiting = alive(s).filter((p) => !p.stack.length);
        if (!waiting.length) {
          s.phase = "placing";
          s.turn = s.starter;
          s.message = "轮到起始玩家加菜或叫价。";
        } else {
          s.turn = waiting.find((p) => p.id !== s.starter)?.id ?? s.starter;
        }
      } else {
        s.turn = nextSeat(s, actorId);
        s.message = "轮到下一位加菜或叫价。";
      }
    } else if (action.type === "bid") {
      if (s.phase !== "placing" && s.phase !== "bidding") fail("现在不能叫价");
      if (s.passed.includes(actorId)) fail("已退出本轮叫价");
      const total = s.players.reduce((n, p) => n + p.stack.length, 0);
      if (
        !Number.isInteger(action.amount) ||
        action.amount <= s.bid ||
        action.amount > total
      )
        fail("叫价必须是高于当前叫价且不超过全桌菜数的整数");
      s.bid = action.amount;
      s.challenger = actorId;
      if (s.bid === total) {
        s.phase = "revealing";
        s.turn = actorId;
        s.message = "开始揭菜：可选择任意玩家最上面的一道菜。";
      } else {
        s.phase = "bidding";
        s.turn = nextSeat(s, actorId, (p) => !s.passed.includes(p.id));
        s.message = "下一位加价或退出叫价。";
      }
    } else if (action.type === "pass") {
      if (
        s.phase !== "bidding" ||
        actorId === s.challenger ||
        s.passed.includes(actorId)
      )
        fail("现在不能退出叫价");
      s.passed.push(actorId);
      const contenders = alive(s).filter((p) => !s.passed.includes(p.id));
      if (contenders.length === 1) {
        s.phase = "revealing";
        s.turn = s.challenger!;
        s.message = "开始揭菜：可选择任意玩家最上面的一道菜。";
      } else {
        s.turn = nextSeat(s, actorId, (p) => !s.passed.includes(p.id));
      }
    } else if (action.type === "flip") {
      if (s.phase !== "revealing" || actorId !== s.challenger)
        fail("现在不能翻菜");
      const owner = s.players.find((p) => p.id === action.owner);
      if (!owner || !owner.stack.length) fail("该玩家没有可翻的菜");
      const id = owner.stack.pop()!;
      const card = owner.cards.find((c) => c.id === id)!;
      s.revealed.push({ owner: owner.id, card: { ...card } });
      if (card.kind === "bad") {
        if (owner.id === actorId) {
          takeBackStacks(s);
          s.phase = "discard";
          s.turn = actorId;
          s.message = "翻到自己的黑暗料理，请私密选择任意一道菜丢弃。";
        } else
          loseCard(
            s,
            actor,
            actor.cards[pick(actor.cards.length, random)]!.id,
            owner.id,
          );
      } else if (s.revealed.length === s.bid) {
        actor.wins++;
        s.starter = actorId;
        s.message = `${actor.name} 挑战成功，获得一分！`;
        endRound(s);
      }
    } else fail("未知动作");
  }
  s.revision++;
  return s;
}
export function dinnerView(state: DinnerState, playerId: string): DinnerView {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) fail("找不到该玩家");
  return {
    revision: state.revision,
    round: state.round,
    phase: state.phase,
    starter: state.starter,
    turn: state.turn,
    bid: state.bid,
    challenger: state.challenger,
    passed: [...state.passed],
    revealed: structuredClone(state.revealed),
    winner: state.winner,
    message: state.message,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: p.cards.length,
      stackCount: p.stack.length,
      wins: p.wins,
      eliminated: p.cards.length === 0,
      passed: state.passed.includes(p.id),
    })),
    me: {
      id: playerId,
      allCards: structuredClone(me.cards),
      hand: structuredClone(
        me.cards.filter(
          (c) =>
            !me.stack.includes(c.id) &&
            !state.revealed.some((r) => r.card.id === c.id),
        ),
      ),
      placed: me.stack.map((id) => ({ ...me.cards.find((c) => c.id === id)! })),
    },
  };
}
