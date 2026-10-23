import { useEffect, useReducer, useRef } from "react";
import BigBoard from "./BigBoard";
import Icon from "./Icon";
import {
  createTutorialState,
  getTutorialTarget,
  isLessonComplete,
  lessons,
  tutorialReducer,
} from "../tutorial/tutorialState";
import styles from "../styles/Tutorial.module.css";
import appStyles from "../App.module.css";

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [state, dispatch] = useReducer(tutorialReducer, undefined, () =>
    createTutorialState(),
  );
  const lesson = lessons[state.step];
  const done = isLessonComplete(state);
  const finished = done && state.step === lessons.length - 1;
  const target = getTutorialTarget(state);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    dialogRef.current?.scrollTo({ top: 0 });
  }, [state.step]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="tutorial-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <span className={appStyles.eyebrow}>一起下懂第一局</span>
          <h2 id="tutorial-title">
            新手教程 <small>五步学会超级井字棋</small>
          </h2>
        </div>
        <button
          className={styles.close}
          onClick={onClose}
          aria-label="退出教程"
        >
          <Icon name="close" />
        </button>
      </header>
      <ol className={styles.progress} aria-label="教程进度">
        {lessons.map((item, i) => (
          <li
            key={item.title}
            aria-current={i === state.step ? "step" : undefined}
            className={`${i === state.step ? styles.current : ""} ${i < state.step ? styles.passed : ""}`}
          >
            <span>
              {i < state.step ? <Icon name="check" size={13} /> : i + 1}
            </span>
            <b>
              {["认识棋盘", "第一步", "决定去向", "满盘自由", "三连获胜"][i]}
            </b>
          </li>
        ))}
      </ol>
      <div className={styles.body}>
        <section className={styles.instructions} aria-label="本课说明">
          <span className={appStyles.eyebrow}>
            第 {state.step + 1} 课 / 共 5 课
          </span>
          <h3 ref={headingRef} tabIndex={-1}>
            {lesson.title}
          </h3>
          <p className={styles.description}>{lesson.description}</p>
          <ol className={styles.tasks}>
            {lesson.tasks.map((task, i) => (
              <li
                key={task}
                className={
                  state.step > 0 && (done || i < state.progress)
                    ? styles.taskDone
                    : ""
                }
              >
                <span>
                  {state.step > 0 && (done || i < state.progress) ? (
                    <Icon name="check" size={14} />
                  ) : (
                    i + 1
                  )}
                </span>
                <p>{task}</p>
              </li>
            ))}
          </ol>
          <div
            className={`${styles.feedback} ${done && state.step > 0 ? styles.success : ""}`}
            role="status"
            aria-live="polite"
          >
            {finished ? (
              <>
                <strong>这片棋盘，你已经会玩了。</strong>
                <p>{state.feedback}</p>
              </>
            ) : (
              state.feedback ||
              (state.step === 0
                ? "先认识棋盘，再跟着金色示范格亲手练习。"
                : "金色边框标出的格子，就是这一课的练习位置。")
            )}
          </div>
          <p className={styles.note}>独立练习棋盘。退出后继续你的原对局。</p>
        </section>
        <section className={styles.practice} aria-label="教程练习棋盘">
          <div className={styles.boardLabel}>
            <span>{lesson.preset ? "预设示范局面" : "独立练习棋盘"}</span>
            <b>
              {state.game.winner
                ? "X 三连获胜"
                : state.step === 0
                  ? "九块小棋盘"
                  : `${state.game.currentPlayer} 回合`}
            </b>
          </div>
          <div className={styles.boardWrap}>
            <BigBoard
              state={state.game}
              isMyTurn={state.step > 0 && !done}
              highlightedCell={target}
              onCellClick={(row, col) => dispatch({ type: "move", row, col })}
            />
            {state.step === 0 && (
              <div className={styles.boardNumbers} aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i}>
                    <b>{i + 1}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className={styles.boardCaption}>
            {state.step === 0
              ? "九块 3×3 小棋盘，组成一整片 9×9 棋盘。"
              : state.game.winner
                ? "第 1 行的第 3、4、5 列跨过小棋盘边界连成一线。"
                : state.game.moveHistory.length === 0
                  ? "第一步请选择外侧小棋盘，中央暂时不能落子。"
                  : state.game.nextBoard
                    ? `下一位必须去第 ${state.game.nextBoard.row * 3 + state.game.nextBoard.col + 1} 块小棋盘。`
                    : "目标已满：可以自由选择任何还有空格的小棋盘。"}
          </p>
        </section>
      </div>
      <footer className={styles.footer}>
        <button
          className={appStyles.secondary}
          disabled={state.step === 0}
          onClick={() => dispatch({ type: "previous" })}
        >
          上一课
        </button>
        <button
          className={styles.restart}
          onClick={() => dispatch({ type: "restart" })}
        >
          重新学习
        </button>
        {finished ? (
          <button className={appStyles.primary} onClick={onClose}>
            学会了，回到对局 <Icon name="arrow" size={18} />
          </button>
        ) : (
          <button
            className={appStyles.primary}
            disabled={!done}
            onClick={() => dispatch({ type: "next" })}
          >
            下一课 <Icon name="arrow" size={18} />
          </button>
        )}
      </footer>
    </dialog>
  );
}
