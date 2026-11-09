import type { ReactNode } from "react";
import { inside, layouts, tilt, type StarPose } from "./star-gems";
import { heartShape, sparkle } from "./star-motion";

// Body patterns are printed on the belly as if it were a dome: each motif is placed by
// longitude and latitude, so it shrinks and turns as the surface curves away. Lighting
// and a rim fade sell the roundness, and an inner mask keeps every motif off the outline.

const rad = Math.PI / 180;
const turn = ([x, y, z]: number[]) => [
  x,
  y * Math.cos(tilt) - z * Math.sin(tilt),
  y * Math.sin(tilt) + z * Math.cos(tilt),
];

type Surface = {
  pose: StarPose;
  // Walking turns the body toward the viewer's right.
  spin: number;
  lift: number;
  face: [number, number];
};
type Spot = { x: number; y: number; z: number; matrix: number[] };

// A point on the belly dome and the local frame there: x runs east, y runs south.
function spot(surface: Surface, lonDeg: number, latDeg: number, widen = 1): Spot {
  const { body } = layouts[surface.pose];
  const lon = (lonDeg + surface.spin) * rad;
  const lat = latDeg * rad;
  const p = turn([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]);
  const east = turn([Math.cos(lon), 0, -Math.sin(lon)]);
  const north = turn([
    -Math.sin(lat) * Math.sin(lon),
    Math.cos(lat),
    -Math.sin(lat) * Math.cos(lon),
  ]);
  const rx = body.rx * widen;
  // A motif unit is about one stage unit where the belly faces the viewer.
  const unit = 32;
  return {
    x: body.cx + rx * p[0],
    y: body.cy - body.ry * p[1] + surface.lift,
    z: p[2],
    matrix: [
      (rx * east[0]) / unit,
      (-body.ry * east[1]) / unit,
      (-rx * north[0]) / unit,
      (body.ry * north[1]) / unit,
    ],
  };
}

const matrixOf = ({ x, y, matrix }: Spot, rotate = 0, scale = 1) =>
  `matrix(${[...matrix, x, y].map((n) => n.toFixed(3)).join(" ")}) rotate(${rotate}) scale(${scale})`;

// Local offsets map through the surface frame, so a footprint check follows the curve.
const offset = ({ x, y, matrix: [a, b, c, d] }: Spot, u: number, v: number) => [
  x + a * u + c * v,
  y + b * u + d * v,
];

function onBelly(surface: Surface, x: number, y: number, margin: number) {
  const { body, feet } = layouts[surface.pose];
  const local = y - surface.lift;
  // Below the hem line the body is six round feet, not one dome.
  if (local < 80 && inside(body, x, local, margin)) return true;
  return feet.some((foot) => inside(foot, x, local, margin));
}

function clearOfFace(surface: Surface, x: number, y: number, pad = 0) {
  const [fx, fy] = surface.face;
  return ((x - fx) / (17 + pad)) ** 2 + ((y - fy - 1.5) / (8.5 + pad)) ** 2 > 1;
}

// A motif fits when its whole footprint sits on the belly, off the face and the arms.
function fits(surface: Surface, at: Spot, radius: number, avoidArms: boolean) {
  if (at.z < 0.2) return false;
  const points = [
    [at.x, at.y],
    offset(at, radius, 0),
    offset(at, -radius, 0),
    offset(at, 0, radius),
    offset(at, 0, -radius),
  ];
  const { arms } = layouts[surface.pose];
  return points.every(
    ([x, y]) =>
      onBelly(surface, x, y, 0.97) &&
      clearOfFace(surface, x, y, 2.5) &&
      (!avoidArms || !arms.some((arm) => inside(arm, x, y - surface.lift, 1.25))),
  );
}

