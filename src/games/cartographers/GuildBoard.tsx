import { useState } from "react";
import type { Board, MapView } from "./types";
import type { PlacementPreview } from "./commission-model";
import { nextCommissionSeason } from "./commission-model";
import { GOALS } from "./data";
import { scoreBoard } from "./scoring";
import { SEASONS } from "./ui-model";
import "./guild.css";
const examples: Record<string, string> = {
  sentinel: "例：边缘森林 1 格 → 1 分；内部森林 → 0 分。",
  treetower: "例：森林四面全被填住 → 1 分。",
  greenbough: "例：一格森林所在的行、列各计 1 分。",
  stoneside: "例：一片森林连接两座山 → 两山共 6 分。",
  wildholds: "例：6 格相连村庄 → 8 分。",
  greengold: "例：村落旁有森林、农田、水域 → 3 分。",
  greatcity: "例：最大村落有 3 格且不邻山 → 3 分。",
  shieldgate: "例：村落大小 5、3 → 第二片 6 分。",
  canal: "例：农田与水域相邻 → 两格共 2 分。",
  granary: "例：遗迹上画一格农田 → 3 分。",
  mages: "例：水域贴山峰 → 2 分。",
  shoreside: "例：一片农田不贴边、不邻水 → 3 分。",
  borderlands: "例：一整行填满 → 6 分。",
  brokenroad: "例：左边通向下边的一条斜线填满 → 3 分。",
  barony: "例：填满 2×2 正方形 → 6 分。",
  cauldrons: "例：空格上下左右封住 → 1 分。",
};
export function GuildBoard({
  game,
  board,
  preview,
  focus,
  onFocus,
  onInspect,
  visibleGoals = 4,
}: {
  game: MapView;
  board: Board;
  preview?: PlacementPreview;
  focus: string | null;
  onFocus: (id: string | null) => void;
  onInspect?: (id: string) => void;
  visibleGoals?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const active = [game.season % 4, (game.season + 1) % 4];
  const projection = preview?.valid ? preview : undefined;
  return (
    <section
      className={`ctguild-board ${expanded ? "ctguild-expanded" : ""}`}
      aria-label="冒险者协会委托板"
    >
      <div className="ctguild-header">
        <div>
          <span className="ctguild-kicker">冒险者协会 · 四季测绘契约</span>
          <h3>先看委托，再决定画在哪里</h3>
        </div>
        <button
          className="ctguild-collapse"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "收起委托" : "展开全部委托"}
        </button>
      </div>
      <p className="ctguild-summary">
        {SEASONS[game.season]}结算 {active.map((i) => "ABCD"[i]).join(" + ")} ·
        以下为地图预计声望，季末才到账。每季按整张地图重新计分。
      </p>
      <div className="ctguild-cards">
        {game.goals.slice(0, visibleGoals).map((id, i) => {
          const goal = GOALS.find((g) => g.id === id);
          if (!goal) return null;
          const isActive = active.includes(i),
            next = nextCommissionSeason(game.season, i),
            change = projection?.goals.find((g) => g.id === id);
          return (
            <button
              key={id}
              className={`ctguild-paper ${isActive ? "ctguild-active" : "ctguild-future"} ${focus === id ? "ctguild-focused" : ""}`}
              aria-pressed={focus === id}
              onClick={() => {
                onFocus(focus === id ? null : id);
                onInspect?.(id);
              }}
            >
              <span className="ctguild-letter">{"ABCD"[i]}</span>
              <span className="ctguild-stamp">
                {isActive
                  ? "本季结算"
                  : next === null
                    ? "本局已结算"
                    : `下次：${SEASONS[next]}`}
              </span>
              <h4>{goal.title}</h4>
              <p>{goal.description}</p>
              <p className="ctguild-example">{examples[id]}</p>
              <div className="ctguild-score">
                当前预计 <b>{scoreBoard(board, id)}</b>
                {change && (
                  <span>
                    {" "}
                    → <b>{change.after}</b>
                    <em className={change.delta < 0 ? "ctguild-loss" : ""}>
                      （{change.delta >= 0 ? "+" : ""}
                      {change.delta}）
                    </em>
                  </span>
                )}
              </div>
              <small>
                {focus === id ? "正在描亮实际贡献格" : "点击查看贡献格"}
              </small>
            </button>
          );
        })}
      </div>
      {focus && (
        <p className="ctguild-detail" role="status">
          {GOALS.find((g) => g.id === focus)?.title}：已描亮
          {projection ? "预览落笔后" : "当前地图"}的真实贡献格。
          {GOALS.find((g) => g.id === focus)?.description}{" "}
          只有本季生效委托计入本季声望。
        </p>
      )}
    </section>
  );
}
