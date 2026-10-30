import { useEffect, useState, type ReactNode } from "react";
import { featuredGames, nextFeatured, ROTATE_MS } from "./featured-games.ts";
import { MapIllustration } from "../games/cartographers/TerrainArt.tsx";
import "./featured-games.css";

export function FeaturedGames({
  onBluff,
  bluffArt,
}: {
  onBluff: () => void;
  bluffArt: ReactNode;
}) {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * featuredGames.length),
  );
  const [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches),
      visibility = () => setHidden(document.hidden);
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const playing = !paused && !hovered && !focused && !hidden && !reduced;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => setIndex((current) => nextFeatured(current, 1)),
      ROTATE_MS,
    );
    return () => clearTimeout(timer);
  }, [index, playing]);
  const game = featuredGames[index]!;
  return (
    <section
      className="featured"
      aria-label="游戏推荐"
      aria-roledescription="轮播"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      <div
        className={`hero featured-slide featured-${game.id}`}
        key={game.id}
        aria-live={playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {game.title}
          </p>
          <h1>
            {game.headline[0]}
            <br />
            <span className="underline">{game.headline[1]}</span>
          </h1>
          <p className="hero-description">{game.description}</p>
          {game.href ? (
            <a className="primary hero-button" href={game.href}>
              来玩{game.title}
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <button className="primary hero-button" onClick={onBluff}>
              来一局瞎掰王<span aria-hidden="true">→</span>
            </button>
          )}
          <div className="hero-meta">
            <span>{game.players}</span>
            <span>{game.duration}</span>
          </div>
        </div>
        {game.id === "bluff" ? bluffArt : <FeatureArt id={game.id} />}
      </div>
      <div className="featured-controls">
        <div className="featured-picker" aria-label="选择推荐游戏">
          {featuredGames.map((item, i) => (
            <button
              key={item.id}
              className={i === index ? "is-active" : ""}
              aria-label={`推荐${item.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            >
              <span />
              {item.title.replace(" · 原版联机", "·联机")}
            </button>
          ))}
        </div>
        <div className="featured-navigation">
          <span className="featured-counter">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(featuredGames.length).padStart(2, "0")}
          </span>
          <button
            aria-label="上一个游戏"
            onClick={() => setIndex((i) => nextFeatured(i, -1))}
          >
            ←
          </button>
          <button
            aria-label="下一个游戏"
            onClick={() => setIndex((i) => nextFeatured(i, 1))}
          >
            →
          </button>
          <button
            aria-label={paused || reduced ? "开始自动轮播" : "暂停自动轮播"}
            aria-pressed={paused || reduced}
            onClick={() => {
              if (reduced) {
                setReduced(false);
              }
              setPaused(paused || reduced ? false : true);
              setFocused(false);
            }}
          >
            {paused || reduced ? "播放" : "暂停"}
          </button>
        </div>
      </div>
    </section>
  );
}
function FeatureArt({ id }: { id: string }) {
  return (
    <div className={`featured-art feature-art-${id}`} aria-hidden="true">
      <span className="feature-orbit" />
      {id === "cartographers" ? (
        <div className="feature-map">
          <MapIllustration />
          <span>把四季，收进一张地图</span>
        </div>
      ) : (
        <svg viewBox="0 0 400 340" fill="none">
          <ellipse
            cx="210"
            cy="305"
            rx="145"
            ry="15"
            fill="#263d31"
            opacity=".09"
          />
          {id === "scout" ? (
            <>
              <g transform="translate(50 60) rotate(-12 90 110)">
                <rect
                  width="150"
                  height="220"
                  rx="13"
                  fill="#527c91"
                  stroke="#263d31"
                  strokeWidth="3"
                />
                <rect
                  x="9"
                  y="9"
                  width="132"
                  height="202"
                  rx="8"
                  stroke="#f7e9c5"
                />
                <text
                  x="20"
                  y="64"
                  fill="#fff5d5"
                  fontSize="52"
                  fontWeight="800"
                >
                  6
                </text>
                <path d="M20 70h30" stroke="#fff5d5" strokeWidth="3" />
                <text x="24" y="96" fill="#fff5d5" fontSize="21">
                  3
                </text>
              </g>
              <g transform="translate(160 55) rotate(10 80 110)">
                <rect
                  width="155"
                  height="225"
                  rx="13"
                  fill="#df976f"
                  stroke="#263d31"
                  strokeWidth="3"
                />
                <rect
                  x="9"
                  y="9"
                  width="137"
                  height="207"
                  rx="8"
                  stroke="#fff1c9"
                />
                <text
                  x="20"
                  y="67"
                  fill="#fff8de"
                  fontSize="54"
                  fontWeight="800"
                >
                  7
                </text>
                <text x="23" y="96" fill="#fff8de" fontSize="21">
                  4
                </text>
                <path
                  d="m76 120 28 50H48z"
                  fill="#f4d783"
                  stroke="#263d31"
                  strokeWidth="2"
                />
                <text
                  x="105"
                  y="205"
                  fill="#fff8de"
                  fontSize="44"
                  fontWeight="800"
                >
                  4
                </text>
              </g>
              <text
                x="98"
                y="326"
                fill="#41654f"
                fontSize="15"
                letterSpacing="6"
              >
                THE SHOW GOES ON
              </text>
            </>
          ) : id === "super-tic-tac-toe" ? (
            <>
              <g transform="translate(74 35) rotate(5 120 120)">
                <rect
                  width="252"
                  height="252"
                  rx="18"
                  fill="#e3c59c"
                  stroke="#263d31"
                  strokeWidth="3"
                />
                {Array.from({ length: 9 }, (_, i) => (
                  <g
                    key={i}
                    transform={`translate(${15 + (i % 3) * 78} ${15 + Math.floor(i / 3) * 78})`}
                  >
                    <rect
                      width="66"
                      height="66"
                      rx="5"
                      fill={i === 4 ? "#b8cfb5" : "#f8eedb"}
                    />
                    {i % 2 === 0 ? (
                      <path
                        d="m18 18 30 30m0-30L18 48"
                        stroke="#51735e"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    ) : (
                      <circle
                        cx="33"
                        cy="33"
                        r="18"
                        stroke="#c17b5e"
                        strokeWidth="5"
                      />
                    )}
                  </g>
                ))}
              </g>
              <text
                x="113"
                y="326"
                fill="#41654f"
                fontSize="15"
                letterSpacing="4"
              >
                NINE LITTLE WORLDS
              </text>
            </>
          ) : id === "dinner" ? (
            <>
              <ellipse
                cx="200"
                cy="258"
                rx="143"
                ry="32"
                fill="#e8c8a3"
                stroke="#263d31"
                strokeWidth="3"
              />
              <path
                d="M78 224a122 122 0 0 1 244 0Z"
                fill="#f7e6bc"
                stroke="#263d31"
                strokeWidth="3"
              />
              <path
                d="M109 207a92 92 0 0 1 61-79"
                stroke="#fff9e4"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M67 225h266v17H67z"
                fill="#cc9360"
                stroke="#263d31"
                strokeWidth="3"
              />
              <circle
                cx="200"
                cy="94"
                r="12"
                fill="#b77c50"
                stroke="#263d31"
                strokeWidth="3"
              />
              <path
                d="M165 65q-18-18 0-36m65 36q-18-18 0-36"
                stroke="#b77c50"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <text
                x="185"
                y="192"
                fill="#946244"
                fontSize="48"
                fontWeight="700"
              >
                ?
              </text>
              <text
                x="113"
                y="311"
                fill="#946244"
                fontSize="17"
                letterSpacing="4"
              >
                这一口，你敢吗？
              </text>
            </>
          ) : (
            <>
              <g transform="translate(95 35) rotate(-7 100 130)">
                <rect
                  x="9"
                  y="9"
                  width="198"
                  height="258"
                  rx="15"
                  fill="#d2b56e"
                  stroke="#263d31"
                  strokeWidth="3"
                />
                <rect
                  width="198"
                  height="258"
                  rx="15"
                  fill="#34554b"
                  stroke="#263d31"
                  strokeWidth="3"
                />
                <rect
                  x="12"
                  y="12"
                  width="174"
                  height="234"
                  rx="9"
                  stroke="#d6ba78"
                />
                <text
                  x="73"
                  y="117"
                  fill="#efcd80"
                  fontSize="89"
                  fontFamily="Georgia"
                >
                  9
                </text>
                <text
                  x="39"
                  y="163"
                  fill="#fff0c7"
                  fontSize="21"
                  fontWeight="700"
                >
                  真话像假话
                </text>
                <text
                  x="47"
                  y="198"
                  fill="#d6ba78"
                  fontSize="11"
                  letterSpacing="3"
                >
                  THE ONLY TRUTH
                </text>
              </g>
              <text
                x="119"
                y="326"
                fill="#41654f"
                fontSize="15"
                letterSpacing="4"
              >
                你会相信谁？
              </text>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
