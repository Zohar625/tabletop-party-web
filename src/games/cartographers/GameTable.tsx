import { useEffect, useState } from "react";
import type { MapAction, MapView, Placement, Terrain } from "./types";
import { placementError, targetPlayer, transformedShape } from "./engine";
import { GOALS } from "./data";
import { goalHighlights, monsterPenalty, neighbors } from "./scoring";
import { GuildBoard } from "./GuildBoard";
import { previewPlacement } from "./commission-model";
import "./tutorial.css";
import { MapBoard } from "./MapBoard";
import { TerrainArt } from "./TerrainArt";
import {
  LIMITS,
  previewCells,
  scoreTotal,
  SEASONS,
  terrainName,
  fullBoardPlacement,
} from "./ui-model";
export function GameTable({
  game,
  actor,
  onAction,
  pending = false,
  notice = "",
  children,
  onGoalInspect,
  teaching,
  completionActions,
}: {
  game: MapView;
  actor: string;
  onAction: (action: MapAction) => void;
  pending?: boolean;
  notice?: string;
  children?: React.ReactNode;
  onGoalInspect?: (id: string) => void;
  teaching?: { step: number };
  completionActions?: React.ReactNode;
}) {
  const [shape, setShape] = useState(0),
    [terrain, setTerrain] = useState<Terrain>(
      game.current.terrains[0] || "forest",
    ),
    [rotation, setRotation] = useState(0),
    [mirrored, setMirrored] = useState(false),
    [anchor, setAnchor] = useState<[number, number] | null>(null),
    [fallback, setFallback] = useState(false),
    [goalFocus, setGoalFocus] = useState<string | null>(null),
    [help, setHelp] = useState(false);
  useEffect(() => {
    setShape(0);
    setTerrain(game.current.terrains[0] || "forest");
    setRotation(0);
    setMirrored(false);
    setAnchor(null);
    setFallback(false);
  }, [game.turn, game.current.id, game.season]);
  const me = game.players.find((p) => p.id === actor) || game.players[0],
    target = game.phase === "placing" ? targetPlayer(game, actor) : me,
    card = game.current;
  const cells = fallback
    ? [[0, 0] as [number, number]]
    : transformedShape(
        card.shapes[shape]?.cells || [[0, 0]],
        rotation,
        mirrored,
      );
  const placement: Placement = {
    shape,
    terrain,
    x: anchor?.[0] ?? 0,
    y: anchor?.[1] ?? 0,
    rotation,
    mirrored,
    fallback,
  };
  const error = anchor ? placementError(game, actor, placement) : null;
  const locked = pending || me.submitted || game.phase !== "placing";
  const showCompletion = !!teaching && pending && !!completionActions;
  const projection =
    anchor && !locked ? previewPlacement(game, actor, placement) : undefined;
  const [sourceFocus, setSourceFocus] = useState<"coins" | "monsters" | null>(
    null,
  );
  const showTransforms = !teaching || teaching.step >= 1;
  const showFallback = !teaching || teaching.step >= 5;
  const highlightBoard = projection?.valid ? projection.board : target.board;
  const sourceHighlight =
    sourceFocus === "coins"
      ? target.board.earnedMountains
      : sourceFocus === "monsters"
        ? [
            ...new Set(
              target.board.cells.flatMap((t, i) =>
                t === "monster"
                  ? neighbors(i).filter((n) => target.board.cells[n] === null)
                  : [],
              ),
            ),
          ]
        : [];
  const full = !target.board.cells.includes(null);
  return (
    <div className={`ct-game season-${game.season}`}>
      <div className="ct-season-strip">
        <div>
          <span className="ct-eyebrow">第 {game.turn + 1} 次探索</span>
          <h2>{SEASONS[game.season]}的边境</h2>
        </div>
        <div className="ct-season-time">
          <span>
            季节时间{" "}
            <b>
              {game.elapsed} / {LIMITS[game.season]}
            </b>
          </span>
          <progress max={LIMITS[game.season]} value={game.elapsed} />
        </div>
        <div className="ct-coin-count">
          <span className="ct-coin-icon" key={me.board.coins}>
            G
          </span>
          <b>{me.board.coins}</b>
          <small>金币</small>
        </div>
        <div className="ct-total">
          <b>{scoreTotal(me.seasons)}</b>
          <small>已结算声望</small>
        </div>
      </div>
      {notice && (
        <div className="ct-notice" role="status">
          {notice}
        </div>
      )}
      {game.lastEvent.includes("伏击") && (
        <div className="ct-ambush-banner" role="status">
          {game.lastEvent}。怪物相邻空格会在季末扣分，注意封住边缘。
        </div>
      )}
      {children}
      <GuildBoard
        game={game}
        board={target.board}
        preview={projection}
        focus={goalFocus}
        onFocus={(id) => {
          setGoalFocus(id);
          setSourceFocus(null);
        }}
        onInspect={onGoalInspect}
        visibleGoals={teaching && teaching.step < 2 ? 1 : 4}
      />
      <div className="ct-play-layout">
        <main className="ct-map-area">
          {teaching?.step === 0 && (
            <div className="cttut-edge-guide">
              边缘指最外一圈：第 1 / 11 行与 A / K
              列。比较两个位置，再确认你要的一笔。
              <div>
                <button disabled={locked} onClick={() => setAnchor([0, 0])}>
                  预览 A1 边缘：+1
                </button>
                <button disabled={locked} onClick={() => setAnchor([4, 4])}>
                  预览 E5 内部：+0
                </button>
              </div>
            </div>
          )}
          {target.id !== actor && (
            <div className="ct-ambush-banner">
              伏击来袭 · 你正在为 {target.name} 绘制怪物。确认后地图会自动归还。
            </div>
          )}
          <MapBoard
            board={target.board}
            season={game.season}
            preview={anchor && !locked ? previewCells(cells, ...anchor) : []}
            terrain={terrain}
            invalid={!!error}
            onCell={locked ? undefined : (x, y) => setAnchor([x, y])}
            highlight={
              goalFocus
                ? goalHighlights(highlightBoard, goalFocus)
                : sourceHighlight
            }
            label={target.id === actor ? "我的王国" : `${target.name} 的地图`}
          />
          <div className="ct-board-caption">
            <span>山峰四周填满可得 1 金币</span>
            <span>虚线城墙 = 遗迹</span>
            <button className="ct-text-button" onClick={() => setHelp(!help)}>
              规则手册 {help ? "收起" : "展开"}
            </button>
          </div>
          {help && (
            <div className="ct-help">
              <h3>每一笔，都成为你的王国</h3>
              <p>
                根据探索牌，选择一种地形与一个形状。形状可旋转或镜像，必须完整画在空格中，不能重叠或越界。点击格子只会预览，确认落笔后无法撤回。
              </p>
              <p>
                带金币的形状额外获得 1 金币；山峰的上下左右都被填满也获得 1
                金币。遗迹探索须覆盖至少一处未填遗迹。若整张地图无法放下牌上任一形状，可使用单格替代。
              </p>
              <p>
                四季分别结算
                A+B、B+C、C+D、D+A。两项目标分，加上当前所有金币，再减去与怪物相邻的空格数。同一个空格只扣一次。多人伏击时，按牌方向在邻座的地图落笔；单人伏击自动按角落扫描。
              </p>
            </div>
          )}
        </main>
        <aside className="ct-explore-column">
          <section className="ct-explore-card" key={`${game.turn}-${card.id}`}>
            <div className="ct-card-heading">
              <span className="ct-eyebrow">
                {card.kind === "ambush" ? "AMBUSH · 伏击" : "EXPLORE · 探索牌"}
              </span>
              <span className="ct-time-badge">
                {card.time} <small>时间</small>
              </span>
            </div>
            <h3>{card.name}</h3>
            <div className="ct-card-art">
              <TerrainArt terrain={card.terrains[0] || "forest"} size={110} />
              <span className="ct-card-art-line" />
            </div>
            {game.ruins && (
              <div className="ct-ruins-notice">
                遗迹探索 · 形状须覆盖一处遗迹
              </div>
            )}
            <fieldset disabled={locked}>
              <legend>01　选择地形</legend>
              <div className="ct-terrain-options">
                {(fallback
                  ? ([
                      "forest",
                      "village",
                      "farm",
                      "water",
                      "monster",
                    ] as Terrain[])
                  : card.terrains
                ).map((t) => (
                  <button
                    key={t}
                    className={terrain === t ? "selected" : ""}
                    aria-pressed={terrain === t}
                    onClick={() => setTerrain(t)}
                  >
                    <TerrainArt terrain={t} size={30} />
                    <span>{terrainName(t)}</span>
                  </button>
                ))}
              </div>
              <legend>02　选择形状</legend>
              <div className="ct-shape-options">
                {card.shapes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShape(i);
                      setFallback(false);
                    }}
                    className={shape === i && !fallback ? "selected" : ""}
                    aria-pressed={shape === i && !fallback}
                    aria-label={`形状 ${i + 1}${s.coin ? "，获得一金币" : ""}`}
                  >
                    <svg viewBox="0 0 66 54" aria-hidden="true">
                      {transformedShape(s.cells, 0, false).map(([x, y], j) => (
                        <rect
                          key={j}
                          x={4 + x * 11}
                          y={4 + y * 11}
                          width="10"
                          height="10"
                          rx="2"
                        />
                      ))}
                    </svg>
                    {s.coin && <span className="ct-shape-coin">+1 金币</span>}
                  </button>
                ))}
              </div>
              {showTransforms && (
                <div className="ct-transform">
                  <button onClick={() => setRotation((r) => (r + 1) % 4)}>
                    ↻ 旋转
                  </button>
                  <button
                    aria-pressed={mirrored}
                    onClick={() => setMirrored((v) => !v)}
                  >
                    ⇄ 镜像
                  </button>
                </div>
              )}
              {showFallback && (
                <button
                  className={`ct-fallback ${fallback ? "selected" : ""}`}
                  onClick={() => {
                    setFallback(!fallback);
                    setShape(0);
                  }}
                >
                  无法放下？使用单格替代
                </button>
              )}
            </fieldset>
          </section>
          <section className="ct-placement-panel">
            <span className="ct-eyebrow">
              {showCompletion
                ? "本步完成 · 在这里继续"
                : "03　点击地图，确认落笔"}
            </span>
            {!showCompletion && (
              <p className={error ? "ct-error" : ""} role="status">
                {me.submitted
                  ? "已落笔，等待其他制图师…"
                  : locked
                    ? teaching
                      ? "本步练习完成，查看上方反馈，再进入下一步。"
                      : "本季探索结束，查看下方计分。"
                    : error
                      ? `${anchor ? String.fromCharCode(65 + anchor[0]) + String(anchor[1] + 1) : ""}：${error}`
                      : anchor
                        ? `落笔于 ${String.fromCharCode(65 + anchor[0])}${anchor[1] + 1} · ${terrainName(terrain)}`
                        : "先选地形与形状，再点地图预览。"}
              </p>
            )}
            {projection?.valid && (
              <div className="cttut-preview" role="status">
                <strong>本次落笔的预计变化（尚未到账）</strong>
                {projection.goals
                  .filter(
                    (_, i) =>
                      i === game.season % 4 || i === (game.season + 1) % 4,
                  )
                  .map((g) => (
                    <div key={g.id}>
                      {GOALS.find((v) => v.id === g.id)?.title}：{g.before} →{" "}
                      {g.after}（{g.delta >= 0 ? "+" : ""}
                      {g.delta}）
                    </div>
                  ))}
                <div>
                  金币 {projection.coinDelta >= 0 ? "+" : ""}
                  {projection.coinDelta} · 怪物扣款变化{" "}
                  {projection.monsterDelta >= 0 ? "+" : ""}
                  {projection.monsterDelta}
                </div>
              </div>
            )}
            {showCompletion ? (
              <div className="cttut-completion">{completionActions}</div>
            ) : (
              <div className="ct-placement-actions">
                <button
                  onClick={() => setAnchor(null)}
                  disabled={!anchor || locked}
                >
                  取消
                </button>
                <button
                  className="ct-primary"
                  disabled={locked || !anchor || !!error}
                  onClick={() => {
                    onAction({ type: "place", placement });
                    setAnchor(null);
                  }}
                >
                  确认落笔 <span>→</span>
                </button>
              </div>
            )}
            {full && !locked && (
              <button
                onClick={() =>
                  onAction({
                    type: "place",
                    placement: fullBoardPlacement(card.kind),
                  })
                }
              >
                地图已满，完成本次探索
              </button>
            )}
          </section>
        </aside>
      </div>
      {game.phase !== "placing" && (
        <section
          className="ct-score-panel"
          key={game.season}
          aria-live="polite"
        >
          <div>
            <span className="ct-eyebrow">SEASON REPORT</span>
            <h2>
              {game.phase === "finished"
                ? "王国绘成，远征落幕"
                : `${SEASONS[game.season]} · 季末结算`}
            </h2>
          </div>
          <div className="cttut-score-source" aria-label="本季声望来源">
            <h3>本季声望来源 · 已结算</h3>
            {me.seasons.slice(-1).map((s) => (
              <div key={s.season}>
                {s.goals.map((value, i) => {
                  const index = (s.season + i) % 4;
                  const id = game.goals[index];
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setGoalFocus(id);
                        setSourceFocus(null);
                      }}
                    >
                      {"ABCD"[index]} {GOALS.find((g) => g.id === id)?.title} +
                      {value} · 描亮贡献格
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setGoalFocus(null);
                    setSourceFocus("coins");
                  }}
                >
                  金币 +{s.coins} · 描亮围合山峰
                </button>
                <button
                  onClick={() => {
                    setGoalFocus(null);
                    setSourceFocus("monsters");
                  }}
                >
                  怪物 −{s.monsters} · 描亮相邻空格
                </button>
                <p>
                  A/B 等本季两项委托 + 当前全部金币 − 怪物相邻空格 =
                  本季已到账声望。金币包括形状奖励与围山奖励；描亮山峰只显示围山来源。
                </p>
              </div>
            ))}
            <p>
              当前怪物相邻空格 {monsterPenalty(me.board)}{" "}
              个。地图与金币保留；下一季更换生效委托。同一委托之后还可再次结算。
            </p>
          </div>
          <div className="ct-score-table">
            {game.players.map((p) => (
              <div key={p.id}>
                <h3>{p.name}</h3>
                {p.seasons.map((s) => (
                  <p key={s.season}>
                    <span>{SEASONS[s.season]}</span>
                    <span>
                      目标 {s.goals[0]} + {s.goals[1]}　金币 +{s.coins}　怪物 −
                      {s.monsters}
                    </span>
                    <b>{s.total}</b>
                  </p>
                ))}
                <strong>总声望 {scoreTotal(p.seasons)}</strong>
              </div>
            ))}
          </div>
          {game.phase === "seasonEnd" && (
            <button
              className="ct-primary"
              onClick={() => onAction({ type: "next" })}
              disabled={pending}
            >
              {game.season === 3 ? "完成远征，查看评级 →" : "进入下一季 →"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
