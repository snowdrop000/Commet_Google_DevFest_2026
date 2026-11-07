import { pixelStarEar, starEars } from "./star-accessories";

export type StarExpression = "idle" | "happy" | "cry" | "proud";
export const outline = "#50352f";

const crystalShape = "M-8.2-9 2-7.1 4.8.4-4.1 4.8-10.3-.1Z";

export function StarOrnaments({
  id,
  crown,
  walking,
  pixel,
}: {
  id: string;
  crown: number;
  walking: boolean;
  pixel: boolean;
}) {
  if (id === "head_none") return null;
  // The walk art faces right. The front edge of the head hides more of the far ornament.
  const placements = walking
    ? { near: "translate(38.5 4.7) scale(.87 .96)", far: "translate(61 4.1) scale(-.74 .85)" }
    : { near: "translate(35 6)", far: "translate(65 6) scale(-1 1)" };
  const custom = pixel && id === "head_gold" ? pixelStarEar : starEars[id];
  return (
    <g data-layer="head" data-part={id} transform={`translate(0 ${crown})`}>
      {Object.entries(placements).map(([side, transform]) =>
        custom ? (
          <g
            key={side}
            transform={transform}
            stroke={outline}
            strokeWidth="1.05"
            strokeLinejoin="round"
          >
            {custom}
          </g>
        ) : (
          <g key={side} transform={transform}>
            <path d={crystalShape} fill="#e4dcf1" />
            <path d="M-8.2-9 2-7.1-4.3-4.2Z" fill="#faf8ff" />
            <path d="M-8.2-9-4.3-4.2-10.3-.1Z" fill="#eeebfa" />
            <path d="M2-7.1 4.8.4-.1.1-4.3-4.2Z" fill="#e5e4f6" />
            <path d="M-10.3-.1-4.3-4.2-.1.1-4.1 4.8Z" fill="#d8cdeb" />
            <path
              d={crystalShape}
              fill="none"
              stroke={outline}
              strokeWidth="1.05"
              strokeLinejoin="round"
            />
            {id === "head_moon" ? (
              <path
                d="M-9.8-15.7A5.1 5.1 0 1 0-4.3-8.7 4.1 4.1 0 0 1-9.8-15.7Z"
                fill="#c3d9f8"
                stroke={outline}
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M-11.7-17.9-8.7-14.9-4.8-15.4-6.8-12.1-4.9-8.6-8.9-9-12-6.3-12.8-10-16.4-11.4-12.6-13.3Z"
                fill="#ffe284"
                stroke={outline}
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
            )}
          </g>
        ),
      )}
    </g>
  );
}

function StarEye({
  id,
  side,
  ink,
  pixel,
}: {
  id: string;
  side: number;
  ink: string;
  pixel: boolean;
}) {
  switch (id) {
    case "eyes_glimmer":
      return (
        <>
          <ellipse rx="3.85" ry="4.65" fill={ink} />
          <ellipse cy="2.35" rx="2.6" ry="1.35" fill="#b78bc2" opacity=".85" />
          <circle cx="-1.02" cy="-1.48" r="1.4" fill="white" />
          <circle cx="1.4" cy=".82" r=".65" fill="#fff4fd" />
        </>
      );
    case "eyes_star_shine":
      return (
        <>
          <ellipse rx="3.55" ry="4.15" fill="#64435d" />
          <path d="M0-3.3.85-1 3.05-.15.9.7 0 3.2-.9.7-3.05-.15-.85-1Z" fill="#ffe28d" />
        </>
      );
    case "eyes_star_heart":
      return (
        <path
          d="M0 3.8C-1 2.9-4.4.7-4.4-1.7c0-2.2 3-3 4.4-.9 1.4-2.1 4.4-1.3 4.4.9C4.4.7 1 2.9 0 3.8Z"
          fill="#cf4977"
          stroke="#6e3651"
          strokeWidth=".65"
        />
      );
    case "eyes_star_sleepy":
      return (
        <>
          <path d="M-3.5-.5H3.5q-.5 3.9-3.5 3.9T-3.5-.5Z" fill={ink} />
          <path
            d="M-3.8-.55q3.8-.65 7.6 0"
            fill="none"
            stroke={ink}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </>
      );
    case "eyes_star_odd":
      return (
        <>
          <ellipse rx="3.45" ry="4.1" fill={ink} />
          <ellipse cy=".4" rx="2.4" ry="3" fill={side === -1 ? "#4e9fc0" : "#c4873f"} />
          <ellipse cy=".4" rx="1.15" ry="1.85" fill="#362c4a" />
          <circle cx="-1" cy="-1.55" r=".95" fill="#fff9e9" />
        </>
      );
    case "eyes_star_digital":
      return (
        <>
          <rect x="-4" y="-3.5" width="8" height="7" rx="1.2" fill="#28314a" />
          <path d="M-2.7-1.4h2.2v2.6h-2.2Zm3.2 0h2.2v2.6H.5Z" fill="#75f1d1" />
          <path d="M-.5-2.4H.5v1H-.5Z" fill="#cefff3" />
        </>
      );
    default:
      return pixel ? (
        <path d="M-2.7-2.25h1V-3.3h3.4v1.05h1v4.5h-1V3.3h-3.4V2.25h-1Z" fill={ink} />
      ) : (
        <ellipse rx="2.65" ry="3.25" fill={ink} />
      );
  }
}

