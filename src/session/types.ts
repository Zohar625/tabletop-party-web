import type {
  ActionInput,
  PrivateView,
  PublicView,
} from "../games/bluff/types.ts";
/** Future remote adapters keep GameState on the server and return only these projections. */
export interface SessionAdapter {
  getPublicView(): PublicView;
  getPrivateView(playerId: string): PrivateView | null;
  dispatch(input: ActionInput): void;
  discard(): void;
  subscribe(listener: () => void): () => void;
  getWarning(): string;
}
