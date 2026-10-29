import type {
  ClassicAction,
  ClassicCard,
  ClassicPlayer,
  ClassicRole,
  ClassicSettings,
  ClassicState,
  ClassicView,
} from "./types.ts";

function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++)
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed: string) {
  let a = hash(seed);
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function role(state: ClassicState, id: string): ClassicRole {
  return id === state.thinkerId
    ? "thinker"
    : id === state.truthId
      ? "truth"
      : "bluffer";
}

function truthFor(
  state: Pick<ClassicState, "players" | "thinkerId" | "seed" | "roundIndex">,
) {
  const candidates = state.players.filter((p) => p.id !== state.thinkerId);
  // Every round draws independently; no previous role is excluded.
  return candidates[
    Math.floor(
      random(`${state.seed}:truth:${state.roundIndex}`)() * candidates.length,
    )
  ]!.id;
}

function draw(state: ClassicState): ClassicState {
  const question = state.deck[state.cursor];
  requireThat(question, "剩余题量不足，请增加主题包后重新开局");
  return {
    ...state,
    question: structuredClone(question),
    cursor: state.cursor + 1,
    usedConcepts: [...state.usedConcepts, question.conceptId],
  };
}

export function createClassic(
  players: ClassicPlayer[],
  cards: ClassicCard[],
  settings: ClassicSettings,
  seed: string,
  now: number,
): ClassicState {
  const n = players.length;
  requireThat(n >= 3 && n <= 9, "人数需要为3至9人");
  requireThat(
    players.every(
      (p) =>
        typeof p.id === "string" &&
        p.id.trim() &&
        typeof p.name === "string" &&
        p.name.trim(),
    ) && new Set(players.map((p) => p.id)).size === n,
    "玩家身份需要唯一且姓名不能为空",
  );
  requireThat(
    Number.isInteger(settings.readSeconds) &&
      settings.readSeconds >= 5 &&
      settings.readSeconds <= 120,
    "阅读时长需要为5至120秒",
  );
  requireThat(
    settings.packIds.length > 0 &&
      settings.packIds.every((p) => typeof p === "string" && p.trim()),
    "请至少选择一个主题包",
  );
  requireThat(
    ["mixed", 1, 2, 3].includes(settings.difficulty),
    "难度需要为1至3或混合",
  );
  requireThat(typeof seed === "string" && Number.isFinite(now), "开局参数无效");
  requireThat(
    cards.every(
      (c) =>
        c.id &&
        c.conceptId &&
        c.term &&
        c.explanation &&
        [1, 2, 3].includes(c.difficulty),
    ),
    "题目数据无效",
  );
  const deck = structuredClone([
    ...new Map(cards.map((c) => [c.conceptId, c])).values(),
  ]);
  const totalRounds = n * (n <= 4 ? 3 : n <= 7 ? 2 : 1);
  requireThat(
    deck.length >= totalRounds,
    `本局需要${totalRounds}题，当前只有${deck.length}题，请增加主题包`,
  );
  const rng = random(`${seed}:deck`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  const firstThinker = Math.floor(random(`${seed}:first`)() * n);
  const base: ClassicState = {
    version: 1,
    matchId: `classic-${now.toString(36)}-${hash(`${seed}:${players.map((p) => p.id).join(":")}`).toString(36)}`,
    revision: 0,
    phase: "roles",
    players: players.map((p) => ({ id: p.id, name: p.name, score: 3 })),
    settings: structuredClone(settings),
    roundIndex: 0,
    totalRounds,
    firstThinker,
    thinkerId: players[firstThinker]!.id,
    truthId: "",
    confirmations: [],
    question: deck[0]!,
    deck,
    cursor: 0,
    usedConcepts: [],
    seed,
    readingDeadline: null,
    challengeTarget: null,
    result: null,
  };
  return draw({ ...base, truthId: truthFor(base) });
}

export function reduceClassic(
  state: ClassicState,
  actorId: string,
  action: ClassicAction,
  now: number,
): ClassicState {
  requireThat(
    state.players.some((p) => p.id === actorId),
    "玩家不在本局中",
  );
  requireThat(Number.isFinite(now), "时间无效");
  const phase = (expected: ClassicState["phase"]) =>
    requireThat(state.phase === expected, "当前阶段不能执行此操作");
  const host = () =>
    requireThat(actorId === state.players[0]!.id, "只有房主能执行此操作");
  const thinker = () =>
    requireThat(actorId === state.thinkerId, "只有想想能执行此操作");
  const target = (id: string) =>
    requireThat(
      id !== state.thinkerId && state.players.some((p) => p.id === id),
      "请选择想想以外的本局玩家",
    );
  let next = structuredClone(state);
  switch (action.type) {
    case "confirmRole":
      phase("roles");
      if (state.confirmations.includes(actorId)) return state;
      next.confirmations.push(actorId);
      break;
    case "beginRead":
      host();
      phase("roles");
      requireThat(
        state.players.every((p) => state.confirmations.includes(p.id)),
        "请等待所有人确认身份",
      );
      next.phase = "reading";
      next.readingDeadline = now + state.settings.readSeconds * 1000;
      break;
    case "finishRead":
      host();
      phase("reading");
      requireThat(
        state.readingDeadline !== null && now >= state.readingDeadline,
        "阅读时间尚未结束",
      );
      next.phase = "discussion";
      break;
    case "skip":
      thinker();
      phase("roles");
      requireThat(
        state.deck.length - state.cursor >=
          state.totalRounds - state.roundIndex,
        "剩余题量不足以换题并完成本局，请增加主题包后重新开局",
      );
      next = draw(next);
      break;
    case "challenge":
      thinker();
      phase("discussion");
      target(action.target);
      requireThat(state.challengeTarget === null, "每轮只能使用一次公三小");
      next.challengeTarget = action.target;
      break;
    case "guess": {
      thinker();
      phase("discussion");
      target(action.target);
      const deltas = new Map(state.players.map((p) => [p.id, 0]));
      const add = (id: string, points: number) =>
        deltas.set(id, deltas.get(id)! + points);
      const correct = action.target === state.truthId;
      if (state.challengeTarget === state.truthId) add(state.thinkerId, -3);
      else if (state.challengeTarget !== null) {
        add(state.challengeTarget, -1);
        add(state.thinkerId, 1);
      }
      if (correct) {
        add(state.thinkerId, state.question.difficulty);
        add(state.truthId, state.question.difficulty);
      } else add(action.target, state.question.difficulty);
      next.players = next.players.map((p) => ({
        ...p,
        score: p.score + deltas.get(p.id)!,
      }));
      next.result = {
        thinkerId: state.thinkerId,
        truthId: state.truthId,
        target: action.target,
        challengeTarget: state.challengeTarget,
        correct,
        question: structuredClone(state.question),
        lines: next.players.map((p) => ({
          id: p.id,
          name: p.name,
          role: role(state, p.id),
          delta: deltas.get(p.id)!,
          total: p.score,
        })),
      };
      next.phase = "results";
      break;
    }
    case "next":
      host();
      phase("results");
      if (state.roundIndex + 1 === state.totalRounds) next.phase = "finished";
      else {
        next.roundIndex++;
        next.thinkerId =
          next.players[
            (next.firstThinker + next.roundIndex) % next.players.length
          ]!.id;
        next.truthId = truthFor(next);
        next.phase = "roles";
        next.confirmations = [];
        next.readingDeadline = null;
        next.challengeTarget = null;
        next.result = null;
        next = draw(next);
      }
      break;
    default:
      throw new Error("未知操作");
  }
  next.revision = state.revision + 1;
  return next;
}

export function classicView(
  state: ClassicState,
  viewerId: string,
  now: number,
): ClassicView {
  requireThat(
    state.players.some((p) => p.id === viewerId),
    "玩家不在本局中",
  );
  const answer =
    state.phase === "reading" &&
    state.readingDeadline !== null &&
    now < state.readingDeadline &&
    viewerId === state.truthId
      ? state.question.explanation
      : null;
  return {
    matchId: state.matchId,
    revision: state.revision,
    phase: state.phase,
    players: state.players.map((p) => ({
      ...p,
      confirmed: state.confirmations.includes(p.id),
    })),
    thinkerId: state.thinkerId,
    term: state.question.term,
    hints: [...state.question.hints],
    difficulty: state.question.difficulty,
    readSeconds: state.settings.readSeconds,
    roundIndex: state.roundIndex,
    totalRounds: state.totalRounds,
    readingDeadline: state.readingDeadline,
    challengeTarget: state.challengeTarget,
    result:
      state.phase === "results" || state.phase === "finished"
        ? structuredClone(state.result)
        : null,
    me: { id: viewerId, role: role(state, viewerId), answer },
  };
}
