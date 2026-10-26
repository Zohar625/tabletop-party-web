import { useState } from "react";
import { GameTable } from "./GameTable";
import {
  LESSONS,
  createLearningState,
  attemptLearningPlacement,
  advanceLearning,
  learningLesson,
} from "./tutorial-model";
import type { LearningState } from "./tutorial-model";
import "./tutorial.css";
export { lessonGame } from "./tutorial-model";
export default function Tutorial({
  onExit,
  onStart,
}: {
  onExit: () => void;
  onStart: () => void;
}) {
  const [state, setState] = useState(() => createLearningState()),
    [history, setHistory] = useState<LearningState[]>([]),
    [hint, setHint] = useState(false),
    [revision, setRevision] = useState(0);
  const lesson = learningLesson(state);
  function restart() {
    return state.step === 0
      ? createLearningState()
      : advanceLearning(history[history.length - 1]);
  }
  function next() {
    setHistory((h) => [...h, state]);
    setState(advanceLearning(state));
    setHint(false);
  }
  return (
    <div className="ct-tutorial cttut-root">
      <div className="ct-tutorial-heading">
        <div>
          <span className="ct-eyebrow">
            协会见习 · 一个春季，学会每笔的目的
          </span>
          <h1>画地图，是为了什么？</h1>
        </div>
        <button onClick={onExit}>退出教学</button>
      </div>
      <p className="cttut-purpose">
        按照探索牌规划地图，在四季中争取当季两项委托的声望。金币加分，怪物周围空格扣分；冬季结束累计成绩。
      </p>
      <section className="cttut-mission" aria-label="当前任务">
        <div className="cttut-count">
          {state.step + 1}
          <span> / {LESSONS.length}</span>
        </div>
        <div>
          <h2>{lesson.title}</h2>
          <p>{lesson.task}</p>
          {state.step === 0 && (
            <div className="cttut-compare">
              <span>森林放在 A1 边缘 → A 预计 +1</span>
              <span>同样森林放在 E5 内部 → A 预计 +0</span>
              <strong>同一块地形，落点不同，声望就不同。</strong>
            </div>
          )}
          <button className="ct-text-button" onClick={() => setHint((v) => !v)}>
            {hint ? "收起提示" : "需要提示"}
          </button>
          {hint && <p className="cttut-hint">{lesson.hint}</p>}
          {state.done && (
            <p className="cttut-success" role="status">
              {state.feedback}
            </p>
          )}
          {state.error && (
            <p className="ct-error" role="alert">
              {state.error}
            </p>
          )}
        </div>
        <div className="cttut-nav">
          <button
            disabled={!history.length}
            onClick={() => {
              const prior = history.slice(0, -1);
              const previous = history[history.length - 1];
              setState(
                prior.length
                  ? advanceLearning(prior[prior.length - 1])
                  : createLearningState(previous.step),
              );
              setHistory(prior);
              setHint(false);
            }}
          >
            返回演示
          </button>
          <button
            onClick={() => {
              setState(restart());
              setRevision((r) => r + 1);
              setHint(false);
            }}
          >
            重试本步
          </button>
          {state.step < LESSONS.length - 1 ? (
            <button
              className="ct-primary"
              disabled={!state.done}
              onClick={next}
            >
              下一步 →
            </button>
          ) : (
            <button
              className="ct-primary"
              disabled={!state.done}
              onClick={onStart}
            >
              开始正式远征 →
            </button>
          )}
        </div>
      </section>
      <div
        className="cttut-progress"
        aria-label={`教学进度 ${state.step + 1}/${LESSONS.length}`}
      >
        {LESSONS.map((_, i) => (
          <span key={i} className={i <= state.step ? "complete" : ""} />
        ))}
      </div>
      <GameTable
        key={`${state.step}-${revision}`}
        game={state.game}
        actor="student"
        pending={state.done}
        teaching={{ step: state.step }}
        completionActions={
          state.done ? (
            <>
              <p className="cttut-success" role="status">
                {state.feedback}
              </p>
              <div className="ct-placement-actions">
                <button
                  onClick={() => {
                    setState(restart());
                    setRevision((r) => r + 1);
                    setHint(false);
                  }}
                >
                  重试本步
                </button>
                <button
                  className="ct-primary"
                  onClick={state.step < LESSONS.length - 1 ? next : onStart}
                >
                  {state.step < LESSONS.length - 1
                    ? "下一步 →"
                    : "开始正式远征 →"}
                </button>
              </div>
            </>
          ) : undefined
        }
        onGoalInspect={(id) => {
          if (id === "greatcity") setState((s) => ({ ...s, inspected: true }));
        }}
        onAction={(action) => {
          if (action.type === "place")
            setState((s) => attemptLearningPlacement(s, action.placement));
        }}
      />
    </div>
  );
}
