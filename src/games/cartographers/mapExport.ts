/** Export only the map inside a caller-owned viewer, never another player's preview. */
export async function downloadBoardImage(
  scope: HTMLElement,
  filename = "我的王国-制图师.png",
  title = "我的王国",
  subtitle = "冒险者协会 · 四季远征",
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1180;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("当前浏览器无法导出图片");
  ctx.fillStyle = "#f3ead4";
  ctx.fillRect(0, 0, 1200, 1180);
  ctx.fillStyle = "#31503b";
  ctx.font = "32px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(title.slice(0, 40), 600, 60);
  const scene = scope.querySelector<HTMLCanvasElement>(
    'canvas[data-diorama][data-ready="true"]',
  );
  if (scene && scene.width > 0 && scene.height > 0) {
    const ratio = Math.min(1120 / scene.width, 990 / scene.height);
    const w = scene.width * ratio,
      h = scene.height * ratio;
    ctx.drawImage(scene, (1200 - w) / 2, 95 + (990 - h) / 2, w, h);
  } else {
    const cells = Array.from(scope.querySelectorAll(".ct-board > .ct-cell"));
    if (cells.length !== 121) throw Error("地图还在准备中，请稍后再试");
    const size = 88,
      x0 = 116,
      y0 = 105;
    await Promise.all(
      cells.map(async (cell, i) => {
        const x = x0 + (i % 11) * size,
          y = y0 + Math.floor(i / 11) * size;
        ctx.strokeStyle = "#b8af93";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
        const svg = cell.querySelector("svg");
        if (!svg) return;
        const clean = svg.cloneNode(true) as SVGElement;
        clean.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clean.setAttribute("width", String(size));
        clean.setAttribute("height", String(size));
        const url = URL.createObjectURL(
          new Blob([new XMLSerializer().serializeToString(clean)], {
            type: "image/svg+xml",
          }),
        );
        try {
          await new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              ctx.drawImage(image, x, y, size, size);
              resolve();
            };
            image.onerror = () => reject(Error("地形插画无法导出"));
            image.src = url;
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      }),
    );
  }
  ctx.fillStyle = "#8b7d60";
  ctx.font = "19px Georgia, serif";
  ctx.fillText(subtitle, 600, 1135);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}
