import { useEffect, useId, useState } from "react";
import { browser } from "wxt/browser";
import { ITEM_CATALOG, type Profile } from "../../shared/game";
import type { PetAnimation } from "./pet-animation";
import { starAssets } from "./star-assets";
import { outline, StarEffects, StarFace, StarOrnaments, StarPattern } from "./star-parts";

type Rect = readonly [x: number, y: number, width: number, height: number];
type Frame = { crop: Rect; center: number; floor: number; crown: number };

// Coordinates are in the exported image. Center/floor register the drawings to
// one stage, while crown positions the same hat on every drawing.
const expressions: Record<"idle" | "happy" | "cry" | "proud", Frame> = {
  idle: { crop: [70, 68, 500, 486], center: 326, floor: 542, crown: 135 },
  happy: { crop: [641, 68, 554, 486], center: 917, floor: 542, crown: 135 },
  cry: { crop: [65, 682, 506, 496], center: 321, floor: 1170, crown: 751 },
  proud: { crop: [596, 681, 624, 501], center: 920, floor: 1173, crown: 751 },
};
const steps: Frame[] = [
  { crop: [68, 33, 380, 430], center: 270, floor: 453, crown: 107 },
  { crop: [577, 43, 379, 423], center: 777, floor: 455, crown: 116 },
  { crop: [1089, 33, 379, 426], center: 1291, floor: 449, crown: 107 },
  { crop: [68, 544, 380, 431], center: 271, floor: 966, crown: 619 },
  { crop: [577, 554, 379, 423], center: 777, floor: 967, crown: 627 },
  { crop: [1090, 544, 379, 428], center: 1291, floor: 963, crown: 618 },
];

function useStep(walking: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!walking) return;
    setStep(0);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    function update() {
      clearInterval(timer);
      if (reduced.matches) setStep(0);
      if (!reduced.matches && !document.hidden) {
        timer = setInterval(() => setStep((current) => (current + 1) % steps.length), 100);
      }
    }
    update();
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
    };
  }, [walking]);
  return step;
}

function Art({
  asset,
  imageSize,
  crop,
  placement,
}: {
  asset: (typeof starAssets)[keyof typeof starAssets];
  imageSize: readonly [number, number];
  crop: Rect;
  placement: Rect;
}) {
  const [x, y, width, height] = placement;
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={crop.join(" ")}
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <image
        href={browser.runtime.getURL(`/${asset}`)}
        width={imageSize[0]}
        height={imageSize[1]}
      />
    </svg>
  );
}

const tint = {
  skin_star_mint: [0.66, 0.98, 0.86],
  skin_star_night: [0.58, 0.61, 0.92],
} as const;
function skinTint(id: string) {
  return id === "skin_star_mint" || id === "skin_star_night" ? tint[id] : undefined;
}

export function PreviousStanding() {
  const { crop, center, floor } = expressions.idle;
  const [x, y, width, height] = crop;
  const scale = 0.147;
  return (
    <svg className="commet-star-previous" viewBox="0 0 100 100" role="img" aria-label="旧ノーマル">
      <ellipse cx="50" cy="93" rx="32" ry="3" fill="#8a79ac" opacity=".24" />
      <Art
        asset={starAssets.previous}
        imageSize={[1254, 1254]}
        crop={crop}
        placement={[
          50 + (x - center) * scale,
          92 + (y - floor) * scale,
          width * scale,
          height * scale,
        ]}
      />
    </svg>
  );
}

