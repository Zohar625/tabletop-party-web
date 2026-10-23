import type { ThemeConfig } from "../state/types.ts";
export const classicTheme: ThemeConfig = {
  boardSkin: "classic",
  pieceSet: "X-O",
  motion: true,
};
export const grassTheme: ThemeConfig = {
  boardSkin: "grass",
  pieceSet: "X-O",
  motion: true,
};
export const riceTheme: ThemeConfig = {
  boardSkin: "rice",
  pieceSet: "X-O",
  motion: true,
};
export const skins = [
  { id: "grass", name: "风吹草地", caption: "翻土与新芽", number: "01" },
  { id: "rice", name: "水光稻田", caption: "涟漪与稻苗", number: "02" },
  { id: "classic", name: "经典棋盘", caption: "专注每一步", number: "03" },
] as const;
export function getPieceSymbol(_pieceSet: string, player: string): string {
  return player;
}
