import type { Point } from "./types";

export function worldToCell(x: number, z: number): Point | null {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < -5.5 ||
    x >= 5.5 ||
    z < -5.5 ||
    z >= 5.5
  )
    return null;
  return [Math.floor(x + 5.5), Math.floor(z + 5.5)];
}
export function cellToWorld(x: number, y: number): [number, number] {
  return [x - 5, y - 5];
}
export function isCameraDrag(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > 5;
}
export function tileVariant(index: number): number {
  return (((index * 137 + 53) % 997) + 997) % 997;
}

/** Fit the raised board and tallest miniature, with a 12% framing margin. */
export function fitDioramaView(
  aspect: number,
  angle: number,
  elevation: number,
  top: boolean,
) {
  const horizontal =
    11.45 * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
  const slope = Math.hypot(1, elevation);
  const spanX = top ? 11.45 : horizontal;
  const spanY = top ? 11.45 : (horizontal * elevation) / slope + 1.6 / slope;
  const halfHeight = Math.max(spanY, spanX / aspect) / (2 * 0.88);
  return { halfWidth: halfHeight * aspect, halfHeight, targetY: 0.3 };
}
