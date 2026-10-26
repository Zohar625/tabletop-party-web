import type { Board, MapGame, Placement } from "./types.ts";
import { createGame, reduceGame, targetPlayer } from "./engine.ts";
import { previewPlacement } from "./commission-model.ts";
import { createBoard } from "./data.ts";
import { monsterPenalty, neighbors } from "./scoring.ts";

export const LESSONS = [
  {
    title: "为什么要画在这里？",
    task: "四季结束累计声望越高越好。春季只结算 A、B 两项委托。先看 A：边缘每个森林格得 1 分。请画一格边缘森林，让预计声望增加。",
    hint: "A1 是边缘：+1；E5 是内部：+0。角落也只算一次。",
  },
  {
    title: "转个方向，多得一分",
    task: "接着上一笔。把这条双格森林旋转成竖排，或镜像后沿边摆放，争取至少 2 分。工具的用途是让形状适合有价值的位置。",
    hint: "旋转一次，在 A3 预览：两格都贴边，哨兵林 +2。镜像对直条没有外观变化。",
  },
  {
    title: "同一回合，两份委托",
    task: "B「大都会」奖励不邻山的最大村落。森林帮助 A，村庄帮助 B：请先点开 B，再落一笔让 B 增分。每张探索牌只能选一种地形。",
    hint: "B1 画村庄：A +0，B +1。若画森林则 A +1，B +0；这是一种取舍。",
  },
  {
    title: "金币让每个季末多一分",
    task: "局部练习：D4 山峰已围三面。请填 E4，围满上下左右，获得 1 金币。金币保留，以后每个季末都加入声望；带金币的形状也会给金币。",
    hint: "只认上下左右，斜角不算。金币最多 14 枚。",
  },
  {
    title: "有遗迹，就先满足落点",
    task: "这次带遗迹限制：覆盖一处虚线遗迹再确认。位置仍要服务于委托；遗迹本身不会自动奖励声望。",
    hint: "F2 是未填遗迹。尝试内部落点时，先看清预计增分与合法性。",
  },
  {
    title: "实在放不下时的补救",
    task: "独立局部练习：地图只剩 A1，双格形状无处可放。启用单格替代，再填 A1。正常形状只要还有合法位置，就不能替代。完成后返回自己的春季地图。",
    hint: "单格替代可不覆盖遗迹，也不获得原形状的金币。",
  },
  {
    title: "伏击时，地图属于邻座",
    task: "独立联机练习：你收到邻座的地图，请放一格怪物。怪物旁每个空格季末扣 1 分；共享空格只扣一次。正式单人局则由系统按牌面扫描放置。",
    hint: "A1 的怪物会留下两个相邻空格，因此预计扣 2 分。",
  },
  {
    title: "回到自己的地图，堵住缺口",
    task: "你的春季地图出现怪物 K1。请填它旁边的空格，减少季末扣分。怪物格本身不扣分，周围的空格才扣分。",
    hint: "J1 或 K2 都能减少 1 分扣款，也能为边缘森林委托加分。",
  },
  {
    title: "亲眼看一次声望到账",
    task: "春季时间已到上限，最后一笔后实际结算。请画一个能增分的位置，再查看 A、B、金币和怪物的明细。地图与金币将保留到下一季。",
    hint: "K11 是边缘空格。春季 A+B，夏季 B+C，秋季 C+D，冬季 D+A；A 冬季还会再计分。",
  },
  {
    title: "现在由你决定",
    task: "结业任务：回到春季最后一笔前的地图，不指定坐标。自行选地形与落点，让当前两项委托的合计预计声望增加。只有真正增分才能完成。",
    hint: "先看 A、B 的规则与当前预计分，再比较预览变化。你可以选择新边缘森林，也可以扩展不邻山的最大村落。",
  },
] as const;
export interface LearningState {
  step: number;
  game: MapGame;
  campaign: Board;
  done: boolean;
  error: string;
  feedback: string;
  inspected: boolean;
  practice: { mountain: number; gap: number; monster: number };
}
const coordinate = (i: number) =>
  `${String.fromCharCode(65 + (i % 11))}${Math.floor(i / 11) + 1}`;
