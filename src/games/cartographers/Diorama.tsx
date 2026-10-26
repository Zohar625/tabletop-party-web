import { useEffect, useRef, useState } from "react";
import { createDioramaScene, type DioramaState } from "./dioramaScene";

export default function Diorama(
  props: DioramaState & { label: string; onFailure: () => void },
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof createDioramaScene> | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [appreciation, setAppreciation] = useState(!props.onCell);
  useEffect(() => {
    if (!canvas.current) return;
    try {
      scene.current = createDioramaScene(canvas.current, latest.current, () =>
        latest.current.onFailure(),
      );
    } catch {
      latest.current.onFailure();
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.update(props);
  }, [props]);
  const editable = !!props.onCell;
  useEffect(() => {
    setAppreciation(!editable);
    scene.current?.setView(editable ? "edit" : "appreciation");
  }, [editable]);
  return (
    <div className="ct-diorama">
      <div className="ct-diorama-tools" aria-label="沙盘视角">
        {props.onCell && (
          <button
            type="button"
            aria-pressed={!appreciation}
            onClick={() => {
              setAppreciation(false);
              scene.current?.setView("edit");
            }}
          >
            稳定落笔
          </button>
        )}
        <button
          type="button"
          aria-pressed={appreciation}
          onClick={() => {
            setAppreciation(true);
            scene.current?.setView("appreciation");
          }}
        >
          欣赏沙盘
        </button>
        <button type="button" onClick={() => scene.current?.setView("top")}>
          俯视地图
        </button>
        <button type="button" onClick={() => scene.current?.setView("reset")}>
          重置视角
        </button>
      </div>
      <canvas
        ref={canvas}
        data-diorama="true"
        aria-label={`${props.label}，真实3D微缩沙盘`}
        role="img"
        style={{ touchAction: appreciation ? "none" : "pan-y" }}
      />
      <p className="ct-diorama-hint">
        {appreciation
          ? "拖动旋转；滚轮或缩放按钮调整大小。欣赏时不会落笔。"
          : "点击地块预览，再在地图下方确认落笔。拖动不会落笔。"}
      </p>
      {appreciation && (
        <div className="ct-diorama-tools">
          <button
            type="button"
            aria-label="缩小3D地图"
            onClick={() => scene.current?.setView("zoomOut")}
          >
            缩小
          </button>
          <button
            type="button"
            aria-label="放大3D地图"
            onClick={() => scene.current?.setView("zoomIn")}
          >
            放大
          </button>
        </div>
      )}
    </div>
  );
}
