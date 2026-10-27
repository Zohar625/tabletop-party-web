import { useEffect, useRef, useState } from "react";
import { quickPhrases } from "./chat-model.ts";
import type { ChatMessage } from "./chat-model.ts";
import { Barrage } from "./Barrage.tsx";
export function Chat({
  messages,
  meId,
  disabled,
  connected = true,
  onSend,
}: {
  messages: ChatMessage[];
  meId: string;
  disabled: boolean;
  connected?: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [barrage, setBarrage] = useState(true),
    [text, setText] = useState(""),
    [group, setGroup] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [read, setRead] = useState(() => messages.at(-1)?.seq ?? 0);
  const list = useRef<HTMLDivElement>(null),
    atBottom = useRef(true),
    lock = useRef(false);
  const latest = messages.at(-1)?.seq ?? 0,
    unread = messages.filter((m) => m.authorId !== meId && m.seq > read).length;
  useEffect(() => {
    if (open) {
      setRead(latest);
      if (atBottom.current)
        list.current?.scrollTo({ top: list.current.scrollHeight });
    }
  }, [open, latest]);
  const send = async (value: string, fromInput = false) => {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onSend(value);
      if (fromInput) setText((current) => (current === value ? "" : current));
      atBottom.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="sc-chat">
      <Barrage
        messages={messages}
        enabled={barrage}
        meId={meId}
        connected={connected}
      />
      <button
        className="sc-barrage-toggle"
        aria-pressed={barrage}
        onClick={() => setBarrage(!barrage)}
      >
        弹幕{barrage ? "开" : "关"}
      </button>
      <button
        className="sc-chat-toggle"
        aria-expanded={open}
        aria-controls="sc-chat-panel"
        onClick={() => {
          setOpen(!open);
          atBottom.current = true;
        }}
      >
        聊天
        {unread > 0 && (
          <span className="sc-chat-badge">{Math.min(unread, 50)}</span>
        )}
      </button>
      {open && (
        <section
          className="sc-chat-panel"
          id="sc-chat-panel"
          aria-label="房间聊天"
        >
          <div className="sc-chat-heading">
            <div>
              <strong>团员闲聊</strong>
              <small>好牌烂牌，都能聊两句</small>
            </div>
            <button aria-label="收起聊天" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div
            className="sc-chat-messages"
            ref={list}
            role="log"
            aria-label="聊天记录"
            aria-live="polite"
            onScroll={() => {
              const el = list.current;
              if (el)
                atBottom.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 45;
            }}
          >
            {!messages.length && (
              <p className="sc-chat-empty">还没人开口，先来一句？</p>
            )}
            {messages.map((m) => (
              <div
                className={`sc-chat-message${m.authorId === meId ? " is-mine" : ""}`}
                key={m.id}
              >
                <span>
                  {m.name}
                  {m.authorId === meId ? " · 你" : ""}
                </span>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <div className="sc-chat-groups" role="group" aria-label="快捷语分类">
            {quickPhrases.map((g, i) => (
              <button
                key={g.name}
                aria-pressed={group === i}
                onClick={() => setGroup(i)}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="sc-chat-phrases" aria-label="快捷聊天">
            {quickPhrases[group].phrases.map((p) => (
              <button
                key={p}
                disabled={disabled || busy}
                onClick={() => void send(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(text, true);
            }}
          >
            <label className="sc-chat-input-label" htmlFor="sc-chat-input">
              说点什么
            </label>
            <input
              id="sc-chat-input"
              value={text}
              maxLength={240}
              placeholder="说点什么，最多120字"
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="sc-primary"
              disabled={disabled || busy || !text.trim()}
              type="submit"
            >
              发送
            </button>
          </form>
          {(error || disabled) && (
            <p role="status" className="sc-chat-notice">
              {error || "连接恢复或当前操作确认后，即可发送。"}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
