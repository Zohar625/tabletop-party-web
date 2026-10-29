import type { Source } from "../bluff/types.ts";
import type { ChatMessage } from "../scout/chat-model.ts";
export type ClassicRole = "thinker" | "truth" | "bluffer";
export type ClassicPhase = "roles" | "reading" | "discussion" | "results" | "finished";
export interface ClassicSettings { readSeconds: number; packIds: string[]; difficulty: "mixed" | 1 | 2 | 3 }
export const DEFAULT_CLASSIC_SETTINGS: ClassicSettings = { readSeconds: 9, packIds: ["outrageous-long-cards"], difficulty: "mixed" };
export interface ClassicCard { id: string; conceptId: string; term: string; explanation: string; sources: Source[]; difficulty: 1 | 2 | 3; hints: string[] }
export interface ClassicPlayer { id: string; name: string; score: number }
export interface ClassicResult { thinkerId: string; truthId: string; target: string; challengeTarget: string | null; correct: boolean; question: ClassicCard; lines: { id: string; name: string; role: ClassicRole; delta: number; total: number }[] }
export interface ClassicState { version: 1; matchId: string; revision: number; phase: ClassicPhase; players: ClassicPlayer[]; settings: ClassicSettings; roundIndex: number; totalRounds: number; firstThinker: number; thinkerId: string; truthId: string; confirmations: string[]; question: ClassicCard; deck: ClassicCard[]; cursor: number; usedConcepts: string[]; seed: string; readingDeadline: number | null; challengeTarget: string | null; result: ClassicResult | null }
export type ClassicAction = { type: "confirmRole" | "beginRead" | "finishRead" | "next" | "skip" } | { type: "challenge" | "guess"; target: string };
export interface ClassicView { matchId: string; revision: number; phase: ClassicPhase; players: (ClassicPlayer & { confirmed: boolean })[]; thinkerId: string; term: string; hints: string[]; difficulty: 1 | 2 | 3; readSeconds: number; roundIndex: number; totalRounds: number; readingDeadline: number | null; challengeTarget: string | null; result: ClassicResult | null; me: { id: string; role: ClassicRole; answer: string | null } }
export interface ClassicRoomSnapshot { code: string; pin: string; meId: string; hostId: string; host: boolean; status: "connecting" | "online" | "waiting" | "offline" | "closed"; warning: string; error: string; revision: number; peers: {id: string;name: string;ready: boolean;online: boolean}[]; game: ClassicView | null; settings: ClassicSettings; chat: ChatMessage[]; pending: boolean; clockOffsetMs: number }
