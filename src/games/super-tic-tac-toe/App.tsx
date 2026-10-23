import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { gameReducer, type GameAction } from "./state/gameReducer";
import { createInitialState } from "./state/gameLogic";
import type { GameState, Player } from "./state/types";
import { ThemeProvider } from "./theme/ThemeContext";
import { useTheme } from "./theme/useTheme";
import { skins } from "./theme/themes";
import BigBoard from "./components/BigBoard";
import Icon from "./components/Icon";
import TerrainArt from "./components/TerrainArt";
import Tutorial from "./components/Tutorial";
import styles from "./App.module.css";

function SkinPanel() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <div className={styles.panelHeading}>
        <h2>换一片风景</h2>
        <span>棋盘皮肤</span>
      </div>
      <div className={styles.skins}>
        {skins.map((skin) => (
          <button
            key={skin.id}
            aria-pressed={theme.boardSkin === skin.id}
            onClick={() => setTheme({ ...theme, boardSkin: skin.id })}
            className={`${styles.skin} ${theme.boardSkin === skin.id ? styles.selectedSkin : ""}`}
          >
            <span
              className={`${styles.skinPreview} ${styles[skin.id]}`}
              aria-hidden="true"
            >
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i}>{i === 2 ? "X" : i === 6 ? "O" : ""}</i>
              ))}
            </span>
            <span className={styles.skinText}>
              <strong>{skin.name}</strong>
              <small>{skin.caption}</small>
            </span>
            <span className={styles.skinCheck}>
              {theme.boardSkin === skin.id ? (
                <Icon name="check" size={17} />
              ) : (
                skin.number
              )}
            </span>
          </button>
        ))}
      </div>
      <label className={styles.motionToggle}>
        <span>
          落子动画<small>草叶、土粒与生长效果</small>
        </span>
        <input
          type="checkbox"
          checked={theme.motion}
          onChange={(event) =>
            setTheme({ ...theme, motion: event.target.checked })
          }
        />
      </label>
    </>
  );
}
function Rules() {
  return (
    <details className={styles.rules} open>
      <summary>
        怎么玩 <span>三步上手</span>
      </summary>
      <ol>
        <li>
          <b>轮流落子</b>
          <span>X 先手，第一步不能下在中央小棋盘。</span>
        </li>
        <li>
          <b>把对手送往下一块地</b>
          <span>
            你落在小棋盘的哪个位置，对手就去对应的小棋盘。目标满了可自由选择。
          </span>
        </li>
        <li>
          <b>三个棋子连成一线</b>
          <span>整个 9×9 棋盘，横、竖、斜任意三连即获胜，可以跨小棋盘。</span>
        </li>
      </ol>
    </details>
  );
}
function Players({ state, myPlayer }: { state: GameState; myPlayer?: Player }) {
  return (
    <div className={styles.players}>
      {(["X", "O"] as const).map((p, i) => (
        <div
          key={p}
          className={`${styles.player} ${state.currentPlayer === p && !state.winner ? styles.currentPlayer : ""}`}
        >
          <span
            className={`${styles.avatar} ${p === "X" ? styles.orange : styles.green}`}
          >
            {p}
          </span>
          <div>
            <strong>{p === "X" ? "开垦者" : "播种者"}</strong>
            <small>
              {myPlayer ? (myPlayer === p ? "你" : "朋友") : `玩家 ${i + 1}`}
            </small>
          </div>
          <span className={styles.playerCount}>
            {state.moveHistory.filter((move) => move.player === p).length}
            <small>步</small>
          </span>
        </div>
      ))}
    </div>
  );
}
function GameView({
  state,
  onMove,
  actions,
  myPlayer,
  locked,
  note,
  result,
}: {
  state: GameState;
  onMove: (r: number, c: number) => void;
  actions: ReactNode;
  myPlayer?: Player;
  locked?: boolean;
  note?: string;
  result?: ReactNode;
}) {
  const target = state.nextBoard
    ? state.nextBoard.row * 3 + state.nextBoard.col + 1
    : null;
  const turn = state.winner
    ? state.winner === "draw"
      ? "这一局，平分秋色。"
      : `${state.winner === "X" ? "开垦者 X" : "播种者 O"} 赢得这一局。`
    : myPlayer
      ? myPlayer === state.currentPlayer
        ? "轮到你落子"
        : "等待朋友落子"
      : `轮到${state.currentPlayer === "X" ? "开垦者 X" : "播种者 O"}`;
  const hint = state.winner
    ? "三子已连成一线，看看这局的最后一步。"
    : target
      ? `请在第 ${target} 块小棋盘落子`
      : state.moveHistory.length === 0
        ? "选择任一外侧小棋盘，开始这一局"
        : "目标小棋盘已满，这一步可以自由选择";
  const lastMove = state.moveHistory.at(-1);
  return (
    <div className={styles.gameLayout}>
      <aside className={styles.leftPanel}>
        <div className={styles.landscape}>
          <TerrainArt />
          <span>慢一点，下一步好棋。</span>
        </div>
        <SkinPanel />
        <Rules />
      </aside>
      <section className={styles.boardPanel} aria-label="对局区域">
        <div className={styles.boardHeading}>
          <div>
            <span className={styles.eyebrow}>
              {myPlayer ? "好友对战" : "本地双人"} ·{" "}
              {String(state.moveHistory.length).padStart(2, "0")} / 81
            </span>
            <h2 aria-live="polite">{turn}</h2>
          </div>
          <span className={styles.turnPill}>
            {state.winner ? "已结束" : `${state.currentPlayer} 回合`}
          </span>
        </div>
        <p className={styles.boardHint}>{hint}</p>
        <BigBoard
          state={state}
          onCellClick={onMove}
          isMyTurn={!locked && (!myPlayer || state.currentPlayer === myPlayer)}
        />
        <div className={styles.boardLegend}>
          <span>
            <i className={styles.activeDot} />
            可落子区域
          </span>
          <span>
            <i className={styles.lastDot} />
            最后一步
          </span>
          <span>三子连线即获胜</span>
        </div>
        {note && (
          <p className={styles.connectionNote} role="status">
            {note}
          </p>
        )}
        {result}
        <div className={styles.actions}>{actions}</div>
      </section>
      <aside className={styles.rightPanel}>
        <div className={styles.panelHeading}>
          <h2>这一局</h2>
          <span>步步为营</span>
        </div>
        <Players state={state} myPlayer={myPlayer} />
        <div className={styles.targetCard}>
          <span className={styles.eyebrow}>下一片田地</span>
          <div className={styles.targetGrid} aria-label={hint}>
            {Array.from({ length: 9 }, (_, i) => (
              <i
                key={i}
                className={
                  !state.winner &&
                  (target === i + 1 ||
                    (!target && (state.moveHistory.length || i !== 4)))
                    ? styles.targetActive
                    : ""
                }
              >
                {i + 1}
              </i>
            ))}
          </div>
          <p>
            {state.winner
              ? "本局已结束"
              : target
                ? `第 ${target} 块小棋盘`
                : state.moveHistory.length
                  ? "自由选择田地"
                  : "自由选择外侧田地"}
            <small>
              {state.winner
                ? "可以回看棋局，再开启下一局。"
                : "你选的位置，决定对手的去向。"}
            </small>
          </p>
        </div>
        <div className={styles.lastMove}>
          <span className={styles.eyebrow}>最后一步</span>
          <p>
            {lastMove
              ? `${lastMove.player} · 第 ${lastMove.globalRow + 1} 行，第 ${lastMove.globalCol + 1} 列`
              : "棋局还未开始"}
          </p>
          <span>
            {lastMove
              ? `已落下 ${state.moveHistory.length} 步棋`
              : "第一步，从你开始。"}
          </span>
        </div>
        <div className={styles.tip}>
          <Icon name="leaf" />
          <p>
            看远一点。
            <br />
            你的落子，也是对手的起点。
          </p>
        </div>
      </aside>
    </div>
  );
}
function LocalGame({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const reset = () => {
    dispatch({ type: "RESET" });
    setConfirmReset(false);
  };
  return (
    <>
      <GameView
        state={state}
        onMove={(globalRow, globalCol) =>
          dispatch({ type: "PLACE_MARK", globalRow, globalCol })
        }
        actions={
          <>
            <button
              className={styles.secondary}
              onClick={() => dispatch({ type: "UNDO" })}
              disabled={!state.moveHistory.length || !!state.winner}
            >
              <Icon name="undo" size={18} />
              悔棋
            </button>
            <button
              className={styles.primary}
              onClick={() =>
                state.moveHistory.length && !state.winner
                  ? setConfirmReset(true)
                  : reset()
              }
            >
              <Icon name="refresh" size={18} />
              {state.winner ? "再来一局" : "重新开始"}
            </button>
          </>
        }
        result={
          state.winner && (
            <div className={styles.result} role="status">
              <Icon name="sun" />
              <span>
                {state.winner === "draw"
                  ? "平局，也是一场好棋。"
                  : `${state.winner} 三子连线，收获胜利！`}
              </span>
            </div>
          )
        }
      />
      {confirmReset && (
        <ResetDialog onClose={() => setConfirmReset(false)} onReset={reset} />
      )}
    </>
  );
}
function ResetDialog({
  onClose,
  onReset,
}: {
  onClose: () => void;
  onReset: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="reset-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="reset-title">重新开始这一局？</h2>
      <p>当前棋局会被清空。</p>
      <div className={styles.actions}>
        <button className={styles.secondary} autoFocus onClick={onClose}>
          继续下棋
        </button>
        <button className={styles.primary} onClick={onReset}>
          重新开始
        </button>
      </div>
    </dialog>
  );
}
function Shell() {
  const { theme } = useTheme();
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const returnToLobby = () => {
    if (
      state.moveHistory.length &&
      !state.winner &&
      !window.confirm("返回大厅会结束当前棋局，确定离开吗？")
    )
      return;
    window.location.href = "../index.html";
  };
  return (
    <div
      className={styles.app}
      data-motion={theme.motion ? "on" : "off"}
      data-skin={theme.boardSkin}
    >
      <header className={styles.topbar}>
        <a
          className={styles.brand}
          href="#"
          onClick={(event) => event.preventDefault()}
        >
          <span className={styles.brandMark}>
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <span>
            超级井字棋<small>SUPER TIC-TAC-TOE</small>
          </span>
        </a>
        <button className={styles.secondary} onClick={returnToLobby}>
          返回一桌好戏
        </button>
        <button
          className={styles.tutorialButton}
          onClick={() => setTutorialOpen(true)}
        >
          <Icon name="leaf" size={17} />
          新手教程
        </button>
      </header>
      <main>
        <div className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>一局棋，一片好风景</span>
            <h1>
              一方草地，<em>步步为营。</em>
            </h1>
            <p>落子的地方，决定对手的下一片田地。</p>
          </div>
          <span className={styles.introNote}>
            9 块田地 · 81 种可能
            <Icon name="sun" size={25} />
          </span>
        </div>
        <LocalGame state={state} dispatch={dispatch} />
      </main>
      <footer className={styles.footer}>
        <span>让每一步，都有一点生长。</span>
        <span>
          田园版 / 2026 <i /> 为朋友间的好棋而作
        </span>
      </footer>
      {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)} />}
    </div>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
