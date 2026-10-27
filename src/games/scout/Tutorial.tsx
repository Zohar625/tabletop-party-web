import { useState } from "react";
import { scoutView } from "./engine.ts";
import { ScoutTable } from "./ScoutTable.tsx";
import { lessonState, lessons, teachingStep } from "./tutorial-model.ts";
export function Tutorial({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0),
    [state, setState] = useState(() => lessonState(0)),
    [complete, setComplete] = useState(false),
    [feedback, setFeedback] = useState("");
  const lesson = lessons[index];
  const load = (next: number) => {
    setIndex(next);
    setState(lessonState(next));
    setComplete(false);
    setFeedback("");
  };
  return (
    <div className="sc-tutorial">
      <section className="sc-lesson-intro">
        <div className="sc-lesson-top">
          <span className="sc-eyebrow">
            LEARN BY PLAYING · {index + 1} / {lessons.length}
          </span>
          <button className="sc-quiet" onClick={onExit}>
            退出教学
          </button>
        </div>
        <div
          className="sc-progress"
          aria-label={`第 ${index + 1} 课，共 ${lessons.length} 课`}
        >
          {lessons.map((_, i) => (
            <i key={i} className={i <= index ? "is-done" : ""} />
          ))}
        </div>
        <h1>{lesson.title}</h1>
        <p>{lesson.purpose}</p>
        <div className="sc-lesson-goal">
          <b>这次试着做</b>
          <span>{lesson.goal}</span>
        </div>
      </section>
      <ScoutTable
        key={index}
        game={scoutView(state, "a")}
        actor="a"
        teaching
        pending={complete}
        onAction={(action) => {
          const result = teachingStep(index, state, action);
          setState(result.state);
          setComplete(result.complete);
          setFeedback(result.message);
        }}
      />
      <div className={`sc-lesson-footer${complete ? " is-complete" : ""}`}>
        <p role="status">
          {feedback ||
            (complete
              ? "这一课已完成。"
              : "在上方牌桌完成目标后，就可以进入下一课。")}
        </p>
        <div className="sc-actions">
          <button onClick={() => load(index)}>重试这一课</button>
          <button
            className="sc-primary"
            disabled={!complete}
            onClick={() =>
              index === lessons.length - 1 ? onExit() : load(index + 1)
            }
          >
            {index === lessons.length - 1 ? "排练结束，去开场" : "下一课 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
