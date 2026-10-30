import { games } from "../games/registry.ts";
const details = {
  bluff: {
    headline: ["一本正经地，", "胡说八道。"],
    description:
      "每人一个离谱冷知识，听故事、找瞎掰人。单手机传一圈，好戏就开场。",
    players: "3–9 人 · 单手机",
    duration: "约 15–30 分钟",
  },
  "super-tic-tac-toe": {
    headline: ["一子落下，", "九盘联动。"],
    description:
      "你的落点，决定对手下一步去哪。把熟悉的井字棋，玩出多一层的心思。",
    players: "2 人 · 同屏对弈",
    duration: "随时来一盘",
  },
  dinner: {
    headline: ["放心吃，", "真的没问题？"],
    description:
      "好菜还是黑暗料理？盖住你的底牌，用胆量和演技，邀请朋友揭开这一桌。",
    players: "3–6 人 · 在线入桌",
    duration: "诈唬 · 叫价 · 揭盖",
  },
  cartographers: {
    headline: ["一格一格，", "画成四季山河。"],
    description:
      "把森林、村庄与河流收进小小地图。一人慢慢画，也能邀朋友共赴四季。",
    players: "1–6 人 · 单人 / 联机",
    duration: "探索 · 拼图 · 绘图",
  },
  scout: {
    headline: ["这手牌，", "也能演出好戏。"],
    description:
      "手牌不能重排？挖角一张，换个方向，让下一场演出成为全桌的焦点。",
    players: "2–5 人 · 在线入桌",
    duration: "顺子 · 挖角 · 演出",
  },
  "bluff-classic": {
    headline: ["听起来很假，", "偏偏是真的。"],
    description:
      "同一个词，一桌不同的解释。只有一位老实人看过答案，你会相信谁？",
    players: "3–9 人 · 在线入桌",
    duration: "原版玩法 · 找老实人",
  },
} satisfies Record<
  string,
  { headline: string[]; description: string; players: string; duration: string }
>;
export const featuredGames = games.map((game) => ({
  ...game,
  ...details[game.id as keyof typeof details],
}));
export const ROTATE_MS = 6000;
export function nextFeatured(index: number, step: number) {
  return (index + step + featuredGames.length) % featuredGames.length;
}
