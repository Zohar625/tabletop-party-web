import type { ScoutCard } from "./types.ts";
const colors = [
  "",
  "#70b7dd",
  "#42b5dc",
  "#26b9d2",
  "#23bca6",
  "#6fbe49",
  "#b4cc39",
  "#efd130",
  "#efb632",
  "#ed8c37",
  "#e66163",
];
export function CardFace({
  card,
  back = false,
}: {
  card?: ScoutCard;
  back?: boolean;
}) {
  if (back || !card)
    return (
      <span className="sc-card sc-card-back" aria-hidden="true">
        <svg viewBox="0 0 80 120">
          <path d="M40 12 68 60 40 108 12 60Z M40 26 60 60 40 94 20 60Z" />
          <circle cx="40" cy="60" r="13" />
          <path d="m40 45 4 10 11 5-11 4-4 11-4-11-11-4 11-5Z" />
        </svg>
      </span>
    );
  return (
    <span className="sc-card sc-card-face">
      <svg className="sc-face-print" viewBox="0 0 80 120" aria-hidden="true">
        <rect width="80" height="120" fill={colors[card.top]} />
        <path
          d="M80 0C40 0 60 60 40 60S40 120 0 120H80Z"
          fill={colors[card.bottom]}
        />
        {[
          { value: card.top, opposite: card.bottom, rotate: false },
          { value: card.bottom, opposite: card.top, rotate: true },
        ].map(({ value, opposite, rotate }) => (
          <g
            key={rotate ? "bottom" : "top"}
            transform={rotate ? "rotate(180 40 60)" : undefined}
          >
            <text
              className="sc-face-numeral"
              x="7"
              y="31"
              fontSize={value === 10 ? "27" : "32"}
            >
              {value}
            </text>
            <text className="sc-face-index" x="9" y="47">
              {opposite}
            </text>
            {(value === 6 || value === 9) && (
              <path d="M8 34h19" className="sc-face-rule" />
            )}
            <path d="m11 56 3-3 3 3-3 3Z" className="sc-face-mark" />
            <text x="70" y="28" className="sc-face-tiny" textAnchor="end">
              {value}
            </text>
          </g>
        ))}
        <rect
          x="1"
          y="1"
          width="78"
          height="118"
          rx="2"
          className="sc-face-frame"
        />
      </svg>
    </span>
  );
}
export function AbilityToken({ available }: { available: boolean }) {
  return (
    <span
      className={`sc-ability-ticket${available ? "" : " is-used"}`}
      role="img"
      aria-label={`挖角并演出：${available ? "可用" : "已使用"}`}
      title={`挖角并演出 · ${available ? "本轮可用" : "本轮已用"}`}
    >
      <span className="sc-ability-ticket-front">
        <svg viewBox="0 0 48 32" aria-hidden="true">
          <path d="M4 5h27v16H4zM31 12h8l6 9v4H31z" />
          <circle cx="12" cy="26" r="4" />
          <circle cx="37" cy="26" r="4" />
          <text x="17" y="17" textAnchor="middle">
            S&amp;S
          </text>
        </svg>
      </span>
      <span className="sc-ability-ticket-back">已用</span>
    </span>
  );
}
export function Card({
  card,
  selected = false,
  onClick,
  disabled = false,
  motionId,
}: {
  card: ScoutCard;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  motionId?: string;
}) {
  return (
    <button
      type="button"
      className={`sc-card-button${selected ? " is-selected" : ""}`}
      data-motion={motionId}
      aria-label={`${card.top} 点，下端 ${card.bottom} 点${selected ? "，已选中" : ""}`}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      disabled={disabled || !onClick}
    >
      <CardFace card={card} />
    </button>
  );
}
