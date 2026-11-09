import { motion, sparkle } from "./star-motion";
import type { StarExpression } from "./star-parts";

// Gem skins cut the body into facets that follow its form: a dome for the belly, a small
// dome for each of the six feet along the hem, and one for each hand. Shapes are measured
// from the body art, so each pose has its own layout.
export type StarPose = StarExpression | "walk";
// Angle tilts the dome clockwise, like SVG rotate().
type Dome = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lons: number;
  lats: number;
  angle?: number;
};
type Layout = { body: Dome; feet: Dome[]; arms: Dome[]; face: [number, number] };

const small = (cx: number, cy: number, rx: number, ry: number, angle = 0): Dome => ({
  cx,
  cy,
  rx,
  ry,
  angle,
  lons: 8,
  lats: 4,
});
// Hands in the body art mirror each other across the center line.
const pair = (cx: number, cy: number, rx: number, ry: number, angle: number) => [
  small(cx, cy, rx, ry, angle),
  small(100 - cx, cy, rx, ry, -angle),
];
const standingBody: Dome = { cx: 50, cy: 64, rx: 35, ry: 29, lons: 18, lats: 9 };
const standingFeet = [
  small(21, 79.5, 6, 7),
  small(31.5, 83, 6.2, 6.5),
  small(43.5, 85, 6.6, 6.5),
  small(56.5, 85, 6.6, 6.5),
  small(68.5, 83, 6.2, 6.5),
  small(79, 79.5, 6, 7),
];
const standing = (arms: Dome[]): Layout => ({
  body: standingBody,
  feet: standingFeet,
  arms,
  face: [50, 55],
});
const layouts: Record<StarPose, Layout> = {
  idle: standing(pair(27, 67, 5.4, 7.3, -35)),
  happy: standing(pair(28, 67.5, 5.6, 7.6, -45)),
  cry: standing(pair(31, 72, 6.4, 5.4, 20)),
  // The learning pose draws its hands separately; see GemHand.
  proud: standing([]),
  // Walking hands move every frame, so only the belly and feet are cut.
  walk: {
    body: { cx: 49, cy: 64, rx: 31, ry: 28, lons: 18, lats: 9 },
    feet: [
      small(23.5, 79, 5.5, 6.5),
      small(33.5, 83.5, 5.8, 6.2),
      small(45, 85.5, 6, 6.2),
      small(56.5, 85.5, 6, 6.2),
      small(66.5, 83.5, 5.8, 6.2),
      small(74, 78.5, 5.5, 6.5),
    ],
    arms: [],
    face: [57, 55],
  },
};

