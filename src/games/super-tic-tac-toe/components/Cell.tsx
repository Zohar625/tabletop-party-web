import { useTheme } from "../theme/useTheme";
import styles from "../styles/Cell.module.css";
interface CellProps {
  value: "X" | "O" | null;
  onClick: () => void;
  disabled: boolean;
  globalRow?: number;
  globalCol?: number;
  last?: boolean;
  winning?: boolean;
  highlighted?: boolean;
}
export default function Cell({
  value,
  onClick,
  disabled,
  globalRow = 0,
  globalCol = 0,
  last,
  winning,
  highlighted,
}: CellProps) {
  const { theme } = useTheme();
  return (
    <button
      className={`${styles.cell} ${styles[theme.boardSkin]} ${value ? styles[value] : ""} ${last ? styles.last : ""} ${winning ? styles.winning : ""} ${highlighted ? styles.tutorialHint : ""}`}
      onClick={onClick}
      disabled={disabled || !!value}
      data-global-row={globalRow}
      data-global-col={globalCol}
      aria-label={`第${globalRow + 1}行，第${globalCol + 1}列，${value ?? "空格"}${!disabled && !value ? "，可落子" : ""}${highlighted ? "，教程示范格" : ""}`}
    >
      {theme.boardSkin !== "classic" && (
        <span className={styles.terrain} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      {value && <span className={styles.mark}>{value}</span>}
      {value && theme.boardSkin !== "classic" && (
        <span className={styles.particles} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
}
