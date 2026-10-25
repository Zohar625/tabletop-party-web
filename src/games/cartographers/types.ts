export type Terrain =
  | "forest"
  | "village"
  | "farm"
  | "water"
  | "monster"
  | "mountain"
  | "wasteland";
export type Point = [number, number];
export interface Board {
  cells: (Terrain | null)[];
  coins: number;
  earnedMountains: number[];
}
export interface Shape {
  cells: Point[];
  coin?: boolean;
}
export interface ExploreCard {
  id: string;
  name: string;
  kind: "explore" | "ruins" | "ambush";
  time: number;
  terrains: Terrain[];
  shapes: Shape[];
  corner?: number;
  direction?: 1 | -1;
}
export interface Goal {
  id: string;
  title: string;
  description: string;
  base: number;
  category: "forest" | "village" | "farmwater" | "pattern";
}
export interface Placement {
  shape: number;
  terrain: Terrain;
  x: number;
  y: number;
  rotation: number;
  mirrored: boolean;
  fallback?: boolean;
}
export interface SeasonScore {
  season: number;
  goals: [number, number];
  coins: number;
  monsters: number;
  total: number;
}
export interface MapPlayer {
  id: string;
  name: string;
  board: Board;
  submitted: boolean;
  seasons: SeasonScore[];
}
export interface MapGame {
  version: 1;
  seed: string;
  mode: "solo" | "multi";
  players: MapPlayer[];
  season: number;
  turn: number;
  phase: "placing" | "seasonEnd" | "finished";
  current: ExploreCard;
  ruins: boolean;
  elapsed: number;
  deck: string[];
  ambushDeck: string[];
  goals: string[];
  lastEvent: string;
}
export type MapView = Omit<MapGame, "deck" | "ambushDeck" | "seed">;
export type MapAction =
  | { type: "place"; placement: Placement }
  | { type: "next" };
