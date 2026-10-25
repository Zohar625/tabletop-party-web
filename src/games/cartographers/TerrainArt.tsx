import type { Terrain } from "./types.ts";

const ink = "#35493c";
const terrainLabels: Record<Terrain, string> = {
  forest: "森林",
  village: "村落",
  farm: "农田",
  water: "水域",
  monster: "怪物",
  mountain: "山峰",
  wasteland: "荒地",
};

function Pine({
  x,
  y,
  scale = 1,
  light = false,
}: {
  x: number;
  y: number;
  scale?: number;
  light?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 1v27" stroke="#715338" strokeWidth="3" />
      <path
        d="M0-15-9 0h4l-9 12h7l-9 12Q0 31 16 24L7 12h6L5 0h4Z"
        fill={light ? "#69956b" : "#37694f"}
        stroke="#355c46"
        strokeWidth="1.3"
      />
      <path
        d="M0-9v31M-2 4l-4 5M3 13l5 6"
        fill="none"
        stroke={light ? "#a4bd80" : "#7d9e71"}
        strokeWidth="1.2"
      />
    </g>
  );
}

function House({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="#72503a"
      strokeWidth="1.3"
      strokeLinejoin="round"
    >
      <path d="m-15 0 15-11 16 11v20H-15Z" fill="#f1d7a2" />
      <path d="M1-9 16 0v20H1Z" fill="#dbc18d" stroke="none" />
      <path d="M7-12v-9h5v13" fill="#c78c65" />
      <path d="m-19 1 18-18L20 1h-7L-1-10-12 1Z" fill="#bb5848" />
      <path d="m-13-2 12-12L14-1" stroke="#e4956b" fill="none" />
      <path d="M-4 20V8q4-5 8 0v12" fill="#7e6749" />
      <path d="M-12 6h5v6h-5ZM8 6h5v6H8Z" fill="#638a84" />
      <path d="M-18 21h37" stroke="#9a9968" />
    </g>
  );
}

function Mountain({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M-24 24-2-22 25 24Z"
        fill="#a4a18b"
        stroke="#646c60"
        strokeWidth="1.5"
      />
      <path d="M-2-22 4 10 25 24H-2Z" fill="#777f71" />
      <path
        d="m-13 1 11-23L11 0 3-4-1 1-6-5Z"
        fill="#faf0d4"
        stroke="#687061"
        strokeWidth="1.1"
      />
      <path
        d="m-17 19 7-15M9 10l6 8M-8 18l3-7"
        stroke="#d3cfb3"
        strokeWidth="1.3"
      />
    </g>
  );
}

