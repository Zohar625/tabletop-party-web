export interface ScoutCard {
  id: string;
  top: number;
  bottom: number;
}
export type ScoutPhase = "orienting" | "playing" | "roundEnd" | "finished";
export type ScoutAction =
  | { type: "orient"; flip: boolean }
  | { type: "show"; start: number; count: number }
  | {
      type: "scout";
      side: "left" | "right";
      flip: boolean;
      insertIndex: number;
      combo: boolean;
    }
  | { type: "next" };
export interface ScoutPublicPlayer {
  id: string;
  name: string;
  handCount: number;
  orientationConfirmed: boolean;
  captured: number;
  scoutChips: number;
  scoutShowAvailable: boolean;
  total: number;
}
export interface ScoutPlayer extends ScoutPublicPlayer {
  hand: ScoutCard[];
}
export interface ScoutEvent {
  seq: number;
  kind: "deal" | "orient" | "show" | "scout" | "roundEnd";
  actorId: string;
  cards?: ScoutCard[];
  captured?: ScoutCard[];
  sourceOwnerId?: string;
  insertIndex?: number;
  flipped?: boolean;
}
export interface ScoutRoundResult {
  round: number;
  starterId: string;
  reason: "emptyHand" | "unbeaten" | "blocked";
  leaderId: string | null;
  lines: {
    id: string;
    name: string;
    captured: number;
    scoutChips: number;
    remainingPenalty: number;
    delta: number;
    total: number;
  }[];
}
interface ScoutPublicState {
  matchId: string;
  phase: ScoutPhase;
  round: number;
  totalRounds: number;
  starterId: string;
  turnId: string;
  active: { ownerId: string; cards: ScoutCard[] } | null;
  scoutsSinceShow: number;
  comboActorId: string | null;
  revision: number;
  eventSeq: number;
  events: ScoutEvent[];
  history: ScoutRoundResult[];
}
export interface ScoutState extends ScoutPublicState {
  players: ScoutPlayer[];
  seed: string;
  reserve: ScoutCard[];
  latestShowerId: string | null;
}
export interface ScoutView extends ScoutPublicState {
  players: ScoutPublicPlayer[];
  me: { id: string; hand: ScoutCard[]; orientationConfirmed: boolean };
}
