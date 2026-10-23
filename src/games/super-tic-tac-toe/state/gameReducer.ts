import type { GameState, Move } from "./types.ts";
import {
  checkWin,
  createInitialState,
  getNextBoard,
  isDraw,
  isValidMove,
} from "./gameLogic.ts";

export type GameAction =
  | {
      type: "PLACE_MARK";
      globalRow: number;
      globalCol: number;
    }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "SET_GAME_STATE"; state: GameState };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "PLACE_MARK": {
      const { globalRow, globalCol } = action;

      if (!isValidMove(state, globalRow, globalCol)) return state;

      const newBoard = state.board.map((row) => [...row]);
      newBoard[globalRow][globalCol] = state.currentPlayer;

      const move: Move = {
        player: state.currentPlayer,
        globalRow,
        globalCol,
      };

      const winResult = checkWin(newBoard, globalRow, globalCol);

      const smallRow = globalRow % 3;
      const smallCol = globalCol % 3;
      const nextBoard = getNextBoard(newBoard, smallRow, smallCol);

      const nextPlayer = state.currentPlayer === "X" ? "O" : "X";

      return {
        board: newBoard,
        currentPlayer: nextPlayer,
        nextBoard,
        winner: winResult?.winner || (isDraw(newBoard) ? "draw" : null),
        winningCells: winResult?.cells || null,
        moveHistory: [...state.moveHistory, move],
      };
    }

    case "UNDO": {
      if (state.moveHistory.length === 0) return state;

      const newHistory = state.moveHistory.slice(0, -1);
      const lastMove = state.moveHistory[state.moveHistory.length - 1];

      const newBoard = state.board.map((row) => [...row]);
      newBoard[lastMove.globalRow][lastMove.globalCol] = null;

      // Recalculate nextBoard from the move before last
      let nextBoard: { row: number; col: number } | null = null;
      if (newHistory.length) {
        const prev = newHistory[newHistory.length - 1];
        const sr = prev.globalRow % 3;
        const sc = prev.globalCol % 3;
        nextBoard = getNextBoard(newBoard, sr, sc);
      }

      return {
        board: newBoard,
        currentPlayer: lastMove.player,
        nextBoard,
        winner: null,
        winningCells: null,
        moveHistory: newHistory,
      };
    }

    case "RESET":
      return createInitialState();

    case "SET_GAME_STATE":
      return action.state;

    default:
      return state;
  }
}
