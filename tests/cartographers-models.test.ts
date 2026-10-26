import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createModelLibrary,
  SEASON_PALETTES,
} from "../src/games/cartographers/dioramaModels.ts";
import type { Terrain } from "../src/games/cartographers/types.ts";

const terrains: Terrain[] = [
  "forest",
  "village",
  "farm",
  "water",
  "monster",
  "mountain",
  "wasteland",
];
function meshes(group: THREE.Group) {
  const result: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) result.push(object);
  });
  return result;
}
function signature(group: THREE.Group) {
  return meshes(group).map((mesh) => [
    mesh.name,
    mesh.position.toArray(),
    mesh.rotation.toArray(),
    mesh.scale.toArray(),
    (mesh.material as THREE.MeshStandardMaterial).color.getHex(),
  ]);
}

test("all terrain miniatures fit their tile and have distinct silhouettes", () => {
  const library = createModelLibrary();
  const signatures = new Set<string>();
  for (const terrain of terrains) {
    for (let season = 0; season < 4; season++) {
      for (let variant = 0; variant < 12; variant++) {
        const model = library.create(terrain, season, variant);
        const bounds = new THREE.Box3().setFromObject(model);
        assert.ok(
          bounds.min.x >= -0.431 && bounds.max.x <= 0.431,
          `${terrain} x bounds`,
        );
        assert.ok(
          bounds.min.z >= -0.431 && bounds.max.z <= 0.431,
          `${terrain} z bounds`,
        );
        assert.ok(bounds.min.y >= -0.001, `${terrain} below ground`);
        assert.ok(
          bounds.max.y <= (terrain === "mountain" ? 1.11 : 0.91),
          `${terrain} height`,
        );
        assert.ok(
          meshes(model).length >= 3,
          `${terrain} includes crafted details`,
        );
        if (season === 0 && variant === 0)
          signatures.add(JSON.stringify(signature(model)));
      }
    }
  }
  assert.equal(signatures.size, terrains.length);
  assert.equal(library.create(null, 0, 0).children.length, 0);
  library.dispose();
});

test("season colors and real winter snow preserve recognizable terrain details", () => {
  const library = createModelLibrary();
  assert.equal(
    new Set(SEASON_PALETTES.map((palette) => palette.foliage)).size,
    4,
  );
  for (const terrain of ["forest", "village", "mountain"] as Terrain[]) {
    const spring = library.create(terrain, 0, 4);
    const winter = library.create(terrain, 3, 4);
    assert.ok(meshes(winter).some((mesh) => mesh.name.includes("snow")));
    assert.ok(
      meshes(winter).some(
        (mesh) =>
          (mesh.material as THREE.MeshStandardMaterial).color.getHex() !==
          SEASON_PALETTES[3].snow,
      ),
    );
    assert.notDeepEqual(signature(spring), signature(winter));
  }
  library.dispose();
});

test("variants are repeatable, resources are shared and disposed exactly once", () => {
  const library = createModelLibrary();
  const a = library.create("forest", 1, 12);
  const b = library.create("forest", 1, 12);
  assert.deepEqual(signature(a), signature(b));
  assert.notDeepEqual(signature(a), signature(library.create("forest", 1, 13)));
  assert.equal(meshes(a)[0].geometry, meshes(b)[0].geometry);
  assert.equal(meshes(a)[0].material, meshes(b)[0].material);
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  for (const terrain of terrains)
    for (const mesh of meshes(library.create(terrain, 3, 1))) {
      resources.add(mesh.geometry);
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        resources.add(material);
    }
  const counts = new Map<object, number>();
  for (const resource of resources)
    resource.addEventListener("dispose", () =>
      counts.set(resource, (counts.get(resource) ?? 0) + 1),
    );
  library.dispose();
  library.dispose();
  assert.equal(counts.size, resources.size);
  assert.ok([...counts.values()].every((count) => count === 1));
});
