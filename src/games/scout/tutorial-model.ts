import { createScout, reduceScout } from "./engine.ts";
import type { ScoutAction, ScoutState } from "./types.ts";
export const lessons = [
  {
    title: "先看懂胜利，再决定方向",
    purpose:
      "压过演出，收旧牌得分；挖角拿新牌拼组合；轮末余牌扣分，累计最高获胜。",
    goal: "试着整手旋转，再确认方向。顺序会倒转，上下数字会交换。",
  },
  {
    title: "连续的牌，才能一起登台",
    purpose: "演出越强，越容易收走场上的旧牌；每张旧牌值 1 分。",
    goal: "选中相邻的 4、5，压过场上的 2、3。不能跳过 8 来选 3、4、5。",
  },
  {
    title: "缺的那一张，就从台上挖",
    purpose:
      "暂时压不过？从场上两端拿一张，放进手牌的任意缝隙。其他牌不能换位。",
    goal: "挖角 4，保持 4 朝上，插入 3 和 5 之间。普通挖角后交给下一位。",
  },
  {
    title: "拿走中间，空隙自然合拢",
    purpose: "不能主动重排手牌，但演出拿走一段后，两边会自然靠拢。",
    goal: "选中中间的 7、7 演出，观察剩下的 2、3、4。",
  },
  {
    title: "让新组合接着演",
    purpose: "刚才的空隙合拢，为下一次登台留下了更长的顺子。",
    goal: "这是你的下个回合：用相邻的 2、3、4 压过两张牌。",
  },
  {
    title: "挖角之后，立即演出",
    purpose:
      "这是 3 人示范：每轮一次「挖角并演出」。先补牌，再立即演出，同一回合完成。",
    goal: "选择挖角并演出，将 4 插入 3 和 5 之间，再演出 3、4、5。",
  },
  {
    title: "最后一手，算清这轮",
    purpose:
      "轮分 = 收牌 + 挖角筹码 − 剩余手牌。无人能压过的领演者免扣余牌；最后留在台上的牌不计收牌分。",
    goal: "演出手里的 7、7，清空手牌。看收据中的各项得分。",
  },
];
export function lessonState(index: number): ScoutState {
  const s = createScout(
    [
      { id: "a", name: "你" },
      { id: "b", name: "阿岚" },
      { id: "c", name: "小满" },
    ],
    `teaching-${index}`,
  );
  const own = [
    [3, 8, 4, 5, 9],
    [3, 8, 4, 5, 9],
    [3, 5, 8],
    [2, 7, 7, 3, 4, 9],
    [2, 3, 4, 9],
    [3, 5, 8],
    [7, 7],
  ][index];
  s.phase = index === 0 ? "orienting" : "playing";
  s.turnId = s.starterId = "a";
  const used = new Set<string>();
  // Allocate high values first so earlier low-value cards do not consume
  // every physical pair containing a later repeated value.
  const active =
    index === 0
      ? null
      : index === 1
        ? [2, 3]
        : index === 2 || index === 5
          ? [4]
          : [6, 6];
  const hands = [own, [2, 6, 8, 9], [2, 6, 8, 9]];
  const allocated = new Map<
    number,
    { id: string; top: number; bottom: number }[]
  >();
  for (const top of [...hands.flat(), ...(active ?? [])].sort(
    (a, b) => b - a,
  )) {
    let found = false;
    for (let bottom = 1; bottom <= 9; bottom++) {
      const id = [top, bottom].sort((a, b) => a - b).join("-");
      if (top !== bottom && !used.has(id)) {
        used.add(id);
        allocated.set(top, [
          ...(allocated.get(top) ?? []),
          { id, top, bottom },
        ]);
        found = true;
        break;
      }
    }
    if (!found) throw Error("教学牌组不足");
  }
  const take = (top: number) => {
    return allocated.get(top)!.shift()!;
  };
  s.players.forEach((p, i) => {
    p.hand = (i === 0 ? own : [2, 6, 8, 9]).map(take);
    p.handCount = p.hand.length;
    p.orientationConfirmed = index !== 0 || i !== 0;
  });
  s.active = active ? { ownerId: "c", cards: active.map(take) } : null;
  s.latestShowerId = active ? "c" : null;
  if (index === 6) {
    s.players[0].captured = 3;
    s.players[0].scoutChips = 2;
  }
  return s;
}
export function teachingStep(
  index: number,
  state: ScoutState,
  action: ScoutAction,
): { state: ScoutState; complete: boolean; message: string } {
  const wrong = (message: string) => ({ state, complete: false, message });
  if (index === 0 && (action.type !== "orient" || !action.flip))
    return wrong("这次先试试「整手旋转」，再确认；整手一起翻面。");
  const expected: Record<number, [number, number]> = {
    1: [2, 2],
    3: [1, 2],
    4: [0, 3],
    6: [0, 2],
  };
  if (
    expected[index] &&
    (action.type !== "show" ||
      action.start !== expected[index][0] ||
      action.count !== expected[index][1])
  )
    return wrong(lessons[index].goal);
  if (index === 2 || index === 5) {
    if (
      !state.comboActorId &&
      (action.type !== "scout" ||
        action.flip ||
        action.insertIndex !== 1 ||
        action.combo !== (index === 5))
    )
      return wrong(lessons[index].goal);
    if (
      state.comboActorId &&
      (action.type !== "show" || action.start !== 0 || action.count !== 3)
    )
      return wrong("现在选择相邻的 3、4、5，完成这次演出。");
  }
  try {
    const next = reduceScout(state, "a", action);
    const complete = index !== 5 || action.type === "show";
    return {
      state: next,
      complete,
      message: complete
        ? "做到了。这个决定已经由真实规则验证。"
        : "挖角成功！回合仍然属于你，现在演出 3、4、5。",
    };
  } catch (error) {
    return wrong(error instanceof Error ? error.message : "请再试一次");
  }
}
