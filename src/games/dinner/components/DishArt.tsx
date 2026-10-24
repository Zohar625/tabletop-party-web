import type { DishCard } from "../types";
import {
  getDishVisual,
  type DishVisual,
  type Ingredient,
} from "../dishVisuals.ts";

const pieces = [
  [68, 82],
  [99, 72],
  [128, 85],
  [84, 103],
  [117, 104],
] as const;

function Shrimp({
  x,
  y,
  color = "#ef9572",
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M9 -11C-15 -23 -22 10 -2 13L7 8C-7 13 -12 -5 0 -6L9 -2"
        fill={color}
        stroke="#b95b44"
        strokeWidth="2"
      />
      <path d="M8 -2l13 -4 -7 13Z" fill={color} />
      <path
        d="M-8 -10l-5 4m3 5 -5 4m8 3 -2 5"
        stroke="#ffdfc0"
        strokeWidth="2"
      />
      <circle cx="6" cy="-8" r="1.5" fill="#493e35" />
    </g>
  );
}
function Lotus({
  x,
  y,
  color = "#eac4a7",
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx="21" ry="14" fill={color} stroke="#ae7f64" strokeWidth="2" />
      {[
        [0, 0],
        [-10, -4],
        [0, -7],
        [10, -4],
        [-9, 5],
        [4, 6],
      ].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="3" ry="2.4" fill="#fff2d9" />
      ))}
    </g>
  );
}

