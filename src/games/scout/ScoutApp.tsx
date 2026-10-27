import { useEffect, useRef, useState } from "react";
import { CardFace } from "./Card.tsx";
import { ScoutTable } from "./ScoutTable.tsx";
import { Tutorial } from "./Tutorial.tsx";
import { Chat } from "./Chat.tsx";
import { lobbyAttention } from "./attention.ts";
import {
  createRoom,
  joinRoom,
  restoreRoom,
  hasSavedRoom,
  clearSavedRoom,
  roomJoinGuard,
  roomLink,
} from "./room.ts";
import type { ScoutRoom, RoomSnapshot } from "./room.ts";
import { roomStatusText } from "./ui-model.ts";
import "./scout.css";
export default function ScoutApp() {
  const [page, setPage] = useState<"home" | "room" | "tutorial">("home"),
    [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false),
    [restoring, setRestoring] = useState(() => hasSavedRoom()),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [exit, setExit] = useState(false),
    [saved, setSaved] = useState(() => hasSavedRoom()),
    [fresh, setFresh] = useState(false);
  const controller = useRef<ScoutRoom | null>(null),
    unsubscribe = useRef<(() => void) | null>(null),
    requesting = useRef(false),
    previousGame = useRef(false);
  const attach = (room: ScoutRoom, restored = false) => {
    unsubscribe.current?.();
    controller.current = room;
    previousGame.current = !!room.getSnapshot().game;
    setFresh(false);
    setSnapshot(room.getSnapshot());
    setSaved(true);
    unsubscribe.current = room.subscribe(() => {
      const next = room.getSnapshot();
      if (next.game && !previousGame.current && !restored) setFresh(true);
      previousGame.current = !!next.game;
      setSnapshot(next);
    });
    setPage("room");
  };
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    setCode(params.get("room") ?? "");
    setPin(params.get("pin") ?? "");
    setSaved(hasSavedRoom());
    void (async () => {
      try {
        const room = await restoreRoom();
        if (!alive) {
          room?.stop();
          return;
        }
        if (room) {
          attach(room, true);
          await room.connect();
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setRestoring(false);
      }
    })();
    return () => {
      alive = false;
      unsubscribe.current?.();
      controller.current?.stop();
    };
  }, []);
  useEffect(() => {
    if (page === "room" && snapshot?.game) setFresh(false);
  }, [page, snapshot?.game?.matchId]);
  const perform = async (fn: () => Promise<unknown>) => {
    if (requesting.current) return;
    requesting.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      requesting.current = false;
      setBusy(false);
    }
  };
  const open = async (join: boolean) =>
    perform(async () => {
      const guard = roomJoinGuard(snapshot, !!controller.current);
      if (guard || restoring || saved)
        throw Error(guard || "请先恢复或结束已有房间，再加入新桌。");
      const room = join
        ? await joinRoom(name, code, pin)
        : await createRoom(name);
      attach(room);
      await room.connect();
    });
  const resume = () =>
    perform(async () => {
      const room = controller.current ?? (await restoreRoom());
      if (!room) throw Error("没有可恢复的房间");
      if (!controller.current) attach(room, true);
      setPage("room");
      await room.connect();
    });
  const leave = () =>
    perform(async () => {
      await controller.current?.leave();
      unsubscribe.current?.();
      unsubscribe.current = null;
      controller.current = null;
      setSnapshot(null);
      setSaved(false);
      setPage("home");
      setExit(false);
      setFresh(false);
    });
  const blocked =
    busy ||
    !!snapshot?.pending ||
    snapshot?.status !== "online" ||
    !!snapshot?.peers.some((p) => !p.online);
  const copyInvite = () =>
    perform(async () => {
      if (!snapshot) return;
      const link = roomLink(snapshot.code, snapshot.pin);
      try {
        await navigator.clipboard.writeText(link);
        setNotice("邀请链接已复制，发给同伴即可入桌。");
      } catch {
        setNotice(`请复制邀请链接：${link}`);
      }
    });
  const live = !!snapshot?.game && snapshot.game.phase !== "finished";
  return (
    <div className="sc-app">
      <header className="sc-header">
        <button
          className="sc-brand"
          onClick={() =>
            page === "room" && controller.current
              ? setExit(true)
              : setPage("home")
          }
          aria-label="SCOUT 首页"
        >
          <span className="sc-brand-star">✦</span>
          <strong>
            SCOUT<span>马戏团巡演</span>
          </strong>
        </button>
        <nav>
          {page === "home" ? (
            <a href="../">桌游大厅 ↗</a>
          ) : (
            <button
              className="sc-quiet"
              onClick={() =>
                page === "room" && controller.current
                  ? setExit(true)
                  : setPage("home")
              }
            >
              返回首页
            </button>
          )}
          <span className="sc-edition">THE CARD CIRCUS</span>
        </nav>
      </header>
      {error && (
        <div className="sc-banner sc-error" role="alert">
          {error}
          <button aria-label="关闭提示" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {page === "home" ? (
        <main className="sc-landing">
          <section className="sc-hero">
            <div className="sc-hero-copy">
              <p className="sc-eyebrow">A LITTLE CIRCUS. A BRILLIANT HAND.</p>
              <h1>
                一手烂牌？
                <br />
                <em>好戏才刚开始。</em>
              </h1>
              <p className="sc-hero-description">
                顺序不能换，机会可以造。
                <br />
                把别人的好演员，变成你的下一场精彩演出。
              </p>
              <div className="sc-hero-meta">
                <span>2–5 人联机</span>
                <span>20 分钟左右</span>
                <span>只需浏览器</span>
              </div>
            </div>
            <div className="sc-hero-art" aria-hidden="true">
              <div className="sc-hero-orbit" />
              <span className="sc-hero-spark s1">✦</span>
              <span className="sc-hero-spark s2">✦</span>
              <div className="sc-hero-card h1">
                <CardFace card={{ id: "hero1", top: 3, bottom: 8 }} />
              </div>
              <div className="sc-hero-card h2">
                <CardFace card={{ id: "hero2", top: 4, bottom: 9 }} />
              </div>
              <div className="sc-hero-card h3">
                <CardFace card={{ id: "hero3", top: 5, bottom: 2 }} />
              </div>
              <div className="sc-hero-stamp">
                MAKE YOUR
                <br />
                <b>NEXT MOVE</b>
                <br />A GREAT SHOW
              </div>
            </div>
          </section>
          <section className="sc-welcome-grid">
            <div className="sc-room-form">
              <span className="sc-eyebrow">TAKE YOUR SEAT</span>
              <h2>今晚，和谁一起开场？</h2>
              {restoring ? (
                <p role="status">正在检查并恢复上次的房间…</p>
              ) : saved || controller.current ? (
                <div className="sc-resume">
                  <p>
                    你的座位还在{snapshot ? ` · 房间 ${snapshot.code}` : ""}
                    。返回首页不会退出房间。
                  </p>
                  <button
                    className="sc-primary"
                    disabled={busy}
                    onClick={resume}
                  >
                    回到我的房间
                  </button>
                  {!controller.current && error && (
                    <button
                      onClick={() =>
                        void perform(async () => {
                          clearSavedRoom();
                          setSaved(false);
                          setError("");
                        })
                      }
                    >
                      清除损坏的本机记录
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <label>
                    你的团员名字
                    <input
                      value={name}
                      maxLength={16}
                      placeholder="怎么称呼你？"
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="nickname"
                    />
                  </label>
                  <button
                    className="sc-primary sc-create"
                    disabled={busy}
                    onClick={() => void open(false)}
                  >
                    创建房间 <span>→</span>
                  </button>
                  <div className="sc-form-divider">
                    <span>已有邀请</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void open(true);
                    }}
                  >
                    <label>
                      6 位房间码
                      <input
                        className="sc-code-input"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        value={code}
                        maxLength={6}
                        placeholder="000000"
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, ""));
                          setPin("");
                        }}
                      />
                    </label>
                    <button disabled={busy || code.length !== 6} type="submit">
                      加入房间
                    </button>
                  </form>
                </>
              )}
              <p className="sc-fineprint">
                无需注册。每个人只能看到自己的手牌。
                <br />
                房主请保持页面在线，大家一起完成巡演。
              </p>
            </div>
            <div className="sc-learn-panel">
              <span className="sc-eyebrow">FIRST TIME IN THE CIRCUS?</span>
              <h2>不急，先排练一场。</h2>
              <p>
                演出，收旧牌得分。
                <br />
                挖角，补出更好的组合。
                <br />
                轮末余牌扣分，累计最高获胜。
              </p>
              <div className="sc-mini-sequence" aria-hidden="true">
                <span>3</span>
                <span className="sc-mini-new">4</span>
                <span>5</span>
                <i>一张牌，接起整场好戏。</i>
              </div>
              <button onClick={() => setPage("tutorial")}>
                学会再开场 <span>↗</span>
              </button>
              <small>独立练习 · 不占房间 · 随时退出</small>
            </div>
          </section>
          <footer className="sc-page-footer">
            <span>SCOUT / 马戏团巡演</span>
            <span>原创网页视觉 · 按原版规则游玩</span>
          </footer>
        </main>
      ) : page === "tutorial" ? (
        <main className="sc-main">
          <Tutorial onExit={() => setPage("home")} />
        </main>
      ) : (
        <main className="sc-main">
          {snapshot ? (
            <>
              <div className="sc-room-bar">
                <div>
                  <span className="sc-eyebrow">ROOM</span>
                  <strong>{snapshot.code}</strong>
                  <span
                    className={`sc-connection ${snapshot.status === "online" ? "is-online" : ""}`}
                  >
                    {roomStatusText(snapshot.status)}
                  </span>
                </div>
                <button onClick={copyInvite} disabled={busy}>
                  复制邀请
                </button>
                <Chat
                  messages={snapshot.chat}
                  meId={snapshot.meId}
                  disabled={
                    busy || snapshot.pending || snapshot.status !== "online"
                  }
                  onSend={async (text) => {
                    await controller.current!.chat(text);
                  }}
                />
              </div>
              {notice && (
                <p className="sc-notice" role="status">
                  {notice}
                </p>
              )}
              {(snapshot.warning || snapshot.error) && (
                <div className="sc-banner sc-error" role="alert">
                  {snapshot.error || snapshot.warning}
                </div>
              )}
              {snapshot.status !== "online" && (
                <div className="sc-banner" role="status">
                  {roomStatusText(snapshot.status)}
                  。座位与手牌会保留，连接恢复前无法操作。
                  {snapshot.status !== "closed" && (
                    <button disabled={busy} onClick={resume}>
                      重新连接
                    </button>
                  )}
                  {controller.current?.canCancelJoin() && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await controller.current!.cancelJoin();
                          unsubscribe.current?.();
                          unsubscribe.current = null;
                          controller.current = null;
                          setSnapshot(null);
                          setSaved(false);
                          setPage("home");
                          setPin("");
                        })
                      }
                    >
                      取消入桌，重新输入房间码
                    </button>
                  )}
                  {snapshot.status === "closed" && (
                    <button
                      onClick={() =>
                        void perform(async () => {
                          controller.current?.discardClosed();
                          controller.current?.stop();
                          unsubscribe.current?.();
                          controller.current = null;
                          setSnapshot(null);
                          setSaved(false);
                          setPage("home");
                        })
                      }
                    >
                      返回首页
                    </button>
                  )}
                </div>
              )}
              {snapshot.game ? (
                <>
                  {snapshot.peers.some((p) => !p.online) &&
                    snapshot.status === "online" && (
                      <div className="sc-banner" role="status">
                        {snapshot.peers
                          .filter((p) => !p.online)
                          .map((p) => p.name)
                          .join("、")}{" "}
                        暂时离线。全员重新连接后继续。
                      </div>
                    )}
                  <ScoutTable
                    game={snapshot.game}
                    actor={snapshot.meId}
                    pending={blocked}
                    isHost={snapshot.host}
                    freshDealOnMount={fresh}
                    onAction={(action) =>
                      void perform(() => controller.current!.act(action))
                    }
                    onRematch={() =>
                      void perform(() => controller.current!.rematch())
                    }
                  />
                </>
              ) : (
                <section className="sc-lobby">
                  <span className="sc-eyebrow">BACKSTAGE · 候场室</span>
                  <h1>好戏，需要好搭档。</h1>
                  <p>
                    把房间码或邀请链接发给朋友。2–5
                    位团员到齐并准备后，由房主开场。
                  </p>
                  <div className="sc-attention" role="status">
                    <span className="sc-attention-dot" aria-hidden="true" />
                    <div>
                      <strong>{lobbyAttention(snapshot.peers).title}</strong>
                      <p>{lobbyAttention(snapshot.peers).detail}</p>
                    </div>
                  </div>
                  <div className="sc-lobby-seats">
                    {snapshot.peers.map((p, i) => (
                      <div
                        className={`sc-lobby-seat ${!p.online ? "is-offline" : p.ready ? "is-ready" : "is-waiting"}`}
                        key={p.id}
                      >
                        <div className="sc-avatar">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <strong>
                          {p.name}
                          {p.id === snapshot.meId ? " · 你" : ""}
                        </strong>
                        <span>
                          {p.id === snapshot.hostId ? "房主 · " : ""}
                          {p.ready ? "已准备" : "尚未准备"}
                        </span>
                        <small className={p.online ? "sc-online" : "sc-muted"}>
                          {p.online ? "在线" : "连接中 / 离线"}
                        </small>
                        {snapshot.host && p.id !== snapshot.meId && (
                          <button
                            className="sc-quiet"
                            disabled={busy || snapshot.pending}
                            onClick={() =>
                              void perform(() => controller.current!.kick(p.id))
                            }
                          >
                            移出房间
                          </button>
                        )}
                      </div>
                    ))}
                    {Array.from(
                      { length: Math.max(0, 5 - snapshot.peers.length) },
                      (_, i) => (
                        <div
                          className="sc-lobby-seat is-empty"
                          key={`empty-${i}`}
                        >
                          <span>+</span>
                          <small>等待团员</small>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="sc-lobby-actions">
                    {snapshot.host ? (
                      <button
                        className="sc-primary"
                        disabled={
                          blocked ||
                          snapshot.peers.length < 2 ||
                          snapshot.peers.some((p) => !p.ready)
                        }
                        onClick={() =>
                          void perform(() => controller.current!.startGame())
                        }
                      >
                        全员就位，开始巡演
                      </button>
                    ) : (
                      <button
                        className="sc-primary"
                        disabled={
                          busy ||
                          snapshot.pending ||
                          snapshot.status !== "online"
                        }
                        onClick={() =>
                          void perform(() =>
                            controller.current!.ready(
                              !snapshot.peers.find(
                                (p) => p.id === snapshot.meId,
                              )?.ready,
                            ),
                          )
                        }
                      >
                        {snapshot.peers.find((p) => p.id === snapshot.meId)
                          ?.ready
                          ? "取消准备"
                          : "我准备好了"}
                      </button>
                    )}
                    <button onClick={() => setPage("tutorial")}>
                      候场时学一局
                    </button>
                  </div>
                  <p className="sc-fineprint">
                    刷新可以回到原座位。房主掉线时全桌暂停，恢复连接后继续。
                  </p>
                </section>
              )}
            </>
          ) : (
            <p role="status">正在打开房间…</p>
          )}
        </main>
      )}
      {exit && (
        <div className="sc-modal-backdrop">
          <section
            className="sc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sc-exit-title"
          >
            <span className="sc-eyebrow">TAKE A BREATHER</span>
            <h2 id="sc-exit-title">暂别一下，还是结束这桌？</h2>
            <p>
              返回首页会保留房间连接与原座位。暂时离桌会断开连接，之后可以恢复。
              {snapshot?.host
                ? "收桌会结束所有人的房间。"
                : live
                  ? "对局中不能永久退出，其他团员需要等你回来。"
                  : "退出房间后会释放你的座位。"}
            </p>
            <div className="sc-modal-actions">
              <button
                className="sc-primary"
                autoFocus
                onClick={() => {
                  setPage("home");
                  setExit(false);
                }}
              >
                返回首页，保留房间
              </button>
              <button
                onClick={() => {
                  controller.current?.stop();
                  setPage("home");
                  setExit(false);
                }}
              >
                暂时离桌
              </button>
              {(snapshot?.host || !live) && (
                <button className="sc-danger" disabled={busy} onClick={leave}>
                  {snapshot?.host ? "确认收桌，所有人退出" : "确认退出房间"}
                </button>
              )}
              <button className="sc-quiet" onClick={() => setExit(false)}>
                继续留在这里
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
