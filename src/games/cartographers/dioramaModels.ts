import * as THREE from "three";
import type { Terrain } from "./types.ts";

export interface SeasonPalette {
  ground: Record<Terrain | "empty", number>;
  foliage: number;
  foliageLight: number;
  crop: number;
  roof: number;
  snow: number;
  water: number;
  ambient: number;
}

export const SEASON_PALETTES: readonly SeasonPalette[] = [
  {
    ground: {
      empty: 0xc3b58b,
      forest: 0x8faf69,
      village: 0xc6ae87,
      farm: 0xbda45c,
      water: 0x7db5b5,
      monster: 0x8b8398,
      mountain: 0xaaa59a,
      wasteland: 0xb5a18b,
    },
    foliage: 0x4e9867,
    foliageLight: 0x8fbe6a,
    crop: 0xc5bd60,
    roof: 0xb8523d,
    snow: 0xf2f4e8,
    water: 0x6baeb9,
    ambient: 0xffe9c7,
  },
  {
    ground: {
      empty: 0xb8ae7f,
      forest: 0x769454,
      village: 0xc0a77d,
      farm: 0xb49b4e,
      water: 0x6ca4ae,
      monster: 0x867a91,
      mountain: 0x9d9d91,
      wasteland: 0xb09a7c,
    },
    foliage: 0x346f54,
    foliageLight: 0x679751,
    crop: 0xe1bd52,
    roof: 0xb94f38,
    snow: 0xf2f4e8,
    water: 0x589eaf,
    ambient: 0xffedcc,
  },
  {
    ground: {
      empty: 0xbcaa83,
      forest: 0xa28c54,
      village: 0xc3a07a,
      farm: 0xb48d4d,
      water: 0x779eaa,
      monster: 0x8e7b8b,
      mountain: 0xa59a90,
      wasteland: 0xb39880,
    },
    foliage: 0xc57b35,
    foliageLight: 0xe5ae4b,
    crop: 0xe3a54a,
    roof: 0xa94b3b,
    snow: 0xf2f4e8,
    water: 0x6c9eaf,
    ambient: 0xffd7a6,
  },
  {
    ground: {
      empty: 0xc7c9bd,
      forest: 0xa6b5a6,
      village: 0xc5c0b2,
      farm: 0xb4ad91,
      water: 0x99b8c6,
      monster: 0xaaa5b3,
      mountain: 0xb8bdbe,
      wasteland: 0xbab7b0,
    },
    foliage: 0x3e7169,
    foliageLight: 0x70978a,
    crop: 0xb5a566,
    roof: 0x8e5349,
    snow: 0xf1f4ef,
    water: 0x88b9cc,
    ambient: 0xdcecff,
  },
];

