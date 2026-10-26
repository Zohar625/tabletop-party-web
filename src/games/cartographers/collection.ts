import type { Board } from "./types.ts";
export interface AlbumStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface SeasonSnapshot {
  season: number;
  board: Board;
}
export interface MapArchive {
  id: string;
  title: string;
  createdAt: string;
  mode: "solo" | "multi";
  score: number;
  rating?: { score: number; title: string };
  snapshots: SeasonSnapshot[];
}
export interface ArchiveInput {
  id: string;
  title?: string;
  createdAt?: string;
  mode: "solo" | "multi";
  score: number;
  rating?: { score: number; title: string };
  season: number;
  board: Board;
}
export const ALBUM_KEY = "tabletop.cartographers.album.v1";
const DRAFT_KEY = "tabletop.cartographers.album-drafts.v1";
const terrains = [
  null,
  "forest",
  "village",
  "farm",
  "water",
  "monster",
  "mountain",
  "wasteland",
];
function validBoard(b: unknown): b is Board {
  const v = b as Board;
  return (
    !!v &&
    Array.isArray(v.cells) &&
    v.cells.length === 121 &&
    v.cells.every((t) => terrains.includes(t)) &&
    Number.isInteger(v.coins) &&
    v.coins >= 0 &&
    v.coins <= 14 &&
    Array.isArray(v.earnedMountains) &&
    v.earnedMountains.every((i) => Number.isInteger(i) && i >= 0 && i < 121)
  );
}
function validSnapshot(s: unknown): s is SeasonSnapshot {
  const v = s as SeasonSnapshot;
  return (
    !!v &&
    Number.isInteger(v.season) &&
    v.season >= 0 &&
    v.season < 4 &&
    validBoard(v.board)
  );
}
function parse(store: AlbumStore, key: string): unknown[] {
  try {
    const v = JSON.parse(store.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function validArchive(a: unknown): a is MapArchive {
  const v = a as MapArchive;
  return (
    !!v &&
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.title === "string" &&
    typeof v.createdAt === "string" &&
    Number.isFinite(Date.parse(v.createdAt)) &&
    ["solo", "multi"].includes(v.mode) &&
    Number.isFinite(v.score) &&
    Array.isArray(v.snapshots) &&
    v.snapshots.length > 0 &&
    v.snapshots.length <= 4 &&
    v.snapshots.every(validSnapshot) &&
    new Set(v.snapshots.map((s) => s.season)).size === v.snapshots.length &&
    (v.rating === undefined ||
      (!!v.rating &&
        Number.isFinite(v.rating.score) &&
        typeof v.rating.title === "string"))
  );
}
const copy = <T>(value: T): T => structuredClone(value);
const titleOf = (s: string | undefined) =>
  s
    ?.replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 40) || "未命名的王国";
export function loadAlbum(store: AlbumStore): MapArchive[] {
  return copy(parse(store, ALBUM_KEY).filter(validArchive).slice(0, 24));
}
type Draft = { id: string; snapshots: SeasonSnapshot[] };
function drafts(store: AlbumStore): Draft[] {
  return parse(store, DRAFT_KEY).filter(
    (v): v is Draft =>
      !!v &&
      typeof (v as Draft).id === "string" &&
      Array.isArray((v as Draft).snapshots) &&
      (v as Draft).snapshots.every(validSnapshot),
  );
}
export function recordSnapshot(
  store: AlbumStore,
  id: string,
  season: number,
  board: Board,
): void {
  if (!id || !validSnapshot({ season, board })) throw Error("地图快照无法保存");
  const all = drafts(store),
    previous = all.find((v) => v.id === id);
  const snapshots = [
    ...(previous?.snapshots || []).filter((v) => v.season !== season),
    { season, board: copy(board) },
  ].sort((a, b) => a.season - b.season);
  if (
    previous &&
    JSON.stringify(previous.snapshots) === JSON.stringify(snapshots)
  )
    return;
  store.setItem(
    DRAFT_KEY,
    JSON.stringify(
      [{ id, snapshots }, ...all.filter((v) => v.id !== id)].slice(0, 6),
    ),
  );
}
export function collectGame(
  store: AlbumStore,
  input: ArchiveInput,
): MapArchive[] {
  const all = loadAlbum(store);
  if (all.some((a) => a.id === input.id)) return all;
  if (
    input.season !== 3 ||
    !input.id ||
    !validBoard(input.board) ||
    !Number.isFinite(input.score) ||
    !["solo", "multi"].includes(input.mode)
  )
    throw Error("请在四季完成后收藏地图");
  recordSnapshot(store, input.id, input.season, input.board);
  const snapshots = drafts(store).find((d) => d.id === input.id)!.snapshots;
  const archive: MapArchive = {
    id: input.id,
    title: titleOf(input.title),
    createdAt: input.createdAt || new Date().toISOString(),
    mode: input.mode,
    score: input.score,
    ...(input.rating ? { rating: copy(input.rating) } : {}),
    snapshots: copy(snapshots),
  };
  if (!validArchive(archive)) throw Error("收藏信息不完整");
  const next = [archive, ...all].slice(0, 24);
  store.setItem(ALBUM_KEY, JSON.stringify(next));
  return next;
}
export function updateArchiveTitle(
  store: AlbumStore,
  id: string,
  title: string,
): MapArchive[] {
  const all = loadAlbum(store).map((a) =>
    a.id === id ? { ...a, title: titleOf(title) } : a,
  );
  store.setItem(ALBUM_KEY, JSON.stringify(all));
  return all;
}
