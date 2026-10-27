import { Fragment, useEffect, useRef, useState } from "react";
import { Card, CardFace, AbilityToken } from "./Card.tsx";
import type { ScoutAction, ScoutView } from "./types.ts";
import { canBeat, hasLegalShow } from "./engine.ts";
import {
  chooseRange,
  describeSet,
  displayedHand,
  previewInsert,
  rangeOf,
  selectionKey,
  selectionMessage,
  stackedGroups,
} from "./ui-model.ts";
import type { Selection } from "./ui-model.ts";
import { useCardMotion } from "./motion.ts";
import { gameAttention, seatAttention } from "./attention.ts";
export interface ScoutTableProps {
  game: ScoutView;
  actor: string;
  pending?: boolean;
  onAction: (action: ScoutAction) => void;
  teaching?: boolean;
  isHost?: boolean;
  onRematch?: () => void;
  freshDealOnMount?: boolean;
}
type Wizard = {
  combo: boolean;
  side: "left" | "right" | null;
  flip: boolean;
  gap: number | null;
  step: 1 | 2 | 3;
};
export function ScoutTable({
  game,
  actor,
  pending = false,
  onAction,
  teaching = false,
  isHost = false,
  onRematch,
  freshDealOnMount = false,
}: ScoutTableProps) {
  const [selection, setSelection] = useState<Selection>(null),
    [flipped, setFlipped] = useState(false),
    [wizard, setWizard] = useState<Wizard | null>(null);
  const [handView, setHandView] = useState<"stacked" | "expanded">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width:600px)").matches
      ? "stacked"
      : "expanded",
  );
  const root = useRef<HTMLDivElement>(null),
    lock = useRef(false),
    key = selectionKey(game);
  useEffect(() => {
    setSelection(null);
    setWizard(null);
    setFlipped(false);
    lock.current = false;
  }, [key]);
  useEffect(() => {
    if (!pending) lock.current = false;
  }, [pending, game.revision]);
  useCardMotion(root, game, freshDealOnMount, flipped);
  const me = game.players.find((p) => p.id === actor)!,
    turn = game.phase === "playing" && game.turnId === actor;
  const hand = displayedHand(game, flipped);
  const stacked = handView === "stacked" && wizard?.step !== 3;
  const handGroups = stacked ? stackedGroups(hand) : [hand];
  const range = rangeOf(selection),
    selected = range ? hand.slice(range.start, range.start + range.count) : [];
  const current = game.active?.cards ?? [],
    myCombo = game.comboActorId === actor;
  const canScout =
    turn &&
    !myCombo &&
    current.length > 0 &&
    (game.players.length > 2 || me.scoutChips > 0);
  const edge = wizard?.side
    ? current[wizard.side === "left" ? 0 : current.length - 1]
    : null;
  const preview =
    edge && wizard?.gap !== null && wizard?.gap !== undefined
      ? previewInsert(hand, edge, wizard.flip, wizard.gap)
      : null;
  const afterActive =
    wizard?.side === "left" ? current.slice(1) : current.slice(0, -1);
  const comboValid =
    !wizard?.combo || (!!preview && hasLegalShow(preview, afterActive));
  const send = (action: ScoutAction) => {
    if (pending || lock.current) return;
    lock.current = true;
    onAction(action);
    queueMicrotask(() => {
      lock.current = false;
    });
  };
  const name = (id: string) =>
    game.players.find((p) => p.id === id)?.name ?? "团员";
  const receipt = game.history.at(-1),
    finished = game.phase === "finished",
    max = Math.max(...game.players.map((p) => p.total));
  const attention = gameAttention(game);
  return (
    <div className="sc-table" ref={root}>
      <div className="sc-table-top">
        <span className="sc-eyebrow">
          {teaching ? "REHEARSAL · 排练场" : "THE GRAND TOUR · 巡演"}
        </span>
        <span>
          第 <b>{game.round}</b> / {game.totalRounds} 轮
        </span>
      </div>
      <div className={`sc-attention${turn ? " is-mine" : ""}`} role="status">
        <span className="sc-attention-dot" aria-hidden="true" />
        <div>
          <strong>{attention.title}</strong>
          <p>{attention.detail}</p>
        </div>
      </div>
      <div className="sc-seats">
        {game.players.map((p, i) => (
          <div
            key={p.id}
            className={`sc-seat is-${seatAttention(game, p.id).kind}${p.id === actor ? " is-you" : ""}`}
            aria-current={
              game.phase === "playing" && game.turnId === p.id
                ? "step"
                : undefined
            }
            data-motion={`seat:${p.id}`}
          >
            <div className="sc-seat-avatar">
              <div className="sc-avatar">{String(i + 1).padStart(2, "0")}</div>
              {game.players.length > 2 && (
                <AbilityToken available={p.scoutShowAvailable} />
              )}
            </div>
            <div className="sc-seat-info">
              <strong>
                {p.name}
                {p.id === actor ? " · 你" : ""}
              </strong>
              <span>{seatAttention(game, p.id).text}</span>
            </div>
            <div className="sc-seat-score" data-motion={`score:${p.id}`}>
              <b>{p.total}</b>
              <small>累计分</small>
            </div>
            <div className="sc-seat-tokens">
              <span title="收牌，每张 1 分">收牌 {p.captured}</span>
              <span
                title={
                  game.players.length === 2
                    ? "每次挖角消耗 1 枚，剩余筹码计分"
                    : "被挖角获得筹码，每枚 1 分"
                }
              >
                筹码 {p.scoutChips}
              </span>
              {game.players.length > 2 && (
                <span
                  className={p.scoutShowAvailable ? "sc-ability" : "sc-muted"}
                >
                  {p.scoutShowAvailable ? "连演可用" : "连演已用"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <section className="sc-stage" aria-label="中央演出台">
        <div className="sc-stage-arch" aria-hidden="true" />
        <div className="sc-stage-heading">
          <span className="sc-eyebrow">CENTER STAGE</span>
          <h2>
            {current.length
              ? `${name(game.active!.ownerId)}的演出`
              : game.phase === "orienting"
                ? "好戏，即将开场"
                : "舞台，等你登场"}
          </h2>
          <p>
            {current.length
              ? describeSet(current)
              : "连续的好牌，值得一次掌声。"}
          </p>
        </div>
        <div className="sc-stage-cards" data-motion="deck">
          {current.length ? (
            current.map((c) => (
              <Card key={c.id} card={c} motionId={`card:${c.id}`} />
            ))
          ) : (
            <div className="sc-empty-stage" aria-hidden="true">
              <span>✦</span>
              <i>SCOUT</i>
              <span>✦</span>
            </div>
          )}
        </div>
        <div className="sc-stage-foot">
          {current.length
            ? "张数优先 · 同点数胜同张数顺子 · 再比最小点数"
            : "演出收牌得分 / 挖角补好牌"}
        </div>
      </section>
      {(game.phase === "roundEnd" || finished) && receipt ? (
        <section className="sc-receipt" aria-label="本轮计分收据">
          <span className="sc-eyebrow">
            {finished ? "FINAL CURTAIN" : "ROUND RECEIPT"}
          </span>
          <h2>
            {finished
              ? `${game.players
                  .filter((p) => p.total === max)
                  .map((p) => p.name)
                  .join(
                    "、",
                  )}${game.players.filter((p) => p.total === max).length > 1 ? " 并列获胜" : " 获胜"}`
              : "本轮谢幕"}
          </h2>
          <p>
            {receipt.reason === "emptyHand"
              ? "有人清空手牌，巡演暂歇。"
              : receipt.reason === "blocked"
                ? "筹码用尽且无法演出，本轮结束。"
                : "领演无人能压过，领演者免扣剩余手牌。"}
          </p>
          <div className="sc-score-scroll">
            <table>
              <thead>
                <tr>
                  <th>团员</th>
                  <th>收牌</th>
                  <th>筹码</th>
                  <th>余牌扣分</th>
                  <th>本轮</th>
                  <th>累计</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr key={line.id}>
                    <th>
                      {line.name}
                      {line.id === receipt.leaderId &&
                      receipt.reason !== "emptyHand"
                        ? " · 免扣"
                        : ""}
                    </th>
                    <td>+{line.captured}</td>
                    <td>+{line.scoutChips}</td>
                    <td>−{line.remainingPenalty}</td>
                    <td>
                      <b>
                        {line.delta > 0 ? "+" : ""}
                        {line.delta}
                      </b>
                    </td>
                    <td>{line.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!teaching &&
            (isHost ? (
              <button
                className="sc-primary"
                disabled={pending || (finished && !onRematch)}
                onClick={() =>
                  finished ? onRematch?.() : send({ type: "next" })
                }
              >
                {finished ? "再巡演一局" : "开启下一轮"}
              </button>
            ) : (
              <p>等待房主{finished ? "开启新一局" : "开启下一轮"}。</p>
            ))}
        </section>
      ) : (
        <>
          <section className="sc-hand-section">
            <div className="sc-hand-heading">
              <div>
                <span className="sc-eyebrow">YOUR TROUPE</span>
                <h2>
                  你的手牌 <span>{hand.length}</span>
                </h2>
              </div>
              <span className="sc-order-note">顺序固定 · 不能重排</span>
            </div>
            <div
              className="sc-hand-view-controls"
              role="group"
              aria-label="手牌显示方式"
            >
              <button
                aria-pressed={handView === "stacked"}
                onClick={() => setHandView("stacked")}
              >
                叠牌概览
              </button>
              <button
                aria-pressed={handView === "expanded"}
                onClick={() => setHandView("expanded")}
              >
                展开操作
              </button>
              <span>
                {wizard?.step === 3
                  ? "插牌时自动展开，完成后恢复原视图。"
                  : stacked
                    ? "大数字看当前，小数字看翻面；单行叠牌，窄屏可左右移动。"
                    : "点选起点、终点，选中一段相邻的牌。"}
              </span>
            </div>
            {game.phase === "orienting" ? (
              <p className="sc-hand-help">
                开场仅此一次：可将整手旋转 180°，反转顺序并交换上下数字。
              </p>
            ) : (
              <p className="sc-hand-help">
                {wizard?.step === 3
                  ? "选择一道缝隙；新牌插入，其余牌保持顺序。"
                  : "点选起点，再选终点。只有相邻的同点数或连续顺子能一起演出。"}
              </p>
            )}
            <div
              className={`sc-hand-scroll${stacked ? " is-stacked" : ""}${wizard?.step === 3 ? " is-inserting" : ""}`}
            >
              {handGroups.map((group, groupIndex) => (
                <div
                  className={`sc-hand-row${stacked ? " is-stacked-row" : ""}`}
                  key={groupIndex}
                >
                  {group.map((c, localIndex) => {
                    const i = localIndex;
                    return (
                      <Fragment key={c.id}>
                        {wizard?.step === 3 && (
                          <button
                            aria-label={`插在第 ${i + 1} 张牌之前`}
                            className={`sc-gap${wizard.gap === i ? " is-chosen" : ""}`}
                            onClick={() => setWizard({ ...wizard, gap: i })}
                          >
                            +
                          </button>
                        )}
                        <Card
                          card={c}
                          motionId={`card:${c.id}`}
                          selected={
                            !!range &&
                            i >= range.start &&
                            i < range.start + range.count
                          }
                          onClick={
                            turn && !wizard
                              ? () => setSelection(chooseRange(selection, i))
                              : undefined
                          }
                          disabled={pending}
                        />
                      </Fragment>
                    );
                  })}
                  {wizard?.step === 3 && (
                    <button
                      className={`sc-gap${wizard.gap === hand.length ? " is-chosen" : ""}`}
                      aria-label="插在手牌最右侧"
                      onClick={() => setWizard({ ...wizard, gap: hand.length })}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
            {wizard?.step === 3 && preview && (
              <div className="sc-insert-preview">
                <span>插入后朝上的数字</span>
                <div>
                  {preview.map((c, i) => (
                    <span
                      className={c.id === edge?.id ? "is-new" : ""}
                      key={c.id}
                    >
                      {c.top}
                      {i < preview.length - 1 && <i>·</i>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="sc-action-dock" aria-label="回合操作">
            {game.phase === "orienting" ? (
              <>
                <div className="sc-action-copy">
                  <b>
                    {game.me.orientationConfirmed
                      ? "方向已锁定，等待其他团员"
                      : "选好方向，整手锁定"}
                  </b>
                  <span>之后仅挖来的那一张可选正反。</span>
                </div>
                <div className="sc-actions">
                  <button
                    disabled={pending || game.me.orientationConfirmed}
                    onClick={() => setFlipped(!flipped)}
                  >
                    {flipped ? "恢复原方向" : "整手旋转 180°"}
                  </button>
                  <button
                    className="sc-primary"
                    disabled={pending || game.me.orientationConfirmed}
                    onClick={() => send({ type: "orient", flip: flipped })}
                  >
                    确认这个方向
                  </button>
                </div>
              </>
            ) : wizard ? (
              <>
                <div className="sc-wizard-title">
                  <div>
                    <span className="sc-eyebrow">
                      {wizard.combo ? "SCOUT & SHOW" : "SCOUT"} · {wizard.step}
                      /3
                    </span>
                    <h3>
                      {wizard.step === 1
                        ? "从舞台哪一端挖角？"
                        : wizard.step === 2
                          ? "哪一个数字朝上？"
                          : "放进哪一道缝隙？"}
                    </h3>
                  </div>
                  <button className="sc-quiet" onClick={() => setWizard(null)}>
                    取消
                  </button>
                </div>
                {wizard.step === 1 ? (
                  <div className="sc-edge-options">
                    {(["left", "right"] as const).map((side, i) => (
                      <button
                        key={side}
                        disabled={i === 1 && current.length === 1}
                        onClick={() => setWizard({ ...wizard, side, step: 2 })}
                      >
                        <span>{side === "left" ? "左端" : "右端"}</span>
                        <CardFace
                          card={
                            current[side === "left" ? 0 : current.length - 1]
                          }
                        />
                      </button>
                    ))}
                  </div>
                ) : wizard.step === 2 && edge ? (
                  <>
                    <div className="sc-orient-options">
                      {[false, true].map((f) => (
                        <button
                          key={String(f)}
                          className={wizard.flip === f ? "is-chosen" : ""}
                          aria-pressed={wizard.flip === f}
                          onClick={() => setWizard({ ...wizard, flip: f })}
                        >
                          <CardFace
                            card={
                              f
                                ? {
                                    ...edge,
                                    top: edge.bottom,
                                    bottom: edge.top,
                                  }
                                : edge
                            }
                          />
                          <span>{f ? edge.bottom : edge.top} 朝上</span>
                        </button>
                      ))}
                    </div>
                    <div className="sc-actions">
                      <button onClick={() => setWizard({ ...wizard, step: 1 })}>
                        上一步
                      </button>
                      <button
                        className="sc-primary"
                        onClick={() => setWizard({ ...wizard, step: 3 })}
                      >
                        选择插入位置
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p role="status">
                      {wizard.gap === null
                        ? "在手牌之间点「+」，预览插入结果。"
                        : !comboValid
                          ? "这个插法无法继续演出，请换个位置或方向。"
                          : wizard.combo
                            ? "确认后还要立即演出，不能再次挖角。"
                            : game.players.length === 2
                              ? "消耗 1 枚筹码，之后仍是你的回合。"
                              : "原演出者获得 1 枚筹码，回合交给下一位。"}
                    </p>
                    <div className="sc-actions">
                      <button onClick={() => setWizard({ ...wizard, step: 2 })}>
                        上一步
                      </button>
                      <button
                        className="sc-primary"
                        disabled={pending || wizard.gap === null || !comboValid}
                        onClick={() => {
                          if (wizard.side && wizard.gap !== null)
                            send({
                              type: "scout",
                              side: wizard.side,
                              flip: wizard.flip,
                              insertIndex: wizard.gap,
                              combo: wizard.combo,
                            });
                        }}
                      >
                        确认挖角{wizard.combo ? "，继续演出" : ""}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="sc-action-copy" aria-live="polite">
                  <b>
                    {pending
                      ? "正在确认操作…"
                      : turn
                        ? myCombo
                          ? "挖角完成 · 现在必须演出"
                          : "轮到你登台"
                        : `等待 ${name(game.turnId)} 登台`}
                  </b>
                  <span>
                    {turn
                      ? selectionMessage(selected, current)
                      : "可以观察舞台与各家的剩余手牌。"}
                  </span>
                </div>
                <div className="sc-actions">
                  <button
                    className="sc-primary"
                    disabled={
                      !turn || pending || !range || !canBeat(selected, current)
                    }
                    onClick={() => range && send({ type: "show", ...range })}
                  >
                    演出{range ? ` ${range.count} 张` : ""}
                  </button>
                  <button
                    disabled={!canScout || pending}
                    onClick={() => {
                      setSelection(null);
                      setWizard({
                        combo: false,
                        side: null,
                        flip: false,
                        gap: null,
                        step: 1,
                      });
                    }}
                  >
                    挖角
                    {game.players.length === 2
                      ? ` · ${me.scoutChips} 筹码`
                      : ""}
                  </button>
                  {game.players.length > 2 && (
                    <button
                      className="sc-combo"
                      disabled={!canScout || pending || !me.scoutShowAvailable}
                      onClick={() => {
                        setSelection(null);
                        setWizard({
                          combo: true,
                          side: null,
                          flip: false,
                          gap: null,
                          step: 1,
                        });
                      }}
                    >
                      挖角并演出{" "}
                      <small>
                        {me.scoutShowAvailable ? "每轮一次" : "已用"}
                      </small>
                    </button>
                  )}
                </div>
                {game.players.length === 2 && (
                  <p className="sc-two-note">
                    双人规则：挖角花 1
                    筹码，仍由你行动；没有「挖角并演出」。余下筹码计入轮分。
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
