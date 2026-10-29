import { useEffect, useRef, useState } from "react";
import {
  createRoom,
  joinRoom,
  restoreRoom,
  hasSavedRoom,
  roomLink,
  clearSavedRoom,
  savedRoomRecord,
} from "./room.ts";
import type { ClassicRoom } from "./room.ts";
import type {
  ClassicAction,
  ClassicRoomSnapshot,
  ClassicSettings,
} from "./types.ts";
import { classicPacks } from "./catalog.ts";
import {
  roleNames,
  rankings,
  readingLeft,
  visibleAnswer,
  calibratedNow,
} from "./ui-model.ts";
import "./classic.css";

export default function ClassicApp() {
  const recoveryRecord = useRef<string | null>(savedRoomRecord());
  const roomRef = useRef<ClassicRoom | null>(null),
    unbind = useRef<(() => void) | null>(null),
    lock = useRef(false);
  const [snapshot, setSnapshot] = useState<ClassicRoomSnapshot | null>(null);
  const [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false),
    [restoring, setRestoring] = useState(true);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [tutorial, setTutorial] = useState(false),
    [exit, setExit] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false),
    [chatText, setChatText] = useState("");
  const [decision, setDecision] = useState<{
    type: "challenge" | "guess";
    target: string;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const attach = (room: ClassicRoom) => {
    unbind.current?.();
    roomRef.current = room;
    setSnapshot(room.getSnapshot());
    unbind.current = room.subscribe(() => setSnapshot(room.getSnapshot()));
  };
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(location.search);
    setCode(params.get("room") ?? "");
    setPin(params.get("pin") ?? "");
    void (async () => {
      try {
        const room = await restoreRoom();
        if (!alive) {
          room?.stop();
          return;
        }
        if (room) {
          attach(room);
          await room.connect();
        }
      } catch (e) {
        if (alive) setError(message(e));
      } finally {
        if (alive) setRestoring(false);
      }
    })();
    const timer = setInterval(() => setNow(Date.now()), 150);
    return () => {
      alive = false;
      clearInterval(timer);
      unbind.current?.();
      roomRef.current?.stop();
    };
  }, []);
  const game = snapshot?.game;
  useEffect(() => {
    if (snapshot?.status === "online") setError("");
  }, [snapshot?.status]);
  useEffect(() => {
    setRoleOpen(false);
    setDecision(null);
  }, [game?.matchId, game?.roundIndex, game?.phase]);
  useEffect(() => {
    if (!tutorial && !exit && !decision) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTutorial(false);
        setExit(false);
        setDecision(null);
      }
      if (event.key !== "Tab") return;
      const modal = document.querySelector<HTMLElement>('[role="dialog"]');
      const focusable = modal
        ? Array.from(
            modal.querySelectorAll<HTMLElement>(
              "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary",
            ),
          )
        : [];
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [tutorial, exit, decision]);
  const perform = async (work: () => unknown | Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const open = (join: boolean) =>
    perform(async () => {
      if (hasSavedRoom() || roomRef.current)
        throw Error("请先恢复或退出原来的房间。");
      const room = join
        ? await joinRoom(name, code, pin)
        : await createRoom(name, { code: code || undefined });
      attach(room);
      await room.connect();
    });
  const abandon = (force = false) =>
    perform(async () => {
      if (force || (!snapshot?.host && game && game.phase !== "finished"))
        await roomRef.current?.forceLeave();
      else await roomRef.current?.leave();
      unbind.current?.();
      unbind.current = null;
      roomRef.current = null;
      setSnapshot(null);
      setExit(false);
      setNotice("已退出房间。");
    });
  const act = (action: ClassicAction) =>
    perform(() => roomRef.current!.act(action));
  const blocked = busy || !!snapshot?.pending || snapshot?.status !== "online";
  const hostNow = calibratedNow(now, snapshot?.clockOffsetMs ?? 0);
  const left = game ? readingLeft(game, hostNow) : 0;
  const answer = game ? visibleAnswer(game, hostNow) : null;
  const me = snapshot?.peers.find((p) => p.id === snapshot.meId);
  const thinker = game?.players.find((p) => p.id === game.thinkerId);
  const isThinker = game?.me.role === "thinker";
  const allReady =
    !!snapshot &&
    snapshot.peers.length >= 3 &&
    snapshot.peers.every((p) => p.online && p.ready);
  const configure = (patch: Partial<ClassicSettings>) =>
    perform(() =>
      roomRef.current!.configure({ ...snapshot!.settings, ...patch }),
    );
  const share = () =>
    perform(async () => {
      const link = roomLink(snapshot!.code, snapshot!.pin);
      try {
        await navigator.clipboard.writeText(link);
        setNotice("邀请链接已复制，发给朋友就能加入。");
      } catch {
        setNotice(`请复制邀请链接：${link}`);
      }
    });
  return (
    <div className="bc-app">
      <header className="bc-header">
        <a href="../index.html" className="bc-brand">
          一桌好戏<span>THE BLUFF CLUB</span>
        </a>
        <button onClick={() => setTutorial(true)}>玩法教学</button>
      </header>
      <main>
        {(error || snapshot?.error) && (
          <div role="alert" className="bc-alert">
            {error || snapshot?.error}
          </div>
        )}
        {notice && (
          <div role="status" className="bc-notice">
            {notice}
            <button aria-label="关闭提示" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {restoring ? (
          <section className="bc-panel">
            <h1>正在找回你的座位…</h1>
          </section>
        ) : !snapshot ? (
          <>
            <section className="bc-hero">
              <div>
                <p className="bc-kicker">SAME WORD. DIFFERENT STORIES.</p>
                <h1>
                  听起来很假。
                  <br />
                  <em>偏偏是真的。</em>
                </h1>
                <p>瞎掰王 · 原版联机</p>
                <p className="bc-muted">
                  同一个冷知识，只有一人知道真相。
                  <br />
                  你能从一桌一本正经里，找到唯一的老实人吗？
                </p>
                <div className="bc-tags">
                  <span>3–9 人</span>
                  <span>各自手机看牌</span>
                  <span>无需注册</span>
                </div>
              </div>
              <div className="bc-cover" aria-hidden="true">
                <span>9</span>
                <b>
                  真话
                  <br />
                  有几分像假话？
                </b>
                <i>THE ONLY TRUTH</i>
              </div>
            </section>
            <section className="bc-panel bc-entry">
              <div>
                <p className="bc-kicker">TAKE A SEAT</p>
                <h2>朋友都到了吗？</h2>
                <p className="bc-muted">
                  面对面聊，或先接通微信等语音。网页负责看牌与计分。
                </p>
              </div>
              <div className="bc-form">
                <label>
                  你的称呼
                  <input
                    value={name}
                    maxLength={20}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="nickname"
                    placeholder="让朋友认出你"
                  />
                </label>
                <label>
                  六位房间号
                  <input
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="创建时可留空，自动生成"
                  />
                </label>
                <details>
                  <summary>邀请口令（链接会自动带上）</summary>
                  <label>
                    口令
                    <input
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                </details>
                <div className="bc-actions">
                  <button
                    className="bc-primary"
                    disabled={busy || !name.trim()}
                    onClick={() => open(false)}
                  >
                    创建一桌
                  </button>
                  <button
                    disabled={busy || !name.trim() || code.length !== 6}
                    onClick={() => open(true)}
                  >
                    加入朋友
                  </button>
                </div>
                {hasSavedRoom() && (
                  <div className="bc-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        perform(async () => {
                          const room = await restoreRoom();
                          if (!room) throw Error("没有可恢复的房间");
                          attach(room);
                          await room.connect();
                        })
                      }
                    >
                      恢复已有座位
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        perform(() => {
                          if (roomRef.current)
                            throw Error("请通过房间内的退出按钮离席。");
                          clearSavedRoom({}, recoveryRecord.current);
                          recoveryRecord.current = null;
                          setNotice("已放弃本机旧座位，可以重新入桌。");
                        })
                      }
                    >
                      放弃无法恢复的旧座位
                    </button>
                  </div>
                )}
              </div>
            </section>
            <section className="bc-primer">
              <h2>不是找骗子，是找真话。</h2>
              <div className="bc-three">
                <article>
                  <b>01 / 想想</b>
                  <h3>听故事，找真相</h3>
                  <p>
                    这一轮的公开侦探。听大家解释同一个词，最终指认唯一的老实人。
                  </p>
                </article>
                <article>
                  <b>02 / 老实人</b>
                  <h3>看过答案，说实话</h3>
                  <p>
                    只有你能限时看到真实解释。记住多少说多少，想办法让想想相信你。
                  </p>
                </article>
                <article>
                  <b>03 / 瞎掰人</b>
                  <h3>没看答案，也要像懂</h3>
                  <p>
                    根据词名和方向即兴编解释。让想想把你当成老实人，就能得分。
                  </p>
                </article>
              </div>
              <button onClick={() => setTutorial(true)}>
                看一轮完整例子 →
              </button>
            </section>
          </>
        ) : (
          <>
            <section className="bc-room-bar">
              <div>
                <p className="bc-kicker">PRIVATE TABLE</p>
                <h1>房间 {snapshot.code}</h1>
                <span className={`bc-status ${snapshot.status}`}>
                  {
                    {
                      online: "已连接",
                      connecting: "连接中",
                      waiting: "等待房主重连",
                      offline: "网络已断开",
                      closed: "房间已结束",
                    }[snapshot.status]
                  }
                </span>
              </div>
              <div className="bc-actions">
                <button onClick={share} disabled={busy}>
                  邀请朋友
                </button>
                <button onClick={() => setExit(true)}>退出房间</button>
              </div>
            </section>
            {snapshot.warning && (
              <p className="bc-alert" role="status">
                {snapshot.warning}
              </p>
            )}
            {snapshot.status !== "online" && (
              <div className="bc-panel">
                <p>
                  房主需要保持网页打开。你可以等待恢复，也可以直接退出，放弃这个座位。
                </p>
                <button
                  disabled={busy}
                  onClick={() => perform(() => roomRef.current!.connect())}
                >
                  尝试重连
                </button>
              </div>
            )}
            <section className="bc-seats" aria-label="玩家与状态">
              {snapshot.peers.map((p, i) => (
                <article
                  key={p.id}
                  className={`${game?.thinkerId === p.id ? "is-thinker" : ""} ${!p.online ? "is-offline" : ""}`}
                >
                  <span className="bc-avatar">{i + 1}</span>
                  <div>
                    <b>
                      {p.name}
                      {p.id === snapshot.meId ? "（你）" : ""}
                    </b>
                    <small>
                      {!p.online
                        ? "离线"
                        : game
                          ? game.thinkerId === p.id
                            ? "本轮想想"
                            : game.phase === "roles"
                              ? game.players.find((v) => v.id === p.id)
                                  ?.confirmed
                                ? "身份已确认"
                                : "等待看身份"
                              : "正在游戏"
                          : p.ready
                            ? "已准备"
                            : "未准备"}
                    </small>
                  </div>
                  <strong>
                    {game?.players.find((v) => v.id === p.id)?.score ?? 3}
                    <small>分</small>
                  </strong>
                  {snapshot.host && p.id !== snapshot.meId && !game && (
                    <button
                      disabled={blocked}
                      onClick={() => perform(() => roomRef.current!.kick(p.id))}
                    >
                      移出
                    </button>
                  )}
                </article>
              ))}
            </section>
            {(!game || game.phase === "finished") && (
              <section className="bc-panel">
                <div className="bc-section-title">
                  <div>
                    <p className="bc-kicker">BEFORE THE SHOW</p>
                    <h2>{game ? "再来一场？" : "等朋友入座"}</h2>
                  </div>
                  <span>{snapshot.peers.length} / 9 人</span>
                </div>
                <div className="bc-settings">
                  <label>
                    读答案时间
                    <select
                      value={snapshot.settings.readSeconds}
                      disabled={!snapshot.host || blocked}
                      onChange={(e) =>
                        configure({ readSeconds: Number(e.target.value) })
                      }
                    >
                      {[5, 9, 15, 30, 60, 120].map((v) => (
                        <option key={v} value={v}>
                          {v} 秒{v === 9 ? "（原版默认）" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    题目难度
                    <select
                      value={snapshot.settings.difficulty}
                      disabled={!snapshot.host || blocked}
                      onChange={(e) =>
                        configure({
                          difficulty:
                            e.target.value === "mixed"
                              ? "mixed"
                              : (Number(e.target.value) as 1 | 2 | 3),
                        })
                      }
                    >
                      <option value="mixed">混合 · 按题目难度</option>
                      <option value="1">1分 · 一个正确方向</option>
                      <option value="2">2分 · 三个备选方向</option>
                      <option value="3">3分 · 没有方向提示</option>
                    </select>
                  </label>
                </div>
                <fieldset disabled={!snapshot.host || blocked}>
                  <legend>题库</legend>
                  {classicPacks.map((p) => (
                    <label className="bc-check" key={p.id}>
                      <input
                        type="checkbox"
                        checked={snapshot.settings.packIds.includes(p.id)}
                        onChange={(e) =>
                          configure({
                            packIds: e.target.checked
                              ? [...snapshot.settings.packIds, p.id]
                              : snapshot.settings.packIds.filter(
                                  (id) => id !== p.id,
                                ),
                          })
                        }
                      />
                      {p.title} · {p.count} 题
                    </label>
                  ))}
                </fieldset>
                <p className="bc-muted">
                  {snapshot.host
                    ? "设置由你决定。全部玩家在线并准备后即可开始。"
                    : "房主设置玩法，准备好后点下方按钮。"}{" "}
                  每人轮流当想想，身份每轮重新随机。
                </p>
                <div className="bc-actions">
                  <button
                    disabled={blocked}
                    onClick={() =>
                      perform(() => roomRef.current!.ready(!me?.ready))
                    }
                  >
                    {me?.ready ? "取消准备" : "我准备好了"}
                  </button>
                  {snapshot.host && (
                    <button
                      className="bc-primary"
                      disabled={
                        blocked ||
                        !allReady ||
                        snapshot.settings.packIds.length === 0
                      }
                      onClick={() =>
                        perform(() =>
                          game
                            ? roomRef.current!.rematch()
                            : roomRef.current!.startGame(),
                        )
                      }
                    >
                      {game ? "开始新一场" : "开始游戏"}
                    </button>
                  )}
                </div>
                {!allReady && (
                  <p className="bc-muted">
                    至少 3 人；等待{" "}
                    {snapshot.peers
                      .filter((p) => !p.ready || !p.online)
                      .map((p) => p.name)
                      .join("、") || "更多朋友"}
                    。
                  </p>
                )}
              </section>
            )}
            {game && (
              <section
                className="bc-stage"
                key={`${game.matchId}-${game.roundIndex}`}
              >
                <div className="bc-section-title">
                  <span className="bc-kicker">
                    ROUND {game.roundIndex + 1} / {game.totalRounds}
                  </span>
                  <span>
                    {game.difficulty} 分题 · 想想：{thinker?.name}
                  </span>
                </div>
                {game.phase !== "finished" && (
                  <div className="bc-topic">
                    <span>本轮共同题目</span>
                    <h2>{game.term}</h2>
                    <div className="bc-tags">
                      {game.hints.length ? (
                        game.hints.map((h) => <span key={h}>{h}</span>)
                      ) : (
                        <span>无方向提示</span>
                      )}
                    </div>
                  </div>
                )}
                {game.phase === "roles" && (
                  <>
                    <button
                      className={`bc-role-card ${roleOpen ? "is-open" : ""}`}
                      onClick={() => setRoleOpen(!roleOpen)}
                      aria-expanded={roleOpen}
                    >
                      <span>{roleOpen ? "仅你可见" : "PRIVATE IDENTITY"}</span>
                      <strong>
                        {roleOpen ? roleNames[game.me.role] : "点开查看身份"}
                      </strong>
                      <p>
                        {roleOpen
                          ? game.me.role === "thinker"
                            ? "听所有人的解释，找出唯一的老实人。"
                            : game.me.role === "truth"
                              ? "稍后你能限时看答案。记住重点，再解释给想想听。"
                              : "你不会看到答案。根据词名编一个让人信服的解释。"
                          : "别让旁边的朋友偷看到。"}
                      </p>
                    </button>
                    <div className="bc-actions">
                      <button
                        disabled={
                          blocked ||
                          !roleOpen ||
                          game.players.find((p) => p.id === snapshot.meId)
                            ?.confirmed
                        }
                        onClick={() => act({ type: "confirmRole" })}
                      >
                        我已确认身份
                      </button>
                      {isThinker && (
                        <button
                          disabled={blocked}
                          onClick={() => act({ type: "skip" })}
                        >
                          这题我知道，换一题
                        </button>
                      )}
                      {snapshot.host && (
                        <button
                          className="bc-primary"
                          disabled={
                            blocked || !game.players.every((p) => p.confirmed)
                          }
                          onClick={() => act({ type: "beginRead" })}
                        >
                          开始 {game.readSeconds} 秒读卡
                        </button>
                      )}
                    </div>
                    <p className="bc-muted">
                      {game.players.every((p) => p.confirmed)
                        ? "所有身份已确认，等待房主开始读卡。"
                        : `等待 ${game.players
                            .filter((p) => !p.confirmed)
                            .map((p) => p.name)
                            .join("、")} 确认身份。`}
                    </p>
                  </>
                )}
                {game.phase === "reading" && (
                  <>
                    <div
                      className={`bc-countdown ${left <= 3 ? "urgent" : ""}`}
                      role="timer"
                      aria-label={`剩余${left}秒`}
                    >
                      <b>{left}</b>
                      <span>{left ? "秒后合上答案" : "答案已合上"}</span>
                    </div>
                    {answer ? (
                      <article className="bc-answer">
                        <span>老实人专属 · 记重点就好</span>
                        <p>{answer}</p>
                      </article>
                    ) : (
                      <div className="bc-wait-card">
                        <h3>
                          {left
                            ? game.me.role === "truth"
                              ? "正在同步答案…"
                              : "想想这个词，可以是什么？"
                            : "读卡结束，可以开始聊了"}
                        </h3>
                        <p>
                          {left
                            ? "这一段时间每个人都在自己的屏幕前，别偷看别人的牌。"
                            : "正在等待房主同步讨论阶段。"}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {game.phase === "discussion" && (
                  <>
                    <div className="bc-discussion">
                      <span>你的身份 · {roleNames[game.me.role]}</span>
                      <h3>
                        {isThinker
                          ? "谁讲的，才是真话？"
                          : "现在轮到你一本正经。"}
                      </h3>
                      <p>
                        {isThinker
                          ? "请每个人解释，再自由提问。你有一次质疑机会，最后必须选一位老实人。"
                          : game.me.role === "truth"
                            ? "用自己的话解释记住的答案，争取让想想相信你。"
                            : "围绕这个词编一个解释，让想想相信你才是老实人。"}
                      </p>
                    </div>
                    {game.challengeTarget && (
                      <p className="bc-notice">
                        想想已质疑{" "}
                        {
                          game.players.find(
                            (p) => p.id === game.challengeTarget,
                          )?.name
                        }
                        。身份暂不公布，指认后一起结算。
                      </p>
                    )}
                    {isThinker ? (
                      <div className="bc-suspects">
                        {game.players
                          .filter((p) => p.id !== snapshot.meId)
                          .map((p) => (
                            <article key={p.id}>
                              <b>{p.name}</b>
                              <div className="bc-actions">
                                <button
                                  disabled={blocked || !!game.challengeTarget}
                                  onClick={() =>
                                    setDecision({
                                      type: "challenge",
                                      target: p.id,
                                    })
                                  }
                                >
                                  质疑在瞎掰
                                </button>
                                <button
                                  className="bc-primary"
                                  disabled={blocked}
                                  onClick={() =>
                                    setDecision({ type: "guess", target: p.id })
                                  }
                                >
                                  选为老实人
                                </button>
                              </div>
                            </article>
                          ))}
                      </div>
                    ) : (
                      <p className="bc-muted">
                        等待 {thinker?.name} 作出最终指认。大家可以继续交流。
                      </p>
                    )}
                  </>
                )}
                {(game.phase === "results" || game.phase === "finished") &&
                  game.result && (
                    <>
                      <div className="bc-reveal">
                        <p className="bc-kicker">THE TRUTH IS OUT</p>
                        <h2>
                          {game.result.correct
                            ? "真话被听见了。"
                            : "这次，瞎掰赢了。"}
                        </h2>
                        <p>
                          老实人是{" "}
                          <b>
                            {
                              game.players.find(
                                (p) => p.id === game.result!.truthId,
                              )?.name
                            }
                          </b>
                          ；想想选择了{" "}
                          {
                            game.players.find(
                              (p) => p.id === game.result!.target,
                            )?.name
                          }
                          。
                        </p>
                      </div>
                      <div className="bc-scorelines">
                        {game.result.lines.map((p) => (
                          <div key={p.id}>
                            <b>
                              {p.name}
                              <small>{roleNames[p.role]}</small>
                            </b>
                            <strong className={p.delta < 0 ? "negative" : ""}>
                              {p.delta > 0 ? "+" : ""}
                              {p.delta}
                              <small>共 {p.total} 分</small>
                            </strong>
                          </div>
                        ))}
                      </div>
                      <details className="bc-truth" open>
                        <summary>
                          真实解释 · {game.result.question.term}
                        </summary>
                        <p>{game.result.question.explanation}</p>
                        <div>
                          {game.result.question.sources.map((s, i) => (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              key={i}
                            >
                              {s.title || `资料来源 ${i + 1}`} ↗
                            </a>
                          ))}
                        </div>
                      </details>
                      {game.phase === "results" && (
                        <div className="bc-actions">
                          {snapshot.host ? (
                            <button
                              className="bc-primary"
                              disabled={blocked}
                              onClick={() => act({ type: "next" })}
                            >
                              {game.roundIndex + 1 >= game.totalRounds
                                ? "查看最终排名"
                                : "开始下一轮"}
                            </button>
                          ) : (
                            <p>等房主开始下一轮。</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                {game.phase === "finished" && (
                  <div className="bc-ranking">
                    <h2>今夜的真话大师</h2>
                    {rankings(game.players).map((p) => (
                      <div key={p.id}>
                        <span>#{p.rank}</span>
                        <b>{p.name}</b>
                        <strong>{p.score} 分</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            <details className="bc-chat bc-panel">
              <summary>桌边聊天 · {snapshot.chat.length} 条</summary>
              <ol aria-label="聊天记录">
                {snapshot.chat.map((m) => (
                  <li key={m.id}>
                    <b>{m.name}</b>
                    <span>{m.text}</span>
                  </li>
                ))}
              </ol>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    await roomRef.current!.sendChat(chatText);
                    setChatText("");
                  });
                }}
              >
                <label>
                  说点什么
                  <input
                    maxLength={240}
                    value={chatText}
                    onChange={(e) =>
                      setChatText(
                        Array.from(e.target.value).slice(0, 120).join(""),
                      )
                    }
                    placeholder="文字聊天，发言请用面对面或外部语音"
                  />
                </label>
                <span className="bc-muted">
                  {Array.from(chatText).length}/120
                </span>
                <button disabled={blocked || !chatText.trim()}>发送</button>
              </form>
            </details>
          </>
        )}
        <footer className="bc-footer">
          规则参考《瞎掰王》原版 · 题库为本站原创冷知识
          <br />
          联机时请房主保持页面打开 · 不内置语音
        </footer>
      </main>
      {tutorial && (
        <div className="bc-overlay">
          <section
            className="bc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="玩法教学"
          >
            <button
              className="bc-close"
              onClick={() => setTutorial(false)}
              autoFocus
            >
              关闭教学
            </button>
            <p className="bc-kicker">HOW TO PLAY</p>
            <h2>一桌人，只有一句真话。</h2>
            <p>
              例如题目是“花园隐士”。所有人都看到这个词，但只有一位老实人能看到它的真实解释。
            </p>
            <ol className="bc-steps">
              <li>
                <b>秘密分身份</b>
                <p>
                  一人是公开的“想想”，负责猜；其余人里只有一位“老实人”，剩下都是“瞎掰人”。
                </p>
              </li>
              <li>
                <b>限时看答案</b>
                <p>
                  各自确认身份后，房主开始读卡。默认 9
                  秒，只有老实人看到真实解释，到时自动隐藏。
                </p>
              </li>
              <li>
                <b>每人都来解释</b>
                <p>
                  老实人凭记忆讲真的；瞎掰人即兴编。想想听完可以追问。发言用面对面或微信等语音。
                </p>
              </li>
              <li>
                <b>可选：质疑一位瞎掰人</b>
                <p>
                  每轮只有一次。质疑成功：想想 +1、被质疑者 −1；错怪老实人：想想
                  −3。暂不揭晓，所以还能继续猜。
                </p>
              </li>
              <li>
                <b>最终选出老实人</b>
                <p>
                  以 2 分题为例：猜对，想想和老实人各
                  +2；猜错，被误认的瞎掰人独得 +2。质疑分数另外结算。
                </p>
              </li>
            </ol>
            <p>
              所有人初始 3 分。3–4 人每人当 3 次想想，5–7 人 2 次，8–9 人 1
              次。每轮老实人独立随机，可能连续抽到同一人。最终总分最高者获胜，同分并列。
            </p>
            <p className="bc-muted">
              1分题给正确方向；2分题给三个方向，只有一个正确；3分题没有提示。旧“冷知识局”是另一套找瞎掰人的玩法，存档互不影响。
            </p>
            <button className="bc-primary" onClick={() => setTutorial(false)}>
              明白了，去入桌
            </button>
          </section>
        </div>
      )}
      {exit && (
        <div className="bc-overlay">
          <section
            className="bc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="退出房间"
          >
            <h2>退出这张桌子？</h2>
            <p>
              {snapshot?.host
                ? "你是房主，退出会结束这间房。"
                : "退出会放弃这个座位；即使房主离线也可以直接退出。"}{" "}
              想保留座位可先取消，之后用同一浏览器恢复。
            </p>
            <div className="bc-actions">
              <button autoFocus onClick={() => setExit(false)}>
                留在房间
              </button>
              <button
                className="bc-danger"
                disabled={busy}
                onClick={() => abandon()}
              >
                确认退出
              </button>
              <button disabled={busy} onClick={() => abandon(true)}>
                无需连接，直接放弃座位
              </button>
            </div>
          </section>
        </div>
      )}
      {decision && (
        <div className="bc-overlay">
          <section
            className="bc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="确认选择"
          >
            <h2>
              {decision.type === "challenge"
                ? "使用唯一一次质疑？"
                : "确定最终指认？"}
            </h2>
            <p>
              {decision.type === "challenge" ? "你认为" : "你选择"}{" "}
              {game?.players.find((p) => p.id === decision.target)?.name}{" "}
              {decision.type === "challenge"
                ? "是瞎掰人。错怪老实人会扣 3 分。"
                : "是老实人。确定后立即揭晓并结算本轮。"}
            </p>
            <div className="bc-actions">
              <button autoFocus onClick={() => setDecision(null)}>
                再想想
              </button>
              <button
                className="bc-primary"
                disabled={blocked}
                onClick={() =>
                  perform(async () => {
                    await roomRef.current!.act(decision);
                    setDecision(null);
                  })
                }
              >
                确认{decision.type === "challenge" ? "质疑" : "指认"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
