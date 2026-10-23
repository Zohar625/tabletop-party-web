import Cell from "./Cell";
import type { CellValue, Move } from "../state/types";
import styles from "../styles/SmallBoard.module.css";
interface SmallBoardProps {
  bigRow: number;
  bigCol: number;
  cells: CellValue[][];
  isActive: boolean;
  opponentTarget?: boolean;
  onCellClick: (row: number, col: number) => void;
  lastMove?: Move;
  winningCells?: [number, number][] | null;
  highlightedCell?: { row: number; col: number };
}
export default function SmallBoard({
  bigRow,
  bigCol,
  cells,
  isActive,
  opponentTarget,
  onCellClick,
  lastMove,
  winningCells,
  highlightedCell,
}: SmallBoardProps) {
  return (
    <div
      className={`${styles.smallBoard} ${isActive ? styles.active : opponentTarget ? styles.opponentTarget : styles.inactive}`}
      aria-label={`小棋盘 ${bigRow * 3 + bigCol + 1}`}
    >
      {cells.map((row, r) =>
        row.map((value, c) => {
          const globalRow = bigRow * 3 + r,
            globalCol = bigCol * 3 + c;
          return (
            <Cell
              key={`${r}-${c}`}
              value={value}
              onClick={() => onCellClick(r, c)}
              disabled={!isActive}
              globalRow={globalRow}
              globalCol={globalCol}
              last={
                lastMove?.globalRow === globalRow &&
                lastMove?.globalCol === globalCol
              }
              winning={winningCells?.some(
                ([wr, wc]) => wr === globalRow && wc === globalCol,
              )}
              highlighted={
                highlightedCell?.row === globalRow &&
                highlightedCell?.col === globalCol
              }
            />
          );
        }),
      )}
    </div>
  );
}
