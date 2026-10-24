import type { DishCard } from "../types";

/** Original, code-drawn dish illustrations. No remote assets. */
export function DishArt({
  dish,
  covered = false,
}: {
  dish?: Pick<DishCard, "name" | "art" | "kind">;
  covered?: boolean;
}) {
  const name = `${dish?.art ?? ""}${dish?.name ?? ""}`;
  const seed = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const type = /面|粉|noodle/.test(name)
    ? 0
    : /饭|寿司|rice/.test(name)
      ? 1
      : /糕|布丁|蛋挞|冰|甜|cake/.test(name)
        ? 2
        : /虾|鱼|蟹|海|fish/.test(name)
          ? 3
          : /肉|排|鸡|鸭|牛|pork|meat/.test(name)
            ? 4
            : /汤|粥|soup/.test(name)
              ? 5
              : seed % 6;
  const orange = ["#dc703b", "#cf563c", "#d69337", "#9a6745"][seed % 4];
  return (
    <svg
      viewBox="0 0 200 150"
      role="img"
      aria-label={covered ? "盖好的料理" : dish?.name || "料理"}
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
      <ellipse cx="100" cy="105" rx="61" ry="17" fill="#efe9d6" />
      {covered ? (
        <g>
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
      ) : (
        <g>
          {type === 0 && (
            <>
              <path d="M44 91Q47 128 100 128Q153 128 156 91Z" fill="#b85438" />
              <ellipse cx="100" cy="91" rx="56" ry="24" fill="#e9ba62" />
              {[0, 1, 2, 3, 4].map((i) => (
                <path
                  key={i}
                  d={`M${57 + i * 7} ${84 + i * 3}q40 -24 69 0q-43 31 -64 9`}
                  fill="none"
                  stroke="#fff0b4"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
              <path
                d="M75 73l10 -8 13 9M110 94l15 -9 14 5"
                stroke="#407c45"
                strokeWidth="7"
                fill="none"
              />
            </>
          )}
          {type === 1 && (
            <>
              <path
                d="M48 108Q50 53 100 52Q150 53 152 108Z"
                fill="#fff7df"
                stroke="#e1d4ae"
                strokeWidth="2"
              />
              {Array.from({ length: 15 }, (_, i) => (
                <path
                  key={i}
                  d={`M${65 + ((i * 19) % 70)} ${76 + ((i * 7) % 26)}l5 -2`}
                  stroke="#d9c9a0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
              <ellipse cx="103" cy="80" rx="24" ry="16" fill={orange} />
              <path
                d="M74 101l17 -12 13 12 16 -10"
                fill="none"
                stroke="#4a7b44"
                strokeWidth="6"
              />
            </>
          )}
          {type === 2 && (
            <>
              <path d="M62 69L130 58L146 105L78 119Z" fill="#dca460" />
              <path d="M62 69L130 58L146 75L78 89Z" fill="#fff5d8" />
              <path d="M78 89V119L146 105V75Z" fill="#eabb87" />
              <path d="M79 101L145 88" stroke="#ae653e" strokeWidth="5" />
              <path d="M88 65q15 -25 27 -1" fill="#e37858" />
              <circle cx="105" cy="56" r="5" fill="#c44337" />
              <path d="M106 51l5 -9" stroke="#4b7041" strokeWidth="3" />
            </>
          )}
          {type === 3 && (
            <>
              <path
                d="M55 92Q99 45 142 91Q98 128 55 92Z"
                fill="#e7a05d"
                stroke="#b95d35"
                strokeWidth="2"
              />
              <path d="M141 91l24 -19v39Z" fill="#c87548" />
              <path
                d="M80 77l11 28m8 -35 10 35m9 -28 8 22"
                stroke="#fff1d3"
                strokeWidth="4"
              />
              <circle cx="66" cy="89" r="3" fill="#264d3d" />
              <path
                d="M54 110l30 -4m36 9 18 -4"
                stroke="#547644"
                strokeWidth="5"
              />
            </>
          )}
          {type === 4 && (
            <>
              <path
                d="M55 80Q79 53 118 65Q153 68 148 95Q134 123 98 112Q48 121 55 80Z"
                fill={orange}
                stroke="#975333"
                strokeWidth="3"
              />
              <path
                d="M74 77l45 29m-26 -36 43 26m-72 -2 38 -24"
                stroke="#874b32"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path d="M43 109l12 -17 12 22m68 0 13 -14 10 9" fill="#5e8248" />
              <circle cx="63" cy="112" r="7" fill="#dfb843" />
            </>
          )}
          {type === 5 && (
            <>
              <path d="M42 88Q45 128 100 128Q155 128 158 88Z" fill="#668c78" />
              <ellipse
                cx="100"
                cy="88"
                rx="58"
                ry="24"
                fill="#b57b41"
                stroke="#e1d5b9"
                strokeWidth="5"
              />
              <ellipse cx="81" cy="84" rx="12" ry="7" fill="#fff2ca" />
              <ellipse cx="119" cy="94" rx="14" ry="7" fill="#e9b961" />
              <path
                d="M99 75l9 10m-42 13 14 -3m50 -13 10 4"
                stroke="#6a8a49"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </>
          )}
          <path
            d="M83 38q-8 -9 0 -18m24 15q-8 -9 0 -18m23 23q-8 -9 0 -18"
            stroke="#b5bba6"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
