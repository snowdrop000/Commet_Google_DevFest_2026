import type { ReactNode } from "react";
import type { StarExpression } from "./star-parts";
import { GemFacets, gems, type Gem, type StarPose } from "./star-gems";
import { motion, sparkle } from "./star-motion";
// Repeats every 10 units so the water can slide by two periods and loop seamlessly.
const wave = (y: number) => `M-40 ${y}${"q2.5-1.6 5 0t5 0".repeat(18)}`;
const flakes: [x: number, y: number, r: number, delay: number][] = [
  [24, 50, 1.2, 0],
  [36, 40, 1, 2.1],
  [45, 64, 1.1, 3.6],
  [58, 38, 1.3, 1.2],
  [67, 56, 1, 4.2],
  [77, 64, 1.2, 0.6],
  [30, 68, 1.1, 2.8],
  [55, 70, 1, 1.7],
  [83, 50, 1.1, 3.1],
  [17, 62, 1, 4.6],
  [63, 45, 0.9, 0.9],
  [41, 34, 1.1, 3.9],
];

function Goldfish({ x, y, size, back }: { x: number; y: number; size: number; back?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <g {...motion(back ? "fish-back" : "fish", back ? 2 : 0)}>
        <path
          {...motion("tail", back ? 0.25 : 0)}
          d="M-2.6 0-6.4-2.8Q-5.4 0-6.4 2.8Z"
          fill="#ff9a62"
          stroke="#c6462a"
          strokeWidth=".45"
          strokeLinejoin="round"
        />
        <ellipse rx="3.6" ry="2.4" fill="#f2603a" stroke="#c6462a" strokeWidth=".45" />
        <path d="M-.6-2.2Q.6-3.9 1.8-2.1" fill="#ff9a62" />
        <path d="M-.4 0q.6 1.4 2 1.1" fill="none" stroke="#ffb98f" strokeWidth=".45" />
        <circle cx="1.9" cy="-.5" r=".55" fill="#3a2a2a" />
      </g>
    </g>
  );
}

type Skin = {
  tint: readonly [number, number, number];
  background?: string;
  ink?: string;
  wash?: readonly [color: string, opacity: number];
  // A function receives the pose, for art that follows the body's shape.
  details?: ReactNode | ((pose: StarPose) => ReactNode);
  // Gem skins also cut facets into hands drawn apart from the body.
  gem?: Gem;
};

