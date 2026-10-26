import test from "node:test";
import assert from "node:assert/strict";
import {
  worldToCell,
  cellToWorld,
  isCameraDrag,
  tileVariant,
  fitDioramaView,
} from "../src/games/cartographers/dioramaMath.ts";
import * as THREE from "three";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("camera fits the full miniature envelope tightly on desktop and mobile at every rotation", () => {
  for (const aspect of [864 / 650, 350 / 370, 2.1, 0.7]) {
    for (const angle of [0, Math.PI / 4, Math.PI / 2, 2.3]) {
      for (const elevation of [0.65, 0.95, 2.7]) {
        for (const top of [false, true]) {
          const fit = fitDioramaView(aspect, angle, elevation, top);
          const camera = new THREE.OrthographicCamera(
            -fit.halfWidth,
            fit.halfWidth,
            fit.halfHeight,
            -fit.halfHeight,
            0.1,
            80,
          );
          if (top) {
            camera.position.set(0, fit.targetY + 20, 0);
            camera.up.set(0, 0, -1);
          } else
            camera.position.set(
              Math.sin(angle) * 17,
              fit.targetY + elevation * 17,
              Math.cos(angle) * 17,
            );
          camera.lookAt(0, fit.targetY, 0);
          camera.updateMatrixWorld();
          let extent = 0;
          for (const x of [-5.725, 5.725])
            for (const z of [-5.725, 5.725])
              for (const y of [-0.5, 1.1]) {
                const point = new THREE.Vector3(x, y, z).project(camera);
                extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
              }
          assert.ok(
            extent <= 0.9,
            `envelope clipped at ${aspect}, ${angle}, ${elevation}`,
          );
          assert.ok(
            extent >= 0.8,
            `excess whitespace at ${aspect}, ${angle}, ${elevation}`,
          );
        }
      }
    }
  }
});

test("plane picking maps all cell centers and rejects the outer edge", () => {
  assert.deepEqual(worldToCell(-5, -5), [0, 0]);
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 11; x++) {
      assert.deepEqual(worldToCell(...cellToWorld(x, y)), [x, y]);
    }
  assert.deepEqual(worldToCell(-5.5, -5.5), [0, 0]);
  assert.deepEqual(worldToCell(5.499, 5.499), [10, 10]);
  for (const [x, z] of [
    [5.5, 0],
    [-5.501, 0],
    [0, 6],
    [NaN, 0],
    [Infinity, 0],
  ])
    assert.equal(worldToCell(x, z), null);
});
test("camera drag uses screen distance so a gesture cannot place a cell", () => {
  assert.equal(isCameraDrag(3, 4), false);
  assert.equal(isCameraDrag(6, 0), true);
  assert.equal(isCameraDrag(-4, -4), true);
});
test("miniature variants stay deterministic across seasons and rerenders", () => {
  assert.equal(tileVariant(18), tileVariant(18));
  assert.notEqual(tileVariant(18), tileVariant(19));
  for (let i = 0; i < 121; i++)
    assert.ok(tileVariant(i) >= 0 && tileVariant(i) < 1000);
});
test("server rendering keeps 121 playable accessible cells without loading a WebGL scene", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  try {
    const { MapBoard } = await server.ssrLoadModule(
      "/src/games/cartographers/MapBoard.tsx",
    );
    const board = {
      cells: Array(121).fill(null),
      coins: 0,
      earnedMountains: [],
    };
    const markup = renderToStaticMarkup(
      createElement(MapBoard, {
        board,
        season: 3,
        onCell() {},
        preview: [[0, 0]],
        highlight: [0],
      }),
    );
    assert.equal((markup.match(/class="ct-cell /g) ?? []).length, 121);
    assert.match(markup, /A1，空地，待落笔/);
    assert.match(markup, /二维兼容视图/);
    assert.doesNotMatch(markup, /<canvas/);
    assert.match(markup, /preview[^\"]*highlight/);
  } finally {
    await server.close();
  }
});
