/** Exact menu-to-art mapping: names never select pictures by substring or random seed. */
export type DishShape =
  | "chunks"
  | "fish"
  | "salmon"
  | "shrimp"
  | "wings"
  | "cutlet"
  | "eggplant"
  | "tofu"
  | "eggs"
  | "broccoli"
  | "greens"
  | "shreds"
  | "noodles"
  | "rice"
  | "curry"
  | "soup"
  | "porridge"
  | "dumplings"
  | "buns"
  | "lotus"
  | "sweetPotato"
  | "cake"
  | "cookies"
  | "iceCream"
  | "marshmallows"
  | "tart"
  | "shake";
export type Ingredient =
  | "pork"
  | "chicken"
  | "peanut"
  | "chili"
  | "scallion"
  | "ginger"
  | "sesame"
  | "tomato"
  | "egg"
  | "peas"
  | "carrot"
  | "shrimp"
  | "mushroom"
  | "beef"
  | "corn"
  | "ribs"
  | "winterMelon"
  | "meatball"
  | "seaweed"
  | "lotus"
  | "osmanthus"
  | "syrup"
  | "lemon"
  | "pineapple"
  | "cheese"
  | "mustard"
  | "toothpaste"
  | "bitterMelon"
  | "durian"
  | "salt"
  | "chocolate"
  | "vinegar"
  | "garlic"
  | "strawberry"
  | "stinkyTofu"
  | "darkSauce";
export type DishVisual = {
  shape: DishShape;
  color: string;
  ingredients: readonly Ingredient[];
};
export const DISH_VISUALS = {
  红烧肉: {
    shape: "chunks",
    color: "#a34629",
    ingredients: ["pork", "scallion"],
  },
  清蒸鲈鱼: {
    shape: "fish",
    color: "#d6ded1",
    ingredients: ["ginger", "scallion"],
  },
  宫保鸡丁: {
    shape: "chunks",
    color: "#c97937",
    ingredients: ["chicken", "peanut", "chili", "scallion"],
  },
  鱼香茄子: {
    shape: "eggplant",
    color: "#754879",
    ingredients: ["chili", "scallion"],
  },
  糖醋里脊: {
    shape: "chunks",
    color: "#df6036",
    ingredients: ["pork", "sesame"],
  },
  麻婆豆腐: {
    shape: "tofu",
    color: "#fff0cf",
    ingredients: ["chili", "darkSauce", "scallion"],
  },
  番茄炒蛋: { shape: "eggs", color: "#f2c64e", ingredients: ["egg", "tomato"] },
  蒜蓉西兰花: { shape: "broccoli", color: "#3e8949", ingredients: ["garlic"] },
  水煮牛肉: {
    shape: "soup",
    color: "#b84628",
    ingredients: ["beef", "chili", "scallion"],
  },
  葱油拌面: {
    shape: "noodles",
    color: "#d7a44f",
    ingredients: ["scallion", "sesame"],
  },
  蛋炒饭: { shape: "rice", color: "#f2d389", ingredients: ["egg", "scallion"] },
  扬州炒饭: {
    shape: "rice",
    color: "#f0d995",
    ingredients: ["shrimp", "peas", "carrot", "egg"],
  },
  鲜虾蒸饺: { shape: "dumplings", color: "#fff3dc", ingredients: ["shrimp"] },
  小笼汤包: { shape: "buns", color: "#fff0d6", ingredients: ["pork"] },
  香菇青菜: { shape: "greens", color: "#3b8549", ingredients: ["mushroom"] },
  酸辣土豆丝: {
    shape: "shreds",
    color: "#f1d88a",
    ingredients: ["chili", "scallion"],
  },
  可乐鸡翅: { shape: "wings", color: "#9b4b28", ingredients: ["sesame"] },
  咖喱鸡饭: {
    shape: "curry",
    color: "#c8942d",
    ingredients: ["chicken", "carrot", "peas"],
  },
  玉米排骨汤: {
    shape: "soup",
    color: "#e8ce8b",
    ingredients: ["corn", "ribs"],
  },
  冬瓜丸子汤: {
    shape: "soup",
    color: "#e6dfbb",
    ingredients: ["winterMelon", "meatball", "scallion"],
  },
  紫菜蛋花汤: {
    shape: "soup",
    color: "#e0cc98",
    ingredients: ["seaweed", "egg"],
  },
  南瓜粥: { shape: "porridge", color: "#e6a73f", ingredients: ["sesame"] },
  桂花糯米藕: {
    shape: "lotus",
    color: "#c88369",
    ingredients: ["osmanthus", "syrup"],
  },
  拔丝地瓜: {
    shape: "sweetPotato",
    color: "#e3a234",
    ingredients: ["syrup", "sesame"],
  },
  香煎三文鱼: { shape: "salmon", color: "#ef986b", ingredients: ["lemon"] },
  菠萝咕咾肉: {
    shape: "chunks",
    color: "#cc5730",
    ingredients: ["pork", "pineapple"],
  },
  蚝油生菜: {
    shape: "greens",
    color: "#78a951",
    ingredients: ["darkSauce", "garlic"],
  },
  白灼虾: { shape: "shrimp", color: "#ef9572", ingredients: ["ginger"] },
  香酥鸡排: {
    shape: "cutlet",
    color: "#d69834",
    ingredients: ["chicken", "lemon"],
  },
  芝士焗饭: {
    shape: "rice",
    color: "#edcf83",
    ingredients: ["cheese", "peas"],
  },
  葱烧豆腐: {
    shape: "tofu",
    color: "#d89750",
    ingredients: ["scallion", "darkSauce"],
  },
  莲藕排骨汤: {
    shape: "soup",
    color: "#d9c7a5",
    ingredients: ["lotus", "ribs"],
  },
  芥末奶油蛋糕: { shape: "cake", color: "#f2deb6", ingredients: ["mustard"] },
  牙膏夹心饼干: {
    shape: "cookies",
    color: "#b9844e",
    ingredients: ["toothpaste"],
  },
  苦瓜榴莲浓汤: {
    shape: "soup",
    color: "#c8bd65",
    ingredients: ["bitterMelon", "durian"],
  },
  盐焗冰淇淋: { shape: "iceCream", color: "#f4e6cb", ingredients: ["salt"] },
  辣椒巧克力面: {
    shape: "noodles",
    color: "#68402f",
    ingredients: ["chili", "chocolate"],
  },
  醋泡棉花糖: {
    shape: "marshmallows",
    color: "#f6dbdf",
    ingredients: ["vinegar"],
  },
  蒜泥草莓塔: {
    shape: "tart",
    color: "#d99d5d",
    ingredients: ["strawberry", "garlic"],
  },
  臭豆腐奶昔: {
    shape: "shake",
    color: "#d2bdb0",
    ingredients: ["stinkyTofu", "darkSauce"],
  },
} as const satisfies Record<string, DishVisual>;

export function getDishVisual(name?: string): DishVisual | undefined {
  return name && Object.hasOwn(DISH_VISUALS, name)
    ? DISH_VISUALS[name as keyof typeof DISH_VISUALS]
    : undefined;
}
