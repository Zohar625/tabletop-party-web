import type { SessionAdapter } from "./types.ts";

export function startReadingClock(
  session: Pick<SessionAdapter, "getPublicView" | "dispatch">,
  onTick: (now: number) => void,
  onError: (error: unknown) => void,
  host: {
    now: () => number;
    setInterval: (callback: () => void, ms: number) => number;
    clearInterval: (id: number) => void;
  },
): () => void {
  let timer: number | undefined;
  let stopped = false;
  const stop = () => {
    stopped = true;
    if (timer !== undefined) {
      host.clearInterval(timer);
      timer = undefined;
    }
  };
  const tick = () => {
    if (stopped) return;
    try {
      const view = session.getPublicView();
      if (view.phase !== "reading") {
        stop();
        return;
      }
      const now = host.now();
      onTick(now);
      if (now >= view.deadline!) {
        stop();
        session.dispatch({ type: "endRead" });
      }
    } catch (error) {
      stop();
      onError(error);
    }
  };
  try {
    if (session.getPublicView().phase === "reading") {
      timer = host.setInterval(tick, 100);
    }
  } catch (error) {
    stop();
    onError(error);
  }
  return stop;
}