export function TerrainArt({
  terrain,
  variant = 0,
  size,
}: {
  terrain: Terrain | null;
  variant?: number;
  size?: number | string;
}) {
  const v = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) % 3 : 0;
  return (
    <svg
      viewBox="0 0 60 60"
      width={size ?? "100%"}
      height={size ?? "100%"}
      role="img"
      aria-label={terrain ? terrainLabels[terrain] : "空地"}
      data-terrain={terrain ?? "empty"}
      focusable="false"
      style={{ display: "block", overflow: "visible" }}
    >
      {terrain && (
        <g
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={
            v === 1
              ? "translate(1 -1)"
              : v === 2
                ? "translate(-1 1)"
                : undefined
          }
        >
          {terrain === "forest" && (
            <>
              <path
                d="M5 49q24-12 50 1-19 9-50-1"
                fill="#9bad76"
                opacity=".48"
              />
              <Pine x={17} y={21} scale={0.72} light />
              <Pine x={42} y={23} scale={0.65} light />
              <Pine x={30} y={27} scale={0.88} />
              <path d="m9 51 3-4m36 5 3-4" stroke="#68845b" strokeWidth="1.5" />
            </>
          )}
          {terrain === "village" && (
            <>
              <path d="M7 49q24-10 47 0L32 55Z" fill="#a7ad76" opacity=".52" />
              <House x={18} y={25} scale={0.64} />
              <House x={38} y={33} scale={0.79} />
              <path
                d="m23 56 5-7M5 45h5m39 5 5 1"
                stroke="#a18a59"
                strokeWidth="2"
              />
            </>
          )}
          {terrain === "farm" && (
            <>
              <path
                d="m5 24 27-13 23 12-3 25-26 7L6 44Z"
                fill="#e2ba55"
                stroke="#a7803d"
                strokeWidth="1.3"
              />
              <path
                d="m7 34 25-15 19 10M8 42l24-15 19 9M18 49l17-13 15 7"
                fill="none"
                stroke="#f9df87"
                strokeWidth="2"
              />
              {[17, 29, 41].map((x, i) => (
                <g
                  key={x}
                  transform={`translate(${x} ${33 + (i % 2) * 7})`}
                  stroke="#956c30"
                  fill="#f9d873"
                  strokeWidth="1.1"
                >
                  <path d="M0 8V-12" fill="none" />
                  <path d="M0-9q-9-7-5-10 6 2 5 10m0 5q8-8 6-11-6 2-6 11m0 5q-9-7-6-10 6 1 6 10m0 4q8-7 6-10-6 1-6 10" />
                </g>
              ))}
            </>
          )}
          {terrain === "water" && (
            <>
              <path
                d="M5 14q13 9 25 1t25 1v33q-13-8-25-1T5 48Z"
                fill="#82bbc0"
              />
              <path
                d="M5 15q13 9 25 1t25 1M7 46q12 8 23 1t23 0"
                fill="none"
                stroke="#467e8a"
                strokeWidth="1.5"
              />
              <path
                d="M10 26q6 4 12 0m11-1q8-4 15 0M16 37q8-4 15 0m8 0q6 3 12 0M11 41h6"
                fill="none"
                stroke="#e3f2dd"
                strokeWidth="2.4"
              />
              <path
                d="m6 51 3-6m42-30 3-5"
                stroke="#7d9567"
                strokeWidth="1.5"
              />
            </>
          )}
          {terrain === "mountain" && (
            <>
              <Mountain x={17} y={29} scale={0.58} />
              <Mountain x={35} y={29} scale={0.93} />
            </>
          )}
          {terrain === "monster" && (
            <>
              <path
                d="M9 48q20-8 43 0-18 9-43 0"
                fill="#9a8b8d"
                opacity=".32"
              />
              <path
                d="m16 22-4-12q9 0 14 9m12 0q5-9 12-9l-4 15"
                fill="#d9c6a0"
                stroke="#5b5064"
                strokeWidth="1.6"
              />
              <path
                d="M15 30q-10 2-8 9l9-2m29-7q11 2 9 9l-10-2"
                fill="#706078"
                stroke="#51465a"
                strokeWidth="1.8"
              />
              <path
                d="M14 31q-2-17 16-17t17 18l-2 17-10-1-5-5-5 5-11 1Z"
                fill="#77647c"
                stroke="#51465a"
                strokeWidth="1.8"
              />
              <path d="M22 35q8 8 16 0v10H22Z" fill="#ad939c" stroke="none" />
              <ellipse cx="23" cy="27" rx="4.5" ry="5" fill="#fff1cb" />
              <ellipse cx="38" cy="27" rx="4.5" ry="5" fill="#fff1cb" />
              <circle cx="24" cy="28" r="2" fill="#3c3742" />
              <circle cx="37" cy="28" r="2" fill="#3c3742" />
              <path
                d="M26 36q4 3 8 0"
                fill="none"
                stroke="#453b4a"
                strokeWidth="1.5"
              />
            </>
          )}
          {terrain === "wasteland" && (
            <>
              <path
                d="m6 26 20-12 27 14-7 22-26 4L7 45Z"
                fill="#c8b294"
                opacity=".75"
              />
              <path
                d="m12 37 11-6 6 6 12-10m-12 10-3 9m3-9 12 9M21 18l3 6-8 4m30 9-5 9 5 4"
                stroke="#927c63"
                strokeWidth="1.7"
                fill="none"
              />
              <path
                d="m8 46 5-8 7 8Zm30-25 3-7 6 9Z"
                fill="#ac9b80"
                stroke="#887960"
                strokeWidth="1.2"
              />
              <path
                d="m14 23 3-2m20 29 4-1"
                stroke="#927c63"
                strokeWidth="1.5"
              />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

export function MapIllustration() {
  return (
    <svg
      viewBox="0 0 720 500"
      role="img"
      aria-label="手绘地图：河流穿过森林、麦田与红顶村落，远方群山连绵"
      focusable="false"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <path d="m53 51 592-9 22 397-597 25Z" fill="#233f35" opacity=".15" />
      <path
        d="m43 37 32-8 76 7 93-6 99 6 91-8 112 5 97-6 16 108-6 80 12 95-7 118-94-5-110 9-99-5-104 8-96-6-99 6 5-97-8-106 5-91Z"
        fill="#e9dbb6"
        stroke="#bba478"
        strokeWidth="2"
      />
      <path
        d="m57 53 585-10 8 371-578 16Z"
        fill="#f4e8c9"
        stroke="#bdac83"
        strokeWidth="1"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={`v${i}`}
          d={`M${89 + i * 46} 51l10 373`}
          stroke="#b7ad87"
          strokeWidth=".7"
          opacity=".26"
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={`h${i}`}
          d={`M65 ${88 + i * 44}l578-10`}
          stroke="#b7ad87"
          strokeWidth=".7"
          opacity=".26"
        />
      ))}
      <path
        d="M69 322q73-87 151-54t148-11q79-60 156-30t119-3l5 191-576 12Z"
        fill="#d7d8a5"
        opacity=".75"
      />
      <path
        d="M83 340q86-46 130-10m173-48q90-38 155 9M405 369q119-27 213 13"
        stroke="#9da77a"
        strokeWidth="2"
        fill="none"
        opacity=".7"
      />
      <path
        d="M385 48q-38 51-16 90t-19 74q-34 39-5 72t-10 62q-46 35-17 76"
        fill="none"
        stroke="#b2c8ac"
        strokeWidth="49"
      />
      <path
        d="M385 48q-38 51-16 90t-19 74q-34 39-5 72t-10 62q-46 35-17 76"
        fill="none"
        stroke="#75adb1"
        strokeWidth="33"
      />
      <path
        d="M385 53q-32 51-17 78m-3 31q-4 27-25 48m-2 21q-15 21 9 51m0 22q7 21-20 39m-12 30q-10 23 1 40"
        fill="none"
        stroke="#d2e5cf"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M157 372q47-58 87-64t98-30 98-2 116-86"
        stroke="#b59c6b"
        strokeWidth="9"
        fill="none"
        opacity=".25"
      />
      <path
        d="M157 372q47-58 87-64t98-30 98-2 116-86"
        stroke="#9b7a50"
        strokeWidth="2"
        strokeDasharray="4 8"
        fill="none"
        strokeLinecap="round"
      />
      <g transform="translate(341 279) rotate(-20)">
        <path
          d="M-23-10h48v20h-48Z"
          fill="#bd9260"
          stroke="#795a3e"
          strokeWidth="2"
        />
        <path
          d="M-22-13h47m-47 26h47M-14-9v18M-4-9v18M6-9v18M16-9v18"
          stroke="#795a3e"
          strokeWidth="2"
        />
      </g>
      <Mountain x={163} y={129} scale={1.2} />
      <Mountain x={205} y={111} scale={1.45} />
      <Mountain x={256} y={129} scale={1.15} />
      <Mountain x={293} y={145} scale={0.8} />
      <path
        d="m111 169 18-7m133 15 18 4m-90-10 12 3"
        stroke="#a5a27c"
        strokeWidth="2"
        fill="none"
      />
      {[
        [120, 212, 1],
        [154, 197, 0.94],
        [191, 214, 1.1],
        [224, 209, 0.88],
        [138, 242, 1.1],
        [176, 248, 1.2],
        [212, 247, 1],
        [106, 260, 0.8],
        [236, 236, 0.75],
        [494, 334, 0.9],
        [527, 318, 1],
        [560, 338, 0.86],
        [586, 326, 0.7],
        [523, 359, 0.85],
        [566, 372, 1],
      ].map(([x, y, scale], i) => (
        <Pine key={i} x={x} y={y} scale={scale} light={i % 3 === 0} />
      ))}
      <path
        d="m409 145 72-18 42 36-61 25-54-14Z"
        fill="#d7b759"
        stroke="#b2914e"
        strokeWidth="1.5"
      />
      <path
        d="m419 149 62-15m-57 22 64-15m-56 22 63-15m-55 23 63-16m-52 22 60-16"
        stroke="#f2d685"
        strokeWidth="3"
      />
      <path
        d="m400 190 63 1 16 32-70 14-29-26Z"
        fill="#e1c475"
        stroke="#b99c58"
        strokeWidth="1.3"
      />
      <path
        d="m397 201 67-2m-62 10 66-3m-58 12 62-5m-55 13 59-6"
        stroke="#f6dfa0"
        strokeWidth="3"
      />
      <House x={473} y={257} scale={1.05} />
      <House x={507} y={231} scale={0.88} />
      <House x={540} y={270} scale={1.16} />
      <House x={222} y={348} scale={0.84} />
      <House x={182} y={368} scale={1.05} />
      <g stroke="#ad925f" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="m239 374 15-17m-2 16 10-9m194-60 10-8m4 10 12-9M101 324l8-5m450-118 10-7" />
      </g>
      <g transform="translate(577 112)" stroke="#6e7157" strokeLinejoin="round">
        <circle r="34" fill="none" strokeWidth="1" />
        <circle r="26" fill="none" strokeWidth=".7" />
        <path
          d="M0-43 8-8 35 0 8 8 0 43-8 8-35 0-8-8Z"
          fill="#c5aa65"
          strokeWidth="1"
        />
        <path d="M0-43V0H-35l27-8ZM0 43V0h35L8 8Z" fill="#435c49" />
        <circle r="5" fill="#f5e9c9" />
        <text
          x="0"
          y="-49"
          textAnchor="middle"
          fill="#5c674f"
          stroke="none"
          fontSize="13"
          fontFamily="Georgia, serif"
        >
          N
        </text>
      </g>
      <g stroke="#a88d59" fill="none" strokeWidth="1.5">
        <path d="M84 84V67h35M621 376v20h-32M83 393v15h31" />
        <path d="M90 76h17m501 312h-13" strokeWidth=".8" />
      </g>
      <g
        fill={ink}
        opacity=".75"
        fontFamily="Georgia, 'Songti SC', serif"
        textAnchor="middle"
      >
        <text x="209" y="71" fontSize="12" letterSpacing="6">
          北 境 群 山
        </text>
        <text x="167" y="305" fontSize="11" letterSpacing="4">
          低语森林
        </text>
        <text x="488" y="303" fontSize="10" letterSpacing="3">
          晨光村
        </text>
      </g>
      <g transform="translate(407 394)" stroke="#807a56" strokeWidth="1">
        <path d="M0 0h75m-75-4v8m25-8v8m25-8v8m25-8v8" />
        <text
          x="38"
          y="16"
          fill="#807a56"
          stroke="none"
          fontSize="8"
          textAnchor="middle"
          letterSpacing="3"
        >
          一日的旅程
        </text>
      </g>
    </svg>
  );
}
