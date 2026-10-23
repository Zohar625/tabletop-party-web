export type Player = "X" | "O";

export type CellValue = Player | null;

// Board is 9x9 represented as 2D array
export type Board = CellValue[][];

export interface Move {
  player: Player;
  globalRow: number;
  globalCol: number;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  nextBoard: { row: number; col: number } | null;
  winner: Player | "draw" | null;
  winningCells: [number, number][] | null;
  moveHistory: Move[];
}

export interface ThemeConfig {
  boardSkin: "classic" | "grass" | "rice";
  pieceSet: "X-O" | "cat-dog" | "sun-moon";
  motion: boolean;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

export type GameMode = "local" | "lobby" | "waiting" | "playing";

export interface MultiplayerSession {
  roomId: string;
  roomCode: string;
  player: Player;
  isHost: boolean;
  localVersion: number;
}
