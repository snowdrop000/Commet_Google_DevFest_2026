import type { ReactNode } from "react";
import type { StarExpression } from "./star-parts";

type Skin = {
  tint: readonly [number, number, number];
  ink?: string;
  wash?: readonly [color: string, opacity: number];
  details?: ReactNode;
};

export const starSkins: Partial<Record<string, Skin>> = {
  skin_star_mint: { tint: [0.66, 0.98, 0.86] },
  skin_star_night: { tint: [0.58, 0.61, 0.92] },
  skin_star_sakura: { tint: [1, 0.77, 0.87] },
  skin_star_lemon: { tint: [1, 1.02, 0.62] },
  skin_star_sky: { tint: [0.68, 0.88, 1.05] },
  skin_star_lavender: { tint: [0.86, 0.76, 1.04] },
  skin_star_matcha: { tint: [0.77, 0.88, 0.58] },
  skin_star_galaxy: {
    tint: [0.36, 0.32, 0.65],
    ink: "#fff1d4",
    wash: ["#662e93", 0.55],
    details: (
      <>
        <path
          d="M13 74C30 82 48 72 60 63S82 51 90 55"
          fill="none"
          stroke="#9e88e3"
          strokeWidth="8"
          opacity=".36"
        />
        <path d="m25 70 12 6 13-7m14 13 9-7 8 4" fill="none" stroke="#cfbbfd" strokeWidth=".55" />
        <path
          d="M25 66l1.2 3 3 1.2-3 1-1.2 3-1-3-3-1 3-1.2ZM72 71l1 2.7 2.8 1.3-2.8 1-1 3-1-3-2.8-1 2.8-1.3Z"
          fill="#ffe69d"
        />
        <path d="M51 66.5l.7 2 2 .7-2 .7-.7 2-.8-2-2-.7 2-.7Z" fill="#e9dafa" />
        <g fill="#fff0ce">
          <circle cx="37" cy="76" r="1" />
          <circle cx="64" cy="82" r="1.2" />
          <circle cx="81" cy="79" r="1" />
          <circle cx="43" cy="42" r="1.1" />
          <circle cx="56" cy="40" r=".8" />
          <circle cx="34" cy="84" r=".9" />
        </g>
      </>
    ),
  },
  skin_star_soda: {
    tint: [0.56, 0.93, 0.96],
    wash: ["#168bb4", 0.62],
    details: (
      <>
        <path d="M10 73Q28 63 46 73T83 71L95 95H10Z" fill="#36afcd" opacity=".22" />
        <g stroke="#f0fffc" strokeWidth="1.15" fill="#d4ffff" fillOpacity=".2">
          <circle cx="33" cy="75" r="3.7" />
          <circle cx="49" cy="82" r="2.7" />
          <circle cx="65" cy="72" r="4.3" />
          <circle cx="72" cy="81" r="1.9" />
          <circle cx="29" cy="60" r="1.8" />
          <circle cx="73" cy="57" r="1.5" />
          <circle cx="55" cy="42" r="2" />
        </g>
        <path
          d="m31 74 1-1m31-2 1-1"
          fill="none"
          stroke="#fff"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </>
    ),
  },
  skin_star_strawberry: {
    tint: [1, 0.98, 0.94],
    wash: ["#eb5684", 0.92],
    details: (
      <g stroke="#fff0c1" strokeWidth="1.6" strokeLinecap="round">
        <path d="m28 77 1 1.9m9-6 1 2m9 4 1.1 2m11-6.7-.5 2m9 2-.8 1.8m10-8-.8 2m-24 8-.7 1.8m-14-1 1 1.8" />
      </g>
    ),
  },
  skin_star_toast: {
    tint: [1, 0.96, 0.81],
    wash: ["#bd622f", 0.85],
    details: (
      <g fill="#945331" opacity=".54">
        <ellipse cx="28" cy="78" rx="2.5" ry="1.2" />
        <ellipse cx="36" cy="84" rx="1.8" ry=".9" />
        <ellipse cx="49" cy="75" rx="2.7" ry="1" />
        <ellipse cx="55" cy="83" rx="2.1" ry="1.2" />
        <ellipse cx="68" cy="77" rx="2.9" ry="1.2" />
        <ellipse cx="72" cy="83" rx="1.1" ry=".7" />
        <ellipse cx="79" cy="73" rx="1.6" ry=".85" />
        <ellipse cx="38" cy="72" rx="1.2" ry=".7" />
      </g>
    ),
  },
  skin_star_kintsugi: {
    tint: [0.9, 0.97, 1.04],
    wash: ["#839cce", 0.6],
    details: (
      <>
        <path
          d="m14 64 16 3 4 10 11 4 2 11H14Zm59 3 9-3 10 2v28H59l3-10 10-4Z"
          fill="#7998d3"
          opacity=".48"
        />
        <path
          d="m14 64 16 3 4 10 11 4 2 11m-13-15-9 5-4 9m71-25-10-2-9 3-1 13-10 4-3 10m13-14 9 5"
          fill="none"
          stroke="#be862f"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m14 64 16 3 4 10 11 4 2 11m-13-15-9 5-4 9m71-25-10-2-9 3-1 13-10 4-3 10m13-14 9 5"
          fill="none"
          stroke="#ffde80"
          strokeWidth=".85"
          strokeLinejoin="round"
        />
      </>
    ),
  },
};

