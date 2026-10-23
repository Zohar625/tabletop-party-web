import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { buildQuestionPool, createGame } from "./games/bluff/engine";
import type { ActionInput, Config, PublicView } from "./games/bluff/types";
import { allQuestions, packs } from "./games/bluff/questions";
import { createDefaultConfig, READ_PRESETS } from "./games/bluff/defaults";
import {
  clearHistory,
  loadHistory,
  loadSession,
  LocalSession,
} from "./session/localSession";
import type { Store } from "./session/localSession";
import type { SessionAdapter } from "./session/types";
import { startReadingClock } from "./session/readingClock";
import { games } from "./games/registry";
function getStore(): Store {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {
        throw Error("Unavailable");
      },
      removeItem: () => {
        throw Error("Unavailable");
      },
    };
  }
}
const store = getStore();
type Modal = {
  title: string;
  text: string;
  confirm: string;
  action: () => void;
};
const packStyles = ["leaf", "clay", "rose", "blue", "gold"];
function Icon({ name = "cards", size = 24 }: { name?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "arrow" ? (
        <path d="M5 12h14m-5-5 5 5-5 5" />
      ) : name === "check" ? (
        <path d="m5 12 4 4L19 6" />
      ) : name === "people" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-3a6 6 0 0 1 12 0v3m1-15a3 3 0 0 1 0 6m3 9v-3a6 6 0 0 0-2-4" />
        </>
      ) : name === "clock" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      ) : name === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
        </>
      ) : name === "leaf" ? (
        <>
          <path d="M20 3C8 2 2 8 5 15c7 6 16 0 15-12Z" />
          <path d="m3 21 12-12M7 17v-6m0 6h6" />
        </>
      ) : name === "cup" ? (
        <>
          <path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v3c0 3 2 4 5 4m9-7h4v3c0 3-2 4-5 4m-4 3v5m-5 1h10" />
        </>
      ) : name === "spark" ? (
        <>
          <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
        </>
      ) : (
        <>
          <rect x="6" y="3" width="13" height="17" rx="2" />
          <path d="m6 6-3 1 1 15 12-1m-5-12h3m-4 5h5" />
        </>
      )}
    </svg>
  );
}
function Primary({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="primary" disabled={disabled} onClick={onClick}>
      {children}
      <Icon name="arrow" size={20} />
    </button>
  );
}
function CardArt() {
  return (
    <div className="card-art" aria-hidden="true">
      <span className="orbit orbit-one" />
      <span className="orbit orbit-two" />
      <div className="art-card back-card">
        <span>?</span>
      </div>
      <div className="art-card front-card">
        <span className="art-corner">一桌好戏</span>
        <svg viewBox="0 0 120 110" fill="none">
          <path
            d="M27 50C30 22 87 20 92 52L86 75 64 88 40 78Z"
            fill="#f3cd6b"
            stroke="#253f32"
            strokeWidth="3"
          />
          <path
            d="M35 52c12-8 39-8 49 0M46 60v5m26-5v5m-22 9c7 5 13 5 20 0"
            stroke="#253f32"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="m22 39-8-6m85-3 7-7m-2 54 9 3M60 12v-9"
            stroke="#253f32"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <strong>
          一本正经
          <br />
          胡说八道？
        </strong>
        <span className="art-bottom">THE BLUFF CLUB</span>
      </div>
      <div className="art-stamp">
        你信吗<span>YOU SURE?</span>
      </div>
      <i className="small-star">✦</i>
    </div>
  );
}
export default function App() {
  const [boot] = useState(() => loadSession(store));
  const [session, setSession] = useState<SessionAdapter | null>(boot.session);
  const [screen, setScreen] = useState<"lobby" | "setup" | "game">(
    boot.session ? "game" : "lobby",
  );
  const [, redraw] = useState(0);
  const [notice, setNotice] = useState(
    boot.warning ||
      (boot.session
        ?.getPublicView()
        .config.selectedPackIds.some((id) => !packs.some((p) => p.id === id))
        ? "你正在继续旧题库的对局。退出本局并重新开桌，即可使用新的长卡题库和默认5秒。"
        : ""),
  );
  const [modal, setModal] = useState<Modal | null>(null);
  const [rules, setRules] = useState(false);
  const [config, setConfig] = useState<Config>(() =>
    createDefaultConfig(packs.map((p) => p.id)),
  );
  const [historyVersion, setHistoryVersion] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [vote, setVote] = useState("");
  const main = useRef<HTMLElement>(null);
  const view = session?.getPublicView();
  const phase = view?.phase;
  useEffect(() => session?.subscribe(() => redraw((n) => n + 1)), [session]);
  useEffect(() => {
    setVote("");
    main.current?.focus();
    window.scrollTo({ top: 0 });
  }, [phase, view?.roundId, view?.readerIndex, view?.voteIndex, screen]);
  useEffect(() => {
    if (!session) return;
    return startReadingClock(
      session,
      setNow,
      (error) => {
        setNotice(
          error instanceof Error
            ? error.message
            : "读卡状态已变化，请刷新页面后继续。",
        );
      },
      {
        now: Date.now,
        setInterval: (tick, delay) => window.setInterval(tick, delay),
        clearInterval: (id) => window.clearInterval(id),
      },
    );
  }, [session, phase]);
  useEffect(() => {
    if (!session) return;
    const close = () => {
      setModal(null);
      setRules(false);
      try {
        if (session.getPublicView().phase === "reading")
          session.dispatch({ type: "consumeRead" });
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "对局状态已变化，请刷新页面后继续。",
        );
      }
    };
    const hide = () => {
      if (document.visibilityState === "hidden") close();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", close);
    window.addEventListener("beforeunload", close);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", close);
      window.removeEventListener("beforeunload", close);
    };
  }, [session]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== store) return;
      setHistoryVersion((version) => version + 1);
      if (session && event.key === "tabletop.session.v1") {
        setModal(null);
        setRules(false);
        setNotice("其他页面已更新或清除对局，请刷新当前页面后继续。");
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [session]);
  function dispatch(action: ActionInput) {
    try {
      session?.dispatch(action);
      setNotice("");
      setNow(Date.now());
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function exit() {
    setModal({
      title: "退出这一局？",
      text: "本局积分将清空，已经展示的词仍会保留在本设备的已玩历史里。",
      confirm: "退出本局",
      action: () => {
        try {
          session?.discard();
        } catch {
          setNotice(
            session?.getWarning() || "无法清除存档，重新打开时可能恢复旧局。",
          );
          return;
        }
        setSession(null);
        setScreen("setup");
        setHistoryVersion((v) => v + 1);
      },
    });
  }
  function start() {
    try {
      const history = loadHistory(store);
      const pool = buildQuestionPool(config, allQuestions, history.seen);
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
      setSession(new LocalSession(createGame(config, pool, seed), store));
      setScreen("game");
      setNotice("");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const historyInfo = useMemo(
    () => loadHistory(store),
    [session, view?.sequence, historyVersion],
  );
  const seen = historyInfo.seen;
  const available = useMemo(
    () =>
      config.selectedPackIds.length
        ? buildQuestionPool(config, allQuestions, seen).length
        : 0,
    [config, seen],
  );
  const playerName = (id: string) =>
    view?.players.find((p) => p.id === id)?.name ?? "";
  const isReading = phase === "reading";
  const card =
    view && isReading
      ? session!.getPrivateView(view.players[view.readerIndex]!.id)
      : null;
  const warning = session?.getWarning() || historyInfo.warning;
  return (
    <>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => (session ? setScreen("game") : setScreen("lobby"))}
          aria-label="一桌好戏首页"
        >
          <span className="brand-mark">
            <Icon size={23} />
          </span>
          <strong>
            一桌好戏<span>TABLE TALK CLUB</span>
          </strong>
        </button>
        <div className="header-right">
          <span className="mode-label">
            <i />
            一部手机，一桌朋友
          </span>
          <button
            className="text-button"
            disabled={isReading}
            onClick={() => setRules(true)}
          >
            怎么玩 <span>↗</span>
          </button>
        </div>
      </header>
      <main
        ref={main}
        tabIndex={-1}
        className={`main ${screen === "game" ? "game-main" : ""}`}
      >
        {notice && (
          <div className="notice" role="alert">
            {notice}
            <button aria-label="关闭提示" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {warning && (
          <div className="notice" role="alert">
            {warning}
          </div>
        )}
        {screen === "lobby" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span />
                  今晚，玩点不一样的
                </p>
                <h1>
                  把手机放桌上，
                  <br />
                  好戏<span className="underline">开场。</span>
                </h1>
                <p className="hero-description">
                  不用下载，不用注册。
                  <br />
                  召集你的朋友，一部手机就能开一桌。
                </p>
                <button
                  className="primary hero-button"
                  onClick={() => setScreen("setup")}
                >
                  来一局瞎掰王
                  <Icon name="arrow" size={21} />
                </button>
                <div className="hero-meta">
                  <span>
                    <Icon name="people" size={16} />
                    3–9 位朋友
                  </span>
                  <span>
                    <Icon name="clock" size={16} />约 15–30 分钟
                  </span>
                </div>
              </div>
              <CardArt />
            </section>
            <section className="shelf">
              <div className="section-title">
                <div>
                  <p className="eyebrow">PICK YOUR PLAY</p>
                  <h2>今天玩什么</h2>
                </div>
                <span className="small-note">讲个故事，或下盘好棋</span>
              </div>
              <button className="game-tile" onClick={() => setScreen("setup")}>
                <div className="tile-art">
                  <span>真</span>
                  <span>掰</span>
                  <i>?</i>
                </div>
                <div className="tile-copy">
                  <div className="tile-top">
                    <span className="tag">推理 · 表达 · 冷知识</span>
                    <span className="available">现在可玩</span>
                  </div>
                  <h3>
                    {games[0]!.title}
                    <span>冷知识局</span>
                  </h3>
                  <p>{games[0]!.subtitle}</p>
                  <div className="tile-bottom">
                    <span>3–9 人 · 单手机传阅</span>
                    <span className="circle-arrow">
                      <Icon name="arrow" size={20} />
                    </span>
                  </div>
                </div>
              </button>
              <a className="game-tile chess-tile" href={games[1]!.href}>
                <div className="tile-art chess-art" aria-hidden="true">
                  <div>
                    {["X", "", "O", "", "X", "", "O", "", "X"].map(
                      (mark, index) => (
                        <b key={index}>{mark}</b>
                      ),
                    )}
                  </div>
                </div>
                <div className="tile-copy">
                  <div className="tile-top">
                    <span className="tag">策略 · 对弈 · 三子连线</span>
                    <span className="available">现在可玩</span>
                  </div>
                  <h3>
                    {games[1]!.title}
                    <span>田园双人局</span>
                  </h3>
                  <p>{games[1]!.subtitle}</p>
                  <div className="tile-bottom">
                    <span>2 人 · 同屏轮流落子</span>
                    <span className="circle-arrow">
                      <Icon name="arrow" size={20} />
                    </span>
                  </div>
                </div>
              </a>
              <p className="coming">
                更多桌游，慢慢上桌。<span>好戏与好棋，都在这一桌。</span>
              </p>
            </section>
            <section className="how-strip">
              <div>
                <b>01</b>
                <span>
                  传手机
                  <br />
                  <small>每人偷偷读自己的卡</small>
                </span>
              </div>
              <div>
                <b>02</b>
                <span>
                  讲故事
                  <br />
                  <small>一个人在一本正经地编</small>
                </span>
              </div>
              <div>
                <b>03</b>
                <span>
                  找瞎掰人
                  <br />
                  <small>投出你最怀疑的那一位</small>
                </span>
              </div>
            </section>
          </>
        )}
        {screen === "setup" && (
          <>
            <button
              className="back text-button"
              onClick={() => setScreen("lobby")}
            >
              ← 返回游戏大厅
            </button>
            <div className="page-heading">
              <p className="eyebrow">LET'S SET THE TABLE</p>
              <h1>这一桌，怎么开？</h1>
              <p>选好人数和题材，把手机交给 1 号玩家。</p>
            </div>
            <div className="setup-layout">
              <div className="setup-options">
                <section className="panel">
                  <div className="section-title">
                    <h2>
                      <Icon name="people" />
                      几位朋友
                    </h2>
                    <span>一圈 {config.playerCount} 轮</span>
                  </div>
                  <div className="segmented player-select">
                    {[3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        aria-pressed={config.playerCount === n}
                        className={config.playerCount === n ? "selected" : ""}
                        onClick={() => setConfig({ ...config, playerCount: n })}
                      >
                        {n}
                        <small>人</small>
                      </button>
                    ))}
                  </div>
                  <p className="helper">
                    每轮独立抽取瞎掰人，可能连续抽中同一人。
                  </p>
                  <div className="section-title subheading">
                    <h2>
                      <Icon name="clock" />
                      读卡时间
                    </h2>
                    <span>每位玩家相同</span>
                  </div>
                  <div className="time-options">
                    {READ_PRESETS.map((n) => (
                      <button
                        className={`choice ${config.readSeconds === n ? "selected" : ""}`}
                        key={n}
                        onClick={() => setConfig({ ...config, readSeconds: n })}
                      >
                        {n} 秒{n === 5 && <small>默认</small>}
                      </button>
                    ))}
                    <label className="custom-time">
                      自定义
                      <input
                        aria-label="自定义阅读秒数"
                        type="number"
                        min="5"
                        max="120"
                        value={config.readSeconds}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            readSeconds: Number(e.target.value),
                          })
                        }
                      />
                      <span>秒</span>
                    </label>
                  </div>
                  <p className="helper">
                    不一定来得及读完。记住一点真知识，就开始你的表演。
                  </p>
                </section>
                <section className="panel pack-panel">
                  <div className="section-title">
                    <h2>
                      <Icon name="cards" />
                      把哪些题材放上桌
                    </h2>
                    <button
                      className="text-button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          selectedPackIds:
                            config.selectedPackIds.length === packs.length
                              ? []
                              : packs.map((p) => p.id),
                        })
                      }
                    >
                      {config.selectedPackIds.length === packs.length
                        ? "取消全选"
                        : "全部选上"}
                    </button>
                  </div>
                  <p className="helper pack-intro">
                    当前有 {allQuestions.length}{" "}
                    道离谱真事长卡，混合直白词与陌生词。原题库已保留归档。
                  </p>
                  <div className="pack-list">
                    {packs.map((p, i) => {
                      const checked = config.selectedPackIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          className={`pack ${checked ? "checked" : ""}`}
                          aria-pressed={checked}
                          onClick={() =>
                            setConfig({
                              ...config,
                              selectedPackIds: checked
                                ? config.selectedPackIds.filter(
                                    (x) => x !== p.id,
                                  )
                                : [...config.selectedPackIds, p.id],
                            })
                          }
                        >
                          <span className={`pack-symbol ${packStyles[i]}`}>
                            <Icon name="cards" size={25} />
                          </span>
                          <span className="pack-body">
                            <strong>{p.title}</strong>
                            <small>{p.description}</small>
                            <em>
                              {p.questions.length} 题 · 本设备未玩{" "}
                              {
                                p.questions.filter(
                                  (q) => !seen.has(q.conceptId),
                                ).length
                              }{" "}
                              题
                            </em>
                          </span>
                          <span className="checkbox">
                            {checked && <Icon name="check" size={17} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
              <aside className="setup-summary">
                <span className="ticket-top">YOUR TABLE IS ALMOST READY</span>
                <h2>
                  准备好
                  <br />
                  一本正经地瞎掰？
                </h2>
                <dl>
                  <div>
                    <dt>这一桌</dt>
                    <dd>
                      {config.playerCount} 人 · {config.playerCount} 轮
                    </dd>
                  </div>
                  <div>
                    <dt>读卡时间</dt>
                    <dd>{config.readSeconds} 秒 / 人</dd>
                  </div>
                  <div>
                    <dt>主题组合</dt>
                    <dd>{config.selectedPackIds.length} 个题包</dd>
                  </div>
                  <div>
                    <dt>可用冷知识</dt>
                    <dd
                      className={
                        available < config.playerCount ** 2 ? "low" : ""
                      }
                    >
                      {available}{" "}
                      <small>/ 需要 {config.playerCount ** 2} 题</small>
                    </dd>
                  </div>
                </dl>
                <label className="history-toggle">
                  <input
                    type="checkbox"
                    checked={config.allowHistoryQuestions}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        allowHistoryQuestions: e.target.checked,
                      })
                    }
                  />
                  <span>允许使用本设备玩过的题</span>
                </label>
                {available < config.playerCount ** 2 && (
                  <p className="capacity-warning">
                    {allQuestions.length < config.playerCount ** 2
                      ? `当前题库共 ${allQuestions.length} 题，${config.playerCount} 人一圈需要 ${config.playerCount ** 2} 题。请减少人数；允许历史题也不会让本局重复抽题。`
                      : "未玩题目还不够。可勾选允许使用历史题，或减少人数。"}
                  </p>
                )}
                <Primary
                  disabled={
                    available < config.playerCount ** 2 ||
                    config.readSeconds < 5 ||
                    config.readSeconds > 120 ||
                    !Number.isInteger(config.readSeconds)
                  }
                  onClick={start}
                >
                  开桌，开始传手机
                </Primary>
                <p className="summary-note">
                  <Icon name="lock" size={14} />
                  点击阅读后才开始计时
                </p>
                <button
                  className="clear-history text-button"
                  onClick={() =>
                    setModal({
                      title: "清空本设备已玩历史？",
                      text: "清空后，之前展示过的词可能会再次抽到。此操作只影响这台设备。",
                      confirm: "清空历史",
                      action: () => {
                        try {
                          clearHistory(store);
                          setHistoryVersion((n) => n + 1);
                          setNotice("已清空本设备的已玩历史。");
                        } catch {
                          setNotice("历史清除失败，请检查浏览器存储权限。");
                        }
                      },
                    })
                  }
                >
                  清空已玩历史（{seen.size} 题）
                </button>
              </aside>
            </div>
          </>
        )}
        {screen === "game" && view && (
          <>
            <div className="game-toolbar">
              <button
                className="text-button"
                disabled={isReading}
                onClick={exit}
              >
                ← 退出本局
              </button>
              <span>
                瞎掰王 <i /> 第 {view.roundIndex + 1} /{" "}
                {view.config.playerCount} 轮
              </span>
              <button
                className="text-button"
                disabled={
                  isReading || ["results", "finished"].includes(view.phase)
                }
                onClick={() =>
                  setModal({
                    title: "整轮重新发牌？",
                    text: "本轮不计分，所有人换新词。已经展示过的词会保留在已玩历史中。",
                    confirm: "确认整轮重发",
                    action: () => dispatch({ type: "redeal" }),
                  })
                }
              >
                整轮重发
              </button>
            </div>
            <div className="round-progress">
              {Array.from({ length: view.config.playerCount }, (_, i) => (
                <span className={i <= view.roundIndex ? "done" : ""} key={i} />
              ))}
            </div>
            {view.phase === "handoff" && (
              <section className="play-card handoff">
                <span className="step-label">
                  秘密读卡 · {view.readerIndex + 1} / {view.config.playerCount}
                </span>
                <div className="pass-icon">
                  <Icon name="lock" size={33} />
                </div>
                <p className="eyebrow">请把手机交给</p>
                <h1>{playerName(view.handoff!.playerId)}</h1>
                <p className="muted">你的词是</p>
                <div className="handoff-word">{view.handoff!.term}</div>
                <p className="card-caption">
                  先确认其他人看不到屏幕。
                  <br />
                  点击后，你有 {view.config.readSeconds} 秒记住卡片。
                </p>
                <Primary onClick={() => dispatch({ type: "read" })}>
                  我是{playerName(view.handoff!.playerId)}，开始阅读
                </Primary>
                <small className="footnote">
                  等待时不计时 · 看完后不能重看
                </small>
              </section>
            )}
            {view.phase === "reading" && (
              <section className="play-card reading" aria-label="私密卡片">
                <div className="reading-top">
                  <span className="step-label">
                    仅 {playerName(view.players[view.readerIndex]!.id)} 阅读
                  </span>
                  <span className="countdown" role="timer">
                    {Math.max(0, Math.ceil((view.deadline! - now) / 1000))}
                    <small>秒</small>
                  </span>
                </div>
                <div className="timer-track">
                  <span
                    style={{
                      transform: `scaleX(${Math.max(0, (view.deadline! - now) / (view.config.readSeconds * 1000))})`,
                    }}
                  />
                </div>
                {card ? (
                  <>
                    <p className="eyebrow">你的冷知识</p>
                    <h1 className="private-word">{card.term}</h1>
                    <span className="role-badge">
                      {card.role === "bluffer"
                        ? "你的身份：瞎掰人"
                        : "你的身份：知情人"}
                    </span>
                    <div className="explanation">
                      <p>{card.text}</p>
                    </div>
                    <p className="reading-note">
                      {card.role === "bluffer"
                        ? "像真的一样说出来，别让表情出卖你。"
                        : "抓住关键细节，稍后用自己的话解释；不必逐字复述。"}
                    </p>
                  </>
                ) : (
                  <p className="locked-message">阅读已结束，正在交接…</p>
                )}
                <p className="private-footer">
                  <Icon name="lock" size={15} />
                  到时自动收起 · 切到后台也会结束阅读
                </p>
              </section>
            )}
            {["speaking", "discussion"].includes(view.phase) && (
              <section className="public-stage">
                <div className="stage-heading">
                  <p className="eyebrow">
                    {view.phase === "speaking"
                      ? "EVERYONE HAS A STORY"
                      : "TALK IT OUT"}
                  </p>
                  <h1>
                    {view.phase === "speaking"
                      ? "轮到你，说得像真的。"
                      : "聊一聊，谁在瞎掰？"}
                  </h1>
                  <p>
                    {view.phase === "speaking"
                      ? `现在请 ${playerName(view.speakerId)} 解释自己的词。`
                      : "所有人已发言。可以追问细节，也可以互相试探。"}
                  </p>
                </div>
                <TermList
                  view={view}
                  highlight={
                    view.phase === "speaking" ? view.speakerId : undefined
                  }
                />
                <div className="stage-actions">
                  <Primary
                    onClick={() =>
                      dispatch({
                        type:
                          view.phase === "speaking"
                            ? "nextSpeaker"
                            : "startVoting",
                      })
                    }
                  >
                    {view.phase === "speaking"
                      ? "我说完了，下一步"
                      : "讨论结束，开始秘密投票"}
                  </Primary>
                  <p className="helper">知情人讲真实信息，瞎掰人尽情发挥。</p>
                </div>
              </section>
            )}
            {view.phase === "voteHandoff" && (
              <section className="play-card handoff">
                <span className="step-label">
                  秘密投票 · {view.voteIndex + 1} / {view.config.playerCount}
                </span>
                <div className="pass-icon">
                  <Icon name="cards" size={34} />
                </div>
                <p className="eyebrow">请把手机交给</p>
                <h1>{view.players[view.voteIndex]!.name}</h1>
                <p className="card-caption">
                  现在轮到你投票。
                  <br />
                  每人投一位其他玩家，全部投完后统一揭晓。
                </p>
                <Primary onClick={() => dispatch({ type: "openVote" })}>
                  我是{view.players[view.voteIndex]!.name}，去投票
                </Primary>
                <small className="footnote">没有人会看到你正在选谁</small>
              </section>
            )}
            {view.phase === "voting" && (
              <section className="voting-stage">
                <div className="stage-heading">
                  <p className="eyebrow">TRUST YOUR INSTINCT</p>
                  <h1>
                    {view.players[view.voteIndex]!.name}，<br />
                    你怀疑谁？
                  </h1>
                  <p>选一位你认为在瞎掰的人。不能投自己。</p>
                </div>
                <div className="vote-list">
                  {view.terms
                    .filter(
                      (t) => t.playerId !== view.players[view.voteIndex]!.id,
                    )
                    .map((t) => (
                      <button
                        key={t.playerId}
                        aria-pressed={vote === t.playerId}
                        className={`vote-option ${vote === t.playerId ? "selected" : ""}`}
                        onClick={() => setVote(t.playerId)}
                      >
                        <span className="seat">
                          {view.players
                            .find((p) => p.id === t.playerId)!
                            .seat.toString()
                            .padStart(2, "0")}
                        </span>
                        <span>
                          <strong>{playerName(t.playerId)}</strong>
                          <small>{t.term}</small>
                        </span>
                        <span className="checkbox">
                          {vote === t.playerId && (
                            <Icon name="check" size={17} />
                          )}
                        </span>
                      </button>
                    ))}
                </div>
                <Primary
                  disabled={!vote}
                  onClick={() =>
                    setModal({
                      title: `确定投给${playerName(vote)}？`,
                      text: "提交后不能修改，手机将交给下一位玩家。所有人的选择会在最后统一揭晓。",
                      confirm: "确认提交这一票",
                      action: () => dispatch({ type: "vote", target: vote }),
                    })
                  }
                >
                  提交我的选择
                </Primary>
                <p className="summary-note">
                  <Icon name="lock" size={14} />
                  提交后锁定 · 最后一票后统一揭晓
                </p>
              </section>
            )}
            {view.phase === "results" && view.result && (
              <section className="results-stage">
                <div className="reveal-banner">
                  <span className="eyebrow">THE BLUFF IS OVER</span>
                  <h1>
                    原来是你，<span>{playerName(view.result.blufferId)}！</span>
                  </h1>
                  <p>
                    本轮瞎掰人 · 骗过了{" "}
                    {
                      view.result.points[
                        view.players.findIndex(
                          (p) => p.id === view.result!.blufferId,
                        )
                      ]
                    }{" "}
                    位知情人
                  </p>
                </div>
                <Scoreboard view={view} />
                <div className="answers">
                  <h2>把真相留在桌上</h2>
                  <p className="helper">这些词真正的解释是…</p>
                  {view.result.cards.map(({ playerId, question }, i) => (
                    <details key={playerId}>
                      <summary>
                        <span className="answer-seat">
                          {playerName(playerId)}
                        </span>
                        <strong>{question.term}</strong>
                        {playerId === view.result!.blufferId && (
                          <span className="mini-badge">瞎掰人</span>
                        )}
                        <span className="detail-chevron">＋</span>
                      </summary>
                      <div className="answer-body">
                        <p>{question.explanation}</p>
                        <p className="vote-result">
                          本轮投给：{playerName(view.result!.votes[i]!)}
                          {playerId === view.result!.blufferId
                            ? "（此票不计分）"
                            : ""}{" "}
                          · 收到 {view.result!.effectiveVotes[i]} 张有效票
                        </p>
                        {question.sources.map((source, j) => (
                          <a
                            key={j}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            核对来源：{source.title} ↗
                          </a>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
                <Primary onClick={() => dispatch({ type: "nextRound" })}>
                  {view.roundIndex === view.config.playerCount - 1
                    ? "这一圈结束，看看排名"
                    : "下一轮，继续瞎掰"}
                </Primary>
              </section>
            )}
            {view.phase === "finished" && (
              <section className="finished-stage">
                <div className="finish-icon">
                  <Icon name="cup" size={48} />
                </div>
                <p className="eyebrow">A GOOD NIGHT, WELL PLAYED</p>
                <h1>
                  好戏落幕，
                  <br />
                  谁最会演？
                </h1>
                <p className="muted">
                  本桌所有轮次已结束，来看看谁最会辨真假。
                </p>
                <div className="ranking">
                  {view.ranking!.map((r) => (
                    <div
                      className={r.rank === 1 ? "winner" : ""}
                      key={r.player.id}
                    >
                      <span className="rank">
                        {r.rank.toString().padStart(2, "0")}
                      </span>
                      <strong>
                        {r.player.name}
                        {r.rank === 1 && <small>本桌最佳</small>}
                      </strong>
                      <b>
                        {r.score}
                        <small>分</small>
                      </b>
                    </div>
                  ))}
                </div>
                <Primary
                  onClick={() => {
                    try {
                      session?.discard();
                    } catch {
                      setNotice(session?.getWarning() || "无法清除旧存档。");
                      return;
                    }
                    setSession(null);
                    setHistoryVersion((n) => n + 1);
                    setScreen("setup");
                  }}
                >
                  再开一桌
                </Primary>
                <p className="helper">同分并列，开心不分高下。</p>
              </section>
            )}
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>
          一桌好戏 <i>·</i> 好玩的人，坐一桌。
        </span>
        <span>本机保存进度 · 网页即开即玩</span>
      </footer>
      {(modal || rules) && (
        <Dialog
          label={rules ? "瞎掰王玩法说明" : modal!.title}
          onClose={() => {
            setModal(null);
            setRules(false);
          }}
        >
          {rules ? (
            <>
              <p className="eyebrow">HOW TO PLAY</p>
              <h2>
                每个人都有词，
                <br />
                只有一个人在瞎掰。
              </h2>
              <ol className="rules-list">
                <li>
                  <strong>逐人读卡</strong>
                  <p>
                    每人一个不同的冷知识词。知情人有真实解释，瞎掰人只有词名。默认只有
                    5 秒，读不完也没关系。
                  </p>
                </li>
                <li>
                  <strong>依次解释</strong>
                  <p>
                    知情人用记住的真实信息讲解，瞎掰人编一个可信的解释。所有人讲完后自由讨论。
                  </p>
                </li>
                <li>
                  <strong>秘密投票</strong>
                  <p>
                    每人选一位其他玩家。知情人投中得 1
                    分；瞎掰人每骗过一位知情人得 1 分，自己的票不计分。
                  </p>
                </li>
                <li>
                  <strong>玩完一圈</strong>
                  <p>
                    N 人玩 N
                    轮，每轮从所有玩家中独立抽一名瞎掰人，允许重复，不保证每人都当过。最后按总分排名，同分并列。
                  </p>
                </li>
              </ol>
              <Primary onClick={() => setRules(false)}>懂了，准备开玩</Primary>
            </>
          ) : (
            <>
              <p className="eyebrow">ONE MORE THING</p>
              <h2>{modal!.title}</h2>
              <p className="modal-text">{modal!.text}</p>
              <div className="dialog-actions">
                <button className="secondary" onClick={() => setModal(null)}>
                  取消
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    const action = modal!.action;
                    setModal(null);
                    action();
                  }}
                >
                  {modal!.confirm}
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
function TermList({
  view,
  highlight,
}: {
  view: PublicView;
  highlight?: string;
}) {
  return (
    <div className="term-list">
      {view.terms.map((t, i) => (
        <div
          className={`term-row ${highlight === t.playerId ? "active" : ""}`}
          key={t.playerId}
        >
          <span className="seat">{String(i + 1).padStart(2, "0")}</span>
          <span className="term-person">
            {view.players[i]!.name}
            {highlight === t.playerId && <small>正在发言</small>}
          </span>
          <strong>{t.term}</strong>
        </div>
      ))}
    </div>
  );
}
function Scoreboard({ view }: { view: PublicView }) {
  return (
    <div className="scoreboard">
      <div className="score-head">
        <h2>本轮积分</h2>
        <span>本轮 / 累计</span>
      </div>
      {view.players.map((p, i) => (
        <div className="score-row" key={p.id}>
          <span>
            {p.name}
            {p.id === view.result!.blufferId && <small>瞎掰人</small>}
          </span>
          <span className="score-numbers">
            <b>+{view.result!.points[i]}</b>
            <strong>{view.scores[i]}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
function Dialog({
  children,
  onClose,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="dialog-close" aria-label="关闭弹窗" onClick={onClose}>
        ×
      </button>
      {children}
    </dialog>
  );
}