export function StarPet({
  profile,
  mood,
  animation,
}: {
  profile: Profile;
  mood: Profile["mood"];
  animation: PetAnimation;
}) {
  const walking = animation.action === "walk";
  const peeking = animation.action === "peek";
  const step = useStep(walking);
  const expression = walking
    ? "idle"
    : mood === "sad"
      ? "cry"
      : mood === "levelup"
        ? "proud"
        : mood;
  const frame = walking ? steps[step] : expressions[expression];
  const scale = walking ? 0.169 : 0.147;
  const [x, y, width, height] = frame.crop;
  const ground = 92;
  const crown = ground + (frame.crown - frame.floor) * scale;
  const flipped = (walking || peeking) && animation.direction === "left";
  const transform = [
    flipped && "translate(100 0) scale(-1 1)",
    peeking && "rotate(8 50 90)",
    `translate(0 ${ground}) scale(1 0.89) translate(0 ${-ground})`,
  ]
    .filter(Boolean)
    .join(" ");
  const { skin, hat, badge, eyes, mouth, head, prop, pattern } = profile.equippedItems;
  const slopes = skinTint(skin);
  const id = useId();
  const bodyId = `${id}-body`;
  const filterId = `${id}-tint`;
  const maskId = `${id}-pattern`;
  const faceX = walking ? 57 : 50;
  const faceY = crown + (expression === "proud" ? 24.5 : 21.7);
  const learning = expression === "proud";
  const holdingBook = learning && prop === "prop_book";
  const filter = slopes ? `url(#${filterId})` : undefined;

  return (
    <div
      className="commet-pet commet-pet--star"
      data-mood={mood}
      data-action={animation.action}
      data-frame={walking ? step : expression}
      data-skin={skin}
      data-direction={flipped ? "left" : "right"}
      aria-label="ほしもち"
    >
      <svg className="commet-star-stage" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <g id={bodyId}>
            <Art
              asset={walking ? starAssets.walk : starAssets.poses}
              imageSize={walking ? [1536, 1024] : [1254, 1254]}
              crop={frame.crop}
              placement={[
                50 + (x - frame.center) * scale,
                ground + (y - frame.floor) * scale,
                width * scale,
                height * scale,
              ]}
            />
          </g>
          {pattern === "pattern_stars" && (
            <mask
              id={maskId}
              x="0"
              y="0"
              width="100"
              height="100"
              maskUnits="userSpaceOnUse"
              style={{ maskType: "alpha" }}
            >
              <use href={`#${bodyId}`} />
            </mask>
          )}
          {slopes && (
            <filter id={filterId} colorInterpolationFilters="sRGB">
              {/* Only the body and hand layers receive the skin tint. */}
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                result="bodyMask"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 6 1 0 -8.45"
              />
              <feComponentTransfer in="SourceGraphic" result="colored">
                <feFuncR type="linear" slope={slopes[0]} />
                <feFuncG type="linear" slope={slopes[1]} />
                <feFuncB type="linear" slope={slopes[2]} />
              </feComponentTransfer>
              <feComposite in="colored" in2="bodyMask" operator="in" result="tinted" />
              <feBlend in="tinted" in2="SourceGraphic" mode="normal" />
            </filter>
          )}
        </defs>
        <ellipse cx="50" cy="93" rx="32" ry="3" fill="#8a79ac" opacity=".24" />
        <g transform={transform}>
          <StarOrnaments id={head} crown={crown} walking={walking} />
          <g data-layer="body" filter={filter}>
            <use href={`#${bodyId}`} />
          </g>
          {pattern === "pattern_stars" && <StarPattern maskId={maskId} />}
          <StarFace
            expression={expression}
            x={faceX}
            y={faceY}
            walking={walking}
            eyes={eyes}
            mouth={mouth}
          />
          <StarEffects expression={expression} x={faceX} y={faceY} crown={crown} />
          {holdingBook && (
            <g data-layer="prop" data-part={prop}>
              <Art
                asset={starAssets.book}
                imageSize={[1536, 1024]}
                crop={[240, 157, 1055, 740]}
                placement={[30, 65, 40, 28]}
              />
            </g>
          )}
          {learning && (
            <g
              data-layer="hands"
              fill="#fae9ed"
              stroke={outline}
              strokeWidth="1.03"
              filter={filter}
            >
              <ellipse
                cx="33.5"
                cy={holdingBook ? 76 : 78}
                rx="4.4"
                ry="5.9"
                transform="rotate(-23 33.5 76)"
              />
              <ellipse
                cx="66.5"
                cy={holdingBook ? 76 : 78}
                rx="4.4"
                ry="5.9"
                transform="rotate(23 66.5 76)"
              />
            </g>
          )}
          {hat === "hat_star_beret" && (
            <g data-layer="hat" data-hat={hat}>
              <Art
                asset={starAssets.beret}
                imageSize={[1774, 887]}
                crop={[471, 239, 802, 408]}
                placement={[32, crown - 12, 36, 18.3]}
              />
            </g>
          )}
          {hat === "hat_star_pin" && (
            <g data-layer="hat" data-hat={hat}>
              <Art
                asset={starAssets.pin}
                imageSize={[1536, 1024]}
                crop={[311, 235, 920, 585]}
                placement={[59, crown + 4, 18, 11.5]}
              />
            </g>
          )}
        </g>
      </svg>
      {badge !== "badge_none" && <span className="commet-badge">{ITEM_CATALOG[badge]?.icon}</span>}
    </div>
  );
}
