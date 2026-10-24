import { useEffect, useState } from "react";
import {
  clearSavedRoom,
  createRoom,
  joinRoom,
  restoreRoom,
  type DinnerRoom,
  type RoomSnapshot,
} from "./room";
import type { DinnerAction, DishCard } from "./types";
import { DishArt } from "./components/DishArt";
import { Tutorial } from "./components/Tutorial";
import "./dinner.css";

const NAME_KEY = "tabletop-dinner-name";
const statusNames = {
  connecting: "正在入座",
  online: "已入座",
  waiting: "等待房主",
  offline: "连接已暂停",
  closed: "房间已结束",
};
const initialHash = new URLSearchParams(window.location.hash.slice(1));
function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}
function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "刚才的操作没有完成，请再试一次。";
}

export default function DinnerApp() {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(initialHash.get("room") || "");
  const [room, setRoom] = useState<DinnerRoom | null>(null);
  const [saved, setSaved] = useState<DinnerRoom | null>(null);
  const [snap, setSnap] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [bid, setBid] = useState(1);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaveForHome, setLeaveForHome] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  useEffect(() => {
    let live = true;
    restoreRoom()
      .then((value) => {
        if (live) setSaved(value);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!room) return;
    const update = () => setSnap(room.getSnapshot());
    update();
    const unsub = room.subscribe(update);
    return () => {
      unsub();
      room.stop();
    };
  }, [room]);
  const game = snap?.game;
  useEffect(() => {
    setSelected(null);
    setBid((game?.bid || 0) + 1);
  }, [game?.revision]);
  async function run(task: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function enter(kind: "create" | "join" | "restore") {
    await run(async () => {
      if (kind !== "restore" && !name.trim())
        throw new Error("先写一个大家认得的称呼吧。");
      if (kind === "join" && !code.trim())
        throw new Error("请输入朋友发来的房间码。");
      const next =
        kind === "restore"
          ? saved
          : kind === "create"
            ? await createRoom(name.trim())
            : await joinRoom(
                name.trim(),
                code.trim().toUpperCase(),
                initialHash.get("host") || undefined,
              );
      if (!next) throw new Error("没有找到可恢复的饭局。");
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* Storage is optional. */
      }
      setRoom(next);
      setSaved(null);
      await next.connect();
    });
  }
  async function copy(value: string, message: string) {
    await run(async () => {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    });
  }
  function act(action: DinnerAction) {
    if (room) void run(() => room.act(action));
  }
  const activeOffline =
    !!game &&
    game.players.some(
      (p) =>
        !p.eliminated && !snap?.peers.find((peer) => peer.id === p.id)?.online,
    );
  const locked =
    busy || !!snap?.pending || snap?.status !== "online" || activeOffline;
  const myTurn = game?.turn === snap?.meId;
  const mine = game?.players.find((p) => p.id === snap?.meId);
  const turnName =
    game?.players.find((p) => p.id === game.turn)?.name || "下一位";
  const canInitialPlace =
    game?.phase === "initial" &&
    !!mine &&
    !mine.eliminated &&
    !mine.stackCount &&
    (snap?.meId !== game.starter ||
      game.players.every(
        (p) => p.eliminated || p.id === snap.meId || p.stackCount > 0,
      ));
  const canPlace = canInitialPlace || (myTurn && game?.phase === "placing");
  const canBid =
    myTurn && (game?.phase === "placing" || game?.phase === "bidding");
  const challengeMine = game?.challenger === snap?.meId;
  const ownRemaining = !!mine && mine.stackCount > 0;
  const allCards = game?.me.allCards || [];
  const phaseLabels = {
    initial: "先盖一道菜",
    placing: "放菜，还是叫价？",
    bidding: "这口，你敢接吗？",
    revealing: "揭盖时刻",
    discard: "失去一道菜",
    chooseStarter: "选一位先上菜",
    roundEnd: "这一轮，吃明白了",
    finished: "今晚的识菜高手",
  };
  return (
    <div className="dinner-app">
      <header className="dinner-header">
        <a
          href="../index.html"
          className="brand-link"
          onClick={(event) => {
            if (room) {
              event.preventDefault();
              setLeaveForHome(true);
              setLeaveConfirm(true);
            }
          }}
        >
          一桌好戏 <span> / 饭局现场</span>
        </a>
        <button className="text-button" onClick={() => setTutorial(true)}>
          怎么玩
        </button>
      </header>
      {!snap ? (
        <main className="dinner-home">
          <section className="dinner-hero">
            <div className="hero-copy">
              <span className="eyebrow">好菜？坏菜？先别急着动筷。</span>
              <h1>
                这口
                <br />
                <em>能吃吗</em>
                <span>？</span>
              </h1>
              <p>
                一桌料理，半桌心眼。
                <br />
                盖好你的菜，让朋友猜。
              </p>
              <div className="hero-tags">
                <span>3–6 人</span>
                <span>约 15 分钟</span>
                <span>手机联机</span>
              </div>
            </div>
            <div className="hero-plates">
              <div className="hero-dish">
                <DishArt dish={{ name: "红烧肉", kind: "safe" }} />
                <span>看起来，很香。</span>
              </div>
              <div className="hero-cover">
                <DishArt covered />
                <span>但这一碗呢？</span>
              </div>
            </div>
          </section>
          <div className="home-bottom">
            <section className="entry-panel">
              <span className="eyebrow">饭局开始前</span>
              <h2>留个称呼，就能上桌</h2>
              <label htmlFor="dinner-name">你的称呼</label>
              <input
                id="dinner-name"
                value={name}
                maxLength={16}
                autoComplete="nickname"
                placeholder="大家怎么叫你？"
                onChange={(e) => setName(e.target.value)}
              />
              <button
                disabled={busy}
                className="primary"
                onClick={() => void enter("create")}
              >
                {busy ? "正在安排座位…" : "我来开一桌"}
                <span>→</span>
              </button>
              <div className="entry-divider">朋友已经开桌了？</div>
              <label htmlFor="room-code">房间码</label>
              <div className="join-row">
                <input
                  id="room-code"
                  autoCapitalize="characters"
                  value={code}
                  placeholder="输入房间码"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <button
                  disabled={busy}
                  className="secondary"
                  onClick={() => void enter("join")}
                >
                  加入饭局
                </button>
              </div>
              {saved && (
                <div className="restore-row">
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => void enter("restore")}
                  >
                    恢复上次饭局 →
                  </button>
                  <button
                    className="text-button muted"
                    onClick={() => setClearConfirm(true)}
                  >
                    清除记录
                  </button>
                </div>
              )}
            </section>
            <section className="quick-rules">
              <span className="eyebrow">三句话，上桌就会</span>
              {[
                ["01", "盖一道菜", "好菜坏菜，只有自己知道。"],
                ["02", "喊个数，赌一口", "说你能翻出几道好菜；不敢就放弃。"],
                ["03", "揭开见真章", "碰到坏菜就丢牌，先赢两轮就获胜。"],
              ].map(([n, title, text]) => (
                <div className="rule-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
              <button
                className="text-button tutorial-link"
                onClick={() => setTutorial(true)}
              >
                亲手试一轮 <span>↗</span>
              </button>
            </section>
          </div>
        </main>
      ) : (
        <main className="dinner-room">
          <section className="room-bar">
            <div>
              <span className="eyebrow">这一桌的暗号</span>
              <div className="room-code">
                {snap.code}
                <span
                  className={`connection ${snap.status === "online" ? "connected" : ""}`}
                >
                  {statusNames[snap.status]}
                </span>
              </div>
            </div>
            <div className="room-tools">
              <button
                className="secondary"
                onClick={() => void copy(snap.code, "房间码已复制")}
              >
                复制房间码
              </button>
              <button
                className="primary"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.hash = new URLSearchParams({
                    room: snap.code,
                    host: snap.pin,
                  }).toString();
                  void copy(url.href, "邀请链接已复制，发给朋友就能入座");
                }}
              >
                邀请朋友
              </button>
            </div>
          </section>
          {activeOffline && (
            <p className="info-banner" role="status">
              有朋友暂时离线，饭局暂停一下，等 TA 回来。
            </p>
          )}
          {snap.warning && (
            <p className="info-banner" role="status">
              {snap.warning}
            </p>
          )}
          {snap.status !== "online" && (
            <div className="info-banner">
              连接暂停时，请先等大家重新入座。
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void run(() => room!.connect())}
              >
                重新连接
              </button>
            </div>
          )}
          {!game ? (
            <section className="lobby">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">留个位置，等你开席</span>
                  <h1>人齐，就上菜。</h1>
                </div>
                <span className="seat-count">{snap.peers.length} / 6 人</span>
              </div>
              <div className="lobby-seats">
                {snap.peers.map((p, i) => (
                  <article className="lobby-seat" key={p.id}>
                    <div className="avatar">
                      {p.name.slice(0, 1)}
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3>
                      {p.name}
                      {p.id === snap.meId && <small>你</small>}
                    </h3>
                    <p>
                      {p.id === snap.hostId
                        ? "房主"
                        : p.ready
                          ? "准备好了"
                          : "还在挑筷子"}{" "}
                      · {p.online ? "在线" : "离线"}
                    </p>
                    {snap.host && p.id !== snap.meId && (
                      <button
                        className="text-button muted"
                        disabled={locked}
                        onClick={() => void run(() => room!.kick(p.id))}
                      >
                        移出饭局
                      </button>
                    )}
                  </article>
                ))}
                {Array.from(
                  { length: Math.max(0, 3 - snap.peers.length) },
                  (_, i) => (
                    <article className="lobby-seat empty" key={`empty${i}`}>
                      <DishArt covered />
                      <p>留给下一位朋友</p>
                    </article>
                  ),
                )}
              </div>
              <div className="lobby-start">
                <p>
                  {snap.host
                    ? "你是房主，开席后请保持这个页面打开。"
                    : "准备好后，等房主开席。"}
                  <br />
                  <small>每人 3 道好菜、1 道坏菜，随机料理即将上桌。</small>
                </p>
                {snap.host ? (
                  <button
                    className="primary"
                    disabled={
                      locked ||
                      snap.peers.filter((p) => p.online).length < 3 ||
                      snap.peers.some((p) => p.id !== snap.meId && !p.ready)
                    }
                    onClick={() => void run(() => room!.startGame())}
                  >
                    人齐了，开席
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={locked}
                    onClick={() =>
                      void run(() =>
                        room!.ready(
                          !snap.peers.find((p) => p.id === snap.meId)?.ready,
                        ),
                      )
                    }
                  >
                    {snap.peers.find((p) => p.id === snap.meId)?.ready
                      ? "取消准备"
                      : "我准备好了"}
                  </button>
                )}
              </div>
            </section>
          ) : (
            <>
              <section className="game-heading">
                <div>
                  <span className="eyebrow">
                    第 {game.round} 轮 · 先赢 2 轮获胜
                  </span>
                  <h1>{phaseLabels[game.phase]}</h1>
                  <p aria-live="polite">
                    {game.message ||
                      (myTurn ? "轮到你了" : `等 ${turnName} 动筷`)}
                  </p>
                </div>
                {game.bid > 0 && (
                  <div className="bid-badge">
                    <span>本轮叫价</span>
                    <strong>
                      {game.bid}
                      <small> 道</small>
                    </strong>
                  </div>
                )}
              </section>
              <section className="dinner-table" aria-label="公开饭桌">
                {game.players.map((p, i) => {
                  const reveals = game.revealed.filter((r) => r.owner === p.id);
                  const remaining = p.stackCount;
                  const flip =
                    game.phase === "revealing" &&
                    challengeMine &&
                    remaining > 0 &&
                    (!ownRemaining || p.id === snap.meId);
                  const choose =
                    game.phase === "chooseStarter" && myTurn && !p.eliminated;
                  return (
                    <article
                      className={`player-place ${p.id === game.turn ? "current-turn" : ""} ${p.eliminated ? "eliminated" : ""}`}
                      key={p.id}
                    >
                      <div className="player-top">
                        <span className="seat-index">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <strong>
                          {p.name}
                          {p.id === snap.meId && <small>你</small>}
                        </strong>
                        <span
                          className="win-marks"
                          aria-label={`已赢 ${p.wins} 轮`}
                        >
                          {[0, 1].map((n) => (
                            <i key={n} className={n < p.wins ? "won" : ""} />
                          ))}
                        </span>
                      </div>
                      <div className="player-status">
                        {p.eliminated
                          ? "已离席"
                          : `${p.cardCount} 张牌 · ${snap.peers.find((peer) => peer.id === p.id)?.online ? "在线" : "离线"}${p.passed ? " · 已放弃" : ""}`}
                      </div>
                      <button
                        className={`covered-stack ${flip || choose ? "actionable" : ""}`}
                        disabled={locked || (!flip && !choose)}
                        onClick={() =>
                          act(
                            choose
                              ? { type: "chooseStarter", playerId: p.id }
                              : { type: "flip", owner: p.id },
                          )
                        }
                      >
                        <DishArt covered />
                        <span>
                          {choose
                            ? "请 TA 先上菜"
                            : flip
                              ? "揭开最上面一道"
                              : `${remaining} 道菜尚未揭开`}
                        </span>
                        {remaining > 1 && (
                          <b className="stack-count">×{remaining}</b>
                        )}
                      </button>
                      {reveals.length > 0 && (
                        <div className="revealed-dishes">
                          {reveals.map((r, n) => (
                            <div
                              className={`revealed-dish ${r.card.kind}`}
                              key={`${r.card.id}${n}`}
                            >
                              <DishArt dish={r.card} />
                              <span>{r.card.name}</span>
                              <b>{r.card.kind === "bad" ? "坏菜" : "好菜"}</b>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
              <section className="action-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      {myTurn || canInitialPlace ? "现在，轮到你" : "饭桌动态"}
                    </span>
                    <h2>
                      {game.phase === "finished"
                        ? `${game.players.find((p) => p.id === game.winner)?.name || "今晚的赢家"}，好眼力！`
                        : game.phase === "roundEnd"
                          ? "准备好下一轮了吗？"
                          : game.phase === "revealing"
                            ? challengeMine
                              ? ownRemaining
                                ? "先翻自己的菜，翻够叫价就成功"
                                : "点击任意对手的盖碗"
                              : "看看挑战者的眼光如何"
                            : game.phase === "discard"
                              ? myTurn
                                ? "挑一道要失去的菜"
                                : `等 ${turnName} 选择丢牌`
                              : game.phase === "chooseStarter"
                                ? myTurn
                                  ? "点一位玩家，请 TA 先来"
                                  : `等 ${turnName} 选择先手`
                                : canInitialPlace
                                  ? "先选一道菜，盖好放上桌"
                                  : myTurn
                                    ? "你要继续放菜，还是叫价？"
                                    : `等 ${turnName} 出招`}
                    </h2>
                  </div>
                </div>
                {(canPlace || (game.phase === "discard" && myTurn)) && (
                  <>
                    <p className="private-note">
                      只有你能看到这些菜 · 选中后再确认
                    </p>
                    <div className="hand-cards">
                      {(game.phase === "discard" ? allCards : game.me.hand).map(
                        (card) => (
                          <DishButton
                            key={card.id}
                            card={card}
                            selected={selected === card.id}
                            disabled={locked}
                            onClick={() => setSelected(card.id)}
                          />
                        ),
                      )}
                    </div>
                    <button
                      className="primary"
                      disabled={locked || !selected}
                      onClick={() =>
                        selected &&
                        act(
                          game.phase === "discard"
                            ? { type: "discard", cardId: selected }
                            : { type: "place", cardId: selected },
                        )
                      }
                    >
                      {game.phase === "discard"
                        ? "确认失去这道菜"
                        : "盖好，就放这道"}
                    </button>
                  </>
                )}
                {canBid && (
                  <div className="bid-controls">
                    <label htmlFor="dinner-bid">我敢翻出</label>
                    <input
                      id="dinner-bid"
                      type="number"
                      min={game.bid + 1}
                      max={game.players.reduce(
                        (sum, p) => sum + p.stackCount,
                        0,
                      )}
                      value={bid}
                      onChange={(e) => setBid(Number(e.target.value))}
                    />
                    <span>道好菜</span>
                    <button
                      className="primary"
                      disabled={
                        locked ||
                        !Number.isInteger(bid) ||
                        bid <= game.bid ||
                        bid >
                          game.players.reduce((sum, p) => sum + p.stackCount, 0)
                      }
                      onClick={() => act({ type: "bid", amount: bid })}
                    >
                      {game.bid ? "加价" : "叫价"}
                    </button>
                    {game.phase === "bidding" && (
                      <button
                        className="secondary"
                        disabled={locked}
                        onClick={() => act({ type: "pass" })}
                      >
                        这轮放弃
                      </button>
                    )}
                  </div>
                )}
                {game.phase === "roundEnd" && (
                  <button
                    disabled={locked}
                    className="primary"
                    onClick={() => act({ type: "next" })}
                  >
                    再上一轮菜 →
                  </button>
                )}
                {game.phase === "finished" &&
                  (snap.host ? (
                    <button
                      disabled={locked}
                      className="primary"
                      onClick={() => void run(() => room!.rematch())}
                    >
                      换一桌菜，再来一局
                    </button>
                  ) : (
                    <p>等房主开启下一局。</p>
                  ))}
                {game.me.placed.length > 0 && (
                  <details className="private-placed">
                    <summary>偷偷看我盖的 {game.me.placed.length} 道菜</summary>
                    <p>按放入顺序排列，最后一道在最上面。</p>
                    <div className="hand-cards">
                      {game.me.placed.map((card) => (
                        <DishButton key={card.id} card={card} disabled />
                      ))}
                    </div>
                  </details>
                )}
              </section>
            </>
          )}
          <div className="room-footer">
            <span>好菜靠眼光，坏菜靠演技。</span>
            <button
              className="text-button"
              onClick={() => {
                setLeaveForHome(false);
                setLeaveConfirm(true);
              }}
            >
              离开饭局
            </button>
          </div>
        </main>
      )}
      {(error || snap?.error) && (
        <div className="error-toast" role="alert">
          {error || snap?.error}
          <button className="text-button" onClick={() => setError("")}>
            知道了
          </button>
        </div>
      )}
      {notice && (
        <div className="notice-toast" role="status">
          {notice}
          <button className="text-button" onClick={() => setNotice("")}>
            关闭
          </button>
        </div>
      )}
      <footer className="dinner-footer">
        <span>一桌好戏 · 这口能吃吗</span>
        <a
          href="https://www.spacecowboys-games.com/game/skull/"
          target="_blank"
          rel="noreferrer"
        >
          规则灵感：Skull · 官方规则 ↗
        </a>
      </footer>
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      {leaveConfirm && (
        <div
          className="dinner-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
        >
          <section className="tutorial-sheet">
            <h2 id="leave-title">这就离席吗？</h2>
            <p>
              {game && game.phase !== "finished"
                ? "离开会暂停你的连接。座位保留在本机，可以稍后恢复这局。"
                : snap?.host
                  ? "你是房主，离开后这桌朋友将无法继续这局。"
                  : "离席后，这局将失去你的座位。"}
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => setLeaveConfirm(false)}
              >
                继续坐着
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await room?.leave();
                    setSaved(game && game.phase !== "finished" ? room : null);
                    setRoom(null);
                    setSnap(null);
                    setLeaveConfirm(false);
                    setError("");
                    if (leaveForHome) window.location.assign("../index.html");
                  })
                }
              >
                确认离开
              </button>
            </div>
            {error && <p role="alert">{error}</p>}
          </section>
        </div>
      )}
      {clearConfirm && (
        <div
          className="dinner-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-title"
        >
          <section className="tutorial-sheet">
            <h2 id="clear-title">清除上次的座位？</h2>
            <p>清除后，这台设备将无法恢复上次饭局。</p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => setClearConfirm(false)}
              >
                保留记录
              </button>
              <button
                className="primary"
                onClick={() => {
                  try {
                    saved?.stop();
                    clearSavedRoom();
                    setSaved(null);
                    setClearConfirm(false);
                  } catch (e) {
                    setClearConfirm(false);
                    setError(errorText(e));
                  }
                }}
              >
                确认清除
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function DishButton({
  card,
  selected = false,
  disabled = false,
  onClick,
}: {
  card: DishCard;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`dish-card ${selected ? "selected" : ""} ${card.kind}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="dish-kind">{card.kind === "bad" ? "坏菜" : "好菜"}</span>
      <DishArt dish={card} />
      <strong>{card.name}</strong>
      <small>{card.kind === "bad" ? "翻到就失败" : "放心吃一口"}</small>
    </button>
  );
}