/** A library owns its reusable resources; removing a miniature never disposes them. */
export function createModelLibrary() {
  const geometries = new Map<string, THREE.BufferGeometry>();
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  let disposed = false;
  function geometry(kind: string) {
    let value = geometries.get(kind);
    if (!value) {
      switch (kind) {
        case "box":
          value = new THREE.BoxGeometry(1, 1, 1);
          break;
        case "cone":
          value = new THREE.ConeGeometry(1, 1, 7);
          break;
        case "peak":
          value = new THREE.ConeGeometry(1, 1, 5);
          break;
        case "cylinder":
          value = new THREE.CylinderGeometry(1, 1, 1, 8);
          break;
        case "round":
          value = new THREE.IcosahedronGeometry(1, 1);
          break;
        case "rock":
          value = new THREE.IcosahedronGeometry(1, 0);
          break;
        case "roof": {
          const shape = new THREE.Shape();
          shape.moveTo(-0.5, 0);
          shape.lineTo(0.5, 0);
          shape.lineTo(0, 1);
          shape.closePath();
          value = new THREE.ExtrudeGeometry(shape, {
            depth: 1,
            bevelEnabled: true,
            bevelSize: 0.035,
            bevelThickness: 0.035,
            bevelSegments: 1,
            steps: 1,
          });
          value.translate(0, 0, -0.5);
          break;
        }
        default:
          throw new Error(`Unknown miniature geometry: ${kind}`);
      }
      geometries.set(kind, value);
    }
    return value;
  }
  function material(color: number) {
    let value = materials.get(color);
    if (!value) {
      value = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        metalness: 0,
        flatShading: true,
      });
      materials.set(color, value);
    }
    return value;
  }

  function create(
    terrain: Terrain | null,
    season: number,
    variant: number,
  ): THREE.Group {
    if (disposed) throw new Error("Miniature library has been disposed");
    const root = new THREE.Group();
    root.name = terrain ?? "empty";
    if (!terrain) return root;
    const p = SEASON_PALETTES[((Math.trunc(season) % 4) + 4) % 4];
    const winter = p === SEASON_PALETTES[3];
    let seed = (Math.trunc(variant) ^ 0x5bd1e995) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const add = (
      name: string,
      kind: string,
      color: number,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      parent: THREE.Group = root,
    ) => {
      const mesh = new THREE.Mesh(geometry(kind), material(color));
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const stone = (x: number, z: number, size: number, color = 0x8c9086) => {
      const rock = add(
        "faceted-stone",
        "rock",
        color,
        x,
        size * 0.65,
        z,
        size,
        size * 0.65,
        size * 0.8,
      );
      rock.rotation.y = random() * Math.PI;
    };

    if (terrain === "forest") {
      const trees = [
        [-0.2, -0.17, 0.76],
        [0.2, -0.13, 0.61],
        [0.02, 0.2, 0.64],
      ];
      trees.forEach(([x, z, height], index) => {
        const h = height * (0.94 + random() * 0.08);
        add("pine-trunk", "cylinder", 0x79523b, x, 0.12, z, 0.035, 0.24, 0.035);
        if (index === 2 && (variant & 1) === 0) {
          add(
            "rounded-leafy-crown",
            "round",
            p.foliageLight,
            x,
            h * 0.61,
            z,
            0.18,
            h * 0.31,
            0.17,
          );
          if (winter)
            add(
              "snow-round-crown",
              "round",
              p.snow,
              x,
              h * 0.75,
              z,
              0.165,
              h * 0.18,
              0.15,
            );
        } else {
          for (let tier = 0; tier < 3; tier++) {
            const radius = 0.18 - tier * 0.035;
            const center = 0.25 + tier * h * 0.21;
            add(
              "layered-pine-crown",
              "cone",
              tier === 1 ? p.foliageLight : p.foliage,
              x,
              center,
              z,
              radius,
              h * 0.42,
              radius,
            );
            if (winter)
              add(
                "snow-pine-cap",
                "cone",
                p.snow,
                x,
                center + h * 0.1,
                z,
                radius * 0.73,
                h * 0.23,
                radius * 0.73,
              );
          }
        }
      });
      stone(-0.25, 0.21, 0.065);
      add(
        "forest-mushroom-stem",
        "cylinder",
        0xe4d5ab,
        0.25,
        0.045,
        0.23,
        0.014,
        0.09,
        0.014,
      );
      add(
        "forest-mushroom-cap",
        "round",
        0xc77951,
        0.25,
        0.09,
        0.23,
        0.04,
        0.024,
        0.04,
      );
    } else if (terrain === "village") {
      add(
        "village-footpath",
        "box",
        0xd5c299,
        0,
        0.013,
        0.09,
        0.68,
        0.026,
        0.09,
      );
      [
        [-0.18, -0.12, 1],
        [0.2, 0.15, 0.76],
      ].forEach(([x, z, scale], index) => {
        const house = new THREE.Group();
        house.position.set(x, 0, z);
        house.rotation.y = index ? -0.18 : 0.12;
        root.add(house);
        const w = 0.27 * scale,
          h = 0.27 * scale,
          d = 0.27 * scale;
        add(
          "plaster-house-walls",
          "box",
          index ? 0xdec694 : 0xf0dbaf,
          0,
          h / 2,
          0,
          w,
          h,
          d,
          house,
        );
        add(
          "red-beveled-gable-roof",
          "roof",
          p.roof,
          0,
          h,
          0,
          w * 1.22,
          0.18 * scale,
          d * 1.2,
          house,
        );
        add(
          "timber-door",
          "box",
          0x735342,
          0,
          0.075 * scale,
          d / 2 + 0.003,
          0.06 * scale,
          0.15 * scale,
          0.012,
          house,
        );
        for (const side of [-1, 1])
          add(
            "golden-window",
            "box",
            0xe8af5b,
            side * w * 0.31,
            h * 0.64,
            d / 2 + 0.005,
            0.043 * scale,
            0.05 * scale,
            0.012,
            house,
          );
        add(
          "brick-chimney",
          "box",
          0x997763,
          w * 0.28,
          h + 0.13 * scale,
          -0.05,
          0.045,
          0.24 * scale,
          0.05,
          house,
        );
        if (winter) {
          add(
            "snow-gable-cover",
            "roof",
            p.snow,
            0,
            h + 0.034,
            0,
            w * 1.2,
            0.16 * scale,
            d * 1.21,
            house,
          );
          add(
            "snow-chimney-cap",
            "box",
            p.snow,
            w * 0.28,
            h + 0.253 * scale,
            -0.05,
            0.053,
            0.018,
            0.058,
            house,
          );
        }
      });
      add(
        "village-hedge",
        "round",
        p.foliageLight,
        -0.23,
        0.08,
        0.23,
        0.1,
        0.075,
        0.06,
      );
    } else if (terrain === "farm") {
      add("raised-garden-bed", "box", 0x96734a, 0, 0.035, 0, 0.7, 0.07, 0.66);
      for (let row = 0; row < 4; row++) {
        const x = -0.255 + row * 0.17;
        add(
          "dark-earth-furrow",
          "box",
          0x72553c,
          x,
          0.081,
          0,
          0.085,
          0.035,
          0.6,
        );
        for (let stalk = 0; stalk < 5; stalk++) {
          const z = -0.24 + stalk * 0.12;
          const height = 0.11 + random() * 0.06;
          add(
            "golden-crop-stalk",
            "cylinder",
            0x9b8b41,
            x,
            0.09 + height / 2,
            z,
            0.012,
            height,
            0.012,
          );
          add(
            "full-grain-ear",
            "round",
            p.crop,
            x,
            0.09 + height,
            z,
            0.035,
            0.065,
            0.028,
          );
        }
      }
      for (const z of [-0.35, 0.35])
        add(
          "farm-timber-border",
          "box",
          0x9a7851,
          0,
          0.09,
          z,
          0.75,
          0.055,
          0.035,
        );
      if (winter)
        add(
          "snow-on-farm-border",
          "box",
          p.snow,
          0,
          0.125,
          -0.35,
          0.74,
          0.02,
          0.045,
        );
    } else if (terrain === "water") {
      add(
        "shallow-lagoon",
        "cylinder",
        p.water,
        0,
        0.025,
        0,
        0.405,
        0.05,
        0.405,
      );
      for (let i = 0; i < 3; i++) {
        const ridge = add(
          "smooth-wave-ridge",
          "round",
          winter ? 0xcce0e3 : 0xb4d4cf,
          -0.08 + i * 0.08,
          0.056,
          -0.2 + i * 0.17,
          0.15,
          0.009,
          0.018,
        );
        ridge.rotation.y = -0.2;
      }
      stone(-0.27, 0.21, 0.09);
      stone(-0.18, 0.29, 0.06);
      add(
        "water-reed",
        "cylinder",
        0x929863,
        0.26,
        0.13,
        -0.22,
        0.011,
        0.26,
        0.011,
      );
      add(
        "reed-seed-head",
        "round",
        0x8a7052,
        0.26,
        0.25,
        -0.22,
        0.025,
        0.055,
        0.022,
      );
    } else if (terrain === "mountain") {
      [
        [-0.1, -0.05, 0.87, 0.25],
        [0.18, 0.14, 0.57, 0.16],
        [-0.2, 0.22, 0.42, 0.14],
      ].forEach(([x, z, h, r], i) => {
        const peak = add(
          "jagged-mountain",
          "peak",
          i === 0 ? 0x929b95 : 0xadb2a3,
          x,
          h / 2,
          z,
          r,
          h,
          r,
        );
        peak.rotation.y = 0.25 + i * 0.65;
        const capHeight = h * (winter ? 0.37 : 0.22);
        const cap = add(
          "snow-mountain-cap",
          "peak",
          p.snow,
          x,
          h - capHeight / 2 + 0.003,
          z,
          r * (winter ? 0.37 : 0.22),
          capHeight,
          r * (winter ? 0.37 : 0.22),
        );
        cap.rotation.y = peak.rotation.y;
      });
      stone(0.22, -0.21, 0.11);
    } else if (terrain === "monster") {
      add("monster-body", "round", 0x5f526e, 0, 0.27, 0, 0.23, 0.26, 0.19);
      add("monster-belly", "round", 0x96839b, 0, 0.21, 0.15, 0.13, 0.16, 0.06);
      for (const side of [-1, 1]) {
        add(
          "monster-foot",
          "round",
          0x51495d,
          side * 0.14,
          0.065,
          0.09,
          0.1,
          0.06,
          0.13,
        );
        const arm = add(
          "monster-arm",
          "round",
          0x5f526e,
          side * 0.23,
          0.25,
          0,
          0.08,
          0.14,
          0.08,
        );
        arm.rotation.z = side * 0.35;
        const horn = add(
          "friendly-monster-horn",
          "cone",
          0xe0cfa2,
          side * 0.13,
          0.54,
          -0.015,
          0.06,
          0.22,
          0.055,
        );
        horn.rotation.z = -side * 0.3;
        add(
          "monster-eye-white",
          "round",
          0xf4e8c4,
          side * 0.081,
          0.35,
          0.168,
          0.048,
          0.05,
          0.029,
        );
        add(
          "monster-eye-pupil",
          "round",
          0x332d3e,
          side * 0.081,
          0.35,
          0.193,
          0.02,
          0.028,
          0.012,
        );
      }
      add(
        "monster-smile",
        "box",
        0x42394e,
        0,
        0.255,
        0.208,
        0.078,
        0.015,
        0.009,
      );
      stone(-0.29, -0.22, 0.07, 0x95839a);
    } else {
      stone(-0.16, -0.1, 0.24, 0x9c8f81);
      stone(0.2, 0.1, 0.17, 0xb8a692);
      stone(-0.15, 0.25, 0.11, 0x897e75);
      for (let i = 0; i < 3; i++)
        add(
          "dry-grass-tuft",
          "cone",
          0xc1aa72,
          0.15 + i * 0.035,
          0.065,
          -0.23,
          0.025,
          0.13,
          0.025,
        );
      if (winter)
        add(
          "snow-on-wasteland-stone",
          "rock",
          p.snow,
          -0.16,
          0.18,
          -0.1,
          0.16,
          0.025,
          0.14,
        );
    }
    root.rotation.y = ((Math.abs(Math.trunc(variant)) % 4) * Math.PI) / 2;
    return root;
  }

  return {
    create,
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      geometries.clear();
      materials.clear();
    },
  };
}
