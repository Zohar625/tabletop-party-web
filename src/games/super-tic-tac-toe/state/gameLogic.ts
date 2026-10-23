import type { Board, GameState, Player } from "./types.ts";
import { createEmptyBoard } from "./types.ts";

// Directions to check: horizontal, vertical, two diagonals
const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

/**
 * Check if the last move created a winning 3-in-a-row.
 * Scans all 4 directions. Returns winner + winning cells, or null.
 */
export function checkWin(
  board: Board,
  lastRow: number,
  lastCol: number,
): { winner: Player; cells: [number, number][] } | null {
  const player = board[lastRow][lastCol];
  if (!player) return null;

  for (const [dr, dc] of DIRECTIONS) {
    const cells: [number, number][] = [[lastRow, lastCol]];

    // Scan forward
    for (let i = 1; i < 3; i++) {
      const r = lastRow + dr * i;
      const c = lastCol + dc * i;
      if (r >= 0 && r < 9 && c >= 0 && c < 9 && board[r][c] === player) {
        cells.push([r, c]);
      } else break;
    }

    // Scan backward
    for (let i = 1; i < 3; i++) {
      const r = lastRow - dr * i;
      const c = lastCol - dc * i;
      if (r >= 0 && r < 9 && c >= 0 && c < 9 && board[r][c] === player) {
        cells.unshift([r, c]);
      } else break;
    }

    if (cells.length >= 3) return { winner: player, cells: cells.slice(0, 3) };
  }

  return null;
}

export function isSmallBoardFull(
  board: Board,
  bigRow: number,
  bigCol: number,
): boolean {
  const startRow = bigRow * 3;
  const startCol = bigCol * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

export function isValidMove(
  state: GameState,
  globalRow: number,
  globalCol: number,
  player?: Player,
): boolean {
  if (
    !Number.isInteger(globalRow) ||
    !Number.isInteger(globalCol) ||
    globalRow < 0 ||
    globalRow > 8 ||
    globalCol < 0 ||
    globalCol > 8
  )
    return false;

  // Cell must be empty
  if (state.board[globalRow][globalCol] !== null) return false;

  // Game must not be over
  if (state.winner) return false;

  // Multiplayer: reject if not your turn
  if (player !== undefined && state.currentPlayer !== player) return false;

  // First move: cannot play in center board (1,1)
  if (state.moveHistory.length === 0) {
    const bigRow = Math.floor(globalRow / 3);
    const bigCol = Math.floor(globalCol / 3);
    if (bigRow === 1 && bigCol === 1) return false;
  }

  // If nextBoard specified, move must be in that small board
  if (state.nextBoard) {
    const targetBigRow = Math.floor(globalRow / 3);
    const targetBigCol = Math.floor(globalCol / 3);
    return (
      targetBigRow === state.nextBoard.row &&
      targetBigCol === state.nextBoard.col
    );
  }

  // nextBoard is null: can play anywhere
  return true;
}

export function getNextBoard(
  board: Board,
  smallRow: number,
  smallCol: number,
): { row: number; col: number } | null {
  if (isSmallBoardFull(board, smallRow, smallCol)) {
    return null; // full → free choice
  }
  return { row: smallRow, col: smallCol };
}

export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: "X",
    nextBoard: null,
    winner: null,
    winningCells: null,
    moveHistory: [],
  };
}

export function isDraw(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}