/** Small, recognizable ingredients placed on top of their dish's main silhouette. */
function IngredientArt({
  ingredient,
  x,
  y,
}: {
  ingredient: Ingredient;
  x: number;
  y: number;
}) {
  let art;
  switch (ingredient) {
    case "pork":
    case "chicken":
      return null; // The main chunks, bun, cutlet, or curry already depicts the meat.
    case "peanut":
      art = (
        <>
          {[-14, 1, 15].map((n, i) => (
            <path
              key={n}
              transform={`translate(${n} ${(i % 2) * 9}) rotate(-25)`}
              d="M-4 -8Q-9 -4 -4 0Q-9 7 -3 9Q3 12 5 5Q3 0 6 -3Q6 -10 -4 -8"
              fill="#deb77a"
              stroke="#a47943"
              strokeWidth="1.5"
            />
          ))}
        </>
      );
      break;
    case "chili":
      art = (
        <>
          {[-12, 8].map((n) => (
            <g key={n} transform={`translate(${n} 0)`}>
              <path
                d="M-7 -8Q16 -8 6 11Q8 0 -7 -2Z"
                fill="#c9362d"
                stroke="#8c3124"
              />
              <path d="M-7 -7l-3 -5" stroke="#3d7949" strokeWidth="2" />
            </g>
          ))}
        </>
      );
      break;
    case "scallion":
      art = (
        <path
          d="M-18 -2l15 -6m7 13 15 -7m-12 -9 6 -7"
          stroke="#3b8351"
          strokeWidth="5"
        />
      );
      break;
    case "ginger":
      art = (
        <path
          d="M-16 -8l27 15m-22 -20L15 2m-22 -17 26 14"
          stroke="#f1cf78"
          strokeWidth="3"
        />
      );
      break;
    case "sesame":
    case "osmanthus":
      art = (
        <g fill={ingredient === "sesame" ? "#fff3cb" : "#f4bd40"}>
          {[-16, -8, 0, 8, 16].map((n, i) => (
            <ellipse
              key={n}
              cx={n}
              cy={(i % 2) * 7 - 4}
              rx="2"
              ry="1"
              transform={`rotate(-20 ${n} 0)`}
            />
          ))}
        </g>
      );
      break;
    case "tomato":
      art = (
        <>
          {[-17, 9].map((n) => (
            <path
              key={n}
              transform={`translate(${n} 0)`}
              d="M-11 2L-3 -12Q16 -8 12 9Z"
              fill="#df5a3d"
              stroke="#b73c2a"
              strokeWidth="2"
            />
          ))}
        </>
      );
      break;
    case "egg":
      art = (
        <path
          d="M-18 0l8 -9 10 6 7 -5 13 12 -8 7 -13 -3 -7 5Z"
          fill="#f9d65d"
          stroke="#d1a644"
        />
      );
      break;
    case "peas":
      art = (
        <g fill="#61954b">
          {[-14, 0, 14].map((n, i) => (
            <circle key={n} cx={n} cy={(i % 2) * 9 - 4} r="4" />
          ))}
        </g>
      );
      break;
    case "carrot":
      art = (
        <g fill="#e67f34">
          <rect x="-13" y="-8" width="9" height="9" transform="rotate(20)" />
          <rect x="6" y="3" width="8" height="8" />
        </g>
      );
      break;
    case "shrimp":
      art = (
        <g transform="scale(.7)">
          <Shrimp x={0} y={0} />
        </g>
      );
      break;
    case "mushroom":
      art = (
        <>
          {[-15, 12].map((n) => (
            <g key={n} transform={`translate(${n} 0)`}>
              <path d="M-4 -1v12h8V-1" fill="#e7d3ac" />
              <path
                d="M-14 0Q-12 -20 0 -17Q13 -18 14 0Z"
                fill="#805a3d"
                stroke="#523d2e"
                strokeWidth="2"
              />
              <path d="M-5 -11l10 6m-10 0 10 -6" stroke="#e5cfa7" />
            </g>
          ))}
        </>
      );
      break;
    case "beef":
      art = (
        <>
          {[-13, 8].map((n) => (
            <path
              key={n}
              transform={`translate(${n} 0)`}
              d="M-11 -7q17 -10 23 6l-7 12 -15 -7Z"
              fill="#98533d"
              stroke="#d79a77"
              strokeWidth="2"
            />
          ))}
        </>
      );
      break;
    case "corn":
      art = (
        <g transform="rotate(-15)">
          <rect
            x="-16"
            y="-12"
            width="32"
            height="24"
            rx="7"
            fill="#f0c548"
            stroke="#bd9a38"
          />
          <path
            d="M-8 -11v22m8 -22v22m8 -22v22M-15 -4h30m-30 8h30"
            stroke="#fff0a0"
            strokeWidth="2"
          />
        </g>
      );
      break;
    case "ribs":
      art = (
        <g transform="rotate(-18)">
          <rect x="-20" y="-9" width="40" height="18" rx="7" fill="#a77f68" />
          <path d="M-17 0h34" stroke="#e6d3af" strokeWidth="5" />
          <circle cx="-17" cy="0" r="4" fill="#f0dec3" />
          <circle cx="17" cy="0" r="4" fill="#f0dec3" />
        </g>
      );
      break;
    case "winterMelon":
      art = (
        <g fill="#e4eaca" stroke="#a4b995" strokeWidth="2">
          <path d="M-19 -9h16v18h-16Z" />
          <path d="M4 -4l17 -6v17L4 11Z" />
        </g>
      );
      break;
    case "meatball":
      art = (
        <g fill="#b9a086" stroke="#8e7966">
          {[-14, 7].map((n) => (
            <circle key={n} cx={n} cy="0" r="10" />
          ))}
        </g>
      );
      break;
    case "seaweed":
      art = (
        <path
          d="M-20 -5l10 -6 5 9 8 -7 7 8 11 -3 -2 10 -11 -2 -7 7 -9 -8 -9 1Z"
          fill="#3c5041"
        />
      );
      break;
    case "lotus":
      art = (
        <g transform="scale(.8)">
          <Lotus x={0} y={0} />
        </g>
      );
      break;
    case "syrup":
      art = (
        <path
          d="M-39 8Q-5 -28 36 -7M-32 12Q0 -11 40 7M-25 -4l48 15"
          fill="none"
          stroke="#b8762b"
          strokeWidth="1.5"
        />
      );
      break;
    case "lemon":
      art = (
        <g>
          <path
            d="M-15 -7A18 18 0 0 1 15 10L0 2Z"
            fill="#f7d75d"
            stroke="#d4af3c"
            strokeWidth="2"
          />
          <path d="M0 2L-7 -9m7 11 8 -6" stroke="#fff6c9" strokeWidth="2" />
        </g>
      );
      break;
    case "pineapple":
      art = (
        <g fill="#f3cc53" stroke="#c6a83f">
          <path d="M-22 -7l15 -7 9 13 -18 6Z" />
          <path d="M5 2l15 -7 9 13 -18 6Z" />
        </g>
      );
      break;
    case "cheese":
      art = (
        <>
          <path
            d="M-42 -17Q0 -32 43 -12L40 10Q26 3 18 9L-20 6 -42 12Z"
            fill="#f4cf63"
          />
          <path
            d="M-35 -9l20 10m10 -18 23 17m3 -15 13 9"
            stroke="#bb8033"
            strokeWidth="3"
          />
        </>
      );
      break;
    case "mustard":
      art = (
        <>
          <path d="M-20 3q10 -13 20 -5t20 -3l-4 15 -37 0Z" fill="#8caa33" />
          <path
            d="M-10 -11q12 -15 19 -1"
            fill="none"
            stroke="#b9cd58"
            strokeWidth="6"
          />
        </>
      );
      break;
    case "toothpaste":
      art = (
        <g transform="rotate(-20)">
          <path
            d="M-22 -13h38v22h-38Z"
            fill="#f2f4e7"
            stroke="#4c9495"
            strokeWidth="2"
          />
          <path d="M-20 -10h25v7h-25" fill="#59b8ae" />
          <rect x="16" y="-9" width="9" height="14" rx="2" fill="#287e88" />
          <path
            d="M25 -1q17 -15 20 -3"
            fill="none"
            stroke="#65c9c4"
            strokeWidth="5"
          />
        </g>
      );
      break;
    case "bitterMelon":
      art = (
        <g fill="#99b459" stroke="#578346" strokeWidth="3">
          {[-15, 12].map((n) => (
            <g key={n} transform={`translate(${n} 0)`}>
              <ellipse rx="12" ry="15" strokeDasharray="3 2" />
              <ellipse rx="5" ry="8" fill="#e2d9a3" />
            </g>
          ))}
        </g>
      );
      break;
    case "durian":
      art = (
        <>
          <path
            d="M-20 5l-3 -9 9 0 0 -9 9 4 5 -9 6 9 9 -3 -1 10 10 3 -7 8Z"
            fill="#8a9e4b"
            stroke="#60763e"
          />
          <path d="M-11 6Q-10 -12 5 -9Q19 -8 14 7Z" fill="#edd46c" />
        </>
      );
      break;
    case "salt":
      art = (
        <>
          <rect
            x="-11"
            y="-27"
            width="22"
            height="27"
            rx="3"
            fill="#e0e8e5"
            stroke="#7d9292"
            strokeWidth="2"
          />
          <path d="M-11 -23h22" stroke="#8d9fa0" strokeWidth="6" />
          <text x="0" y="-8" textAnchor="middle" fontSize="10" fill="#405e64">
            盐
          </text>
          <path
            d="M-10 8h3m12 -4h3m4 9h3m-14 3h3"
            stroke="#fff"
            strokeWidth="3"
          />
        </>
      );
      break;
    case "chocolate":
      art = (
        <g transform="rotate(-14)">
          <rect
            x="-19"
            y="-14"
            width="38"
            height="28"
            rx="3"
            fill="#4e302a"
            stroke="#2e2520"
            strokeWidth="2"
          />
          <path
            d="M-6 -13v26m12 -26v26m-24 -13h36"
            stroke="#925b43"
            strokeWidth="2"
          />
        </g>
      );
      break;
    case "vinegar":
      art = (
        <>
          <path
            d="M-9 -28h18v10l6 8v24h-30v-24l6 -8Z"
            fill="#725234"
            stroke="#4d3d2d"
            strokeWidth="2"
          />
          <rect x="-11" y="-7" width="22" height="17" fill="#f2dfb0" />
          <text x="0" y="6" textAnchor="middle" fontSize="12" fill="#614b36">
            醋
          </text>
        </>
      );
      break;
    case "garlic":
      art = (
        <>
          {[-11, 10].map((n) => (
            <path
              key={n}
              transform={`translate(${n} 0)`}
              d="M0 -15q-3 8 -9 12Q-16 14 0 12Q16 14 9 -3Q3 -7 0 -15Z"
              fill="#fff2d5"
              stroke="#b7a88c"
              strokeWidth="1.5"
            />
          ))}
        </>
      );
      break;
    case "strawberry":
      art = (
        <>
          {[-17, 8].map((n) => (
            <g key={n} transform={`translate(${n} 0)`}>
              <path
                d="M-11 -8Q0 -15 11 -8Q14 3 0 15Q-14 3 -11 -8Z"
                fill="#df4d4b"
              />
              <path d="M-10 -8L0 -4 10 -8 3 -11 0 -16 -3 -11Z" fill="#508749" />
              <path
                d="M-5 -1h1m7 1h1m-5 6h1"
                stroke="#ffe1a4"
                strokeWidth="2"
              />
            </g>
          ))}
        </>
      );
      break;
    case "stinkyTofu":
      art = (
        <>
          <path d="M-16 -12l26 -5 12 11 -25 6Z" fill="#8c7965" />
          <path
            d="M-16 -12v24l13 10V0m0 22 25 -7V-6"
            fill="#615748"
            stroke="#413e36"
            strokeWidth="2"
          />
          <path
            d="M-11 -26q-10 -8 -1 -18m17 15q10 -9 0 -18"
            stroke="#73825b"
            strokeWidth="3"
            fill="none"
          />
        </>
      );
      break;
    case "darkSauce":
      art = (
        <path
          d="M-27 2Q-12 -5 0 1T29 0"
          fill="none"
          stroke="#5d3f2c"
          strokeWidth="5"
          strokeLinecap="round"
        />
      );
      break;
  }
  return (
    <g data-ingredient={ingredient} transform={`translate(${x} ${y})`}>
      {art}
    </g>
  );
}

