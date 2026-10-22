export type Source = {
  url: string;
  title: string;
  checkedAt?: string;
  [key: string]: unknown;
};
export type Question = {
  id: string;
  conceptId: string;
  term: string;
  explanation: string;
  packIds: string[];
  difficulty: number;
  status: "verified" | "draft";
  sources: Source[];
  [key: string]: unknown;
};
export type Config = {
  playerCount: number;
  readSeconds: number;
  selectedPackIds: string[];
  allowHistoryQuestions: boolean;
};
export type Phase =
  | "handoff"
  | "reading"
  | "speaking"
  | "discussion"
  | "voteHandoff"
  | "voting"
  | "results"
  | "finished";
export type Player = { id: string; seat: number; name: string };
export type GameState = {
  version: 1;
  id: string;
  roundId: string;
  sequence: number;
  config: Config;
  players: Player[];
  phase: Phase;
  roundIndex: number;
  scores: number[];
  roundPoints: number[];
  pool: Question[];
  cursor: number;
  cards: Question[];
  // Legacy save field: records dealt roles; future slots are not assignments.
  blufferSchedule: number[];
  bluffer: number;
  readerIndex: number;
  deadline: number | null;
  speakerIndex: number;
  voteIndex: number;
  votes: (string | null)[];
  seed: number;
  redeals: number;
};
export type ActionInput =
  | {
      type:
        | "read"
        | "endRead"
        | "consumeRead"
        | "nextSpeaker"
        | "startVoting"
        | "openVote"
        | "nextRound"
        | "redeal";
    }
  | { type: "vote"; target: string };
export type Action = ActionInput & {
  gameId: string;
  roundId: string;
  sequence: number;
};
export type Result = {
  blufferId: string;
  cards: { playerId: string; question: Question }[];
  votes: (string | null)[];
  effectiveVotes: number[];
  points: number[];
};
export type PublicView = {
  id: string;
  roundId: string;
  sequence: number;
  phase: Phase;
  config: Config;
  players: Player[];
  roundIndex: number;
  scores: number[];
  readerIndex: number;
  deadline: number | null;
  speakerId: string;
  voteIndex: number;
  terms: { playerId: string; term: string }[];
  handoff?: { playerId: string; term: string };
  result?: Result;
  ranking?: { player: Player; score: number; rank: number }[];
};
export type PrivateView = {
  playerId: string;
  term: string;
  role: "normal" | "bluffer";
  text: string;
  deadline: number;
};
