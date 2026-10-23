import type { TutorialState } from "../src/games/super-tic-tac-toe/tutorial/tutorialState.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTutorialState,
  tutorialReducer,
  isLessonComplete,
} from "../src/games/super-tic-tac-toe/tutorial/tutorialState.ts";
import { isValidMove } from "../src/games/super-tic-tac-toe/state/gameLogic.ts";
const move = (state: TutorialState, row: number, col: number) =>
  tutorialReducer(state, { type: "move", row, col });
const next = (state: TutorialState) => tutorialReducer(state, { type: "next" });

test("课程推进需要完成练习，认识棋盘后才开始落子课", () => {
  const first = createTutorialState();
  assert.equal(isLessonComplete(first), true);
  const practice = next(first);
  assert.equal(practice.step, 1);
  assert.equal(isLessonComplete(practice), false);
  assert.equal(next(practice), practice);
});
test("错误点击只给提示，正确首步送往第2块棋盘", () => {
  const initial = createTutorialState(1);
  const wrong = move(initial, 0, 0);
  assert.equal(wrong.game, initial.game);
  assert.ok(wrong.feedback);
  const correct = move(wrong, 0, 1);
  assert.equal(correct.game.board[0][1], "X");
  assert.deepEqual(correct.game.nextBoard, { row: 0, col: 1 });
  assert.equal(isLessonComplete(correct), true);
  assert.equal(initial.game.board[0][1], null);
});
test("下一课继承首步示范，O 在指定棋盘落子并送回第1块", () => {
  const lesson = createTutorialState(2);
  assert.equal(lesson.game.currentPlayer, "O");
  assert.deepEqual(lesson.game.nextBoard, { row: 0, col: 1 });
  const result = move(lesson, 0, 3);
  assert.equal(result.game.board[0][3], "O");
  assert.deepEqual(result.game.nextBoard, { row: 0, col: 0 });
  assert.equal(isLessonComplete(result), true);
});
test("满盘示范可以自由选中央，且两次练习后才能下一课", () => {
  const lesson = createTutorialState(3);
  const free = move(lesson, 0, 3);
  assert.equal(free.game.nextBoard, null);
  assert.equal(isLessonComplete(free), false);
  assert.equal(isValidMove(free.game, 4, 4), true);
  const result = move(free, 4, 4);
  assert.equal(isLessonComplete(result), true);
  assert.equal(result.game.winner, null);
});
test("最后一课跨小棋盘三连获胜，重学与上一课重置练习", () => {
  const final = move(createTutorialState(4), 0, 4);
  assert.equal(final.game.winner, "X");
  assert.deepEqual(final.game.winningCells, [
    [0, 2],
    [0, 3],
    [0, 4],
  ]);
  assert.equal(isLessonComplete(final), true);
  assert.equal(next(final), final);
  const previous = tutorialReducer(final, { type: "previous" });
  assert.equal(previous.step, 3);
  assert.equal(previous.progress, 0);
  assert.equal(tutorialReducer(final, { type: "restart" }).step, 0);
});
