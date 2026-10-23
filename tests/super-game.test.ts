import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  isValidMove,
  checkWin,
  getNextBoard,
} from "../src/games/super-tic-tac-toe/state/gameLogic.ts";
import { gameReducer } from "../src/games/super-tic-tac-toe/state/gameReducer.ts";

test("首步禁止中央，合法棋步指定下一棋盘，悔棋恢复", () => {
  const initial = createInitialState();
  assert.equal(isValidMove(initial, 4, 4), false);
  const next = gameReducer(initial, {
    type: "PLACE_MARK",
    globalRow: 0,
    globalCol: 1,
  });
  assert.deepEqual(next.nextBoard, { row: 0, col: 1 });
  assert.equal(next.currentPlayer, "O");
  assert.equal(isValidMove(next, 0, 0), false);
  assert.equal(isValidMove(next, 0, 3), true);
  assert.deepEqual(gameReducer(next, { type: "UNDO" }), initial);
  assert.deepEqual(gameReducer(next, { type: "RESET" }), initial);
});
test("全盘三连可以跨小棋盘边界", () => {
  const { board } = createInitialState();
  board[0][2] = board[0][3] = board[0][4] = "X";
  assert.equal(checkWin(board, 0, 3)!.winner, "X");
});
test("目标小棋盘满盘时自由落子", () => {
  const { board } = createInitialState();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) board[r][c] = "X";
  assert.equal(getNextBoard(board, 0, 0), null);
});
test("非法坐标不应崩溃或修改棋盘", () => {
  const state = createInitialState();
  for (const coordinate of [0.5, NaN, Infinity, -1, 9]) {
    assert.equal(isValidMove(state, coordinate, 0), false);
    assert.equal(isValidMove(state, 0, coordinate), false);
  }
});
