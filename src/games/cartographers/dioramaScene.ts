import * as THREE from "three";
import type { Board, Point, Terrain } from "./types";
import {
  cellToWorld,
  fitDioramaView,
  isCameraDrag,
  tileVariant,
  worldToCell,
} from "./dioramaMath";
import { createModelLibrary, SEASON_PALETTES } from "./dioramaModels";
import { RUINS } from "./data";

export interface DioramaState {
  board: Board;
  season: number;
  preview: Point[];
  terrain: Terrain;
  invalid: boolean;
  highlight: number[];
  onCell?: (x: number, y: number) => void;
}
export function createDioramaScene(
  canvas: HTMLCanvasElement,
  initial: DioramaState,
  onFailure: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  // If setup fails before React receives the scene handle, release everything
  // already created. The normal unmount path below handles successful setup.
  const rollback: (() => void)[] = [
    () => {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  ];
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    const ambient = new THREE.HemisphereLight(0xfff7df, 0x575b60, 2.4);
    const sun = new THREE.DirectionalLight(0xfff0cf, 3.2);
    rollback.push(() => sun.shadow.dispose());
    sun.position.set(-5, 12, -7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -9,
      right: 9,
      top: 9,
      bottom: -9,
      near: 1,
      far: 35,
    });
    sun.shadow.bias = -0.002;
    scene.add(ambient, sun);
    const library = createModelLibrary();
    rollback.push(() => library.dispose());
    const boardGroup = new THREE.Group(),
      overlay = new THREE.Group();
    scene.add(boardGroup, overlay);
    const owned: (THREE.BufferGeometry | THREE.Material)[] = [];
    const own = <T extends THREE.BufferGeometry | THREE.Material>(
      item: T,
    ): T => {
      owned.push(item);
      rollback.push(() => item.dispose());
      return item;
    };
    const base = new THREE.Mesh(
      own(new THREE.BoxGeometry(11.45, 0.42, 11.45)),
      own(new THREE.MeshStandardMaterial({ color: 0x67503c, roughness: 0.9 })),
    );
    base.position.y = -0.28;
    base.receiveShadow = true;
    scene.add(base);
    const square = own(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.46, 0, -0.46),
        new THREE.Vector3(0.46, 0, -0.46),
        new THREE.Vector3(0.46, 0, 0.46),
        new THREE.Vector3(-0.46, 0, 0.46),
      ]),
    );
    const gold = own(
      new THREE.LineBasicMaterial({ color: 0xffd665, depthTest: false }),
    );
    const valid = own(
      new THREE.LineBasicMaterial({ color: 0x154943, depthTest: false }),
    );
    const invalid = own(
      new THREE.LineBasicMaterial({ color: 0xe13c36, depthTest: false }),
    );
    const ruinMaterial = own(
      new THREE.MeshStandardMaterial({ color: 0x917960, roughness: 1 }),
    );
    const ruinGeometry = own(new THREE.BoxGeometry(0.12, 0.22, 0.12));
    const tileGeometry = own(new THREE.BoxGeometry(0.97, 0.14, 0.97));
    const tileMaterials = SEASON_PALETTES.map(
      (palette) =>
        Object.fromEntries(
          Object.entries(palette.ground).map(([terrain, color]) => [
            terrain,
            own(new THREE.MeshStandardMaterial({ color, roughness: 1 })),
          ]),
        ) as Record<Terrain | "empty", THREE.MeshStandardMaterial>,
    );
    const fillGeometry = own(new THREE.PlaneGeometry(0.92, 0.92));
    const fillValid = own(
      new THREE.MeshBasicMaterial({
        color: 0x62d1b0,
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        depthWrite: false,
      }),
    );
    const fillInvalid = own(
      new THREE.MeshBasicMaterial({
        color: 0xeb5454,
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        depthWrite: false,
      }),
    );
    let state = initial,
      disposed = false,
      frame = 0,
      appreciation = !initial.onCell,
      top = false;
    let angle = appreciation ? Math.PI / 4 : 0,
      elevation = 0.95,
      zoom = 1;
    rollback.push(() => {
      disposed = true;
      cancelAnimationFrame(frame);
    });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const backgroundColors = [0xcbdcca, 0xbed4cd, 0xe1c6a4, 0xcbd7e4];
    const targetBackground = new THREE.Color();
    scene.background = new THREE.Color(backgroundColors[0]);
    let transitionStarted = 0;
    const oldBackground = new THREE.Color();
    function cameraPosition() {
      const aspect = (canvas.clientWidth || 640) / (canvas.clientHeight || 520);
      const fit = fitDioramaView(aspect, angle, elevation, top);
      camera.left = -fit.halfWidth;
      camera.right = fit.halfWidth;
      camera.top = fit.halfHeight;
      camera.bottom = -fit.halfHeight;
      camera.zoom = zoom;
      if (top) {
        camera.position.set(0, 20 + fit.targetY, 0);
        camera.up.set(0, 0, -1);
      } else {
        camera.up.set(0, 1, 0);
        camera.position.set(
          Math.sin(angle) * 17,
          17 * elevation + fit.targetY,
          Math.cos(angle) * 17,
        );
      }
      camera.lookAt(0, fit.targetY, 0);
      camera.updateProjectionMatrix();
    }
    function draw(time = performance.now()) {
      frame = 0;
      if (disposed || document.hidden) return;
      try {
        const progress = reduced.matches
          ? 1
          : Math.min(1, (time - transitionStarted) / 350);
        (scene.background as THREE.Color).lerpColors(
          oldBackground,
          targetBackground,
          progress,
        );
        renderer.render(scene, camera);
        canvas.dataset.ready = "true";
        if (progress < 1) frame = requestAnimationFrame(draw);
      } catch {
        delete canvas.dataset.ready;
        onFailure();
      }
    }
    function invalidate() {
      if (!disposed && !frame && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function update(next: DioramaState) {
      const changeModels =
        state.board.cells !== next.board.cells ||
        state.season !== next.season ||
        boardGroup.children.length === 0;
      state = next;
      if (changeModels) {
        boardGroup.clear();
        next.board.cells.forEach((terrain, index) => {
          const model = library.create(
            terrain,
            next.season,
            tileVariant(index),
          );
          const [x, z] = cellToWorld(index % 11, Math.floor(index / 11));
          const tile = new THREE.Mesh(
            tileGeometry,
            tileMaterials[((next.season % 4) + 4) % 4][terrain ?? "empty"],
          );
          tile.position.set(x, 0.01, z);
          tile.receiveShadow = true;
          tile.castShadow = true;
          boardGroup.add(tile);
          model.position.set(x, 0.08, z);
          boardGroup.add(model);
          if (
            terrain === null &&
            RUINS.some(([rx, ry]) => ry * 11 + rx === index)
          ) {
            for (const dx of [-0.2, 0.2]) {
              const pillar = new THREE.Mesh(ruinGeometry, ruinMaterial);
              pillar.position.set(x + dx, 0.19, z);
              pillar.castShadow = true;
              boardGroup.add(pillar);
            }
          }
        });
      }
      overlay.clear();
      for (const index of next.highlight) {
        const outline = new THREE.LineLoop(square, gold);
        const [x, z] = cellToWorld(index % 11, Math.floor(index / 11));
        outline.position.set(x, 0.14, z);
        outline.renderOrder = 10;
        overlay.add(outline);
      }
      for (const [cx, cy] of next.preview) {
        if (cx < 0 || cy < 0 || cx > 10 || cy > 10) continue;
        const [x, z] = cellToWorld(cx, cy);
        const outline = new THREE.LineLoop(
          square,
          next.invalid ? invalid : valid,
        );
        outline.position.set(x, 0.16, z);
        outline.renderOrder = 12;
        overlay.add(outline);
        const fill = new THREE.Mesh(
          fillGeometry,
          next.invalid ? fillInvalid : fillValid,
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(x, 0.15, z);
        fill.renderOrder = 11;
        overlay.add(fill);
      }
      oldBackground.copy(scene.background as THREE.Color);
      targetBackground.setHex(
        backgroundColors[Math.max(0, Math.min(3, next.season))],
      );
      sun.color.setHex(
        next.season === 3 ? 0xe3efff : next.season === 2 ? 0xffd1a1 : 0xfff0cf,
      );
      ambient.color.setHex(
        SEASON_PALETTES[((next.season % 4) + 4) % 4].ambient,
      );
      transitionStarted = performance.now();
      invalidate();
    }
    const raycaster = new THREE.Raycaster();
    const pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08);
    let pointer: {
      id: number;
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      dragged: boolean;
    } | null = null;
    function down(event: PointerEvent) {
      if (pointer || event.button !== 0) return;
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        dragged: false,
      };
      canvas.setPointerCapture(event.pointerId);
    }
    function move(event: PointerEvent) {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer.dragged ||= isCameraDrag(
        event.clientX - pointer.x,
        event.clientY - pointer.y,
      );
      if (appreciation && pointer.dragged) {
        angle -= (event.clientX - pointer.lastX) * 0.008;
        elevation = Math.max(
          0.65,
          Math.min(2.7, elevation + (event.clientY - pointer.lastY) * 0.012),
        );
        top = false;
        cameraPosition();
        invalidate();
      }
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
    }
    function up(event: PointerEvent) {
      const gesture = pointer;
      if (!gesture || gesture.id !== event.pointerId) return;
      pointer = null;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      if (
        appreciation ||
        gesture.dragged ||
        isCameraDrag(event.clientX - gesture.x, event.clientY - gesture.y)
      )
        return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.ray.intersectPlane(pickPlane, new THREE.Vector3());
      const cell = hit && worldToCell(hit.x, hit.z);
      if (cell) state.onCell?.(...cell);
    }
    function cancel() {
      pointer = null;
    }
    function wheel(event: WheelEvent) {
      if (!appreciation) return;
      event.preventDefault();
      zoom = Math.min(2.1, Math.max(0.8, zoom - event.deltaY * 0.001));
      cameraPosition();
      invalidate();
    }
    function resize() {
      const width = canvas.clientWidth || 640,
        height = canvas.clientHeight || 520;
      renderer.setSize(width, height, false);
      cameraPosition();
      invalidate();
    }
    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else invalidate();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      delete canvas.dataset.ready;
      onFailure();
    }
    function removeListeners() {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("webglcontextlost", contextLost);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", invalidate);
    }
    rollback.push(removeListeners);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("webglcontextlost", contextLost);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", invalidate);
    const observer = new ResizeObserver(resize);
    rollback.push(() => observer.disconnect());
    observer.observe(canvas);
    resize();
    update(initial);
    return {
      update,
      setView(
        view: "edit" | "appreciation" | "top" | "reset" | "zoomIn" | "zoomOut",
      ) {
        if (view === "appreciation") appreciation = true;
        else if (view === "edit") {
          appreciation = false;
          angle = 0;
          elevation = 0.95;
          zoom = 1;
          top = false;
        } else if (view === "top") top = true;
        else if (view === "zoomIn") zoom = Math.min(2.1, zoom + 0.2);
        else if (view === "zoomOut") zoom = Math.max(0.8, zoom - 0.2);
        else {
          angle = appreciation ? Math.PI / 4 : 0;
          elevation = 0.95;
          zoom = 1;
          top = false;
        }
        cameraPosition();
        invalidate();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        removeListeners();
        library.dispose();
        owned.forEach((item) => item.dispose());
        sun.shadow.dispose();
        scene.clear();
        renderer.dispose();
        renderer.forceContextLoss();
        delete canvas.dataset.ready;
      },
    };
  } catch (error) {
    for (const cleanup of rollback.reverse()) {
      try {
        cleanup();
      } catch {
        /* Continue releasing the other resources. */
      }
    }
    throw error;
  }
}
