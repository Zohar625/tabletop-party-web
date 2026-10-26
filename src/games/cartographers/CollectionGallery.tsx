import { useRef, useState } from "react";
import type { MapArchive } from "./collection";
import { MapBoard } from "./MapBoard";
import { downloadBoardImage } from "./mapExport";
import type { Terrain } from "./types";
import "./collection.css";
const seasons = ["春日", "盛夏", "金秋", "寒冬"];
const colors: Record<Terrain, string> = {
  forest: "#66895e",
  village: "#b8664f",
  farm: "#d2ae57",
  water: "#84b8c3",
  monster: "#806484",
  mountain: "#aaa58d",
  wasteland: "#b7a480",
};
function Miniature({ archive }: { archive: MapArchive }) {
  const board = archive.snapshots[archive.snapshots.length - 1].board;
  return (
    <svg viewBox="0 0 132 132" className="ct-album-mini" aria-hidden="true">
      <rect width="132" height="132" rx="5" fill="#d8c9a7" />
      {board.cells.map((t, i) => (
        <rect
          key={i}
          x={11 + (i % 11) * 10}
          y={11 + Math.floor(i / 11) * 10}
          width="9"
          height="9"
          rx="1"
          fill={t ? colors[t] : "#f0e6cd"}
        />
      ))}
    </svg>
  );
}
export function CollectionGallery({
  records,
  onClose,
  onUpdate,
}: {
  records: MapArchive[];
  onClose: () => void;
  onUpdate: (id: string, title: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(
      records[0]?.id || null,
    ),
    [season, setSeason] = useState(3),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState(false),
    [title, setTitle] = useState("");
  const viewer = useRef<HTMLDivElement>(null);
  const archive = records.find((a) => a.id === selected) || records[0];
  const snapshot =
    archive?.snapshots.find((s) => s.season === season) ||
    archive?.snapshots[archive.snapshots.length - 1];
  async function download() {
    if (!viewer.current || !archive || !snapshot) return;
    try {
      await downloadBoardImage(
        viewer.current,
        `${archive.title}-${seasons[snapshot.season]}.png`,
        archive.title,
        `${seasons[snapshot.season]} · 声望 ${archive.score} · 一桌好戏`,
      );
      setNotice("图片已交给浏览器下载。");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "导出失败，请稍后重试");
    }
  }
  return (
    <section className="ct-album">
      <header className="ct-album-heading">
        <div>
          <span className="ct-eyebrow">THE ATLAS COLLECTION</span>
          <h1>我的山河收藏册</h1>
          <p>把四季留在这一方沙盘里。收藏保存在当前设备，无需登录。</p>
        </div>
        <button onClick={onClose}>返回书桌 →</button>
      </header>
      {!archive ? (
        <div className="ct-album-empty">
          <h2>第一座王国，还在等你落笔。</h2>
          <p>
            完成一局远征后，自己的地图会自动加入这里。旧版仅有分数的记录仍在远征档案中。
          </p>
          <button className="ct-primary" onClick={onClose}>
            去绘制我的王国
          </button>
        </div>
      ) : (
        <div className="ct-album-layout">
          <aside className="ct-album-shelf" aria-label="已收藏地图">
            {records.map((a) => (
              <button
                className={`ct-album-card ${a.id === archive.id ? "selected" : ""}`}
                key={a.id}
                onClick={() => {
                  setSelected(a.id);
                  setSeason(3);
                  setEditing(false);
                  setNotice("");
                }}
                aria-pressed={a.id === archive.id}
              >
                <Miniature archive={a} />
                <span>
                  <strong>{a.title}</strong>
                  <small>
                    {new Date(a.createdAt).toLocaleDateString("zh-CN")} ·{" "}
                    {a.mode === "solo" ? "单人远征" : "朋友同绘"}
                  </small>
                  <b>{a.score} 声望</b>
                </span>
              </button>
            ))}
          </aside>
          <main className="ct-album-display">
            <div className="ct-album-title">
              <div>
                <span className="ct-eyebrow">YOUR OWN LITTLE KINGDOM</span>
                <h2>{archive.title}</h2>
                <p>
                  {archive.rating?.title || "朋友同绘 · 独一无二的地图"} ·{" "}
                  {archive.score} 声望
                </p>
              </div>
              <button
                onClick={() => {
                  setTitle(archive.title);
                  setEditing(!editing);
                }}
              >
                给王国起名
              </button>
            </div>
            {editing && (
              <form
                className="ct-album-name"
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdate(archive.id, title);
                  setEditing(false);
                }}
              >
                <label>
                  王国名称
                  <input
                    value={title}
                    maxLength={40}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <button className="ct-primary">保存名称</button>
              </form>
            )}
            <div className="ct-album-seasons" aria-label="查看记录到的四季">
              {seasons.map((name, i) => (
                <button
                  key={name}
                  disabled={!archive.snapshots.some((s) => s.season === i)}
                  aria-pressed={snapshot?.season === i}
                  onClick={() => setSeason(i)}
                >
                  {name}
                </button>
              ))}
            </div>
            {archive.snapshots.length < 4 && (
              <p className="ct-album-note">
                此局记录了{" "}
                {archive.snapshots.map((s) => seasons[s.season]).join("、")}{" "}
                地图；没有记录到的季节不会补画。
              </p>
            )}
            <div ref={viewer} className="ct-album-viewer">
              {snapshot && (
                <MapBoard
                  key={archive.id}
                  board={snapshot.board}
                  season={snapshot.season}
                  label={archive.title}
                />
              )}
            </div>
            <div className="ct-album-actions">
              <p>在沙盘中选择“欣赏”可旋转、缩放，再导出喜欢的视角。</p>
              <button className="ct-primary" onClick={() => void download()}>
                导出这幅山河 PNG ↓
              </button>
            </div>
            {notice && (
              <p role="status" className="ct-notice">
                {notice}
              </p>
            )}
          </main>
        </div>
      )}
    </section>
  );
}
