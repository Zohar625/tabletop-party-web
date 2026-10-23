import { createInitialState } from "../state/gameLogic.ts";
import { gameReducer } from "../state/gameReducer.ts";
import type { GameState, Player } from "../state/types.ts";
export interface TutorialState {
  step: number;
  game: GameState;
  progress: number;
  feedback: string;
}
export type TutorialAction =
  | { type: "next" }
  | { type: "previous" }
  | { type: "restart" }
  | { type: "move"; row: number; col: number };
type Coordinate = readonly [number, number];
interface Lesson {
  title: string;
  description: string;
  tasks: readonly string[];
  targets: readonly Coordinate[];
  success: string;
  preset?: boolean;
}
export const lessons: readonly Lesson[] = [
  {
    title: "认识这片棋盘",
    description:
      "大棋盘有九块 3×3 小棋盘，共 81 格。你每次落的是一格，双方轮流下，X 先手。",
    tasks: [
      "图中的数字 1—9 表示九块小棋盘。",
      "X 是开垦者，O 是播种者。准备好后点击“下一课”。",
    ],
    targets: [],
    success: "",
  },
  {
    title: "种下你的第一步",
    description:
      "第一步不能下在第 5 块，也就是正中央的小棋盘。其他八块都能选。",
    tasks: [
      "点击金色示范格：第 1 块的上边中间。",
      "它是整个棋盘的第 1 行、第 2 列。",
    ],
    targets: [[0, 1]],
    success: "X 落在小棋盘的上边中间，所以下一位 O 必须去第 2 块。",
  },
  {
    title: "你的一步，决定对手去向",
    description: "落子在小棋盘内的位置，对应大棋盘里下一位玩家必须去的那一块。",
    tasks: [
      "现在轮到 O，只能在第 2 块落子。",
      "点击它的左上角示范格：全局第 1 行、第 4 列。",
    ],
    targets: [[0, 3]],
    success: "O 选了左上角，下一位 X 就被送到大棋盘的左上角，也就是第 1 块。",
  },
  {
    title: "目标满了，就自由选择",
    description:
      "如果你把对手送到一块已经下满的小棋盘，对手可以选择任何仍有空格的小棋盘，中央也可以。",
    tasks: [
      "这是预设示范局面，第 1 块已经下满。先点击第 2 块左上角。",
      "轮到 O 自由选择了。点击中央示范格：第 5 行、第 5 列。",
    ],
    targets: [
      [0, 3],
      [4, 4],
    ],
    success: "中央只在第一步被禁止。目标满盘后，自由落子同样可以选中央。",
    preset: true,
  },
  {
    title: "跨过田埂，也能获胜",
    description:
      "整个 9×9 棋盘中，同一方任意三个连续棋子横、竖、斜连线就获胜，可以跨小棋盘边界。",
    tasks: [
      "这是预设示范局面，X 已在第 1 行的第 3、4 列落子。",
      "点击第 1 行、第 5 列，完成跨小棋盘三连。",
    ],
    targets: [[0, 4]],
    success:
      "你完成了跨小棋盘三连！不用先赢下小棋盘，三个连续棋子连成一线即可获胜。",
    preset: true,
  },
];
function place(game: GameState, row: number, col: number) {
  return gameReducer(game, {
    type: "PLACE_MARK",
    globalRow: row,
    globalCol: col,
  });
}
export function createTutorialState(step = 0): TutorialState {
  const safeStep = Number.isInteger(step)
    ? Math.max(0, Math.min(lessons.length - 1, step))
    : 0;
  let game = createInitialState();
  if (safeStep === 2) game = place(game, 0, 1);
  if (safeStep === 3) {
    // A teaching fixture, not a historical game: the target block is full.
    const full: Player[][] = [
      ["X", "O", "X"],
      ["X", "O", "O"],
      ["O", "X", "X"],
    ];
    full.forEach((row, r) =>
      row.forEach((player, c) => {
        game.board[r][c] = player;
        game.moveHistory.push({ player, globalRow: r, globalCol: c });
      }),
    );
    game.board[3][8] = "O";
    game.moveHistory.push({ player: "O", globalRow: 3, globalCol: 8 });
    game.nextBoard = { row: 0, col: 1 };
  }
  if (safeStep === 4) {
    const pieces = [
      { player: "X" as const, globalRow: 0, globalCol: 2 },
      { player: "O" as const, globalRow: 5, globalCol: 5 },
      { player: "X" as const, globalRow: 0, globalCol: 3 },
      { player: "O" as const, globalRow: 8, globalCol: 8 },
    ];
    pieces.forEach((move) => {
      game.board[move.globalRow][move.globalCol] = move.player;
    });
    game.moveHistory = pieces;
    game.nextBoard = { row: 0, col: 1 };
  }
  return { step: safeStep, game, progress: 0, feedback: "" };
}
export function isLessonComplete(state: TutorialState): boolean {
  return state.progress >= lessons[state.step].targets.length;
}
export function getTutorialTarget(
  state: TutorialState,
): { row: number; col: number } | undefined {
  const target = lessons[state.step].targets[state.progress];
  return target ? { row: target[0], col: target[1] } : undefined;
}
export function tutorialReducer(
  state: TutorialState,
  action: TutorialAction,
): TutorialState {
  if (action.type === "restart") return createTutorialState();
  if (action.type === "previous")
    return state.step ? createTutorialState(state.step - 1) : state;
  if (action.type === "next")
    return isLessonComplete(state) && state.step < lessons.length - 1
      ? createTutorialState(state.step + 1)
      : state;
  if (isLessonComplete(state)) return state;
  const target = getTutorialTarget(state)!;
  if (action.row !== target.row || action.col !== target.col)
    return {
      ...state,
      feedback: `这一课请点击金色示范格：第 ${target.row + 1} 行、第 ${target.col + 1} 列。`,
    };
  const game = place(state.game, action.row, action.col);
  if (game === state.game) return state;
  const progress = state.progress + 1;
  const complete = progress >= lessons[state.step].targets.length;
  return {
    ...state,
    game,
    progress,
    feedback: complete
      ? lessons[state.step].success
      : "对方的目标棋盘已经下满！现在可以自由选择，试着下在正中央。",
  };
}
