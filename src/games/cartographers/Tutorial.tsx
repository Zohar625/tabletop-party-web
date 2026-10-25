import { useState } from "react";
import { createGame, reduceGame } from "./engine";
import type { MapGame } from "./types";
import { GameTable } from "./GameTable";
import { createBoard } from "./data";
const lessons = [
  [
    "认识探索牌",
    "森林或村庄，选一种喜欢的地形。点选地图上的空格，再确认落笔。",
  ],
  [
    "让形状转个弯",
    "试试旋转和镜像按钮。半透明形状是待落笔的位置；越界或压住山峰时不能确认。",
  ],
  [
    "每一次落笔都算数",
    "点击另一个位置可以移动预览，取消则收起预览。只有确认落笔才真正填入地图。",
  ],
  [
    "给山峰围一圈",
    "这座山峰已经围好了三面。把单格放在 E4，填上最后一面，看看金币如何增加。",
  ],
  [
    "按敕令绘制王国",
    "地图下方的 A、B 敕令在春季生效。点击目标查看说明与实时分数，再画一片地形。",
  ],
  [
    "寻找古老遗迹",
    "地图中虚线石墙是遗迹。请让这次的形状覆盖一处遗迹。整张地图确实无法容纳形状时，才能改画一个单格。",
  ],
  [
    "怪物来到边境",
    "地图交到了你手上：请在邻座地图放下怪物。怪物周围每个空格在季末扣 1 分。正式单人局自动按伏击牌扫描；联机局由邻座放置。",
  ],
  [
    "亲手完成季末计分",
    "最后落一笔，让时间达到本季上限。下方将显示两项敕令、金币和怪物扣分。每季保留全部地图与金币。",
  ],
];
export function lessonGame(step: number, fallbackStage = false): MapGame {
  const g = createGame(
    [{ id: "student", name: "新晋制图师" }],
    "cartographers-tutorial",
    "solo",
  );
  g.current = {
    id: `lesson-${step}`,
    name: [
      "边境小径",
      "蜿蜒林间",
      "初次落笔",
      "山间补笔",
      "皇家田园",
      "遗迹边缘",
      "怪物踪迹",
      "春日终章",
    ][step],
    kind: "explore",
    time: step === 7 ? 1 : 0,
    terrains:
      step === 6
        ? ["monster"]
        : step === 4
          ? ["farm", "water"]
          : ["forest", "village"],
    shapes:
      step === 1
        ? [
            {
              cells: [
                [0, 0],
                [1, 0],
                [0, 1],
              ],
            },
          ]
        : [{ cells: [[0, 0]], coin: step === 0 }],
  };
  if (step === 3) {
    g.players[0].board.cells[3 * 11 + 3] = "mountain";
    g.players[0].board.cells[2 * 11 + 3] = "forest";
    g.players[0].board.cells[3 * 11 + 2] = "forest";
    g.players[0].board.cells[4 * 11 + 3] = "forest";
    g.current.terrains = ["forest"];
  }
  if (step === 6) {
    g.mode = "multi";
    g.players.push({
      id: "neighbor",
      name: "邻座的制图师",
      board: createBoard(),
      submitted: true,
      seasons: [],
    });
    g.current.kind = "ambush";
    g.current.direction = 1;
  }
  g.ruins = step === 5;
  g.elapsed = step === 7 ? 8 : 0;
  if (step === 5 && fallbackStage) {
    g.current.id = "lesson-5-fallback";
    g.current.name = "遗迹封闭之后";
    g.current.shapes = [
      {
        cells: [
          [0, 0],
          [1, 0],
        ],
      },
    ];
    g.players[0].board.cells.fill("forest");
    g.players[0].board.cells[0] = null;
  }
  return g;
}
export default function Tutorial({
  onExit,
  onStart,
}: {
  onExit: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(0),
    [game, setGame] = useState(() => lessonGame(0)),
    [done, setDone] = useState(false),
    [error, setError] = useState(""),
    [inspected, setInspected] = useState(false),
    [fallbackStage, setFallbackStage] = useState(false);
  function go(n: number) {
    setStep(n);
    setGame(lessonGame(n));
    setDone(false);
    setError("");
    setInspected(false);
    setFallbackStage(false);
  }
  return (
    <div className="ct-tutorial">
      <div className="ct-tutorial-heading">
        <div>
          <span className="ct-eyebrow">FIELD GUIDE · 实操教学</span>
          <h1>你的第一张地图</h1>
        </div>
        <button onClick={onExit}>退出教学</button>
      </div>
      <section className="ct-lesson">
        <div className="ct-lesson-number">
          {String(step + 1).padStart(2, "0")}
          <small>/ 08</small>
        </div>
        <div>
          <h2>{lessons[step][0]}</h2>
          <p>
            {step === 5 && fallbackStage
              ? "遗迹落笔完成。现在地图只剩 A1 空格，牌面形状与遗迹都放不下了。点击“使用单格替代”，在 A1 放一个单格，再确认。替代格不必覆盖遗迹。"
              : lessons[step][1]}
          </p>
          {done && (
            <p className="ct-success">
              {step === 3
                ? `山峰四周已填满，当前金币 ${game.players[0].board.coins}。`
                : step === 7
                  ? "春季结算已完成。你的地图会一直保留，直到冬季结束。"
                  : "这一笔完成了。准备好就进入下一课。"}
            </p>
          )}
          {error && (
            <p role="alert" className="ct-error">
              {error}
            </p>
          )}
        </div>
        <div className="ct-lesson-nav">
          <button disabled={step === 0} onClick={() => go(step - 1)}>
            上一步
          </button>
          <button onClick={() => go(step)}>重试</button>
          {step < 7 ? (
            <button
              className="ct-primary"
              disabled={!done}
              onClick={() => go(step + 1)}
            >
              下一课 →
            </button>
          ) : (
            <button className="ct-primary" disabled={!done} onClick={onStart}>
              开始正式远征 →
            </button>
          )}
        </div>
      </section>
      <div className="ct-lesson-progress" aria-label={`教学进度 ${step + 1}/8`}>
        {lessons.map((_, i) => (
          <span key={i} className={i <= step ? "complete" : ""} />
        ))}
      </div>
      <GameTable
        game={game}
        actor="student"
        pending={done}
        onGoalInspect={() => setInspected(true)}
        onAction={(action) => {
          try {
            if (action.type === "place" && step === 4 && !inspected) {
              setError(
                "请先点击地图下方 A 或 B 敕令，读一读目标说明与当前试算分。",
              );
              return;
            }
            if (
              action.type === "place" &&
              step === 1 &&
              action.placement.rotation === 0 &&
              !action.placement.mirrored
            ) {
              setError("先试一次旋转或镜像，让形状换个朝向。");
              return;
            }
            if (
              action.type === "place" &&
              step === 3 &&
              (action.placement.x !== 4 || action.placement.y !== 3)
            ) {
              setError("这一课请填在 E4：它是山峰右侧最后一个空格。");
              return;
            }
            const result = reduceGame(game, "student", action);
            if (step === 5 && !fallbackStage) {
              setGame(lessonGame(5, true));
              setFallbackStage(true);
              setError("");
              return;
            }
            setGame(result);
            setDone(true);
            setError("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "请检查这次落笔。");
          }
        }}
      />
    </div>
  );
}
