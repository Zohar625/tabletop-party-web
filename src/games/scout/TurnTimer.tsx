import { useEffect, useState } from "react";
import { turnClockView } from "./turn-clock.ts";
import type { TurnClock } from "./turn-clock.ts";

export function TurnTimer({
  clock,
  clockOffsetMs = 0,
  connected = true,
  mine,
  name,
}: {
  clock: TurnClock;
  clockOffsetMs?: number;
  connected?: boolean;
  mine: boolean;
  name: string;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [clock.key, clock.deadline]);
  const view = turnClockView(clock, now - clockOffsetMs);
  return (
    <div
      className={`sc-turn-timer${connected && view.urgent ? " is-urgent" : ""}${clock.stage === 1 ? " is-final" : ""}`}
    >
      <div className="sc-turn-timer-label">
        <strong>
          {connected
            ? `${mine ? "你的" : `${name}的`}行动 · 第${clock.stage + 1}段`
            : "连接恢复中 · 等待房主同步"}
        </strong>
        <span role="timer" aria-label="出牌倒计时" aria-live="off">
          {connected ? `${view.remaining}秒` : "—"}
        </span>
      </div>
      <div className="sc-turn-timer-track" aria-hidden="true">
        <i style={{ transform: `scaleX(${view.progress})` }} />
      </div>
      <small>
        {clock.stage === 0
          ? "首次超时会提醒，并重新计时一次"
          : "已提醒并重新计时 · 再次超时将自动操作"}
      </small>
    </div>
  );
}
