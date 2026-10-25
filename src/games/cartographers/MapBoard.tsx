import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { Board, Point, Terrain } from "./types";
import { TerrainArt } from "./TerrainArt";
import { terrainName } from "./ui-model";
import { RUINS } from "./data";
export const RUIN_CELLS = RUINS.map(([x, y]) => y * 11 + x);
export function MapBoard({
  board,
  preview = [],
  terrain = "forest",
  invalid = false,
  onCell,
  highlight = [],
  label = "你的地图",
}: {
  board: Board;
  preview?: Point[];
  terrain?: Terrain;
  invalid?: boolean;
  onCell?: (x: number, y: number) => void;
  highlight?: number[];
  label?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [inkNew, setInkNew] = useState<number[]>([]);
  const previous = useRef({ cells: board.cells, label });
  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = { cells: board.cells, label };
    if (old.label !== label) {
      setInkNew([]);
      return;
    }
    const added = board.cells.flatMap((cell, i) =>
      old.cells[i] === null && cell !== null ? [i] : [],
    );
    if (added.length) setInkNew(added);
  }, [board.cells, label]);
  useEffect(() => {
    if (!inkNew.length) return;
    const timer = setTimeout(() => setInkNew([]), 450);
    return () => clearTimeout(timer);
  }, [inkNew]);
  return (
    <div className="ct-board-wrap">
      <div className="ct-board-tools">
        <span>{label}</span>
        <div>
          <button
            aria-label="缩小地图"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="放大地图"
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          >
            ＋
          </button>
        </div>
      </div>
      <div className="ct-board-scroll">
        <div className="ct-board-paper" style={{ width: `${zoom * 100}%` }}>
          <div className="ct-coordinates">A　B　C　D　E　F　G　H　I　J　K</div>
          <div
            className="ct-board"
            role="group"
            aria-label={`${label}，11行11列。点击空格预览，再确认落笔。`}
          >
            {board.cells.map((cell, index) => {
              const x = index % 11,
                y = Math.floor(index / 11),
                isPreview = preview.some((p) => p[0] === x && p[1] === y);
              return (
                <button
                  key={index}
                  type="button"
                  className={`ct-cell ${cell ? "filled" : ""} ${inkNew.includes(index) ? "ink-new" : ""} ${isPreview ? `preview ${invalid ? "invalid" : ""}` : ""} ${highlight.includes(index) ? "highlight" : ""}`}
                  aria-label={`${String.fromCharCode(65 + x)}${y + 1}，${terrainName(cell)}${RUIN_CELLS.includes(index) ? "，遗迹" : ""}${isPreview ? "，待落笔" : ""}`}
                  onClick={() => onCell?.(x, y)}
                  disabled={!onCell}
                >
                  <TerrainArt
                    terrain={isPreview ? terrain : cell}
                    variant={index}
                  />
                  {!cell && !isPreview && RUIN_CELLS.includes(index) && (
                    <svg
                      className="ct-ruin"
                      viewBox="0 0 32 32"
                      aria-hidden="true"
                    >
                      <path d="M8 25V12h6V7h5v8h5v10M5 25h22M11 15v7m9-4v4" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <div className="ct-map-signature">
            <span>THE NORTHERN KINGDOM</span>
            <span>✧</span>
            <span>皇家制图院 · A 面</span>
          </div>
        </div>
      </div>
    </div>
  );
}
