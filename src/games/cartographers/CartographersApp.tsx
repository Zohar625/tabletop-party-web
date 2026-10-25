import { useEffect, useRef, useState } from "react";
import { createGame, reduceGame } from "./engine";
import type { MapAction, MapGame } from "./types";
import { createRoom, joinRoom, restoreRoom } from "./room";
import type { MapRoom, RoomSnapshot } from "./room";
import { soloRating } from "./scoring";
import { GameTable } from "./GameTable";
import Tutorial from "./Tutorial";
import { MapIllustration } from "./TerrainArt";
import {
  HISTORY_KEY,
  readSavedGame,
  SAVE_KEY,
  scoreTotal,
  canOpenRoom,
  winners,
} from "./ui-model";
import "./cartographers.css";
type RecordEntry = {
  date: string;
  score: number;
  rating: number;
  seed?: string;
};
function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function history(): RecordEntry[] {
  try {
    const h = JSON.parse(stored(HISTORY_KEY) || "[]");
    return Array.isArray(h)
      ? h
          .filter(
            (v) =>
              v &&
              typeof v.date === "string" &&
              Number.isFinite(v.score) &&
              Number.isFinite(v.rating),
          )
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
export default function CartographersApp({ onBack }: { onBack?: () => void }) {
  const [screen, setScreen] = useState<"home" | "tutorial" | "solo" | "online">(
      "home",
    ),
    [game, setGame] = useState<MapGame | null>(() =>
      readSavedGame(stored(SAVE_KEY)),
    ),
    [name, setName] = useState("制图师"),
    [code, setCode] = useState(
      () => new URLSearchParams(location.search).get("maproom") || "",
    ),
    [pin, setPin] = useState(
      () => new URLSearchParams(location.search).get("mappin") || "",
    ),
    [room, setRoom] = useState<MapRoom | null>(null),
    [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null),
    [error, setError] = useState(""),
    [records, setRecords] = useState(history),
    [help, setHelp] = useState(false),
    [copied, setCopied] = useState(false),
    [restoring, setRestoring] = useState(true),
    [opening, setOpening] = useState(false);
  const recorded = useRef("");
  const openingRef = useRef(false);
  const roomAvailable = canOpenRoom(!!room, restoring || opening);
  useEffect(() => {
    let active = true;
    restoreRoom()
      .then((r) => {
        if (r && active) {
          setRoom(r);
          setScreen("online");
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!room) return;
    setSnapshot(room.getSnapshot());
    const unsub = room.subscribe(() => setSnapshot(room.getSnapshot()));
    room.connect().catch((e) => setError(String(e)));
    return () => {
      unsub();
      room.stop();
    };
  }, [room]);
  useEffect(() => {
    if (!game) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
      if (game.phase === "finished" && recorded.current !== game.seed) {
        recorded.current = game.seed;
        const rating = soloRating(
          scoreTotal(game.players[0].seasons),
          game.goals,
        );
        const item = {
          date: new Date().toLocaleDateString("zh-CN"),
          score: scoreTotal(game.players[0].seasons),
          rating: rating.score,
          seed: game.seed,
        };
        setRecords((old) => {
          const next = old.some((r) => r.seed === game.seed)
            ? old
            : [item, ...old].slice(0, 10);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
        });
      }
    } catch {
      setError("浏览器无法保存进度，请保持本页打开。");
    }
  }, [game]);
  function start() {
    setGame(
      createGame(
        [{ id: "solo", name: name.trim() || "制图师" }],
        `${Date.now()}-${Math.random()}`,
        "solo",
      ),
    );
    setScreen("solo");
    setError("");
  }
  function action(a: MapAction) {
    if (!game) return;
    try {
      setGame(reduceGame(game, "solo", a));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "落笔失败，请重新选择位置。");
    }
  }
  async function online(create: boolean) {
    if (!roomAvailable || openingRef.current) {
      if (room) setScreen("online");
      return;
    }
    openingRef.current = true;
    setOpening(true);
    try {
      const r = await (create
        ? createRoom(name.trim() || "制图师")
        : joinRoom(name.trim() || "制图师", code, pin || undefined));
      setRoom(r);
      setScreen("online");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "房间连接失败");
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  }
  function roomCall(value: Promise<unknown> | undefined) {
    value?.catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }
  async function copyInvite() {
    if (!snapshot) return;
    const url = new URL(location.href);
    url.searchParams.set("game", "cartographers");
    url.searchParams.set("maproom", snapshot.code);
    url.searchParams.set("mappin", snapshot.pin);
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
    } catch {
      setError(`邀请链接：${url.href}`);
    }
  }
  async function exportMap() {
    if (current?.phase !== "finished") return;
    const source = document.querySelector(".ct-board");
    if (!source) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 1050;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#f3ead4";
      ctx.fillRect(0, 0, 960, 1050);
      ctx.fillStyle = "#31503b";
      ctx.font = "24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("CARTOGRAPHERS · 我的王国", 480, 48);
      const cellSize = 80,
        offsetX = 40,
        offsetY = 90;
      const cells = Array.from(source.children);
      await Promise.all(
        cells.map(async (cell, i) => {
          const x = offsetX + (i % 11) * cellSize,
            y = offsetY + Math.floor(i / 11) * cellSize;
          ctx.strokeStyle = "#b8af93";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellSize, cellSize);
          const svg = cell.querySelector("svg");
          if (!svg) return;
          const clean = svg.cloneNode(true) as SVGElement;
          clean.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          clean.setAttribute("width", "80");
          clean.setAttribute("height", "80");
          const url = URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(clean)], {
              type: "image/svg+xml",
            }),
          );
          try {
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, x, y, cellSize, cellSize);
                resolve();
              };
              img.onerror = reject;
              img.src = url;
            });
          } finally {
            URL.revokeObjectURL(url);
          }
        }),
      );
      ctx.fillStyle = "#918565";
      ctx.font = "15px Georgia, serif";
      ctx.fillText("皇家制图院 · 四季远征", 480, 1010);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "我的王国-制图师.png";
      link.click();
    } catch {
      setError("地图导出失败，可以使用设备截图保存。");
    }
  }
  const current = screen === "online" ? snapshot?.game : game;
  return (
    <div className="cartographers">
      <header className="ct-header">
        <button
          className="ct-brand"
          onClick={() => setScreen("home")}
          aria-label="制图师首页"
        >
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <path
              d="m5 27 9-21 6 14 4-8 8 15H5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m10 15 5 3 4-4M24 2v7m-3-4h6"
              stroke="currentColor"
              fill="none"
            />
          </svg>
          <span>
            制图师<small>CARTOGRAPHERS</small>
          </span>
        </button>
        <nav>
          <button onClick={() => setHelp(!help)}>玩法指南</button>
          {screen !== "home" && (
            <button onClick={() => setScreen("home")}>返回书桌</button>
          )}
          <button
            onClick={
              onBack ||
              (() => {
                location.href = "../index.html";
              })
            }
          >
            游戏大厅 ↗
          </button>
        </nav>
      </header>
      {help && (
        <div className="ct-global-help">
          <h2>四季探索，绘成你的王国</h2>
          <p>
            每回合选地形和形状 → 点击地图预览 →
            确认落笔。金币和地图跨季保留，每季结算两个轮换目标。冬季结束比较总声望；单人局还会扣除敕令基准，评定头衔。
          </p>
          <button
            className="ct-primary"
            onClick={() => {
              setScreen("tutorial");
              setHelp(false);
            }}
          >
            进入八步实操教学 →
          </button>
        </div>
      )}
      {error && (
        <div className="ct-notice ct-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="关闭提示">
            ×
          </button>
        </div>
      )}
      {screen === "home" ? (
        <>
          <section className="ct-hero">
            <div className="ct-hero-copy">
              <div className="ct-kicker">
                <span /> A TABLETOP EXPEDITION <span />
              </div>
              <p className="ct-eyebrow">一张地图，一整个王国</p>
              <h1>
                为未知的土地，
                <br />
                画下你的<span>名字。</span>
              </h1>
              <p className="ct-hero-description">
                穿过松林，沿着河流，发现山脉另一端的村庄。
                <br className="ct-desktop-break" />
                跟随四季的探索牌，用每一次落笔赢得女王的青睐。
              </p>
              <div className="ct-hero-actions">
                <button
                  className="ct-primary"
                  onClick={() => setScreen("tutorial")}
                >
                  先学会玩 <span>→</span>
                </button>
                <button className="ct-secondary" onClick={start}>
                  开始单人远征
                </button>
              </div>
              {game && game.phase !== "finished" && (
                <button className="ct-resume" onClick={() => setScreen("solo")}>
                  继续上次远征{" "}
                  <span>已自动保存 · 第 {game.season + 1} 季 →</span>
                </button>
              )}
              <div className="ct-hero-meta">
                <span>1–6 位制图师</span>
                <span>约 30 分钟</span>
                <span>零基础可学</span>
              </div>
            </div>
            <div className="ct-hero-art">
              <div className="ct-map-stamp">
                皇家制图院
                <br />
                <b>EXPLORER'S ATLAS</b>
                <span>北境 · 第 01 卷</span>
              </div>
              <MapIllustration />
              <div className="ct-art-caption">
                <span>未知，值得被描绘。</span>
                <i>Draw your own kingdom.</i>
              </div>
              <svg
                className="ct-compass"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r="37" />
                <path d="m50 7 9 34 34 9-34 9-9 34-9-34L7 50l34-9Z" />
                <path d="m50 18 0 64M18 50h64" />
                <text x="46" y="7">
                  N
                </text>
              </svg>
            </div>
          </section>
          {room && (
            <div className="ct-notice">
              <span>
                你仍在朋友房间 {snapshot?.code}
                。先返回房间完成远征或明确离开，才能创建新房间。
              </span>
              <button onClick={() => setScreen("online")}>返回房间 →</button>
              {snapshot &&
                (!snapshot.game || snapshot.game.phase === "finished") && (
                  <button
                    onClick={async () => {
                      try {
                        await room.leave();
                        setRoom(null);
                        setSnapshot(null);
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    离开此房间
                  </button>
                )}
            </div>
          )}
          <section className="ct-bottom-grid">
            <div className="ct-online-card">
              <span className="ct-eyebrow">EXPLORE TOGETHER</span>
              <h2>朋友同桌，各绘山河。</h2>
              <p>共用探索牌，各自创造王国。支持 2–6 人，输入房间码即刻相聚。</p>
              <label>
                你的称呼
                <input
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="制图师"
                />
              </label>
              <div className="ct-room-form">
                <input
                  aria-label="六位房间码"
                  placeholder="6 位房间码"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setPin("");
                  }}
                />
                <button
                  className="ct-primary"
                  disabled={code.length !== 6 || !roomAvailable}
                  onClick={() => online(false)}
                >
                  加入
                </button>
              </div>
              <button
                className="ct-text-button"
                disabled={!roomAvailable}
                onClick={() => online(true)}
              >
                创建朋友房间 →
              </button>
              <small>
                请通过完整邀请链接加入；联机需要网络，房主需保持在线。
              </small>
            </div>
            <div className="ct-how-card">
              <span className="ct-eyebrow">THE ART OF CARTOGRAPHY</span>
              <h2>只需三步，落笔成山河。</h2>
              {[
                ["01", "翻开探索牌", "选择地形与形状，规划你的边境。"],
                ["02", "自由旋转，谨慎落笔", "在地图上预览，确认后才会绘入。"],
                [
                  "03",
                  "四季轮转，赢得声望",
                  "完成皇家敕令，让每块土地都有价值。",
                ],
              ].map(([n, t, d]) => (
                <div className="ct-how-step" key={n}>
                  <b>{n}</b>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {records.length > 0 && (
            <section className="ct-records">
              <span className="ct-eyebrow">YOUR EXPEDITIONS</span>
              <h2>远征档案</h2>
              <div>
                {records.map((r, i) => (
                  <article key={i}>
                    <small>{r.date}</small>
                    <b>
                      {r.score}
                      <span> 声望</span>
                    </b>
                    <p>
                      单人评级 {r.rating >= 0 ? "+" : ""}
                      {r.rating}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
          <footer className="ct-footer">
            <span>一桌好戏 · CARTOGRAPHERS</span>
            <span>一笔一格，世界由你展开。</span>
          </footer>
        </>
      ) : screen === "tutorial" ? (
        <Tutorial onExit={() => setScreen("home")} onStart={start} />
      ) : screen === "online" && !snapshot?.game ? (
        <section className="ct-lobby">
          <span className="ct-eyebrow">THE CARTOGRAPHERS' GUILD</span>
          <h1>制图师集合处</h1>
          <p>
            房间号{" "}
            <strong className="ct-room-code">
              {snapshot?.code || "连接中"}
            </strong>
          </p>
          <div className="ct-lobby-actions">
            <button className="ct-primary" onClick={copyInvite}>
              {copied ? "邀请链接已复制" : "复制完整邀请链接"}
            </button>
            <span>
              {snapshot?.status === "online" || snapshot?.status === "waiting"
                ? "已连接"
                : snapshot?.status === "connecting"
                  ? "正在连接中转…"
                  : "等待网络恢复…"}
            </span>
          </div>
          <div className="ct-peers">
            {snapshot?.peers.map((p) => (
              <div key={p.id}>
                <span className="ct-avatar">{p.name.slice(0, 1)}</span>
                <b>{p.name}</b>
                <span>
                  {p.online ? (p.ready ? "已准备" : "整理画笔中") : "已断线"}
                </span>
              </div>
            ))}
          </div>
          <p>至少 2 人、最多 6 人。所有人准备后，由房主启程。</p>
          {snapshot?.error && (
            <p role="alert" className="ct-error">
              {snapshot.error}
            </p>
          )}
          {snapshot?.warning && <p>{snapshot.warning}</p>}
          <div className="ct-lobby-actions">
            <button
              onClick={() =>
                roomCall(
                  room?.ready(
                    !snapshot?.peers.find((p) => p.id === snapshot.meId)?.ready,
                  ),
                )
              }
            >
              切换准备状态
            </button>
            {snapshot?.host && (
              <button
                className="ct-primary"
                onClick={() => roomCall(room?.startGame())}
              >
                开始远征 →
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  await room?.leave();
                  setRoom(null);
                  setSnapshot(null);
                  setScreen("home");
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              离开房间
            </button>
          </div>
        </section>
      ) : current ? (
        <>
          <div className="ct-session-toolbar">
            <span>
              {screen === "solo"
                ? "单人远征 · 自动保存"
                : `朋友房间 ${snapshot?.code}`}
            </span>
            <button onClick={exportMap} disabled={current.phase !== "finished"}>
              {current.phase === "finished"
                ? "导出地图 PNG ↓"
                : "完局后可导出地图"}
            </button>
            {screen === "online" && (
              <button onClick={copyInvite}>邀请朋友</button>
            )}
          </div>
          <GameTable
            game={current}
            actor={screen === "online" ? snapshot!.meId : "solo"}
            onAction={
              screen === "online" ? (a) => roomCall(room?.act(a)) : action
            }
            pending={
              screen === "online" &&
              (snapshot?.pending ||
                snapshot?.status !== "online" ||
                snapshot?.peers.some((p) => !p.online))
            }
            notice={
              screen === "online"
                ? snapshot?.error ||
                  (snapshot?.status !== "online"
                    ? "正在恢复连接，地图和座位已保留。"
                    : snapshot?.peers.some((p) => !p.online)
                      ? "有制图师暂时离线，已暂停，等待重连后继续。"
                      : "") ||
                  snapshot?.warning ||
                  "所有人落笔后，自动翻开下一张探索牌。"
                : ""
            }
          />
          {current.phase === "finished" && (
            <section className="ct-final">
              <span className="ct-eyebrow">A KINGDOM TO REMEMBER</span>
              <h2>
                {screen === "solo"
                  ? soloRating(
                      scoreTotal(current.players[0].seasons),
                      current.goals,
                    ).title
                  : `${winners(current.players)
                      .map((p) => p.name)
                      .join(
                        "、",
                      )}${winners(current.players).length > 1 ? " 并列获胜" : " 赢得本次远征"}`}
              </h2>
              {screen === "solo" && (
                <p>
                  总声望 {scoreTotal(current.players[0].seasons)} ·
                  扣除敕令基准后评级{" "}
                  <b>
                    {
                      soloRating(
                        scoreTotal(current.players[0].seasons),
                        current.goals,
                      ).score
                    }
                  </b>
                </p>
              )}
              <button
                className="ct-primary"
                onClick={
                  screen === "solo" ? start : () => roomCall(room?.rematch())
                }
              >
                再绘一个王国 →
              </button>
              <button onClick={() => setScreen("home")}>返回书桌</button>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