/** Fixtures only add to empty cells; accepted earlier decisions remain intact. */
function practiceSites(board: Board) {
  const openWithGap = (i: number) =>
    board.cells[i] === null &&
    neighbors(i).some((n) => board.cells[n] === null);
  const indices = board.cells.map((_, i) => i);
  const mountain = [36, ...indices].find(openWithGap)!;
  const gap =
    neighbors(mountain).includes(mountain + 1) &&
    board.cells[mountain + 1] === null
      ? mountain + 1
      : neighbors(mountain).find((n) => board.cells[n] === null)!;
  const monster = [10, ...indices].find(openWithGap)!;
  return { mountain, gap, monster };
}
export function learningLesson(state: LearningState) {
  const lesson = LESSONS[state.step];
  if (state.step === 3)
    return {
      ...lesson,
      task: `局部练习：${coordinate(state.practice.mountain)} 山峰已围三面。请填 ${coordinate(state.practice.gap)}，围满上下左右，获得 1 金币。金币保留，以后每个季末都加入声望；带金币的形状也会给金币。`,
      hint: `本次缺口是 ${coordinate(state.practice.gap)}。只认上下左右，斜角不算。金币最多 14 枚。`,
    };
  if (state.step === 7) {
    const empty = neighbors(state.practice.monster).filter(
      (i) => state.game.players[0].board.cells[i] === null,
    );
    return {
      ...lesson,
      task: `你的春季地图出现怪物 ${coordinate(state.practice.monster)}。请填它旁边的空格，减少季末扣分。怪物格本身不扣分，周围的空格才扣分。`,
      hint: empty.length
        ? `${empty.map(coordinate).join("、")} 是当前可填的相邻空格；每填一格少扣 1 分。`
        : "怪物周围的缺口已堵住，季末扣款已减少。",
    };
  }
  return lesson;
}
export function lessonGame(
  step: number,
  fallbackStage = false,
  board?: Board,
): MapGame {
  const g = createGame(
    [{ id: "student", name: "新晋制图师" }],
    "purpose-first-spring",
    "solo",
  );
  g.goals = ["sentinel", "greatcity", "canal", "borderlands"];
  g.players[0].board = structuredClone(board || createBoard());
  g.players[0].seasons = [];
  g.players[0].submitted = false;
  g.phase = "placing";
  g.turn = step;
  g.elapsed = step === 8 ? 8 : Math.min(step, 7);
  g.lastEvent = "教学练习 · 与正式存档独立";
  g.ruins = step === 4;
  g.current = {
    id: `learning-${step}`,
    name: LESSONS[step]?.title || "春季探索",
    kind: "explore",
    time: 0,
    terrains: step === 2 || step === 9 ? ["forest", "village"] : ["forest"],
    shapes: [
      {
        cells:
          step === 1
            ? [
                [0, 0],
                [1, 0],
              ]
            : [[0, 0]],
      },
    ],
  };
  if (step === 3) {
    const c = g.players[0].board.cells;
    const { mountain, gap } = practiceSites(g.players[0].board);
    c[mountain] = "mountain";
    for (const i of neighbors(mountain))
      if (i !== gap && c[i] === null) c[i] = "forest";
  }
  if (step === 5 || fallbackStage) {
    g.ruins = true;
    g.players[0].board = createBoard();
    g.players[0].board.cells.fill("forest");
    g.players[0].board.cells[0] = null;
    g.current.shapes = [
      {
        cells: [
          [0, 0],
          [1, 0],
        ],
        coin: true,
      },
    ];
  }
  if (step === 6) {
    g.mode = "multi";
    g.players.push({
      id: "neighbor",
      name: "邻座的制图师",
      board: createBoard(),
      submitted: true,
      seasons: [],
    });
    g.current.kind = "ambush";
    g.current.direction = 1;
    g.current.terrains = ["monster"];
  }
  if (step === 7) {
    const { monster } = practiceSites(g.players[0].board);
    g.players[0].board.cells[monster] = "monster";
  }
  return g;
}
export function createLearningState(step = 0, board?: Board): LearningState {
  const initial = board || createBoard();
  const game = lessonGame(step, false, initial);
  return {
    step,
    game,
    campaign: structuredClone(initial),
    done: false,
    error: "",
    feedback: "",
    inspected: false,
    practice: practiceSites(initial),
  };
}
export function attemptLearningPlacement(
  state: LearningState,
  p: Placement,
): LearningState {
  if (state.done) return state;
  const fail = (error: string) => ({ ...state, error });
  const preview = previewPlacement(state.game, "student", p);
  if (!preview.valid) return fail(preview.error!);
  const [a, b] = preview.goals;
  if (state.step === 0 && a.delta < 1)
    return fail(
      "这格合法，但没有帮助 A。请比较边缘 +1 与内部 +0，再选一个能增分的位置。",
    );
  if (state.step === 1 && ((p.rotation === 0 && !p.mirrored) || a.delta < 2))
    return fail("请调整方向，让两格森林都贴边：A 的预计声望至少 +2。");
  if (state.step === 2 && (!state.inspected || b.delta <= 0))
    return fail("先点击 B 委托了解规则，再用村庄让 B 的预计声望增加。");
  if (
    state.step === 3 &&
    (p.y * 11 + p.x !== state.practice.gap || preview.coinDelta < 1)
  )
    return fail(
      `请填 ${coordinate(state.practice.gap)}，封住山峰最后一面，亲眼看到金币 +1。`,
    );
  if (state.step === 5 && !p.fallback) return fail("请使用单格替代完成补救。");
  if (state.step === 7 && preview.monsterDelta >= 0)
    return fail("请填怪物旁的空格，实际减少季末扣分。");
  if ((state.step === 8 || state.step === 9) && a.delta + b.delta <= 0)
    return fail(
      "这一笔没有增加本季委托合计。请换一个位置或地形，比较 A、B 的预计变化。",
    );
  try {
    // Finish only the report exercise. Other lessons stop without drawing random future cards.
    const controlled = structuredClone(state.game);
    controlled.elapsed = 8;
    const result = reduceGame(controlled, "student", {
      type: "place",
      placement: p,
    });
    if (state.step !== 8) {
      result.phase = "placing";
      result.players.forEach((player) => (player.submitted = false));
      result.players.forEach((player) => (player.seasons = []));
      result.elapsed = state.game.elapsed;
      result.lastEvent = "练习落笔已完成";
    }
    const actual = targetPlayer(result, "student").board;
    let feedback = `本次 A ${a.delta >= 0 ? "+" : ""}${a.delta}，B ${b.delta >= 0 ? "+" : ""}${b.delta}；地图预计声望已更新，尚未到账。`;
    if (state.step === 3)
      feedback = `围山完成：金币 +${preview.coinDelta}，以后每个季末都会计入声望。`;
    if (state.step === 6)
      feedback = `邻座怪物已落下；周围空格造成 ${monsterPenalty(actual)} 分季末扣款。`;
    if (state.step === 7)
      feedback = `怪物相邻空格减少 ${-preview.monsterDelta}，季末少扣 ${-preview.monsterDelta} 分。`;
    if (state.step === 8) {
      const r = result.players[0].seasons[0];
      feedback = `春季到账：A ${r.goals[0]} + B ${r.goals[1]} + 金币 ${r.coins} − 怪物 ${r.monsters} = ${r.total} 声望。夏季改算 B+C，地图与金币保留。`;
    }
    if (state.step === 9)
      feedback = `你自主让本季委托声望增加 ${a.delta + b.delta}！先看目标、比较预览、再确认，这就是每次探索的决策。`;
    return {
      ...state,
      game: result,
      done: true,
      error: "",
      feedback,
      campaign:
        state.step === 5 || state.step === 6 || state.step === 8
          ? state.campaign
          : structuredClone(result.players[0].board),
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "请检查这次落笔。");
  }
}
export function advanceLearning(state: LearningState): LearningState {
  if (!state.done) throw new Error("请先完成当前任务");
  if (state.step >= LESSONS.length - 1) return state;
  return createLearningState(state.step + 1, state.campaign);
}
