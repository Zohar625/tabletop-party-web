export type DishCard = {
  id: string;
  name: string;
  kind: "safe" | "bad";
  art?: string;
};
export type DinnerPhase =
  | "initial"
  | "placing"
  | "bidding"
  | "revealing"
  | "discard"
  | "chooseStarter"
  | "roundEnd"
  | "finished";
export type DinnerPlayer = {
  id: string;
  name: string;
  cards: DishCard[];
  stack: string[];
  wins: number;
};
export type DinnerState = {
  revision: number;
  round: number;
  phase: DinnerPhase;
  players: DinnerPlayer[];
  starter: string;
  turn: string;
  bid: number;
  challenger: string | null;
  passed: string[];
  revealed: { owner: string; card: DishCard }[];
  winner: string | null;
  message: string;
};
export type DinnerAction =
  | { type: "place"; cardId: string }
  | { type: "bid"; amount: number }
  | { type: "pass" }
  | { type: "flip"; owner: string }
  | { type: "discard"; cardId: string }
  | { type: "chooseStarter"; playerId: string }
  | { type: "next" };
export type DinnerView = Omit<DinnerState, "players"> & {
  players: {
    id: string;
    name: string;
    cardCount: number;
    stackCount: number;
    wins: number;
    eliminated: boolean;
    passed: boolean;
  }[];
  me: {
    id: string;
    hand: DishCard[];
    placed: DishCard[];
    allCards: DishCard[];
  };
};
