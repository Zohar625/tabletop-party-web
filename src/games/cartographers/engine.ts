import type {
  Board,
  MapGame,
  MapView,
  MapPlayer,
  MapAction,
  Placement,
  Point,
  Terrain,
} from "./types.ts";
import { CARDS, GOALS, RUINS, SEASONS, createBoard } from "./data.ts";
import { neighbors, monsterPenalty, scoreBoard } from "./scoring.ts";
type State = MapGame | MapView;
const DRAWABLE: Terrain[] = ["forest", "village", "farm", "water", "monster"];
function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const j = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function transformedShape(
  cells: Point[],
  rotation: number,
  mirrored: boolean,
): Point[] {
  if (!Number.isInteger(rotation) || rotation < 0 || rotation > 3)
    throw new Error("旋转须为0至3");
  const points = cells.map(([x, y]): Point => {
    let a = mirrored ? -x : x,
      b = y;
    for (let r = 0; r < rotation; r++) [a, b] = [-b, a];
    return [a, b];
  });
  const minX = Math.min(...points.map((p) => p[0])),
    minY = Math.min(...points.map((p) => p[1]));
  return points.map(([x, y]) => [x - minX, y - minY]);
}
export function targetPlayer(state: State, actor: string): MapPlayer {
  const i = state.players.findIndex((p) => p.id === actor);
  if (i < 0) throw new Error("玩家不在本局中");
  // Maps pass in the arrow direction; each actor receives the opposite neighbor's map.
  const offset =
    state.mode === "multi" && state.current.kind === "ambush"
      ? -(state.current.direction ?? 1)
      : 0;
  return state.players[
    (i + offset + state.players.length) % state.players.length
  ];
}
function fits(
  board: Board,
  cells: Point[],
  x: number,
  y: number,
  ruins: boolean,
): boolean {
  return (
    cells.every(
      ([dx, dy]) =>
        x + dx >= 0 &&
        x + dx < 11 &&
        y + dy >= 0 &&
        y + dy < 11 &&
        board.cells[(y + dy) * 11 + x + dx] === null,
    ) &&
    (!ruins ||
      cells.some(([dx, dy]) =>
        RUINS.some(([rx, ry]) => rx === x + dx && ry === y + dy),
      ))
  );
}
export function hasNormalPlacement(state: State, actor: string): boolean {
  const b = targetPlayer(state, actor).board;
  const ruins = state.ruins && state.current.kind !== "ambush";
  for (const shape of state.current.shapes)
    for (let r = 0; r < 4; r++)
      for (const m of [false, true]) {
        const cells = transformedShape(shape.cells, r, m);
        for (let y = 0; y < 11; y++)
          for (let x = 0; x < 11; x++)
            if (fits(b, cells, x, y, ruins)) return true;
      }
  return false;
}
export function placementError(
  state: State,
  actor: string,
  p: Placement,
): string | null {
  if (state.phase !== "placing") return "当前不是绘图阶段";
  const player = state.players.find((v) => v.id === actor);
  if (!player) return "玩家不在本局中";
  if (player.submitted) return "本回合已经确认，请等待其他玩家";
  if (
    !p ||
    ![p.x, p.y, p.shape, p.rotation].every(Number.isInteger) ||
    p.rotation < 0 ||
    p.rotation > 3 ||
    typeof p.mirrored !== "boolean" ||
    (p.fallback !== undefined && typeof p.fallback !== "boolean")
  )
    return "位置或旋转参数无效";
  if (p.shape < 0 || p.shape >= state.current.shapes.length)
    return "请选择牌面提供的形状";
  const board = targetPlayer(state, actor).board;
  if (p.fallback) {
    if (hasNormalPlacement(state, actor))
      return "仍有形状可合法放置，不能使用替代格";
    if (
      !DRAWABLE.includes(p.terrain) ||
      (state.current.kind === "ambush" && p.terrain !== "monster")
    )
      return "替代格地形无效";
    if (!board.cells.includes(null))
      return p.x === -1 && p.y === -1 ? null : "地图已满，请跳过本回合";
    return fits(board, [[0, 0]], p.x, p.y, false)
      ? null
      : "替代格必须放在地图内的空格";
  }
  if (!state.current.terrains.includes(p.terrain))
    return "请选择牌面提供的地形";
  const cells = transformedShape(
    state.current.shapes[p.shape].cells,
    p.rotation,
    p.mirrored,
  );
  if (!fits(board, cells, p.x, p.y, false))
    return "形状越过地图边缘，或与已填格及山峰重叠";
  if (
    state.ruins &&
    state.current.kind !== "ambush" &&
    !fits(board, cells, p.x, p.y, true)
  )
    return "遗迹回合必须覆盖至少一处空遗迹";
  return null;
}
function ink(
  board: Board,
  cells: Point[],
  x: number,
  y: number,
  terrain: Terrain,
  coin: boolean,
) {
  for (const [dx, dy] of cells) board.cells[(y + dy) * 11 + x + dx] = terrain;
  if (coin) board.coins = Math.min(14, board.coins + 1);
  board.cells.forEach((t, i) => {
    if (
      t === "mountain" &&
      !board.earnedMountains.includes(i) &&
      neighbors(i).every((n) => board.cells[n] !== null)
    ) {
      board.earnedMountains.push(i);
      board.coins = Math.min(14, board.coins + 1);
    }
  });
}
function endTurn(state: MapGame): MapGame {
  if (state.current.kind !== "ambush") state.ruins = false;
  if (state.elapsed >= SEASONS[state.season].threshold) {
    const [a, b] = SEASONS[state.season].goals;
    for (const p of state.players) {
      const goals: [number, number] = [
        scoreBoard(p.board, state.goals[a]),
        scoreBoard(p.board, state.goals[b]),
      ];
      const monsters = monsterPenalty(p.board);
      p.seasons.push({
        season: state.season,
        goals,
        coins: p.board.coins,
        monsters,
        total: goals[0] + goals[1] + p.board.coins - monsters,
      });
    }
    state.phase = "seasonEnd";
    state.lastEvent = SEASONS[state.season].name + "季结算";
    return state;
  }
  return reveal(state);
}
// Enumerate anchor positions by concentric clockwise/counterclockwise rings.
// The rectangle contains legal top-left anchors for the fixed printed shape.
function soloAmbush(state: MapGame) {
  const card = state.current,
    board = state.players[0].board,
    cells = card.shapes[0].cells;
  const seen = new Set<string>();
  const maxX = 10 - Math.max(...cells.map(([x]) => x)),
    maxY = 10 - Math.max(...cells.map(([, y]) => y));
  for (let inset = 0; inset * 2 <= Math.min(maxX, maxY); inset++) {
    const lo = inset,
      right = maxX - inset,
      bottom = maxY - inset;
    const corners: Point[] = [
      [lo, lo],
      [right, lo],
      [right, bottom],
      [lo, bottom],
    ];
    const start = card.corner ?? 0;
    for (let side = 0; side < 4; side++) {
      const from = (start + (card.direction ?? 1) * side + 8) % 4,
        to = (from + (card.direction ?? 1) + 4) % 4;
      const [sx, sy] = corners[from],
        [ex, ey] = corners[to];
      const steps = Math.max(Math.abs(ex - sx), Math.abs(ey - sy));
      for (let j = 0; j <= steps; j++) {
        const x = sx + Math.sign(ex - sx) * j,
          y = sy + Math.sign(ey - sy) * j;
        const key = x + "," + y;
        if (seen.has(key)) continue;
        seen.add(key);
        if (fits(board, cells, x, y, false)) {
          ink(board, cells, x, y, "monster", false);
          state.lastEvent = "伏击：怪物已经按牌面方向进入地图";
          return;
        }
      }
    }
  }
  state.lastEvent = "伏击：没有空间容纳怪物，本次忽略";
}
function reveal(state: MapGame): MapGame {
  const automaticEvents: string[] = [];
  for (const p of state.players) p.submitted = false;
  while (state.deck.length) {
    const id = state.deck.shift()!;
    const card = CARDS.find((c) => c.id === id);
    if (!card) throw new Error("牌堆包含未知卡牌");
    state.current = structuredClone(card);
    state.elapsed += card.time;
    if (card.kind === "ruins") {
      state.ruins = true;
      continue;
    }
    state.turn++;
    if (card.kind === "ambush" && state.mode === "solo") {
      soloAmbush(state);
      automaticEvents.push(state.lastEvent);
      continue;
    }
    const exploreEvent =
      card.kind === "ambush"
        ? "伏击：为邻座绘制怪物"
        : state.ruins
          ? "探索遗迹：覆盖一处遗迹"
          : card.name;
    state.lastEvent = [...automaticEvents, exploreEvent].join("；");
    return state;
  }
  throw new Error("探索牌堆意外耗尽");
}
export function createGame(
  players: { id: string; name: string }[],
  seed: string,
  mode: "solo" | "multi",
): MapGame {
  if (
    !Array.isArray(players) ||
    players.length < (mode === "solo" ? 1 : 2) ||
    players.length > (mode === "solo" ? 1 : 6) ||
    new Set(players.map((p) => p.id)).size !== players.length ||
    players.some(
      (p) => typeof p.id !== "string" || !p.id || typeof p.name !== "string",
    ) ||
    typeof seed !== "string" ||
    !["solo", "multi"].includes(mode)
  )
    throw new Error("玩家或游戏设置无效");
  const goals = shuffle(
    ["forest", "village", "farmwater", "pattern"].map(
      (category) =>
        shuffle(
          GOALS.filter((g) => g.category === category),
          seed + category,
        )[0].id,
    ),
    seed + "goals",
  );
  const ambushDeck = shuffle(
    CARDS.filter((c) => c.kind === "ambush").map((c) => c.id),
    seed + "ambush",
  );
  const deck = shuffle(
    [
      ...CARDS.filter((c) => c.kind !== "ambush").map((c) => c.id),
      ambushDeck.shift()!,
    ],
    seed + "season0",
  );
  return reveal({
    version: 1,
    seed,
    mode,
    players: players.map((p) => ({
      ...p,
      board: createBoard(),
      submitted: false,
      seasons: [],
    })),
    season: 0,
    turn: 0,
    phase: "placing",
    current: CARDS.find((c) => c.kind === "explore")!,
    ruins: false,
    elapsed: 0,
    deck,
    ambushDeck,
    goals,
    lastEvent: "",
  });
}
export function reduceGame(
  state: MapGame,
  actor: string,
  action: MapAction,
): MapGame {
  if (!state.players.some((p) => p.id === actor))
    throw new Error("玩家不在本局中");
  if (!action || !["next", "place"].includes(action.type))
    throw new Error("未知操作");
  if (action.type === "next") {
    if (state.phase !== "seasonEnd") throw new Error("请先完成本季探索");
    const next = structuredClone(state);
    if (next.season === 3) {
      next.phase = "finished";
      next.lastEvent = "四季绘图完成";
      next.turn++;
      return next;
    }
    next.season++;
    next.elapsed = 0;
    next.ruins = false;
    next.phase = "placing";
    const carried = next.deck.filter(
      (id) => CARDS.find((c) => c.id === id)?.kind === "ambush",
    );
    const ambush = next.ambushDeck.shift();
    next.deck = shuffle(
      [
        ...CARDS.filter((c) => c.kind !== "ambush").map((c) => c.id),
        ...carried,
        ...(ambush ? [ambush] : []),
      ],
      next.seed + "season" + next.season,
    );
    return reveal(next);
  }
  const error = placementError(state, actor, action.placement);
  if (error) throw new Error(error);
  const next = structuredClone(state),
    p = action.placement,
    board = targetPlayer(next, actor).board;
  if (!(p.fallback && p.x === -1 && p.y === -1))
    ink(
      board,
      p.fallback
        ? [[0, 0]]
        : transformedShape(
            next.current.shapes[p.shape].cells,
            p.rotation,
            p.mirrored,
          ),
      p.x,
      p.y,
      p.terrain,
      !p.fallback && !!next.current.shapes[p.shape].coin,
    );
  next.players.find((v) => v.id === actor)!.submitted = true;
  return next.players.every((v) => v.submitted) ? endTurn(next) : next;
}
export function gameView(state: MapGame): MapView {
  const { seed: _seed, deck: _deck, ambushDeck: _ambushDeck, ...view } = state;
  return structuredClone(view);
}