const noise = (a: number, b: number) => {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

// Scattered prints sit on a staggered longitude/latitude grid with a little jitter, so
// they read as an all-over print. Poses keep the ones that fit.
function scatter(step: number) {
  const spots: [number, number, number, number][] = [];
  // Rows stop above the hem, where the feet squash prints into slivers.
  for (let row = 0; 22 - row * step * 0.55 >= -32; row++) {
    const lat = 22 - row * step * 0.55;
    const shift = (row % 2) * step * 0.5;
    for (let lon = -90 + shift; lon <= 90; lon += step) {
      spots.push([
        lon + (noise(row, lon) - 0.5) * step * 0.3,
        lat + (noise(lon, row) - 0.5) * step * 0.2,
        0.85 + noise(row * 3, lon) * 0.35,
        (noise(lon, row * 5) - 0.5) * 36,
      ]);
    }
  }
  return spots;
}

function scattered(
  surface: Surface,
  radius: number,
  step: number,
  draw: (index: number, size: number) => ReactNode,
) {
  return scatter(step).map(([lon, lat, size, rotate], index) => {
    const at = spot(surface, lon, lat);
    if (!fits(surface, at, radius * size * 0.8, true)) return null;
    return (
      <g key={index} transform={matrixOf(at, rotate, size)}>
        {draw(index, size)}
      </g>
    );
  });
}

// A latitude band between two parallels, cut where the dome turns away.
function band(surface: Surface, top: number, bottom: number) {
  const edge = (lat: number) => {
    const reach = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat * rad) * Math.tan(tilt))));
    const limit = Math.min(100, reach / rad);
    return Array.from({ length: 25 }, (_, i) => -limit + (i * 2 * limit) / 24 - surface.spin);
  };
  const point = (lon: number, lat: number) => {
    const at = spot(surface, lon, lat, 1.12);
    return `${at.x.toFixed(2)} ${at.y.toFixed(2)}`;
  };
  const upper = edge(top).map((lon) => point(lon, top));
  const lower = edge(bottom)
    .reverse()
    .map((lon) => point(lon, bottom));
  return `M${[...upper, ...lower].join("L")}Z`;
}

const ghostShape =
  "M0-4c2.4 0 3.6 1.8 3.6 4.2v3.8l-1.2-1-1.2 1-1.2-1-1.2 1-1.2-1-1.2 1-1.2-1V.2C-3.6-2.2-2.4-4 0-4Z";
const snowflakeShape = "M0-2.6v5.2M-2.25-1.3l4.5 2.6M-2.25 1.3l4.5-2.6";

const patternInk: Record<string, { color: string; opacity: number }> = {
  pattern_star_border: { color: "#5f86cf", opacity: 0.55 },
  pattern_star_ghost: { color: "#8f7cc4", opacity: 0.6 },
  pattern_star_snow: { color: "#6fa6dc", opacity: 0.8 },
  pattern_star_heart: { color: "#e8669a", opacity: 0.58 },
  pattern_star_dots: { color: "#5fa6e2", opacity: 0.5 },
};
const defaultInk = { color: "#856bc4", opacity: 0.55 };