const tilt = (20 * Math.PI) / 180;
// Upper left and toward the viewer.
const light = [-0.45, 0.55, 0.7];
const noise = (a: number, b: number) => {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

type Facet = { d: string; shade: number; roll: number; glint: number };

function inside(dome: Dome, x: number, y: number, margin = 1) {
  const a = ((dome.angle ?? 0) * Math.PI) / 180;
  const dx = x - dome.cx;
  const dy = y - dome.cy;
  const u = dx * Math.cos(a) + dy * Math.sin(a);
  const v = -dx * Math.sin(a) + dy * Math.cos(a);
  return (u / dome.rx) ** 2 + (v / dome.ry) ** 2 < margin;
}

// Facets of an ellipsoid seen slightly from above, so rows curve like a real dome.
function domeFacets(dome: Dome, seed: number, keep: (x: number, y: number) => boolean) {
  const a = ((dome.angle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const sphere = (lon: number, lat: number) => {
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
  };
  // Local x/y (y up) to the stage, turned by the dome's angle.
  const place = ([x, y]: number[]): [number, number] => {
    const u = dome.rx * x;
    const v = -dome.ry * y;
    return [dome.cx + u * cos - v * sin, dome.cy + u * sin + v * cos];
  };
  const screen = (p: number[]) =>
    place(p)
      .map((n) => n.toFixed(2))
      .join(" ");
  const facets: Facet[] = [];
  for (let row = 0; row < dome.lats; row++) {
    for (let col = 0; col < dome.lons; col++) {
      const lat = (n: number) => -Math.PI / 2 + (n * Math.PI) / dome.lats;
      const lon = (n: number) => -Math.PI + (n * 2 * Math.PI) / dome.lons;
      const corners = [
        sphere(lon(col), lat(row + 1)),
        sphere(lon(col + 1), lat(row + 1)),
        sphere(lon(col + 1), lat(row)),
        sphere(lon(col), lat(row)),
      ];
      const center = sphere(lon(col + 0.5), lat(row + 0.5));
      if (center[2] < 0.05 || !keep(...place(center))) continue;
      // Turn the normal with the dome so light still comes from the upper left.
      const nx = center[0] * cos + center[1] * sin;
      const ny = -center[0] * sin + center[1] * cos;
      const facing = light[0] * nx + light[1] * ny + light[2] * center[2];
      const jitter = noise(row + seed, col * 1.7 + seed) - 0.5;
      facets.push({
        d: `M${corners.map(screen).join("L")}Z`,
        shade: 0.5 + 0.42 * (facing - 0.45) + jitter * 0.7,
        roll: noise(col + 7 + seed, row * 3),
        glint: noise(col * 3 + seed, row + 11),
      });
    }
  }
  return facets;
}

function layoutFacets(layout: Layout) {
  // Hands sit over the belly and feet; the belly also stops where the feet begin,
  // so each part keeps its own rounded outline.
  const covered = (x: number, y: number) =>
    layout.arms.some((dome) => inside(dome, x, y)) ||
    layout.feet.some((dome) => inside(dome, x, y, 1.1));
  const body = domeFacets(layout.body, 0, (x, y) => !covered(x, y));
  const feet = layout.feet.flatMap((dome, i) =>
    domeFacets(dome, 20 + i * 5, (x, y) => !layout.arms.some((arm) => inside(arm, x, y))),
  );
  const arms = layout.arms.flatMap((dome, i) => domeFacets(dome, 60 + i * 5, () => true));
  return [...body, ...feet, ...arms];
}
const facetSets = Object.fromEntries(
  Object.entries(layouts).map(([pose, layout]) => [pose, layoutFacets(layout)]),
) as Record<StarPose, Facet[]>;

export type Gem = { dark: string; fire: number };
export const gems = {
  diamond: { dark: "#2e3a58", fire: 0.8 },
  amethyst: { dark: "#2a0a66", fire: 0.92 },
  sapphire: { dark: "#081c64", fire: 0.93 },
  ruby: { dark: "#5c0420", fire: 0.93 },
} satisfies Record<string, Gem>;
const rainbow = ["#ff9fd0", "#9fe8ff", "#fff09a", "#b9a6ff"];

function paint(gem: Gem, facet: Facet, calm: number) {
  if (facet.roll > gem.fire) {
    return { fill: rainbow[Math.floor(facet.roll * 40) % rainbow.length], opacity: 0.42 * calm };
  }
  const bright = facet.shade > 0.5;
  const strength = bright ? (facet.shade - 0.5) * 1.25 : (0.5 - facet.shade) * 1.05;
  return { fill: bright ? "#fff" : gem.dark, opacity: Math.min(strength, 0.6) * calm };
}

function Facets({
  gem,
  facets,
  calm = () => 1,
}: {
  gem: Gem;
  facets: Facet[];
  calm?: (x: number, y: number) => number;
}) {
  return (
    <>
      {facets.map((facet) => {
        const [x, y] = facet.d.slice(1).split(/[ L]/).map(Number);
        const { fill, opacity } = paint(gem, facet, calm(x, y));
        return <path key={facet.d} d={facet.d} fill={fill} opacity={+opacity.toFixed(2)} />;
      })}
      <path
        d={facets.map((facet) => facet.d).join("")}
        fill="none"
        stroke="#fff"
        strokeWidth=".3"
        strokeLinejoin="round"
        opacity=".42"
      />
      {/* A few facets catch the light in turn. */}
      {facets
        .filter((facet) => facet.glint > 0.9)
        .map((facet) => (
          <path
            key={facet.d}
            {...motion("facet", facet.roll * 4)}
            d={facet.d}
            fill="#fff"
            opacity="0"
          />
        ))}
    </>
  );
}

export function GemFacets({ gem, pose }: { gem: Gem; pose: StarPose }) {
  const [faceX, faceY] = layouts[pose].face;
  // Quieter facets behind the face keep the expression readable.
  const calm = (x: number, y: number) =>
    ((x - faceX) / 22) ** 2 + ((y - faceY) / 11) ** 2 < 1 ? 0.45 : 1;
  return (
    <>
      <Facets gem={gem} facets={facetSets[pose]} calm={calm} />
      <g fill="#fff">
        <path {...motion("twinkle")} d={sparkle(30, 46, 2.4)} />
        <path {...motion("twinkle", 1.1)} d={sparkle(71, 50, 1.9)} />
        <path {...motion("twinkle", 1.9)} d={sparkle(41, 80, 1.6)} />
        <path {...motion("twinkle", 0.6)} d={sparkle(60, 38, 1.4)} />
      </g>
    </>
  );
}

const handFacets = new Map<string, Facet[]>();
// Facets for a hand drawn as its own ellipse, such as when holding a book.
export function GemHand({
  gem,
  cx,
  cy,
  rx,
  ry,
  angle,
}: {
  gem: Gem;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle: number;
}) {
  const key = [cx, cy, rx, ry, angle].join();
  let facets = handFacets.get(key);
  if (!facets) {
    facets = domeFacets(small(cx, cy, rx, ry, angle), 90 + cx, () => true);
    handFacets.set(key, facets);
  }
  return <Facets gem={gem} facets={facets} />;
}
