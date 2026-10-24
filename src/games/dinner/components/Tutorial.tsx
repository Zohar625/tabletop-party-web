import { useState } from "react";
import { DishArt } from "./DishArt";

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<"safe" | "bad">("safe");
  const [firstOwner, setFirstOwner] = useState<"self" | "opponent">("self");
  const titles = [
    "先盖上一道菜",
    "相信自己的判断？叫 2！",
    "自由选择，先揭谁的菜？",
    "再揭一道最上面的菜",
    "你已经会玩了",
  ];
  return (
    <div
      className="dinner-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <section className="tutorial-sheet">
        <div className="section-heading">
          <span className="eyebrow">上桌练习 · 自由揭菜版</span>
          <button className="text-button" onClick={onClose}>
            退出教学
          </button>
        </div>
        <div className="tutorial-dots">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i <= step ? "active" : ""} />
          ))}
        </div>
        <h2 id="tutorial-title">{titles[step]}</h2>
        {step === 0 && (
          <>
            <p>每人有 3 道好菜、1 道坏菜。选一道，盖着放在自己面前。</p>
            <p>
              第一道菜，其他人可以同时放，首家最后放；之后才轮流加菜或叫价。
            </p>
            <div className="tutorial-cards">
              {(["safe", "bad"] as const).map((kind) => (
                <button
                  key={kind}
                  className={`dish-card ${choice === kind ? "selected" : ""}`}
                  onClick={() => setChoice(kind)}
                >
                  <DishArt
                    dish={{
                      name: kind === "safe" ? "蛋炒饭" : "芥末奶油蛋糕",
                      kind,
                    }}
                  />
                  <strong>{kind === "safe" ? "好菜" : "坏菜"}</strong>
                </button>
              ))}
            </div>
            <button className="primary" onClick={() => setStep(1)}>
              盖好这道{choice === "safe" ? "好" : "坏"}菜
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <DishArt covered motion="close" />
            <p>
              轮到你时，可以继续放菜，也可以叫价。叫 2，就要连续翻出 2
              道好菜。之后大家只能加价或放弃。
            </p>
            <button className="primary" onClick={() => setStep(2)}>
              我敢吃 2 道
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <p>
              当前采用自由揭菜：可以先揭自己，也可以先揭任意对手。每次只能揭该玩家最上面一道，翻够叫价即成功。
            </p>
            <button
              className="tutorial-flip"
              onClick={() => {
                setFirstOwner("self");
                setStep(choice === "safe" ? 3 : 4);
              }}
            >
              <DishArt covered />
              <strong>这次先揭自己的菜</strong>
            </button>
            <button
              className="tutorial-flip"
              onClick={() => {
                setFirstOwner("opponent");
                setStep(3);
              }}
            >
              <DishArt covered />
              <strong>也可以先揭对手的菜</strong>
            </button>
            <small>选谁都行，不用先翻完自己的菜。</small>
          </>
        )}
        {step === 3 && (
          <>
            <div className="tutorial-safe">
              <DishArt
                dish={{
                  name: firstOwner === "self" ? "蛋炒饭" : "红烧肉",
                  kind: "safe",
                }}
                motion="open"
              />
              <strong>第 1 道，是好菜。</strong>
            </div>
            <p>
              第 1 道安全。下一道仍可自由选择任意玩家；这次试试另一道对手的菜。
            </p>
            <button className="tutorial-flip" onClick={() => setStep(4)}>
              <DishArt covered />
              <strong>揭开对手的菜</strong>
            </button>
          </>
        )}
        {step === 4 && (
          <>
            <DishArt
              dish={{ name: "芥末奶油蛋糕", kind: "bad" }}
              motion="open"
            />
            <h3>
              哎呀，是
              {firstOwner === "self" && choice === "bad" ? "自己" : "对手"}
              的坏菜！
            </h3>
            <p>
              挑战失败，你会失去一张牌。翻到自己的坏菜，由你选择丢牌；翻到别人的坏菜，则随机失去一张。牌丢光就出局。
            </p>
            <p>
              每轮结束，未丢弃的菜会收回，下轮继续用；永久丢弃的菜不会回来。
            </p>
            <p>
              <strong>连续翻够叫价的好菜，赢下一轮。先赢 2 轮的人获胜！</strong>
            </p>
            <div className="button-row">
              <button className="secondary" onClick={() => setStep(0)}>
                再练一次
              </button>
              <button className="primary" onClick={onClose}>
                懂了，去上桌
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
