import {
  privateView,
  publicView,
  reduceGame,
  resumeGame,
} from "../games/bluff/engine.ts";
import type { ActionInput, GameState } from "../games/bluff/types.ts";
import type { SessionAdapter } from "./types.ts";
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const SAVE = "tabletop.session.v1",
  HISTORY = "tabletop.history.v1";
export function loadHistory(store: Store): {
  seen: Set<string>;
  warning: string;
} {
  try {
    const raw = store.getItem(HISTORY);
    if (!raw) return { seen: new Set(), warning: "" };
    const v = JSON.parse(raw);
    if (
      v.version !== 1 ||
      !Array.isArray(v.seen) ||
      v.seen.some((x: unknown) => typeof x !== "string")
    )
      throw Error();
    return { seen: new Set(v.seen), warning: "" };
  } catch {
    return {
      seen: new Set(),
      warning: "本设备题目历史无法读取，跨局避重可能失效。",
    };
  }
}
export function clearHistory(store: Store) {
  store.removeItem(HISTORY);
}
export function discardSession(store: Store) {
  store.removeItem(SAVE);
}
export class LocalSession implements SessionAdapter {
  #state: GameState;
  #store: Store;
  #clock: () => number;
  #listeners = new Set<() => void>();
  #warning = "";
  #seen: Set<string>;
  constructor(state: GameState, store: Store, clock = Date.now) {
    this.#state = state;
    this.#store = store;
    this.#clock = clock;
    const history = loadHistory(store);
    this.#seen = history.seen;
    this.#warning = history.warning;
    this.#save();
  }
  #save() {
    const s = this.#state;
    const exposed =
      s.phase === "handoff"
        ? [s.cards[s.readerIndex]!]
        : [
              "speaking",
              "discussion",
              "voteHandoff",
              "voting",
              "results",
              "finished",
            ].includes(s.phase)
          ? s.cards
          : [];
    for (const q of exposed)
      if (!this.#seen.has(q.conceptId)) {
        this.#seen.add(q.conceptId);
      }
    try {
      this.#store.setItem(
        HISTORY,
        JSON.stringify({ version: 1, seen: [...this.#seen] }),
      );
      this.#store.setItem(SAVE, JSON.stringify(s));
    } catch {
      this.#warning =
        "进度或题目历史保存失败。当前仍可玩，刷新恢复和跨局避重无法保证。";
    }
  }
  getPublicView() {
    return publicView(this.#state);
  }
  getPrivateView(playerId: string) {
    return privateView(this.#state, playerId, this.#clock());
  }
  getWarning() {
    return this.#warning;
  }
  dispatch(input: ActionInput) {
    this.#state = reduceGame(
      this.#state,
      {
        ...input,
        gameId: this.#state.id,
        roundId: this.#state.roundId,
        sequence: this.#state.sequence,
      },
      this.#clock(),
    );
    this.#save();
    for (const listener of this.#listeners) listener();
  }
  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
}
function validState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const s = value as GameState;
  const n = s.config?.playerCount;
  const index = (v: number, max: number) =>
    Number.isInteger(v) && v >= 0 && v < max;
  const question = (q: GameState["cards"][number]) =>
    q &&
    typeof q.id === "string" &&
    typeof q.term === "string" &&
    typeof q.explanation === "string" &&
    typeof q.conceptId === "string" &&
    Array.isArray(q.sources) &&
    q.sources.every(
      (source) =>
        source &&
        typeof source.url === "string" &&
        typeof source.title === "string",
    );
  const scores = (v: number[]) =>
    Array.isArray(v) &&
    v.length === n &&
    v.every((score) => Number.isInteger(score) && score >= 0);
  return (
    s.version === 1 &&
    Number.isInteger(n) &&
    n >= 3 &&
    n <= 9 &&
    Number.isInteger(s.config.readSeconds) &&
    s.config.readSeconds >= 5 &&
    s.config.readSeconds <= 120 &&
    Array.isArray(s.config.selectedPackIds) &&
    s.config.selectedPackIds.length > 0 &&
    s.config.selectedPackIds.every((p) => typeof p === "string") &&
    typeof s.config.allowHistoryQuestions === "boolean" &&
    Number.isInteger(s.sequence) &&
    s.sequence >= 0 &&
    Number.isFinite(s.seed) &&
    Number.isInteger(s.redeals) &&
    s.redeals >= 0 &&
    typeof s.id === "string" &&
    typeof s.roundId === "string" &&
    [
      "handoff",
      "reading",
      "speaking",
      "discussion",
      "voteHandoff",
      "voting",
      "results",
      "finished",
    ].includes(s.phase) &&
    Array.isArray(s.players) &&
    s.players.length === n &&
    s.players.every(
      (p, i) =>
        p &&
        p.id === `p${i + 1}` &&
        p.seat === i + 1 &&
        p.name === `${i + 1}号玩家`,
    ) &&
    Array.isArray(s.cards) &&
    s.cards.length === n &&
    s.cards.every(question) &&
    Array.isArray(s.pool) &&
    s.pool.every(question) &&
    new Set(s.pool.map((q) => q.conceptId)).size === s.pool.length &&
    Number.isInteger(s.cursor) &&
    s.cursor >= n &&
    s.cursor <= s.pool.length &&
    s.cards.every((q, i) => q.id === s.pool[s.cursor - n + i]?.id) &&
    scores(s.scores) &&
    scores(s.roundPoints) &&
    Array.isArray(s.blufferSchedule) &&
    s.blufferSchedule.length === n &&
    new Set(s.blufferSchedule).size === n &&
    s.blufferSchedule.every((i) => index(i, n)) &&
    Number.isInteger(s.roundIndex) &&
    s.roundIndex >= 0 &&
    s.roundIndex < n &&
    s.bluffer === s.blufferSchedule[s.roundIndex] &&
    Number.isInteger(s.readerIndex) &&
    s.readerIndex >= 0 &&
    s.readerIndex <= n &&
    (["reading", "handoff"].includes(s.phase)
      ? s.readerIndex < n
      : s.readerIndex === n) &&
    (s.phase === "reading"
      ? typeof s.deadline === "number" && Number.isFinite(s.deadline)
      : s.deadline === null) &&
    index(s.speakerIndex, n + 1) &&
    Number.isInteger(s.voteIndex) &&
    s.voteIndex >= 0 &&
    s.voteIndex <= n &&
    (["voteHandoff", "voting"].includes(s.phase) ? s.voteIndex < n : true) &&
    Array.isArray(s.votes) &&
    s.votes.length === n &&
    s.votes.every((v, i) =>
      i < s.voteIndex
        ? typeof v === "string" &&
          s.players.some((p) => p.id === v) &&
          v !== s.players[i]!.id
        : v === null,
    ) &&
    (["results", "finished"].includes(s.phase)
      ? s.voteIndex === n
      : s.voteIndex < n)
  );
}
export function loadSession(
  store: Store,
  clock = Date.now,
): { session: LocalSession | null; warning: string } {
  try {
    const raw = store.getItem(SAVE);
    if (!raw) return { session: null, warning: "" };
    const s = JSON.parse(raw);
    if (s.version !== 1)
      return { session: null, warning: "存档版本不兼容，请重新开局。" };
    if (!validState(s)) throw Error();
    const state = resumeGame(s);
    return {
      session: new LocalSession(state, store, clock),
      warning: s.phase === "reading" ? "上次阅读已结束，已交接给下一位。" : "",
    };
  } catch {
    return { session: null, warning: "存档损坏或无法读取，请重新开局。" };
  }
}
