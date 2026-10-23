import type {
  Action,
  Config,
  GameState,
  PrivateView,
  PublicView,
  Question,
} from "./types.ts";
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], seed: number) {
  const a = [...items],
    r = random(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
export function buildQuestionPool(
  config: Config,
  all: Question[],
  seen: Set<string>,
): Question[] {
  assert(config.selectedPackIds.length, "请至少选择一个主题包");
  const unique = new Map<string, Question>();
  for (const q of all)
    if (
      q.status === "verified" &&
      q.packIds.some((p) => config.selectedPackIds.includes(p)) &&
      (config.allowHistoryQuestions || !seen.has(q.conceptId)) &&
      !unique.has(q.conceptId)
    )
      unique.set(q.conceptId, q);
  return [...unique.values()];
}
function deal(s: GameState): GameState {
  const n = s.config.playerCount;
  assert(s.pool.length - s.cursor >= n, "题量不足，无法继续发牌，请重新开桌。");
  // One draw per deal attempt, with replacement. Past roles never exclude seats.
  const draw = random(s.seed ^ 0x1234);
  let bluffer = 0;
  for (let attempt = 0; attempt <= s.roundIndex + s.redeals; attempt++) {
    bluffer = Math.floor(draw() * n);
  }
  const blufferSchedule = [...s.blufferSchedule];
  blufferSchedule[s.roundIndex] = bluffer;
  return {
    ...s,
    roundId: `${s.id}:r${s.roundIndex}:${s.redeals}`,
    cards: s.pool.slice(s.cursor, s.cursor + n),
    cursor: s.cursor + n,
    blufferSchedule,
    bluffer,
    readerIndex: 0,
    deadline: null,
    speakerIndex: 0,
    voteIndex: 0,
    votes: Array(n).fill(null),
    roundPoints: Array(n).fill(0),
    phase: "handoff",
  };
}
export function createGame(
  config: Config,
  questions: Question[],
  seed: number,
): GameState {
  const n = config.playerCount;
  assert(Number.isInteger(n) && n >= 3 && n <= 9, "人数需要为3至9人");
  assert(
    Number.isInteger(config.readSeconds) &&
      config.readSeconds >= 5 &&
      config.readSeconds <= 120,
    "阅读时长需要为5至120秒",
  );
  assert(config.selectedPackIds.length, "请至少选择一个主题包");
  const pool = shuffle(
    [...new Map(questions.map((q) => [q.conceptId, q])).values()],
    seed,
  );
  assert(
    pool.length >= n * n,
    `本局需要${n * n}题，当前只有${pool.length}题。请增加主题包或允许使用历史题。`,
  );
  const players = Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    seat: i + 1,
    name: `${i + 1}号玩家`,
  }));
  return deal({
    version: 1,
    id: `g${seed.toString(36)}`,
    roundId: "",
    sequence: 0,
    config: structuredClone(config),
    players,
    phase: "handoff",
    roundIndex: 0,
    scores: Array(n).fill(0),
    roundPoints: Array(n).fill(0),
    pool,
    cursor: 0,
    cards: [],
    blufferSchedule: Array(n).fill(0),
    bluffer: 0,
    readerIndex: 0,
    deadline: null,
    speakerIndex: 0,
    voteIndex: 0,
    votes: [],
    seed,
    redeals: 0,
  });
}
function endReading(s: GameState): GameState {
  const i = s.readerIndex + 1;
  return {
    ...s,
    readerIndex: i,
    deadline: null,
    phase: i === s.config.playerCount ? "speaking" : "handoff",
  };
}
export function resumeGame(s: GameState): GameState {
  return s.phase === "reading"
    ? { ...endReading(s), sequence: s.sequence + 1 }
    : s;
}
export function reduceGame(
  state: GameState,
  action: Action,
  now: number,
): GameState {
  assert(
    action.gameId === state.id &&
      action.roundId === state.roundId &&
      action.sequence === state.sequence,
    "操作已过期，请使用当前页面",
  );
  let s = structuredClone(state);
  const n = s.config.playerCount;
  const phase = (p: GameState["phase"]) =>
    assert(s.phase === p, "当前阶段不能执行此操作");
  switch (action.type) {
    case "read":
      phase("handoff");
      s.phase = "reading";
      s.deadline = now + s.config.readSeconds * 1000;
      break;
    case "endRead":
      phase("reading");
      assert(now >= s.deadline!, "阅读时间尚未结束");
      s = endReading(s);
      break;
    case "consumeRead":
      phase("reading");
      s = endReading(s);
      break;
    case "nextSpeaker":
      phase("speaking");
      s.speakerIndex++;
      if (s.speakerIndex === n) s.phase = "discussion";
      break;
    case "startVoting":
      phase("discussion");
      s.phase = "voteHandoff";
      break;
    case "openVote":
      phase("voteHandoff");
      s.phase = "voting";
      break;
    case "vote": {
      phase("voting");
      const voter = s.players[s.voteIndex]!;
      assert(
        s.players.some((p) => p.id === action.target) &&
          action.target !== voter.id,
        "请选择其他玩家，不能投自己",
      );
      assert(s.votes[s.voteIndex] === null, "此票已提交");
      s.votes[s.voteIndex] = action.target;
      s.voteIndex++;
      if (s.voteIndex < n) s.phase = "voteHandoff";
      else {
        s.phase = "results";
        const bluffId = s.players[s.bluffer]!.id;
        s.votes.forEach((v, i) => {
          if (i !== s.bluffer) {
            if (v === bluffId) s.roundPoints[i] = 1;
            else s.roundPoints[s.bluffer]++;
          }
        });
        s.scores = s.scores.map((score, i) => score + s.roundPoints[i]!);
      }
      break;
    }
    case "nextRound":
      phase("results");
      if (s.roundIndex === n - 1) s.phase = "finished";
      else {
        s.roundIndex++;
        s = deal(s);
      }
      break;
    case "redeal":
      assert(
        !["results", "finished"].includes(s.phase),
        "本轮已经结算，不能重发",
      );
      assert(
        s.pool.length - s.cursor >= n * (n - s.roundIndex),
        `剩余${s.pool.length - s.cursor}题，重发并完成本局需要${n * (n - s.roundIndex)}题。请重开并增加主题包。`,
      );
      s.redeals++;
      s = deal(s);
      break;
    default:
      throw new Error("未知操作");
  }
  s.sequence = state.sequence + 1;
  return s;
}
export function publicView(s: GameState): PublicView {
  const revealed = ["results", "finished"].includes(s.phase),
    publicTerms = [
      "speaking",
      "discussion",
      "voteHandoff",
      "voting",
      "results",
      "finished",
    ].includes(s.phase);
  const v: PublicView = {
    id: s.id,
    roundId: s.roundId,
    sequence: s.sequence,
    phase: s.phase,
    config: structuredClone(s.config),
    players: structuredClone(s.players),
    roundIndex: s.roundIndex,
    scores: [...s.scores],
    readerIndex: s.readerIndex,
    deadline: s.deadline,
    speakerId:
      s.players[(s.roundIndex + s.speakerIndex) % s.players.length]!.id,
    voteIndex: s.voteIndex,
    terms: publicTerms
      ? s.cards.map((q, i) => ({ playerId: s.players[i]!.id, term: q.term }))
      : [],
  };
  if (s.phase === "handoff")
    v.handoff = {
      playerId: s.players[s.readerIndex]!.id,
      term: s.cards[s.readerIndex]!.term,
    };
  if (revealed) {
    const effectiveVotes = s.players.map(
      (p) => s.votes.filter((v, i) => i !== s.bluffer && v === p.id).length,
    );
    v.result = {
      blufferId: s.players[s.bluffer]!.id,
      cards: s.cards.map((q, i) => ({
        playerId: s.players[i]!.id,
        question: structuredClone(q),
      })),
      votes: [...s.votes],
      effectiveVotes,
      points: [...s.roundPoints],
    };
  }
  if (s.phase === "finished")
    v.ranking = s.players
      .map((player, i) => ({
        player: { ...player },
        score: s.scores[i]!,
        rank: 1 + s.scores.filter((score) => score > s.scores[i]!).length,
      }))
      .sort((a, b) => b.score - a.score);
  return v;
}
export function privateView(
  s: GameState,
  playerId: string,
  now: number,
): PrivateView | null {
  if (
    s.phase !== "reading" ||
    now >= s.deadline! ||
    s.players[s.readerIndex]!.id !== playerId
  )
    return null;
  const q = s.cards[s.readerIndex]!,
    bluffer = s.readerIndex === s.bluffer;
  return {
    playerId,
    term: q.term,
    role: bluffer ? "bluffer" : "normal",
    text: bluffer
      ? "你的卡上没有真实解释。给这个词编一个听起来可信的说法，藏好身份，让大家相信你。"
      : q.explanation,
    deadline: s.deadline!,
  };
}