function Food({ visual }: { visual: DishVisual }) {
  const { shape, color, ingredients } = visual;
  let body;
  switch (shape) {
    case "chunks":
      body = (
        <>
          {pieces.map(([x, y], i) => (
            <g
              key={i}
              transform={`translate(${x} ${y}) rotate(${i % 2 ? -12 : 12})`}
            >
              <path
                d="M-14 -12l24 -3 8 10 -23 4Z"
                fill={color}
                stroke="#87482d"
                strokeWidth="1.5"
              />
              <path
                d="M-14 -12V9l9 8V-1m0 18 23 -4V-5"
                fill={color}
                stroke="#87482d"
                strokeWidth="1.5"
              />
              {ingredients[0] === "pork" && (
                <path d="M-13 1l8 6 22 -5" stroke="#efc09a" strokeWidth="4" />
              )}
            </g>
          ))}
        </>
      );
      break;
    case "fish":
      body = (
        <>
          <path
            d="M44 90Q90 43 143 88Q94 122 44 90Z"
            fill={color}
            stroke="#879c8b"
            strokeWidth="2"
          />
          <path d="M139 88l28 -20v39Z" fill="#8dada1" stroke="#668579" />
          <path d="M77 62l17 -12 21 10m-27 48 16 9 11 -12" fill="#9eb8a2" />
          <path
            d="M76 73l7 28m18 -36 7 37m15 -29 5 21"
            stroke="#a9bbaa"
            strokeWidth="3"
          />
          <circle cx="59" cy="85" r="4" fill="#374f40" />
          <path
            d="M68 77q9 13 0 22"
            fill="none"
            stroke="#8d9f8c"
            strokeWidth="2"
          />
        </>
      );
      break;
    case "salmon":
      body = (
        <>
          <path
            d="M60 60L133 67 151 103 82 117 52 91Z"
            fill={color}
            stroke="#bb7250"
            strokeWidth="2"
          />
          <path d="M52 91l30 26 69 -14 -3 10 -67 12 -28 -24Z" fill="#656d60" />
          <path
            d="M67 63q-3 20 23 45m-4 -43q-2 16 24 40m-4 -37q1 13 23 33m-5 -29 18 25"
            fill="none"
            stroke="#ffdcc0"
            strokeWidth="4"
          />
        </>
      );
      break;
    case "shrimp":
      body = (
        <>
          {[
            [67, 77],
            [105, 70],
            [139, 87],
            [88, 107],
            [123, 108],
          ].map(([x, y], i) => (
            <Shrimp key={i} x={x} y={y} color={color} />
          ))}
        </>
      );
      break;
    case "wings":
      body = (
        <>
          {[
            [71, 84, -20],
            [121, 93, 20],
            [100, 64, 10],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path
                d="M-28 -5Q-25 -19 -7 -14L21 -9Q35 -2 24 10L-9 15Q-31 15 -28 -5Z"
                fill={color}
                stroke="#713e28"
                strokeWidth="2"
              />
              <path
                d="M-15 -8l32 8m-29 8 28 -2"
                stroke="#c88542"
                strokeWidth="3"
              />
            </g>
          ))}
        </>
      );
      break;
    case "cutlet":
      body = (
        <>
          <path
            d="M49 84Q57 54 104 59Q151 61 151 97Q144 121 99 117Q45 120 49 84Z"
            fill={color}
            stroke="#aa7133"
            strokeWidth="3"
          />
          <path
            d="M68 66l10 49m10 -54 9 57m10 -56 8 52m10 -45 8 42"
            stroke="#fff0bb"
            strokeWidth="4"
          />
          {pieces.map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y}l4 -2m3 7 3 -1`}
              stroke="#ad762d"
              strokeWidth="2"
            />
          ))}
        </>
      );
      break;
    case "eggplant":
      body = (
        <>
          {pieces.map(([x, y], i) => (
            <g
              key={i}
              transform={`translate(${x} ${y}) rotate(${i * 23 - 40})`}
            >
              <path
                d="M-26 -7Q0 -15 28 -3L23 9Q0 13 -25 7Z"
                fill={color}
                stroke="#503359"
                strokeWidth="2"
              />
              <path d="M-20 0Q0 -4 22 1" stroke="#d6bc86" strokeWidth="5" />
            </g>
          ))}
        </>
      );
      break;
    case "tofu":
      body = (
        <>
          <ellipse cx="100" cy="98" rx="59" ry="21" fill="#b86836" />
          {pieces.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path
                d="M-16 -11l23 -5 12 9 -24 6Z"
                fill={color}
                stroke="#c3a374"
              />
              <path
                d="M-16 -11V9l11 8V-1m0 18 24 -6V-7"
                fill={color}
                stroke="#c3a374"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </>
      );
      break;
    case "eggs":
      body = (
        <>
          {pieces.map(([x, y], i) => (
            <path
              key={i}
              transform={`translate(${x} ${y}) rotate(${i * 22})`}
              d="M-23 0l10 -13 12 6 12 -3 13 14 -10 10 -15 -4 -13 6Z"
              fill={color}
              stroke="#d4a940"
              strokeWidth="2"
            />
          ))}
        </>
      );
      break;
    case "broccoli":
      body = (
        <>
          {pieces.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M-4 16l1 -22h9l3 22Z" fill="#94ba62" />
              <circle cy="-8" r="13" fill={color} />
              <circle cx="-11" cy="-1" r="10" fill="#5b9e50" />
              <circle cx="11" cy="-1" r="10" fill={color} />
              <path
                d="M-7 -10l2 -3m10 7 3 1"
                stroke="#8bb860"
                strokeWidth="2"
              />
            </g>
          ))}
        </>
      );
      break;
    case "greens":
      body = (
        <>
          {[-46, -23, 0, 23, 46].map((x, i) => (
            <g
              key={x}
              transform={`translate(${100 + x} ${90 + Math.abs(x) / 4}) rotate(${x / 2})`}
            >
              <path
                d="M0 22Q-25 3 -18 -17Q-3 -30 0 -17Q18 -31 21 -13Q29 7 0 22Z"
                fill={color}
                stroke="#3e753d"
                strokeWidth="2"
              />
              <path
                d="M0 23V-16m0 19 -12 -12M0 9l13 -13"
                stroke="#b4cd79"
                strokeWidth="3"
              />
            </g>
          ))}
        </>
      );
      break;
    case "shreds":
      body = (
        <>
          {Array.from({ length: 22 }, (_, i) => (
            <path
              key={i}
              d={`M${52 + ((i * 13) % 52)} ${73 + ((i * 7) % 36)}l${35 + (i % 4) * 5} ${i % 2 ? -14 : 11}`}
              stroke={i % 3 ? color : "#e0c16c"}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
        </>
      );
      break;
    case "noodles":
      body = (
        <>
          <path d="M43 91Q47 128 100 128Q153 128 157 91Z" fill="#a65d43" />
          <ellipse cx="100" cy="89" rx="57" ry="25" fill={color} />
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M${53 + i * 3} ${80 + i * 3}q35 -23 82 -4q-10 21 -63 8q-12 -11 24 -12`}
              fill="none"
              stroke={color === "#68402f" ? "#a77552" : "#fae0a0"}
              strokeWidth="3"
            />
          ))}
        </>
      );
      break;
    case "rice":
    case "curry":
      body = (
        <>
          <path
            d="M46 109Q48 57 100 57Q151 58 154 109Z"
            fill={shape === "curry" ? "#fff1d2" : color}
            stroke="#d3bb83"
            strokeWidth="2"
          />
          {Array.from({ length: 27 }, (_, i) => (
            <path
              key={i}
              d={`M${65 + ((i * 19) % 72)} ${74 + ((i * 11) % 32)}l5 -2`}
              stroke={shape === "curry" ? "#cabb91" : "#c1a25f"}
              strokeWidth="2"
            />
          ))}
          {shape === "curry" && (
            <>
              <path d="M100 70Q147 57 159 102L148 115 100 110Z" fill={color} />
              <path d="M114 81l18 -4 9 13 -19 6Z" fill="#c9a160" />
              <path d="M130 101l15 -5 8 10 -19 7Z" fill="#c9a160" />
            </>
          )}
        </>
      );
      break;
    case "soup":
    case "porridge":
      body = (
        <>
          <path
            d="M41 87Q43 127 100 128Q157 127 159 87Z"
            fill="#668b78"
            stroke="#496d5b"
            strokeWidth="2"
          />
          <ellipse
            cx="100"
            cy="87"
            rx="58"
            ry="26"
            fill={color}
            stroke="#e6debf"
            strokeWidth="5"
          />
          {shape === "porridge" && (
            <>
              {pieces.map(([x, y], i) => (
                <path
                  key={i}
                  d={`M${x} ${y - 4}l6 -2m3 5 5 -1`}
                  stroke="#f7cb79"
                  strokeWidth="3"
                />
              ))}
              <path
                d="M77 82l17 -11 10 13 -20 7m21 7 16 -13 10 15 -19 5"
                fill="#e59029"
              />
            </>
          )}
        </>
      );
      break;
    case "dumplings":
    case "buns":
      body = (
        <>
          <ellipse
            cx="100"
            cy="107"
            rx="66"
            ry="23"
            fill="#b8844c"
            stroke="#89633b"
            strokeWidth="3"
          />
          <ellipse cx="100" cy="101" rx="62" ry="22" fill="#ead8a3" />
          {[
            [74, 75],
            [122, 77],
            [97, 102],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {shape === "dumplings" ? (
                <>
                  <path
                    d="M-25 9Q-18 -22 8 -16Q24 -11 27 9Q1 24 -25 9Z"
                    fill={color}
                    stroke="#c9b087"
                    strokeWidth="2"
                  />
                  <path
                    d="M-17 2l8 -10 -1 12 10 -16 1 14 8 -11 0 13 9 -8"
                    fill="none"
                    stroke="#d5bfa0"
                    strokeWidth="2"
                  />
                  <path
                    d="M-12 8q10 -7 20 0"
                    stroke="#e4a888"
                    strokeWidth="4"
                    opacity=".8"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M-24 10Q-28 -10 -9 -15L0 -23 9 -15Q30 -9 24 11Q0 27 -24 10Z"
                    fill={color}
                    stroke="#c9b087"
                    strokeWidth="2"
                  />
                  <path
                    d="M-17 -6L0 -14 16 -5M-9 -12L0 -14 8 -12M0 -14v21m-12 -17 2 17m20 -17 -2 17"
                    fill="none"
                    stroke="#d1b896"
                    strokeWidth="2"
                  />
                  <ellipse cy="-16" rx="6" ry="3" fill="#a98b66" />
                </>
              )}
            </g>
          ))}
        </>
      );
      break;
    case "lotus":
      body = (
        <>
          {[
            [66, 85],
            [104, 75],
            [136, 91],
            [94, 108],
          ].map(([x, y], i) => (
            <Lotus key={i} x={x} y={y} color={color} />
          ))}
        </>
      );
      break;
    case "sweetPotato":
      body = (
        <>
          {pieces.map(([x, y], i) => (
            <path
              key={i}
              transform={`translate(${x} ${y}) rotate(${i * 32})`}
              d="M-18 -8L3 -17 20 -2 9 16 -14 12Z"
              fill={color}
              stroke="#bb7f26"
              strokeWidth="2"
            />
          ))}
        </>
      );
      break;
    case "cake":
      body = (
        <>
          <path d="M59 66L129 56 146 104 78 119Z" fill={color} />
          <path d="M78 85v34l68 -15V72Z" fill="#dec192" />
          <path d="M78 100l68 -14" stroke="#8ca745" strokeWidth="7" />
          <path
            d="M59 66l70 -10 17 16 -68 13Z"
            fill="#fff4d6"
            stroke="#cbbd93"
          />
          <path
            d="M78 85v10m16 -13v9m16 -12v10m16 -13v9"
            stroke="#fff4d6"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </>
      );
      break;
    case "cookies":
      body = (
        <>
          {[
            [76, 100],
            [124, 83],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <ellipse
                cy="9"
                rx="29"
                ry="15"
                fill={color}
                stroke="#986638"
                strokeWidth="2"
              />
              <ellipse cy="3" rx="29" ry="14" fill="#74c8c4" />
              <ellipse
                cy="-4"
                rx="29"
                ry="15"
                fill={color}
                stroke="#986638"
                strokeWidth="2"
              />
              <path
                d="M-14 -8h2m12 -3h2m12 7h2m-18 4h2"
                stroke="#704a2d"
                strokeWidth="3"
              />
            </g>
          ))}
        </>
      );
      break;
    case "iceCream":
      body = (
        <>
          <path d="M62 103Q67 126 100 126Q133 126 138 103Z" fill="#8eacb4" />
          <ellipse cx="100" cy="102" rx="38" ry="13" fill="#b4ced0" />
          {[
            [82, 88],
            [117, 88],
            [100, 66],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="22"
              fill={color}
              stroke="#d7c8ad"
              strokeWidth="2"
            />
          ))}
        </>
      );
      break;
    case "marshmallows":
      body = (
        <>
          <ellipse cx="100" cy="100" rx="58" ry="23" fill="#8e653f" />
          {pieces.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${i * 12})`}>
              <rect
                x="-13"
                y="-15"
                width="26"
                height="28"
                rx="8"
                fill={i % 2 ? "#fff1e5" : color}
                stroke="#ceaba0"
                strokeWidth="1.5"
              />
              <path d="M-8 -7h15" stroke="#fff9ed" strokeWidth="3" />
            </g>
          ))}
        </>
      );
      break;
    case "tart":
      body = (
        <>
          <path
            d="M50 89l10 26Q100 130 141 113l9 -24Z"
            fill={color}
            stroke="#ad733c"
            strokeWidth="3"
          />
          <ellipse
            cx="100"
            cy="88"
            rx="50"
            ry="22"
            fill="#fff0cf"
            stroke="#d29a56"
            strokeWidth="5"
          />
          <path
            d="M64 103l4 12m13 -8 1 12m17 -10v12m17 -13 -1 11m17 -16 -3 12"
            stroke="#b98142"
            strokeWidth="2"
          />
        </>
      );
      break;
    case "shake":
      body = (
        <>
          <path
            d="M74 61h53l-7 65H82Z"
            fill={color}
            stroke="#9a8c80"
            strokeWidth="2"
          />
          <ellipse
            cx="100"
            cy="61"
            rx="27"
            ry="9"
            fill="#e8dbcb"
            stroke="#b1a18d"
            strokeWidth="2"
          />
          <path
            d="M111 91l16 -51 13 -8"
            fill="none"
            stroke="#978a62"
            strokeWidth="5"
          />
          <path d="M87 76l4 38" stroke="#eee4d5" strokeWidth="4" />
        </>
      );
      break;
  }
  // Space garnish around the main food; special unusual ingredients remain large enough to recognize.
  const garnish = ingredients.filter((i) => i !== "pork" && i !== "chicken");
  return (
    <g data-dish-shape={shape}>
      {body}
      {garnish.map((ingredient, i) => (
        <IngredientArt
          key={ingredient}
          ingredient={ingredient}
          x={garnish.length === 1 ? 100 : 73 + (i * 54) / (garnish.length - 1)}
          y={
            shape === "shake"
              ? 65
              : shape === "cake" || shape === "tart"
                ? 66
                : 88 + (i % 2) * 12
          }
        />
      ))}
    </g>
  );
}

function DishLid({ motion }: { motion?: "open" | "close" }) {
  return (
    <g
      className={motion ? `dish-lid lid-${motion}` : "dish-lid"}
      aria-hidden="true"
    >
      <path
        d="M29 107Q35 44 100 44Q165 44 171 107Z"
        fill="#7d9c85"
        stroke="#335944"
        strokeWidth="2"
      />
      <path
        d="M45 94Q57 57 96 56"
        fill="none"
        stroke="#abc0a8"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="44" rx="12" ry="6" fill="#d99a4a" />
      <path
        d="M24 108H176"
        stroke="#335944"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Original SVG illustrations. Covered cards return before reading any dish-specific data. */
export function DishArt({
  dish,
  covered = false,
  empty = false,
  motion,
}: {
  dish?: Pick<DishCard, "name" | "art" | "kind">;
  covered?: boolean;
  empty?: boolean;
  motion?: "open" | "close";
}) {
  if (covered || empty)
    return (
      <svg
        viewBox="0 0 200 150"
        role="img"
        aria-label={empty ? "等待上菜的空盘" : "盖好的料理"}
        className="dish-art"
      >
        <ellipse cx="100" cy="127" rx="72" ry="10" fill="#173e3020" />
        <ellipse cx="100" cy="111" rx="79" ry="25" fill="#e3d7bc" />
        <ellipse
          cx="100"
          cy="106"
          rx="77"
          ry="25"
          fill="#fffdf4"
          stroke="#ccbea1"
          strokeWidth="2"
        />
        {!empty && <DishLid motion={motion === "close" ? "close" : undefined} />}
      </svg>
    );
  const visual = getDishVisual(dish?.name);
  const bad = dish?.kind === "bad";
  const label = dish ? (bad ? "黑暗料理" : "正常料理") : "待揭晓料理";
  return (
    <svg
      viewBox="0 0 200 150"
      role="img"
      aria-label={`${dish?.name || "料理"}，${label}`}
      className="dish-art"
    >
      <ellipse cx="100" cy="131" rx="73" ry="9" fill="#173e3020" />
      <ellipse cx="100" cy="112" rx="80" ry="24" fill="#e3d7bc" />
      <ellipse
        cx="100"
        cy="107"
        rx="78"
        ry="25"
        fill="#fffdf4"
        stroke="#ccbea1"
        strokeWidth="2"
      />
      <ellipse cx="100" cy="105" rx="62" ry="18" fill="#efe9d6" />
      {visual ? (
        <Food visual={visual} />
      ) : (
        <g data-dish-shape="unknown">
          <ellipse
            cx="100"
            cy="96"
            rx="44"
            ry="15"
            fill="#e0e3d6"
            stroke="#9dada0"
            strokeWidth="2"
          />
          <text
            x="100"
            y="99"
            textAnchor="middle"
            fontSize="39"
            fontWeight="700"
            fill="#758b7a"
          >
            ?
          </text>
        </g>
      )}
      {dish && (
        <g data-safety={dish.kind}>
          <rect
            x="36"
            y="5"
            width="128"
            height="29"
            rx="14.5"
            fill={bad ? "#922f3a" : "#21664c"}
            stroke={bad ? "#642330" : "#164b38"}
            strokeWidth="2"
          />
          <circle cx="53" cy="19.5" r="10" fill="#fff8e8" />
          <path
            d={bad ? "M49 15l8 9m0 -9 -8 9" : "M47 19l4 5 8 -10"}
            fill="none"
            stroke={bad ? "#922f3a" : "#21664c"}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="110"
            y="25"
            textAnchor="middle"
            fontSize="17"
            fontWeight="800"
            fill="#fff9eb"
          >
            {label}
          </text>
        </g>
      )}
      {motion === "open" && <DishLid motion="open" />}
    </svg>
  );
}