export const starSkins: Partial<Record<string, Skin>> = {
  skin_level_sunrise: {
    background: "#fff2d3",
    tint: [1.04, 0.98, 0.72],
    wash: ["#ffd57c", 0.18],
    details: (
      <g fill="#fff7d7" opacity=".8">
        <ellipse cx="33" cy="75" rx="8" ry="3" />
        <ellipse cx="67" cy="80" rx="6" ry="2.5" />
        <path d="m50 72 1.2 3.1 3.3 1.2-3.3 1.2L50 81l-1.2-3.5-3.3-1.2 3.3-1.2Z" />
      </g>
    ),
  },
  skin_level_twilight: {
    background: "#fbe1e8",
    tint: [1.03, 0.79, 0.83],
    wash: ["#e99c82", 0.2],
    details: (
      <>
        <path d="M8 79Q29 69 50 78T94 75v23H8Z" fill="#d2a6dc" opacity=".35" />
        <path d="M24 78q15-5 30 0t27-1" fill="none" stroke="#ffedd2" strokeWidth="2" opacity=".8" />
        <g fill="#fff1cf">
          <circle cx="32" cy="71" r="1" />
          <circle cx="66" cy="76" r="1.3" />
          <circle cx="57" cy="84" r=".8" />
        </g>
      </>
    ),
  },
  skin_level_aurora: {
    background: "#dff2ed",
    tint: [0.84, 1.02, 0.98],
    wash: ["#bad4f3", 0.24],
    details: (
      <>
        <g fill="none" strokeLinecap="round" opacity=".44">
          <path d="M14 89Q33 62 52 75T88 63" stroke="#a9ead2" strokeWidth="15" />
          <path d="M15 96Q35 69 54 82T89 70" stroke="#c3b4ee" strokeWidth="12" />
        </g>
        <g fill="#fffef4">
          <path d="m33 72 .8 2.4 2.5.8-2.5.8-.8 2.4-.8-2.4-2.5-.8 2.5-.8Zm37 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
          <circle cx="52" cy="86" r="1.1" />
        </g>
      </>
    ),
  },
  skin_level_moonlight: {
    background: "#e9e5f7",
    tint: [0.88, 0.88, 1.04],
    ink: "#716383",
    wash: ["#d5cfef", 0.2],
    details: (
      <>
        <path d="M15 85Q35 70 52 80T91 75v22H15Z" fill="#c7c4e9" opacity=".5" />
        <path {...motion("glow")} d="M54 68a8 8 0 1 0 6 13 6.6 6.6 0 0 1-6-13Z" fill="#fff6ca" />
        <g fill="#fffdf0">
          <path {...motion("twinkle")} d="m30 75 1 2.6 2.8 1-2.8 1-1 2.6-1-2.6-2.8-1 2.8-1Z" />
          <circle {...motion("twinkle", 0.7)} cx="71" cy="72" r="1.2" />
          <circle {...motion("twinkle", 1.5)} cx="74" cy="84" r=".9" />
          <circle {...motion("twinkle", 2.1)} cx="40" cy="86" r=".8" />
        </g>
      </>
    ),
  },
  skin_star_mint: { tint: [0.66, 0.98, 0.86], background: "#d9f1e7" },
  skin_star_night: { tint: [0.58, 0.61, 0.92], background: "#e1e4f6" },
  skin_star_sakura: { tint: [1, 0.77, 0.87], background: "#fbe1eb" },
  skin_star_lemon: { tint: [1, 1.02, 0.62], background: "#f6f2ce" },
  skin_star_sky: { tint: [0.68, 0.88, 1.05], background: "#dceefa" },
  skin_star_lavender: { tint: [0.86, 0.76, 1.04], background: "#eae2f8" },
  skin_star_matcha: { tint: [0.77, 0.88, 0.58], background: "#e8eed7" },
  skin_star_galaxy: {
    background: "#e8e1f5",
    tint: [0.36, 0.32, 0.65],
    ink: "#fff1d4",
    wash: ["#662e93", 0.55],
    details: (
      <>
        <g {...motion("shimmer")} opacity=".36">
          <path
            d="M13 74C30 82 48 72 60 63S82 51 90 55"
            fill="none"
            stroke="#9e88e3"
            strokeWidth="8"
          />
        </g>
        <path d="m25 70 12 6 13-7m14 13 9-7 8 4" fill="none" stroke="#cfbbfd" strokeWidth=".55" />
        <g fill="#ffe69d">
          <path {...motion("twinkle")} d="M25 66l1.2 3 3 1.2-3 1-1.2 3-1-3-3-1 3-1.2Z" />
          <path {...motion("twinkle", 1.3)} d="M72 71l1 2.7 2.8 1.3-2.8 1-1 3-1-3-2.8-1 2.8-1.3Z" />
        </g>
        <path
          {...motion("twinkle", 0.6)}
          d="M51 66.5l.7 2 2 .7-2 .7-.7 2-.8-2-2-.7 2-.7Z"
          fill="#e9dafa"
        />
        <g fill="#fff0ce">
          {(
            [
              [37, 76, 1],
              [64, 82, 1.2],
              [81, 79, 1],
              [43, 42, 1.1],
              [56, 40, 0.8],
              [34, 84, 0.9],
            ] as const
          ).map(([cx, cy, r], index) => (
            <circle key={cx} {...motion("twinkle", index * 0.45)} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        {/* A shooting star crosses the crown now and then. */}
        <g {...motion("shoot")} opacity="0">
          <path
            d="M22 37l7 2.4"
            fill="none"
            stroke="#fff4d6"
            strokeWidth=".9"
            strokeLinecap="round"
          />
          <circle cx="29" cy="39.4" r=".9" fill="#fff" />
        </g>
      </>
    ),
  },
  skin_star_soda: {
    background: "#d9f2f4",
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
    background: "#fbe4eb",
    tint: [1, 0.98, 0.94],
    wash: ["#eb5684", 0.92],
    details: (
      <g stroke="#fff0c1" strokeWidth="1.6" strokeLinecap="round">
        <path d="m28 77 1 1.9m9-6 1 2m9 4 1.1 2m11-6.7-.5 2m9 2-.8 1.8m10-8-.8 2m-24 8-.7 1.8m-14-1 1 1.8" />
      </g>
    ),
  },
  skin_star_toast: {
    background: "#f5e8d7",
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
    background: "#e2eaf5",
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
        {/* A glint runs along the gold seams. With reduced motion it waits off the path. */}
        <path
          {...motion("glint")}
          d="m14 64 16 3 4 10 11 4 2 11m-13-15-9 5-4 9m71-25-10-2-9 3-1 13-10 4-3 10m13-14 9 5"
          pathLength={100}
          fill="none"
          stroke="#fffbe8"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeDasharray="6 194"
          strokeDashoffset="6"
        />
        <path {...motion("twinkle", 1)} d={sparkle(34, 77, 2.2)} fill="#fff6cf" />
        <path {...motion("twinkle", 2.2)} d={sparkle(72, 81, 1.8)} fill="#fff6cf" />
      </>
    ),
  },
  skin_star_choco: {
    background: "#efe2dc",
    tint: [1, 0.96, 0.9],
    details: (
      <>
        {/* Chocolate coat on the crown with a few drips, kept above the eyes. */}
        <path
          d="M0 0H100V40Q95 44 90 41T80 42V49Q80 52.5 77 52.5T74 49V43Q70 40 64 42.5T52 41.5 40 43 31 41.5V47Q31 50 28.5 50T26 47V42Q22 39.5 17 42.5T0 41Z"
          fill="#6e4334"
        />
        <path
          d="M0 37Q8 40 17 38.5T31 38 52 38 64 39 80 38.5 100 37V40Q95 44 90 41T80 42Q75 39.5 70 42 64 42.5 58 41 52 41.5 46 42.5 40 43 35 42 31 41.5 26 42 22 39.5 17 42.5T0 41Z"
          fill="#8d5a45"
        />
        <path
          d="M31 37Q37 31 46 30.5"
          fill="none"
          stroke="#c49079"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity=".8"
        />
        <path d="M78.2 46v3" stroke="#c49079" strokeWidth="1.1" strokeLinecap="round" />
        <g strokeWidth="1.5" strokeLinecap="round">
          <path d="m40 35.5 2-1" stroke="#ff9fb9" />
          <path d="m52 33 .4 2.2" stroke="#9fe0d0" />
          <path d="m60 36.5 2 .9" stroke="#ffe17d" />
          <path d="m46 39 1.6-1.4" stroke="#b7a5ff" />
          <path d="m66 39.5.2-2.1" stroke="#ff9fb9" />
          <path d="m34 39.5 2 .4" stroke="#ffe17d" />
          <path d="m56 39.8 1.8-.8" stroke="#9fe0d0" />
        </g>
      </>
    ),
  },
  skin_star_pumpkin: {
    background: "#fbe6d5",
    tint: [1.02, 0.74, 0.44],
    wash: ["#d0601e", 0.42],
    details: (
      // Pumpkin ribs bow outward from the crown and avoid the face.
      <g fill="none" stroke="#c4602a" strokeWidth="1.3" strokeLinecap="round" opacity=".5">
        <path d="M40 33Q29 60 34 92M60 33Q71 60 66 92M27 48Q16 70 21 92M73 48Q84 70 79 92" />
        <path d="M50 66v26" opacity=".7" />
      </g>
    ),
  },
  skin_star_ginger: {
    background: "#f1e2d4",
    tint: [0.88, 0.62, 0.42],
    wash: ["#8f4a24", 0.35],
    details: (
      <>
        {/* White icing: a wavy line on the crown and a scalloped band at the hem. */}
        <g fill="none" stroke="#fffaf3" strokeWidth="1.6" strokeLinecap="round">
          <path d="M33 41q2.6-2.4 5.2 0t5.2 0 5.2 0 5.2 0 5.2 0 5.2 0 5.2 0" />
          <path d="M10 78q3-3.4 6 0t6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0" />
        </g>
        <g stroke="#50352f" strokeWidth=".8">
          <circle cx="50" cy="66" r="1.9" fill="#e2545f" />
          <circle cx="50" cy="72" r="1.9" fill="#6cc985" />
        </g>
        <g fill="#fffaf3">
          <circle cx="30" cy="85" r=".9" />
          <circle cx="70" cy="85" r=".9" />
        </g>
      </>
    ),
  },
  skin_star_franken: {
    background: "#e1efdc",
    tint: [0.72, 0.92, 0.66],
    wash: ["#4f8a52", 0.35],
    details: (
      <>
        {/* Flat-top hair with a jagged fringe, kept above the eyes. */}
        <path
          d="M0 0H100V39L88 40 84 43.5 80 40.5 74 44 68 40.5 62 44 56 40.5 50 44 44 40.5 38 44 32 40.5 26 43.5 20 40 12 39H0Z"
          fill="#3a3346"
        />
        <path d="M30 35.5h14" stroke="#5d5470" strokeWidth="1.4" strokeLinecap="round" />
        <g fill="none" stroke="#50352f" strokeWidth=".8" strokeLinecap="round">
          <path d="M57 47.2h10M59 45.6v3.2M62 45.6v3.2M65 45.6v3.2" />
          <path d="M33 77q9 3.5 18 0M36 75.6v3.4M40 76.6v3.4M44 76.8v3.4M48 76.3v3.4" />
        </g>
      </>
    ),
  },
  skin_star_mummy: {
    background: "#f2ebdc",
    tint: [1, 0.95, 0.84],
    wash: ["#a8936b", 0.3],
    details: (
      <>
        {/* Bandages leave a gap for the eyes and mouth. */}
        {["M5 37 95 41", "M5 48.5 95 44.5", "M5 70 95 64.5", "M5 74 95 81", "M5 87 95 83"].map(
          (d) => (
            <g key={d} fill="none">
              <path d={d} stroke="#cdbb97" strokeWidth="5.8" />
              <path d={d} stroke="#fbf5e6" strokeWidth="4.4" />
              <path d={d} stroke="#e6dac0" strokeWidth=".6" strokeDasharray="6 5" />
            </g>
          ),
        )}
      </>
    ),
  },
  skin_star_zombie: {
    background: "#e3ecdf",
    tint: [0.74, 0.86, 0.72],
    wash: ["#5e7a5a", 0.42],
    details: (
      <>
        <g transform="rotate(-8 62 75)">
          <rect
            x="56"
            y="70"
            width="12"
            height="10"
            rx="1"
            fill="#a7c79d"
            stroke="#50352f"
            strokeWidth=".8"
          />
          <path
            d="M57.5 69v2M61 69v2M64.5 69v2M57.5 79v2M61 79v2M64.5 79v2"
            stroke="#50352f"
            strokeWidth=".7"
            strokeLinecap="round"
          />
        </g>
        <g fill="none" stroke="#50352f" strokeWidth=".8" strokeLinecap="round">
          <path d="M31 81l9 3M33 80.4l-.5 2.6M36 81.4l-.5 2.6M39 82.4l-.5 2.6" />
        </g>
        <g transform="rotate(-25 64 40)">
          <rect
            x="59"
            y="38.2"
            width="10"
            height="3.6"
            rx="1.8"
            fill="#f2c9a0"
            stroke="#50352f"
            strokeWidth=".7"
          />
          <rect x="62.5" y="38.2" width="3" height="3.6" fill="#e3b287" />
        </g>
        <g fill="#4f6a4c" opacity=".35">
          <circle cx="38" cy="42" r="1.4" />
          <circle cx="73" cy="86" r="1.8" />
          <circle cx="24" cy="70" r="1.1" />
        </g>
      </>
    ),
  },
  skin_star_ghost: {
    background: "#ece8f8",
    tint: [0.93, 0.96, 1.06],
    wash: ["#9d8fe0", 0.5],
    details: (
      <>
        <path
          d="M10 80Q30 74 50 80T90 80"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          opacity=".55"
        />
        <g fill="#fff">
          <path d="M28 70l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6ZM71 74l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5Z" />
          <circle cx="50" cy="86" r=".9" />
          <circle cx="62" cy="83" r=".7" />
        </g>
      </>
    ),
  },
  skin_star_diamond: {
    background: "#e6ecf8",
    tint: [0.94, 0.96, 1.03],
    wash: ["#7f93bd", 0.42],
    gem: gems.diamond,
    details: (pose) => <GemFacets gem={gems.diamond} pose={pose} />,
  },
  skin_star_amethyst: {
    background: "#eae0f8",
    tint: [0.8, 0.62, 1.02],
    wash: ["#5b23b0", 0.6],
    gem: gems.amethyst,
    details: (pose) => <GemFacets gem={gems.amethyst} pose={pose} />,
  },
  skin_star_sapphire: {
    background: "#dfe9fa",
    tint: [0.6, 0.74, 1.04],
    wash: ["#163a9e", 0.6],
    gem: gems.sapphire,
    details: (pose) => <GemFacets gem={gems.sapphire} pose={pose} />,
  },
  skin_star_ruby: {
    background: "#f8dfe6",
    tint: [0.9, 0.26, 0.36],
    wash: ["#7a0626", 0.75],
    gem: gems.ruby,
    details: (pose) => <GemFacets gem={gems.ruby} pose={pose} />,
  },
  skin_star_peach: {
    background: "#fbe4dc",
    tint: [1.04, 0.8, 0.72],
    wash: ["#ff8f73", 0.32],
    details: (
      <>
        {/* The peach's seam runs down from the crown and fades above the eyes. */}
        <path
          d="M51 33Q47 40 49.5 47"
          fill="none"
          stroke="#e8846f"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity=".55"
        />
        <ellipse cx="37" cy="43" rx="5" ry="3" fill="#fff" opacity=".3" />
        <ellipse cx="34" cy="74" rx="8" ry="5" fill="#ffd2c4" opacity=".45" />
      </>
    ),
  },
  skin_star_milktea: {
    background: "#f2e6d8",
    tint: [0.98, 0.85, 0.7],
    wash: ["#9c6b45", 0.42],
    details: (
      <>
        <path
          d="M14 70Q30 64 46 70T86 68"
          fill="none"
          stroke="#fff6ea"
          strokeWidth="1.6"
          opacity=".55"
        />
        {/* Tapioca pearls settle in the feet. */}
        {(
          [
            [22, 86],
            [30, 89],
            [38, 87],
            [47, 90],
            [55, 88],
            [63, 90],
            [71, 87],
            [79, 86],
            [34, 83],
            [60, 84],
          ] as const
        ).map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="2.2" fill="#4a2c22" />
            <circle cx={cx - 0.7} cy={cy - 0.7} r=".6" fill="#fff" opacity=".7" />
          </g>
        ))}
      </>
    ),
  },
  skin_star_goldfish: {
    background: "#e0f0f8",
    tint: [0.86, 0.96, 1.04],
    wash: ["#2f8fd0", 0.35],
    details: (
      <>
        {/* Water fills the bowl below the mouth; two goldfish swim inside it. */}
        <g {...motion("wave")}>
          <path d={`${wave(67)}V100H-40Z`} fill="#4fb0e6" opacity=".4" />
          <path d={wave(67)} fill="none" stroke="#e6fbff" strokeWidth="1" />
        </g>
        <g fill="none" stroke="#3f9a63" strokeWidth="2" strokeLinecap="round">
          <path {...motion("sway")} d="M22 92q-3-5 0-9t0-9" />
          <path {...motion("sway", 1.4)} d="M79 92q3-4 0-8t0-7" />
        </g>
        <g stroke="none">
          <circle cx="30" cy="91" r="1.6" fill="#f5c78a" />
          <circle cx="35" cy="91.5" r="1.3" fill="#c6d4e8" />
          <circle cx="66" cy="91.5" r="1.5" fill="#f4a3b6" />
          <circle cx="71" cy="91" r="1.2" fill="#f5c78a" />
        </g>
        <Goldfish x={31} y={77} size={1.3} />
        <Goldfish x={67} y={84} size={1} back />
        <g fill="none" stroke="#f2fdff" strokeWidth=".6">
          <circle {...motion("bubble")} cx="42" cy="78" r=".9" />
          <circle {...motion("bubble", 1)} cx="58" cy="82" r=".7" />
          <circle {...motion("bubble", 2)} cx="47" cy="85" r="1" />
        </g>
        <g fill="none" stroke="#fff" strokeLinecap="round" opacity=".75">
          <path d="M22 58Q21 44 32 36" strokeWidth="2.2" />
          <path d="M71 37q4 2 6.5 6" strokeWidth="1.2" />
        </g>
      </>
    ),
  },
  skin_star_snowdome: {
    background: "#e5eff9",
    tint: [0.72, 0.84, 1.03],
    wash: ["#3f6fc4", 0.5],
    details: (
      <>
        {/* A tiny snowy village sits on a red stand, under drifting snow. */}
        <path d="M0 78Q20 72 40 76T80 75 100 77V100H0Z" fill="#fdfdff" />
        <path d="M14 81q12-3 24 0m24-1q10-3 22 0" fill="none" stroke="#d6e2f2" strokeWidth=".9" />
        <g stroke="#50352f" strokeWidth=".6" strokeLinejoin="round" transform="translate(0 -2.5)">
          <rect x="27.2" y="76" width="1.8" height="3" fill="#9a6a4a" />
          <path d="M22.6 77 28.1 70.5 33.6 77Z" fill="#4fa36b" />
          <path d="M23.8 73 28.1 67.4 32.4 73Z" fill="#5cb878" />
          <rect x="66" y="73" width="9" height="6.5" fill="#e2545f" />
          <path d="M64.5 73.6 70.5 68.4 76.5 73.6Z" fill="#fffaf3" />
          <rect x="69.2" y="75.2" width="2.6" height="2.4" fill="#ffe08a" />
        </g>
        <path {...motion("twinkle")} d={sparkle(28.1, 64.1, 1.4)} fill="#ffe284" />
        <path d="M0 84.5Q50 89 100 84.5V100H0Z" fill="#b8434b" />
        <path d="M0 85.2Q50 89.7 100 85.2" fill="none" stroke="#ffd77a" strokeWidth=".9" />
        <g fill="#fff">
          {flakes.map(([cx, cy, r, delay]) => (
            <circle key={`${cx}-${cy}`} {...motion("flake", delay)} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g fill="none" stroke="#fff" strokeLinecap="round" opacity=".7">
          <path d="M21 60Q20 45 32 36" strokeWidth="2" />
          <path d="M72 38q4 2 6 6" strokeWidth="1.2" />
        </g>
      </>
    ),
  },
};

export function StarSkinFinish({
  skin,
  maskId,
  gradientId,
  pose,
}: {
  skin: Skin;
  maskId: string;
  gradientId: string;
  pose: StarPose;
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
      {typeof skin.details === "function" ? skin.details(pose) : skin.details}
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