export function StarFace({
  expression,
  x,
  y,
  walking,
  eyes,
  mouth,
  pixel,
  ink,
}: {
  expression: StarExpression;
  x: number;
  y: number;
  walking: boolean;
  eyes: string;
  mouth: string;
  pixel: boolean;
  ink?: string;
}) {
  const reaction = expression === "happy" || expression === "cry";
  const smile = !reaction && mouth === "mouth_smile";
  const distance = expression === "idle" ? 8.1 : 9.8;
  const stroke = ink ?? outline;
  return (
    <g transform={`translate(${x} ${y})`}>
      {expression !== "cry" && (
        <g data-layer="cheeks" fill="#f094ae" opacity=".56">
          {pixel ? (
            <>
              <rect x={-distance - 7.2} y="3" width="6" height="2.6" />
              <rect x={distance + 1.5} y={walking ? 2 : 3} width={walking ? 5 : 6} height="2.6" />
            </>
          ) : (
            <>
              <ellipse cx={-distance - 4.2} cy="4.35" rx="3.16" ry="1.48" />
              <ellipse
                cx={distance + 4.2}
                cy={walking ? 3.35 : 4.35}
                rx={walking ? 2.55 : 3.16}
                ry="1.48"
              />
            </>
          )}
        </g>
      )}
      <g
        data-layer="eyes"
        data-part={reaction ? expression : eyes}
        fill="none"
        stroke={stroke}
        strokeWidth="1.45"
        strokeLinecap="round"
      >
        {expression === "happy" && (
          <path
            d={pixel ? "M-14 1V-1h2v-2h4v2h2v2M6 1V-1h2v-2h4v2h2v2" : "M-14 1q4-8 8 0M6 1q4-8 8 0"}
          />
        )}
        {expression === "cry" && (
          <path d={pixel ? "M-14 1h3V0h2v-2h2M7-2h2v2h2v1h3" : "M-14 1q4 .2 7-3M7-2q3 3.2 7 3"} />
        )}
        {!reaction &&
          [-1, 1].map((side) => {
            const far = walking && side === 1;
            const position = far
              ? `translate(${distance} -1) scale(.76 .87)`
              : `translate(${side * distance} 0)`;
            return (
              <g key={side} transform={position} stroke="none">
                <StarEye id={eyes} side={side} ink={ink ?? "#3c2622"} pixel={pixel} />
              </g>
            );
          })}
      </g>
      <g
        data-layer="mouth"
        data-part={reaction ? expression : mouth}
        transform={`translate(${walking ? 1.3 : 0} ${expression === "idle" ? 5.7 : 7.6})`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {pixel && expression === "happy" ? (
          <path d="M-4-3H4V1H3V3H-3V1H-4Z" fill="#f591a8" />
        ) : expression === "happy" ? (
          <>
            <path d="M-4.25-3q4.25-.65 8.5 0 .1 7-4.25 7T-4.25-3Z" fill="#f591a8" />
            <path d="M-2.6.2Q0-1.35 2.6.2q-.75 2.7-2.6 2.7T-2.6.2Z" fill="#ffc0ca" stroke="none" />
          </>
        ) : pixel ? (
          <path d={smile ? "M-3-1V0h1v1h4V0h1v-1" : "M-3.5-1V0H-2.5V1h2V0h1v1h2V0h1v-1"} />
        ) : smile ? (
          <path d="M-3.2-1q3.2 3.4 6.4 0" />
        ) : (
          <path d="M-3.7-.85q1.7 2.5 3.7 0 2 2.5 3.7 0" />
        )}
      </g>
    </g>
  );
}

export function StarEffects({
  expression,
  x,
  y,
  crown,
}: {
  expression: StarExpression;
  x: number;
  y: number;
  crown: number;
}) {
  if (expression === "idle") return null;
  return (
    <g data-layer="effects" data-part={expression}>
      {expression === "happy" && (
        <g fill="#ffd061" transform={`translate(0 ${y - 5})`}>
          <path d="M14 1q-1 1.2-2.6.4L6.6-2q-2.2-1.8.5-3.4 1-.7 2.4.5l4.5 4.3ZM13 6q.1 1.6-1.3 1.7L5 7.5q-2.1-.1-1.4-2.8.3-1.5 2-1l6.3.8ZM86 1q1 1.2 2.6.4L93.4-2q2.2-1.8-.5-3.4-1-.7-2.4.5L86-.6ZM87 6q-.1 1.6 1.3 1.7l6.7-.2q2.1-.1 1.4-2.8-.3-1.5-2-1l-6.3.8Z" />
        </g>
      )}
      {expression === "cry" && (
        <g transform={`translate(${x} ${y + 4})`}>
          {[-10.5, 10.5].map((offset) => (
            <g key={offset} transform={`translate(${offset} 0)`}>
              <path
                d="M0 0q4.55 6.1 0 6.1Q-4.55 6.1 0 0Z"
                fill="#afe5ff"
                stroke="#3c9de4"
                strokeWidth=".85"
              />
              <path
                d="M-.65 2.05q-1.2 1.65-.5 2.3"
                stroke="white"
                strokeWidth=".6"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ))}
        </g>
      )}
      {expression === "proud" && (
        <g transform={`translate(86 ${crown + 8}) rotate(13)`}>
          <path
            d="M-2.5 4.6q.1-1.2-2-3.45A5.35 5.35 0 1 1 4.5 1.15q-2.1 2.25-2 3.45Z"
            fill="#ffdc76"
            stroke={outline}
            strokeWidth="1.05"
          />
          <path
            d="M-2.6 4.4h5.2v1.7q0 1-1 1h-3.2q-1 0-1-1Z"
            fill="#f6ebff"
            stroke={outline}
            strokeWidth=".85"
          />
          <path
            d="M-1.1 4.15V1.2q-2-2.9-.85-2.9.9 0 .85 2.05h2.2q-.05-2.05.85-2.05 1.15 0-.85 2.9v2.95"
            fill="none"
            stroke="#fff9e3"
            strokeWidth=".7"
            strokeLinecap="round"
          />
          <path
            d="M-5.5-5.5-6.8-6.8M0-7.2v-2M5.5-5.5l1.3-1.3"
            fill="none"
            stroke="#ffbd52"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
}

export function StarPattern({ maskId }: { maskId: string }) {
  return (
    <g data-layer="pattern" mask={`url(#${maskId})`} fill="#856bc4" opacity=".46">
      <path d="M37 69.5q.8 3.7 4.5 4.5-3.7.8-4.5 4.5-.8-3.7-4.5-4.5 3.7-.8 4.5-4.5ZM60 73q1 4 5 5-4 1-5 5-1-4-5-5 4-1 5-5ZM70 62q.6 2.6 3.2 3.2-2.6.6-3.2 3.2-.6-2.6-3.2-3.2 2.6-.6 3.2-3.2Z" />
      <circle cx="27" cy="82" r="1.15" />
      <circle cx="50" cy="70" r="1.35" />
      <circle cx="72" cy="80" r="1.1" />
    </g>
  );
}
