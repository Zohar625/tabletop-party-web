import { useLayoutEffect, useRef } from "react";
import SmallBoard from "./SmallBoard";
import type { GameState } from "../state/types";
import { isSmallBoardFull } from "../state/gameLogic";
import { useTheme } from "../theme/useTheme";
import styles from "../styles/BigBoard.module.css";
interface BigBoardProps {
  state: GameState;
  onCellClick: (row: number, col: number) => void;
  isMyTurn?: boolean;
  highlightedCell?: { row: number; col: number };
}
export default function BigBoard({
  state,
  onCellClick,
  isMyTurn = true,
  highlightedCell,
}: BigBoardProps) {
  const { theme } = useTheme();
  const boardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const allowed = (r: number, c: number) =>
    !state.winner &&
    !isSmallBoardFull(state.board, r, c) &&
    (state.nextBoard
      ? state.nextBoard.row === r && state.nextBoard.col === c
      : !(state.moveHistory.length === 0 && r === 1 && c === 1));
  const winning = state.winningCells;
  useLayoutEffect(() => {
    const board = boardRef.current;
    const line = lineRef.current;
    if (!board || !line || !winning) return;
    const position = () => {
      const rect = board.getBoundingClientRect();
      [winning[0], winning[2]].forEach(([r, c], i) => {
        const cell = board
          .querySelector(`[data-global-row="${r}"][data-global-col="${c}"]`)
          ?.getBoundingClientRect();
        if (!cell) return;
        line.setAttribute(
          `x${i + 1}`,
          String(((cell.left - rect.left + cell.width / 2) / rect.width) * 100),
        );
        line.setAttribute(
          `y${i + 1}`,
          String(((cell.top - rect.top + cell.height / 2) / rect.height) * 100),
        );
      });
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(board);
    return () => observer.disconnect();
  }, [winning]);
  return (
    <div
      ref={boardRef}
      className={`${styles.bigBoard} ${styles[theme.boardSkin]} ${state.winner ? styles.finished : ""}`}
      aria-label="超级井字棋棋盘"
    >
      {Array.from({ length: 9 }, (_, index) => {
        const r = Math.floor(index / 3),
          c = index % 3;
        return (
          <SmallBoard
            key={index}
            bigRow={r}
            bigCol={c}
            cells={state.board
              .slice(r * 3, r * 3 + 3)
              .map((row) => row.slice(c * 3, c * 3 + 3))}
            isActive={isMyTurn && allowed(r, c)}
            opponentTarget={!isMyTurn && allowed(r, c)}
            onCellClick={(sr, sc) => onCellClick(r * 3 + sr, c * 3 + sc)}
            lastMove={state.moveHistory.at(-1)}
            winningCells={winning}
            highlightedCell={highlightedCell}
          />
        );
      })}
      {winning && (
        <svg
          className={styles.winLine}
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <line
            ref={lineRef}
            stroke="var(--gold)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {state.winner && state.winner !== "draw" && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i
              key={i}
              style={{ left: `${8 + i * 7}%`, animationDelay: `${i * 0.06}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