const mix = (from: string, to: string, amount: number) =>
  `#${[1, 3, 5]
    .map((i) => {
      const a = parseInt(from.slice(i, i + 2), 16);
      const b = parseInt(to.slice(i, i + 2), 16);
      return Math.round(a + (b - a) * amount)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;

function motifs(id: string, surface: Surface, paint: string) {
  if (id === "pattern_star_border") {
    return (
      <g fill={paint}>
        {[
          [16, 10],
          [0, -6],
          [-16, -22],
          [-32, -38],
        ].map(([top, bottom]) => (
          <path key={top} d={band(surface, top, bottom)} />
        ))}
      </g>
    );
  }
  if (id === "pattern_star_dots") {
    // Few, large, well-spaced dots. Small crowded dots and flat slivers at the rim read
    // as clusters, so dots stay round and keep off the rim. Like fabric, they run under the arms.
    const dots: ReactNode[] = [];
    for (let row = 0; row < 3; row++) {
      const lat = 14 - row * 17;
      for (let col = -4; col <= 4; col++) {
        const lon = col * 26 + (row % 2) * 13;
        const curved = spot(surface, lon, lat);
        if (curved.z < 0.45 || !fits(surface, curved, 3, false)) continue;
        // Only half the foreshortening, so dots stay round instead of flat ovals.
        const [a, b, c, d] = curved.matrix;
        const even = Math.sqrt(Math.abs(a * d - b * c));
        const at = { ...curved, matrix: [(a + even) / 2, b / 2, c / 2, (d + even) / 2] };
        dots.push(<circle key={`${row}-${col}`} r="3" transform={matrixOf(at)} />);
      }
    }
    return <g fill={paint}>{dots}</g>;
  }
  if (id === "pattern_star_heart") {
    return (
      <g fill={paint}>
        {scattered(surface, 3.4, 25, () => (
          <path d={heartShape} transform="scale(1.1)" />
        ))}
      </g>
    );
  }
  if (id === "pattern_star_ghost") {
    return scattered(surface, 4.4, 28, () => (
      <>
        <path d={ghostShape} fill={paint} />
        <circle cx="-1.2" cy="-.6" r=".55" fill="#fff" />
        <circle cx="1.2" cy="-.6" r=".55" fill="#fff" />
      </>
    ));
  }
  if (id === "pattern_star_snow") {
    return scattered(surface, 3, 24, (index) =>
      index % 3 === 2 ? (
        <circle r="1" fill={paint} />
      ) : (
        <path
          d={snowflakeShape}
          fill="none"
          stroke={paint}
          strokeWidth=".8"
          strokeLinecap="round"
          transform="scale(1.15)"
        />
      ),
    );
  }
  return (
    <g fill={paint}>
      {scattered(surface, 3.6, 23, (index) =>
        index % 3 === 1 ? <circle r="1.25" /> : <path d={sparkle(0, 0, 3.8)} />,
      )}
    </g>
  );
}

export function StarPattern({
  id,
  bodyId,
  uid,
  pose,
  crown,
  face,
}: {
  id: string;
  bodyId: string;
  uid: string;
  pose: StarPose;
  crown: number;
  face: [number, number];
}) {
  const walking = pose === "walk";
  // Walking frames bob a little; the belly follows about half of the crown's motion.
  const surface: Surface = {
    pose,
    spin: walking ? 15 : 0,
    lift: walking ? (crown - 34.1) * 0.6 : 0,
    face,
  };
  const { body } = layouts[pose];
  const ink = patternInk[id] ?? defaultInk;
  const inner = `${uid}-pattern-inner`;
  const erode = `${uid}-pattern-erode`;
  const rim = `${uid}-pattern-rim`;
  const rimFade = `${uid}-pattern-rim-fade`;
  const shade = `${uid}-pattern-shade`;
  const cx = body.cx + (walking ? 8 : 0);
  const cy = body.cy + 6 + surface.lift;
  return (
    <g data-layer="pattern" data-part={id}>
      <defs>
        {/* Only the light fill of the body: the outline and inner lines drop out. */}
        <filter
          id={erode}
          x="0"
          y="0"
          width="100"
          height="100"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.2 2.4 .4 0 -1.65"
          />
          <feMorphology operator="erode" radius=".5" />
          <feGaussianBlur stdDeviation=".3" />
        </filter>
        <mask
          id={inner}
          x="0"
          y="0"
          width="100"
          height="100"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "alpha" }}
        >
          <use href={`#${bodyId}`} filter={`url(#${erode})`} />
        </mask>
        {/* Prints fade where the belly turns away from the viewer. */}
        <radialGradient
          id={rimFade}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="1"
          gradientTransform={`translate(${cx} ${cy}) scale(${body.rx * 1.05} ${body.ry * 1.05})`}
        >
          <stop offset=".55" stopOpacity="1" />
          <stop offset=".85" stopOpacity=".55" />
          <stop offset="1" stopOpacity=".2" />
        </radialGradient>
        <mask
          id={rim}
          x="0"
          y="0"
          width="100"
          height="100"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "alpha" }}
        >
          <rect width="100" height="100" fill={`url(#${rimFade})`} />
        </mask>
        {/* Light from the upper left, matching the body art's shine. */}
        <radialGradient id={shade} gradientUnits="userSpaceOnUse" cx={cx - 15} cy={cy - 10} r="48">
          <stop offset="0" stopColor={mix(ink.color, "#ffffff", 0.35)} />
          <stop offset=".45" stopColor={ink.color} />
          <stop offset="1" stopColor={mix(ink.color, "#2a1f4a", 0.4)} />
        </radialGradient>
      </defs>
      <g mask={`url(#${inner})`}>
        <g mask={`url(#${rim})`} opacity={ink.opacity}>
          {motifs(id, surface, `url(#${shade})`)}
        </g>
      </g>
    </g>
  );
}
