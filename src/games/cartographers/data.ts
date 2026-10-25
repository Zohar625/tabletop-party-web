import type { Board, ExploreCard, Goal, Point } from "./types.ts";
// Rule text and A-side coordinates: publisher's CART-Rulebook-Web.pdf and
// CART-SheetsAB-Web.pdf, linked at https://thunderworksgames.com/products/cartographers-board-game.
export const SIZE = 11;
export const MOUNTAINS: Point[] = [
  [3, 1],
  [8, 2],
  [5, 5],
  [2, 8],
  [7, 9],
];
export const RUINS: Point[] = [
  [5, 1],
  [1, 2],
  [9, 2],
  [1, 8],
  [9, 8],
  [5, 9],
];
export const SEASONS = [
  { name: "春", threshold: 8, goals: [0, 1] },
  { name: "夏", threshold: 8, goals: [1, 2] },
  { name: "秋", threshold: 7, goals: [2, 3] },
  { name: "冬", threshold: 6, goals: [3, 0] },
] as const;
export function createBoard(): Board {
  const cells: Board["cells"] = Array(121).fill(null);
  for (const [x, y] of MOUNTAINS) cells[y * 11 + x] = "mountain";
  return { cells, coins: 0, earnedMountains: [] };
}
export const GOALS: Goal[] = [
  {
    id: "sentinel",
    title: "哨兵林",
    category: "forest",
    base: 25,
    description: "每个贴地图边缘的森林格得1分，角落不重复计分。",
  },
  {
    id: "treetower",
    title: "林中高塔",
    category: "forest",
    base: 17,
    description: "每个四面被已填格或地图边缘围住的森林格得1分。",
  },
  {
    id: "greenbough",
    title: "绿枝",
    category: "forest",
    base: 22,
    description: "每个至少含一格森林的行、列各得1分。",
  },
  {
    id: "stoneside",
    title: "山间森林",
    category: "forest",
    base: 18,
    description: "通过同一片相连森林连接到另一座山的山峰，每座得3分。",
  },
  {
    id: "wildholds",
    title: "荒野聚落",
    category: "village",
    base: 16,
    description: "每片至少6格的村落得8分。",
  },
  {
    id: "greengold",
    title: "绿金平原",
    category: "village",
    base: 21,
    description: "每片邻接至少3种其他地形的村落得3分。",
  },
  {
    id: "greatcity",
    title: "大都会",
    category: "village",
    base: 16,
    description: "不邻接山峰的最大一片村落，每格得1分。",
  },
  {
    id: "shieldgate",
    title: "盾门",
    category: "village",
    base: 20,
    description: "第二大的村落每格得2分；最大并列时取其中一片。",
  },
  {
    id: "canal",
    title: "运河湖",
    category: "farmwater",
    base: 24,
    description: "邻接农田的水域格、邻接水域的农田格，每格得1分。",
  },
  {
    id: "granary",
    title: "黄金粮仓",
    category: "farmwater",
    base: 20,
    description: "邻接遗迹的水域格各得1分；画在遗迹上的农田格各得3分。",
  },
  {
    id: "mages",
    title: "法师山谷",
    category: "farmwater",
    base: 22,
    description: "邻接山峰的水域格各得2分、农田格各得1分。",
  },
  {
    id: "shoreside",
    title: "远岸",
    category: "farmwater",
    base: 27,
    description:
      "不邻接水域和地图边缘的农田片得3分；不邻接农田和边缘的水域片得3分。",
  },
  {
    id: "borderlands",
    title: "边疆",
    category: "pattern",
    base: 24,
    description: "每条填满的行、列各得6分。",
  },
  {
    id: "brokenroad",
    title: "断路",
    category: "pattern",
    base: 24,
    description: "每条连接地图左边与下边、且填满的斜线得3分。",
  },
  {
    id: "barony",
    title: "失落领地",
    category: "pattern",
    base: 24,
    description: "最大已填实心正方形的边长乘3。",
  },
  {
    id: "cauldrons",
    title: "地穴",
    category: "pattern",
    base: 20,
    description: "每个四面被已填格或地图边缘围住的空格得1分。",
  },
];
// Exact shapes, solo corners and baselines transcribed from licensed Yucata images:
// https://www.yucata.de/game-plugins/cartographers/1.2.14/images/cards/en/
// explore/1.png through 17.png; scoring/26.png through 41.png.
// Coordinates preserve the printed orientation (required for solo ambushes).
export const CARDS: ExploreCard[] = [
  {
    id: "goblin",
    name: "哥布林突袭",
    kind: "ambush",
    time: 0,
    terrains: ["monster"],
    shapes: [
      {
        cells: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    ],
    corner: 2,
    direction: -1,
  },
  {
    id: "bugbear",
    name: "熊地精进攻",
    kind: "ambush",
    time: 0,
    terrains: ["monster"],
    shapes: [
      {
        cells: [
          [0, 0],
          [2, 0],
          [0, 1],
          [2, 1],
        ],
      },
    ],
    corner: 1,
    direction: 1,
  },
  {
    id: "kobold",
    name: "狗头人猛攻",
    kind: "ambush",
    time: 0,
    terrains: ["monster"],
    shapes: [
      {
        cells: [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 2],
        ],
      },
    ],
    corner: 3,
    direction: 1,
  },
  {
    id: "gnoll",
    name: "豺狼人袭击",
    kind: "ambush",
    time: 0,
    terrains: ["monster"],
    shapes: [
      {
        cells: [
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 2],
          [1, 2],
        ],
      },
    ],
    corner: 0,
    direction: -1,
  },
  {
    id: "temple",
    name: "神庙遗迹",
    kind: "ruins",
    time: 0,
    terrains: [],
    shapes: [],
  },
  {
    id: "outpost",
    name: "哨站遗迹",
    kind: "ruins",
    time: 0,
    terrains: [],
    shapes: [],
  },
  {
    id: "river",
    name: "大河",
    kind: "explore",
    time: 1,
    terrains: ["water"],
    shapes: [
      {
        cells: [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
        coin: true,
      },
      {
        cells: [
          [2, 0],
          [1, 1],
          [2, 1],
          [0, 2],
          [1, 2],
        ],
      },
    ],
  },
  {
    id: "farmland",
    name: "农田",
    kind: "explore",
    time: 1,
    terrains: ["farm"],
    shapes: [
      {
        cells: [
          [0, 0],
          [0, 1],
        ],
        coin: true,
      },
      {
        cells: [
          [1, 0],
          [0, 1],
          [1, 1],
          [2, 1],
          [1, 2],
        ],
      },
    ],
  },
  {
    id: "hamlet",
    name: "村庄",
    kind: "explore",
    time: 1,
    terrains: ["village"],
    shapes: [
      {
        cells: [
          [0, 0],
          [0, 1],
          [1, 1],
        ],
        coin: true,
      },
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [0, 1],
          [1, 1],
        ],
      },
    ],
  },
  {
    id: "forest",
    name: "遗忘森林",
    kind: "explore",
    time: 1,
    terrains: ["forest"],
    shapes: [
      {
        cells: [
          [0, 0],
          [1, 1],
        ],
        coin: true,
      },
      {
        cells: [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 2],
        ],
      },
    ],
  },
  {
    id: "hinterland",
    name: "腹地溪流",
    kind: "explore",
    time: 2,
    terrains: ["farm", "water"],
    shapes: [
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [0, 1],
          [0, 2],
        ],
      },
    ],
  },
  {
    id: "homestead",
    name: "农庄",
    kind: "explore",
    time: 2,
    terrains: ["village", "farm"],
    shapes: [
      {
        cells: [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 2],
        ],
      },
    ],
  },
  {
    id: "orchard",
    name: "果园",
    kind: "explore",
    time: 2,
    terrains: ["forest", "farm"],
    shapes: [
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [2, 1],
        ],
      },
    ],
  },
  {
    id: "treetop",
    name: "树顶村落",
    kind: "explore",
    time: 2,
    terrains: ["forest", "village"],
    shapes: [
      {
        cells: [
          [2, 0],
          [3, 0],
          [0, 1],
          [1, 1],
          [2, 1],
        ],
      },
    ],
  },
  {
    id: "marshlands",
    name: "沼泽",
    kind: "explore",
    time: 2,
    terrains: ["forest", "water"],
    shapes: [
      {
        cells: [
          [0, 0],
          [0, 1],
          [1, 1],
          [2, 1],
          [0, 2],
        ],
      },
    ],
  },
  {
    id: "fishing",
    name: "渔村",
    kind: "explore",
    time: 2,
    terrains: ["village", "water"],
    shapes: [
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
        ],
      },
    ],
  },
  {
    id: "rift",
    name: "裂隙之地",
    kind: "explore",
    time: 0,
    terrains: ["forest", "village", "farm", "water", "monster"],
    shapes: [{ cells: [[0, 0]] }],
  },
];