export function StarSkinFinish({
  skin,
  maskId,
  gradientId,
}: {
  skin: Skin;
  maskId: string;
  gradientId: string;
}) {
  return (
    <g data-layer="skin-finish" mask={`url(#${maskId})`}>
      {skin.wash && (
        <>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset=".42" stopColor={skin.wash[0]} stopOpacity="0" />
            <stop offset="1" stopColor={skin.wash[0]} stopOpacity={skin.wash[1]} />
          </linearGradient>
          <rect x="8" y="30" width="84" height="63" fill={`url(#${gradientId})`} />
        </>
      )}
      {skin.details}
    </g>
  );
}

// Draw on a 46 × 40 grid, registered to the same crown and ground as the painted body.
const pixelCrown = "M20 0H26V1H30V2H33V3H35V5H37V7H39V10H40V13H41V16";
const pixelHem =
  "H43V28H44V29H45V31H46V33H45V35H43V36H41V35H39V34H38V37H37V38H35V39H33V38H31V37H30V35H29V38H28V39H27V40H25V39H24V38H23V36H22V38H21V39H20V40H18V39H17V38H16V35H15V37H14V38H12V39H10V38H9V37H8V34H7V35H5V36H3V35H1V33H0V31H1V29H2V28H3V26H4";
const pixelBack = "H5V13H6V10H7V7H9V5H11V3H13V2H16V1H20Z";
const pixelStanding = {
  raised: pixelCrown + "H43V18H44V21H43V24H42V26" + pixelHem + "V24H3V21H2V18H3V16" + pixelBack,
  lowered: pixelCrown + "V23H42V26" + pixelHem + "V23H5V16" + pixelBack,
};
const pixelWalk = [
  {
    shoulder: "V19H43V20H45V22H46V25H45V27H42V26",
    arm: "M7 23V21H9V19H12V18H15V19H17V22H16V24H14V25H10",
    farArmOffset: 0,
  },
  {
    shoulder: "V21H43V22H45V24H46V27H45V29H44V27H42V26",
    arm: "M7 24V22H9V21H13V22H16V24H17V26H15V27H11",
    farArmOffset: 2,
  },
  {
    shoulder: "V17H43V18H45V20H46V23H45V25H42V26",
    arm: "M8 25V23H10V21H13V19H16V20H18V23H17V25H15V26H11",
    farArmOffset: -2,
  },
];
const pixelArms = {
  idle: "M5 16H7V17H9V19H10V21H11V24H10V26M4 24H5V26H7V27",
  happy: "M5 16H8V17H10V19H12V21H13V23M4 24H5V26H7V27",
  cry: "M12 30H10V29H8V27H7V24H8V22H10V21H13V22H15V24H16V27",
  proud: "",
};

export function StarPixelBody({
  crown,
  ground,
  walking,
  step,
  expression,
}: {
  crown: number;
  ground: number;
  walking: boolean;
  step: number;
  expression: StarExpression;
}) {
  const pose = pixelWalk[step % pixelWalk.length];
  const body = walking
    ? pixelCrown + pose.shoulder + pixelHem + "V22H5V16" + pixelBack
    : expression === "idle" || expression === "happy"
      ? pixelStanding.raised
      : pixelStanding.lowered;
  const arm = pixelArms[expression];
  return (
    <g
      transform={`translate(${walking ? 18 : 14} ${crown}) scale(${walking ? 1.4 : 72 / 46} ${(ground - crown) / 40})`}
      shapeRendering="crispEdges"
    >
      <path d={body} fill="#f3cad6" />
      <path d={body} fill="#fff0f2" transform="translate(1 1) scale(.957 .93)" />
      <path d={body} fill="none" stroke="#58383e" strokeWidth="1.15" />
      <path d="M11 8H13V6H16V5H20V7H18V8H15V9H13V10H11ZM9 11H11V13H9Z" fill="#fffdf9" />
      <g fill="none" stroke="#714b53" strokeWidth="1">
        {walking ? (
          <>
            <path d={pose.arm} />
            <path d="M43 20H41V21H40V23H39V25" transform={`translate(0 ${pose.farArmOffset})`} />
          </>
        ) : (
          arm && (
            <>
              <path d={arm} />
              <path d={arm} transform="translate(46) scale(-1 1)" />
            </>
          )
        )}
      </g>
    </g>
  );
}
