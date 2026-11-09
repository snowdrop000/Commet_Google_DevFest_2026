import { useEffect, useId, useState } from "react";
import { browser } from "wxt/browser";
import type { Profile } from "../../shared/game";
import type { PetAnimation } from "./pet-animation";
import { starAssets } from "./star-assets";
import { StarBadge, StarHat, StarProp } from "./star-accessories";
import { GemHand } from "./star-gems";
import { outline, StarEffects, StarFace, StarOrnaments } from "./star-parts";
import { StarPattern } from "./star-patterns";
import { StarPixelBody, StarSkinFinish, starSkins } from "./star-skins";
import "./star-reading.css";
import "./star-motion.css";

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
  const squash = 0.89;
  const transform = [
    flipped && "translate(100 0) scale(-1 1)",
    `translate(0 ${ground}) scale(1 ${squash}) translate(0 ${-ground})`,
  ]
    .filter(Boolean)
    .join(" ");
  const { skin, hat, badge, eyes, mouth, head, prop, pattern } = profile.equippedItems;
  const skinStyle = starSkins[skin];
  const slopes = skinStyle?.tint;
  const hasFinish = Boolean(skinStyle?.wash || skinStyle?.details);
  const pixel = skin === "skin_star_pixel";
  const id = useId();
  const bodyId = `${id}-body`;
  const filterId = `${id}-tint`;
  const maskId = `${id}-pattern`;
  const gradientId = `${id}-skin-wash`;
  const faceX = walking ? 57 : peeking ? 51 : 50;
  const faceY = crown + (expression === "proud" ? 24.5 : 21.7) + (peeking ? 0.35 : 0);
  const learning = expression === "proud";
  const holding = learning && prop !== "prop_none";
  const holdingBook = holding && prop === "prop_book";
  const handY = holding ? 76.5 : 78;
  // SVG props are narrower than the book, so their hands sit a little closer together.
  const handInset = holding && !holdingBook ? 2 : 0;
  // Tops lean inward so the hands grip the sides of what they hold.
  const hands = [
    [33 + handInset, 18],
    [67 - handInset, -18],
  ];
  // The pin rides on the chest, below the right cheek. Measured from the crown, so it bobs
  // with each walking frame; the thinking pose moves it up to the shoulder, clear of the hands.
  const badgeX = walking ? 63 : learning ? 74 : 61;
  const badgeY = crown + (learning ? 36 : walking ? 44 : 45);
  const hasPattern = pattern !== "pattern_none";
  const filter = slopes ? `url(#${filterId})` : undefined;

  return (
    <div
      className="commet-pet commet-pet--star"
      data-mood={mood}
      data-action={animation.action}
      data-frame={walking ? step : expression}
      data-skin={skin}
      data-direction={flipped ? "left" : "right"}
      aria-label={profile.name}
    >
      <svg className="commet-star-stage" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <g id={bodyId}>
            {pixel ? (
              <StarPixelBody
                crown={crown}
                ground={ground}
                walking={walking}
                step={step}
                expression={expression}
              />
            ) : (
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
            )}
          </g>
          {hasFinish && (
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
          <g className="commet-star-pose">
            <StarOrnaments id={head} crown={crown} walking={walking} pixel={pixel} />
            <g data-layer="body" filter={filter}>
              <use href={`#${bodyId}`} />
            </g>
            {skinStyle && hasFinish && (
              <StarSkinFinish
                skin={skinStyle}
                maskId={maskId}
                gradientId={gradientId}
                pose={walking ? "walk" : expression}
              />
            )}
            {hasPattern && (
              <StarPattern
                id={pattern}
                bodyId={bodyId}
                uid={id}
                pose={walking ? "walk" : expression}
                crown={crown}
                face={[faceX, faceY]}
              />
            )}
            <StarFace
              expression={expression}
              x={faceX}
              y={faceY}
              walking={walking}
              reading={peeking && expression === "idle"}
              eyes={eyes}
              mouth={mouth}
              pixel={pixel}
              ink={skinStyle?.ink}
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
            {holding && !holdingBook && <StarProp id={prop} outline={outline} />}
            {learning && (
              <g
                data-layer="hands"
                fill="#fae9ed"
                stroke={outline}
                strokeWidth="1.03"
                filter={filter}
              >
                {hands.map(([cx, angle]) => (
                  <ellipse
                    key={cx}
                    cx={cx}
                    cy={handY}
                    rx="4.7"
                    ry="6.1"
                    transform={`rotate(${angle} ${cx} ${handY})`}
                  />
                ))}
              </g>
            )}
            {learning && skinStyle?.gem && (
              <g data-layer="hand-facets">
                {/* Slightly inside the outline, so the hand keeps its dark edge. */}
                {hands.map(([cx, angle]) => (
                  <GemHand
                    key={cx}
                    gem={skinStyle.gem!}
                    cx={cx}
                    cy={handY}
                    rx={4.2}
                    ry={5.6}
                    angle={angle}
                  />
                ))}
              </g>
            )}
            <StarBadge
              id={badge}
              x={badgeX}
              y={badgeY}
              flipped={flipped}
              walking={walking}
              step={step}
              squash={squash}
              uid={id}
              outline={outline}
            />
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
            <StarHat id={hat} crown={crown} outline={outline} />
          </g>
        </g>
      </svg>
      {peeking && expression === "idle" && (
        <svg className="commet-thought" viewBox="0 0 48 40" aria-hidden="true" focusable="false">
          <g transform={flipped ? undefined : "translate(48 0) scale(-1 1)"}>
            <g fill="#fffaf7" stroke="#d6c5cc" strokeWidth="1.1" strokeLinejoin="round">
              <path d="M13 25C6 26 1 21 4 16 1 10 5 5 11 6 14 0 22 0 26 5 32 2 39 6 38 12 46 11 49 21 42 25 39 28 34 28 30 26 25 30 17 29 13 25Z" />
              <circle cx="11" cy="32" r="2.2" />
              <circle cx="6.5" cy="37.5" r="1.25" />
            </g>
            <g fill="#9d7e90">
              {[18, 25, 32].map((cx) => (
                <circle key={cx} className="commet-thought-dot" cx={cx} cy="16" r="1.45" />
              ))}
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
