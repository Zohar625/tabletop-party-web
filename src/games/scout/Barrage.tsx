import { useEffect, useRef, useState } from "react";
import { barrageUpdate } from "./chat-model.ts";
import type { ChatMessage } from "./chat-model.ts";

type Flight = { message: ChatMessage; lane: number; expires: number };
export function Barrage({
  messages,
  enabled,
  meId,
  connected,
}: {
  messages: ChatMessage[];
  enabled: boolean;
  meId: string;
  connected: boolean;
}) {
  const after = useRef(messages.at(-1)?.seq ?? 0);
  const wasConnected = useRef(false);
  const queue = useRef<ChatMessage[]>([]);
  const active = useRef<Flight[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  useEffect(() => {
    const update = barrageUpdate(
      messages,
      after.current,
      Date.now(),
      !connected || !wasConnected.current,
    );
    after.current = update.after;
    wasConnected.current = connected;
    if (enabled && connected)
      queue.current = [...queue.current, ...update.messages].slice(-12);
  }, [messages, enabled, connected]);
  useEffect(() => {
    active.current = [];
    setFlights([]);
    if (!enabled || !connected) {
      queue.current = [];
      return;
    }
    const timer = setInterval(() => {
      const now = Date.now();
      const next = active.current.filter((f) => f.expires > now);
      queue.current = queue.current.filter((m) => now - m.sentAt < 15000);
      for (let lane = 0; lane < 3 && queue.current.length; lane++) {
        if (!next.some((f) => f.lane === lane)) {
          next.push({
            message: queue.current.shift()!,
            lane,
            expires: now + 7000,
          });
        }
      }
      if (
        next.length !== active.current.length ||
        next.some((f, i) => f !== active.current[i])
      ) {
        active.current = next;
        setFlights(next);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [enabled, connected]);
  return (
    <div className="sc-barrage" aria-hidden="true">
      {flights.map(({ message, lane }) => (
        <div
          key={message.id}
          className={`sc-barrage-message${message.authorId === meId ? " is-mine" : ""}`}
          style={{ top: `${lane * 40}px` }}
        >
          <b>{message.name}</b>
          <span>{message.text}</span>
        </div>
      ))}
    </div>
  );
}
