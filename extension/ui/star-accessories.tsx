import type { ReactNode } from "react";
import { ITEM_CATALOG } from "../../shared/game";
import { motion, sparkle, starShape } from "./star-motion";

// Angel wing in three overlapping rows, each with a scalloped trailing edge:
// long flight feathers at the back, shorter ones over them, and small coverts at the root.
const angelWing = [
  {
    d: "M0 2C-4-6-12-13-22-16C-23-13-21.5-11.5-19.5-10.5C-22.5-9.5-22.5-6.5-19.5-5.5C-21.5-3.5-20.5-.5-16.5-.3C-17.5 2-15 4-11 3.2C-11 5.5-8 6.5-5 5.2Z",
    fill: "#f3eefa",
  },
  {
    d: "M0 2C-3-4-9-9-15.5-11C-16.5-8.5-14.8-7-12.8-6.4C-14.8-4.6-13.8-2-10.6-1.8C-10.8.6-8.4 2.2-5.4 1.6C-5.4 3.6-3 4.8 0 4.2Z",
    fill: "#fffaf5",
  },
  {
    d: "M.5 2C-1.5-2-4.5-4.8-8-6C-9-3.8-7.8-2.2-6-1.8C-6.4.2-4.4 1.8-2 1.6C-1.6 3 0 3.6 1 3.2Z",
    fill: "#fff",
  },
];
// Shafts from the root toward each scallop of the flight feathers.
const angelShafts = "M-4-3-19-12M-5-1.5-20-7.5M-5 0-18-2M-4 1.5-13 2.2";

export const starEars: Partial<Record<string, ReactNode>> = {
  head_star_bunny: (
    <>
      <path d="M-4 5C-8 3-12-7-13-14s1-10 4-10c5 0 7 8 8 14L2 3Z" fill="#fff0eb" />
      <path d="M-4 .5c-3-3-7-15-6-19 2-1 5 7 6 14Z" fill="#f2a5bc" stroke="none" />
    </>
  ),
  head_star_cat: (
    <>
      <path d="M-9 3c-2-3-5-14-4-18 5 0 12 6 16 14L0 5Z" fill="#f8d6b0" />
      <path d="M-7 0c-1.7-3-3-8-3-10 3 1 6 4 8 8Z" fill="#eb98aa" stroke="none" />
    </>
  ),
  head_star_cloud: (
    <>
      <path
        d="M-7 3c-5-1-8-4-7-7 .4-2 2-3 4-3-1-4 2-7 5-7s5 2 6 4c4-1 7 2 6 5-.5 4-6 7-10 8Z"
        fill="#f6f8ff"
      />
      <path
        d="M-11-2c4 1.8 7 1.4 9-1C1-2 4-4 5-6c1 3-2 5.5-5 7L-6 3Z"
        fill="#ccd6f0"
        stroke="none"
      />
      <path d="M-8-8q1-3 4-3" fill="none" stroke="#fff" strokeLinecap="round" />
    </>
  ),
  head_star_sprout: (
    <>
      <path d="M-2 5q-2-8-6-13" fill="none" stroke="#537a59" strokeWidth="2" />
      <path d="M-6-6c-5 1-9-3-11-10 6-1 11 2 12 7C-4-15 0-17 5-18c1 7-3 13-11 12Z" fill="#a9d687" />
      <path d="m-6-7-7-6m7 6 8-8" fill="none" stroke="#659e65" strokeLinecap="round" />
    </>
  ),
  head_star_ice: (
    <>
      <path d="M-5 5-13-5l-1-12 7-4 9 8 3 13Z" fill="#9ce1f5" />
      <path d="m-13-5 7-4-1-12 9 8-8 4 1 14Z" fill="#d8fbff" stroke="none" />
      <path d="m-13-5 7-4-1-12m1 12 8-4m-8 4 1 14" fill="none" stroke="#5db7d3" strokeWidth=".7" />
      <path d="m-10-15 .6 3 2.8.8-2.7.7-.7 2.7-.7-2.7-2.4-.7 2.4-.8Z" fill="#fff" stroke="none" />
    </>
  ),
  head_star_antler: (
    <>
      {/* Drawn twice: a wide stroke in the outline color, then the antler color inside it. */}
      <path
        d="M-2 5Q-5-3-7-13M-5.6-6Q-10-7-14-12M-7-13Q-7-18-3-21M-7-13q-3-3-6-7"
        fill="none"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M-2 5Q-5-3-7-13M-5.6-6Q-10-7-14-12M-7-13Q-7-18-3-21M-7-13q-3-3-6-7"
        fill="none"
        stroke="#c99a6a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M-4-1q-1.5-5-2.4-9"
        fill="none"
        stroke="#e8c79c"
        strokeWidth=".8"
        strokeLinecap="round"
      />
    </>
  ),
  head_star_bat: (
    <g transform="scale(1.3)" strokeWidth=".85">
      <path d="M1 2Q-6-9-17-10Q-14-6-16-3Q-12-4-10-1Q-7-2-5 3Q-2 1 1 3Z" fill="#5b4a7a" />
      <path
        d="M-1 1-13-7.5M-3.5 2.2-10.5-2.5"
        fill="none"
        stroke="#8a76ad"
        strokeWidth=".7"
        strokeLinecap="round"
      />
    </g>
  ),
  head_star_holly: (
    <>
      {/* Two spiky leaves from one path; the second is turned upward and a bit smaller. */}
      {[undefined, "rotate(52) scale(.85)"].map((transform) => (
        <g key={transform ?? "base"} transform={transform}>
          <path
            d="M0 2-1.4-3.4-4.4-3.6-5.6-6.4-8.6-6.6-9.8-9.4-14-8-14-3.6-11-3.4-9.8-.6-6.8-.4-5.6 2.4Z"
            fill="#4fa36b"
          />
          <path d="M-1 1.5-12-7" fill="none" stroke="#2f7a4b" strokeWidth=".6" />
        </g>
      ))}
      <g fill="#e2545f">
        <circle cx="-1" cy="-.5" r="2.1" />
        <circle cx="2.2" cy="1.3" r="1.9" />
        <circle cx="-2.6" cy="2.6" r="1.8" />
      </g>
      <g fill="#fff" stroke="none">
        <circle cx="-1.7" cy="-1.2" r=".55" />
        <circle cx="1.6" cy=".7" r=".5" />
      </g>
    </>
  ),
  head_star_bolt: (
    // Ornaments sit behind the body, so only the outer end of the bolt shows at the temple.
    <>
      <rect x="-10.5" y="12.4" width="10" height="3.6" rx=".8" fill="#b8c0c8" />
      <rect x="-13.5" y="10.6" width="3.6" height="7.2" rx="1" fill="#9aa3ad" />
      <path d="M-12.6 12v4.4" fill="none" stroke="#e3e8ee" strokeWidth=".7" strokeLinecap="round" />
    </>
  ),
  head_star_angel: (
    <g transform="scale(1.1)" strokeWidth=".85">
      {/* The whole wing flaps from where it meets the head. */}
      <g {...motion("flap")}>
        <path {...angelWing[0]} />
        <path d={angelShafts} fill="none" stroke="#d6cbe8" strokeWidth=".5" strokeLinecap="round" />
        <path {...angelWing[1]} />
        <path {...angelWing[2]} />
      </g>
      <path {...motion("twinkle", 0.8)} d={sparkle(-21, -19, 1.7)} fill="#ffe9a0" stroke="none" />
    </g>
  ),
  head_star_leaf: (
    <>
      <path
        d="M-1 4Q-2-2-6-6"
        fill="none"
        stroke="#5d8f4f"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M-4-4C-12-4-16-11-15-19-8-19-3-13-4-4Z" fill="#8cc56a" />
      <path
        d="M-5-5Q-9-11-14-17"
        fill="none"
        stroke="#5d9a4f"
        strokeWidth=".7"
        strokeLinecap="round"
      />
    </>
  ),
  head_star_butterfly: (
    // Perched above the head, tilted a little outward.
    <g transform="translate(-9 -12) rotate(-15)" strokeWidth=".8">
      <path
        d="M0 0C-2 2-6 5-5 6.5-3.5 7.5-1 4 0 0Zm0 0C2 2 6 5 5 6.5 3.5 7.5 1 4 0 0Z"
        fill="#ffd28a"
      />
      <path d="M0 0C-3-5-8-6-8-2-8 1-4 2 0 0Zm0 0C3-5 8-6 8-2 8 1 4 2 0 0Z" fill="#ffb4d0" />
      <g fill="#fff" stroke="none">
        <circle cx="-4.6" cy="-2.4" r=".8" />
        <circle cx="4.6" cy="-2.4" r=".8" />
      </g>
      <ellipse cy="1.4" rx=".9" ry="3" fill="#5b4a6a" />
      <path d="M-.3-1.4Q-1-4-2.4-4.8M.3-1.4Q1-4 2.4-4.8" fill="none" strokeWidth=".6" />
    </g>
  ),
};

export const pixelStarEar = (
  <>
    <path d="M-10-9h8v2h4v5h2v5h-8v-2h-6Z" fill="#b9a8e6" />
    <path d="M-8-7h5v2h3v3h-5v-2h-3Z" fill="#efe6ff" stroke="none" />
    <path d="M-12-18h3v4h5v3h-3v5h-4v-2h-4v-4h2v-3h1Z" fill="#ffe185" />
  </>
);

const hats: Partial<Record<string, ReactNode>> = {
  hat_level_ribbon: (
    <>
      <path
        d="M-3-7q-14-13-17-4t13 10l-6 8 7-1 5-10M3-7q14-13 17-4T7-1l6 8-7-1L1-4"
        fill="#e7a6c6"
      />
      <path
        d="m-16-9 11 3m21-3L5-6"
        fill="none"
        stroke="#f7d6e7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cy="-6" r="4" fill="#ffe5ac" />
      <path
        d="m0-8 1 1.4 1.6.3-1.1 1.1.2 1.6L0-4.4l-1.7.8.2-1.6-1.1-1.1 1.6-.3Z"
        fill="#fff8e9"
        stroke="none"
      />
    </>
  ),
  hat_level_tiara: (
    <>
      <path d="m-16-2 1-13 7 7 8-15 8 15 7-7 1 13Q0 3-16-2Z" fill="#ede4fb" />
      <path d="M-13-1Q0 2 13-1" fill="none" stroke="#b6a4d2" strokeWidth="1.2" />
      <path d="m0-15 3 4-3 4-3-4Z" fill="#a8ddeb" />
      <g fill="#fff8d5">
        <circle cx="-10" cy="-7" r="1.4" />
        <circle cx="10" cy="-7" r="1.4" />
        <circle cy="-22" r="1.5" />
      </g>
    </>
  ),
  hat_star_crown: (
    <>
      <path d="m-12-2-3-13 8 4 7-8 7 8 8-4-3 13Z" fill="#ffc862" />
      <path d="M-11-6q11-2 22 0l1 4Q0-4-12-2Z" fill="#e8a34a" />
      <path d="m0-13 3 3-3 3-3-3Z" fill="#f99bab" stroke="#a96569" strokeWidth=".75" />
      <circle cx="-8" cy="-9" r="1" fill="#fff1c3" stroke="none" />
      <circle cx="8" cy="-9" r="1" fill="#fff1c3" stroke="none" />
    </>
  ),
  hat_star_wizard: (
    <>
      <path d="M-10-3Q-7-20 2-25q5-2 9 1l-6 2q.5 8 5 19Z" fill="#7260ad" />
      <path d="M-10-7q10 3 20 0l1 4H-11Z" fill="#c4a8e1" />
      <path d="M-14-5q14 3 28 0l2 3Q0 2-16-2Z" fill="#564685" />
      <path
        {...motion("twinkle")}
        d="m-1-18 1 2.7 2.7 1-2.7 1L-1-11l-1-2.4-2.7-1 2.7-1Z"
        fill="#ffe49a"
        stroke="none"
      />
    </>
  ),
  hat_star_sailor: (
    <>
      <path d="M-14-5q-3-4 0-8 14-5 28 0 3 4 0 8Z" fill="#fffaf1" />
      <path d="M-12-8q12 2 24 0l-1 5q-11 3-22 0Z" fill="#5d84b9" />
      <path d="M0-9v4m-3-2q1 3 3 3t3-3" stroke="#ffe2a1" strokeLinecap="round" fill="none" />
      <circle cx="0" cy="-10" r="1" fill="none" stroke="#ffe2a1" strokeWidth=".75" />
    </>
  ),
  hat_star_knit: (
    <>
      <circle cx="0" cy="-19" r="3.7" fill="#ffe1d2" />
      <path d="M-13-5c0-8 6-12 13-12S13-13 13-5Z" fill="#e697a8" />
      <path
        d="M-7-6q0-6 3-9m4 9v-9m7 9q0-6-3-9"
        stroke="#f6bcc3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M-14-7q14 1.5 28 0v5q-14 2-28 0Z" fill="#f3bac0" />
      <path d="M-9-5v2m4-2v2m5-2v2m5-2v2m4-2v2" stroke="#cc778d" strokeWidth=".7" />
    </>
  ),
  hat_star_cap: (
    <>
      <path d="M-13-5q.5-11 12-12 11 0 13 10L6-4Z" fill="#97d6bc" />
      <path d="M-4-5q-.5-8 4-12" fill="none" stroke="#64a992" strokeWidth=".8" />
      <path d="M2-6q8-2 17 1 2 1-1 3Q8 1-2-3Z" fill="#66b59b" />
      <circle cx="5" cy="-11" r="1.8" fill="#e8fbce" stroke="none" />
    </>
  ),
  hat_star_top: (
    <>
      <path d="m-9-5-2-15q11-3 22 0L9-5Z" fill="#51436c" />
      <path d="M-9-10q9 1 18 0v5H-9Z" fill="#b688bc" />
      <path d="M-15-6q15 3 30 0l1 3Q0 1-16-3Z" fill="#43375a" />
      <path d="M-7-18l1 6" stroke="#8774a3" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  hat_star_pumpkin: (
    <>
      <path d="M-2-15q-1-5 3-6l2 2-2 5Z" fill="#88ad69" />
      <path d="M0-16q5-3 8 1c6 0 9 5 7 9s-9 4-15 4-13 0-15-4 1-9 7-9q3-4 8-1Z" fill="#ffa969" />
      <path
        d="M-7-15q-5 7 0 12M7-15q5 7 0 12M0-16v13"
        fill="none"
        stroke="#d57946"
        strokeWidth=".85"
      />
      <path d="m-4-10 1.5 2h-3Zm8 0 1.5 2h-3Z" fill="#804838" stroke="none" />
    </>
  ),
  hat_star_mushroom: (
    <>
      <path d="M-8-5v3q8 2 16 0v-3Z" fill="#fff0d3" />
      <path d="M-17-6q2-6 7-11t10-4q11 0 17 15-17 5-34 0Z" fill="#e67982" />
      <g fill="#fff4dd" stroke="none">
        <ellipse cx="-7" cy="-13" rx="2.5" ry="1.7" />
        <ellipse cx="2" cy="-17" rx="2" ry="1.5" />
        <ellipse cx="8" cy="-11" rx="3" ry="2" />
        <circle cx="-11" cy="-8" r="1.35" />
      </g>
    </>
  ),
  hat_star_rain: (
    <>
      <path d="M-11-7l2-10q9-3 18 0l2 10 6 5q-17 3-34 0Z" fill="#f3cf69" />
      <path d="M-11-8q11 1.5 22 0l1 3q-12 2-24 0Z" fill="#edab53" />
      <path d="M0-16q4 4 0 5-4-1 0-5Z" fill="#a1d7eb" stroke="#6da2b1" strokeWidth=".65" />
    </>
  ),
  hat_star_graduate: (
    <>
      <path d="M-10-10v7q10 3 20 0v-7Z" fill="#524c78" />
      <path d="m-18-11 18-7 18 7-18 6Z" fill="#71628d" />
      <path d="M0-11l12 2v5" fill="none" stroke="#ffdc82" strokeLinecap="round" />
      <path d="m12-5-1.4 3h2.8Z" fill="#ffd67b" stroke="#b58354" strokeWidth=".55" />
    </>
  ),
  hat_star_santa: (
    <>
      <path d="M-12-6Q-11-19-1-23q9-3 14 3l3 6-3 1.5-4-5q-2-2-4-.5Q6-12 11-6Z" fill="#e2545f" />
      <path
        d="M-6-8Q-6-17 0-20"
        fill="none"
        stroke="#f58b8e"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <g fill="#ffe08a" stroke="none">
        <path d="m-3-15 .7 1.8 1.9.3-1.4 1.2.4 1.9-1.6-1-1.7 1 .4-1.9-1.4-1.2 1.9-.3Z" />
        <circle cx="5" cy="-17" r=".8" />
        <circle cx="4" cy="-10" r=".7" />
      </g>
      <path d="M-15-7.5q15-4 30 0 2 3 0 6-15 3-30 0-2-3 0-6Z" fill="#fff8f1" />
      <path
        d="M-10-3.5q10 1.6 20 0"
        fill="none"
        stroke="#e7dde0"
        strokeWidth=".8"
        strokeLinecap="round"
      />
      <circle cx="16" cy="-12.5" r="3.6" fill="#fff8f1" />
      <circle cx="15" cy="-13.6" r="1.1" fill="#fff" stroke="none" />
    </>
  ),
  hat_star_witch: (
    <>
      <path d="M-19-5q19-5 38 0 2 2.5-1 4Q0 3-18-1q-3-1.5-1-4Z" fill="#3a2f58" />
      <path d="M-10-6-3-27q1-3 4-3 5 1 9 5-4-1-6 0L9-6Z" fill="#4a3d6e" />
      <path d="M-9.4-10.5q9.4 2 18.8 0L9.6-6Q0-4-9.8-6Z" fill="#f39a4a" />
      <rect x="-2.6" y="-10.6" width="5.2" height="4.6" rx=".6" fill="none" stroke="#ffd77a" />
      <path
        {...motion("glow")}
        d="M2.5-21a2.7 2.7 0 1 0 1.9 3.6 2.1 2.1 0 0 1-1.9-3.6Z"
        fill="#ffe08a"
        stroke="none"
      />
      <path
        d="M-5-16q1-5 3-9"
        fill="none"
        stroke="#6a5a92"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </>
  ),
  hat_star_tree: (
    <>
      <path d="M-14-3Q0 0 14-3L6-12H-6Z" fill="#4fa36b" />
      <path d="M-10-10Q0-7.5 10-10L4-18H-4Z" fill="#5cb878" />
      <path d="M-6.5-16.5Q0-14.5 6.5-16.5L0-25Z" fill="#6cc985" />
      <path
        d="M-11-5Q0-8 9-8.5M-7-12.5Q0-14.5 6-14"
        fill="none"
        stroke="#ffe08a"
        strokeWidth=".8"
      />
      <g stroke="none">
        <circle {...motion("blink")} cx="-6" cy="-6" r="1.4" fill="#e2545f" />
        <circle {...motion("blink", 0.9)} cx="5" cy="-5" r="1.4" fill="#9fc6f0" />
        <circle {...motion("blink", 0.45)} cx="-2" cy="-12" r="1.2" fill="#ffe08a" />
        <circle {...motion("blink", 1.35)} cx="3" cy="-18" r="1.1" fill="#e2545f" />
      </g>
      <path
        {...motion("twinkle")}
        d="m0-30.5 1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4Z"
        fill="#ffe284"
      />
    </>
  ),
};

// Held in the learning pose, between the hands at x 33.5 and 66.5. Stage coordinates.
const heldProps: Partial<Record<string, ReactNode>> = {
  prop_star_cocoa: (
    <>
      <path
        d="M41 66q-1.5-2 0-4t0-4M59 66q1.5-2 0-4t0-4"
        fill="none"
        stroke="#e2d4ec"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M62 72.5q6 0 6 5t-6 5" fill="none" strokeWidth="2.6" />
      <path d="M62 72.5q6 0 6 5t-6 5" fill="none" stroke="#9fc6f0" strokeWidth="1.2" />
      <path d="M38 69h24v14q0 6-6 6H44q-6 0-6-6Z" fill="#9fc6f0" />
      <path d="M41 72v10q0 3 3 4" fill="none" stroke="#d3e7fb" strokeWidth="1.6" />
      <ellipse cx="50" cy="69" rx="12" ry="2.6" fill="#f3f8ff" />
      <ellipse cx="50" cy="69.3" rx="10" ry="1.7" fill="#8a5640" stroke="none" />
      <path
        d="m50 64.6 1 2.2 2.4.3-1.8 1.6.5 2.3-2.1-1.2-2.1 1.2.5-2.3-1.8-1.6 2.4-.3Z"
        fill="#fff7fb"
        strokeWidth=".8"
      />
      <path
        d="m50 75.5 1.1 2.3 2.5.3-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.3Z"
        fill="#ffe08a"
        stroke="none"
      />
    </>
  ),
  prop_star_candy: (
    <>
      <path d="M39 72Q50 56 61 72" fill="none" strokeWidth="1.4" />
      <circle cx="44.5" cy="69" r="2.6" fill="#f49ac1" />
      <circle cx="55.5" cy="68.6" r="2.4" fill="#9fd6f0" />
      <ellipse cx="50" cy="68" rx="2.4" ry="1.6" fill="#ffe08a" />
      <path d="M37 71q13-3 26 0l-1.5 13q-1 5-11.5 5T38.5 84Z" fill="#ff9d4d" />
      <path d="M44 70.5q-2 9 0 18M56 70.5q2 9 0 18" fill="none" stroke="#e07a32" strokeWidth=".8" />
      <g fill="#5a2f22" stroke="none">
        <path d="m42.5 77 2.5-3.6 2.5 3.6Zm10 0 2.5-3.6 2.5 3.6Z" />
        <path d="M43 80.5q7 5.5 14 0l-2 1-1.5-1-1.6 1.2-1.9-1.2-1.9 1.2-1.6-1.2-1.5 1Z" />
      </g>
    </>
  ),
  prop_star_gift: (
    <>
      <rect x="38" y="72" width="24" height="16.5" rx="2" fill="#e2545f" />
      <g fill="#fff2f4" stroke="none">
        <circle cx="42" cy="79" r=".9" />
        <circle cx="57.5" cy="83.5" r=".9" />
        <circle cx="43.5" cy="85.5" r=".8" />
        <circle cx="56" cy="76.5" r=".8" />
      </g>
      <rect x="36.5" y="68.5" width="27" height="5" rx="1.5" fill="#f0717b" />
      <path d="M47.6 68.5h4.8v20h-4.8Z" fill="#ffe08a" />
      <path d="M50 69q-6-5.5-7.2-1.6T50 69Zm0 0q6-5.5 7.2-1.6T50 69Z" fill="#ffe08a" />
      <circle cx="50" cy="68.8" r="1.5" fill="#ffd25e" />
    </>
  ),
  prop_star_lantern: (
    <>
      <path d="M44 66Q50 56.5 56 66" fill="none" strokeWidth="1.4" />
      <path d="M39.5 66h21l-2.6 5H42.1Z" fill="#d9a84a" />
      <rect x="40.5" y="71" width="19" height="15" rx="2" fill="#fff4c9" />
      {/* The light inside flickers, and specks of light drift up from the top. */}
      <ellipse
        {...motion("glow")}
        cx="50"
        cy="78.5"
        rx="7.6"
        ry="6.4"
        fill="#ffd25e"
        opacity=".75"
        stroke="none"
      />
      <path
        {...motion("twinkle", 0.4)}
        d={starShape(50, 78.8, 4.8)}
        fill="#ffae3d"
        strokeWidth=".7"
      />
      <path d="M43 73.5v8" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M39.5 86h21l-1.8 4H41.3Z" fill="#d9a84a" />
      <g fill="#fff3b0" stroke="none">
        <circle {...motion("bubble")} cx="45.5" cy="63.5" r=".8" />
        <circle {...motion("bubble", 1.2)} cx="54.5" cy="62.5" r=".7" />
        <circle {...motion("bubble", 2.1)} cx="50" cy="60" r=".9" />
      </g>
    </>
  ),
  prop_star_magnifier: (
    <>
      <path d="M50 82.5v6.5" fill="none" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M50 82.5v6.5" fill="none" stroke="#a8673d" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50" cy="74" r="8.8" fill="#e0b04f" />
      <circle cx="50" cy="74" r="6.6" fill="#e3f5ff" strokeWidth=".7" />
      {/* A star looks bigger through the lens. */}
      <path d={starShape(50, 74.6, 4.2)} fill="#ffd25e" strokeWidth=".6" />
      <path
        d="M45.6 71.6q1.4-2.4 4-3"
        fill="none"
        stroke="#fff"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </>
  ),
  prop_star_pencil: (
    <>
      {/* Held at a slant, so the eraser and the point both clear the hands. */}
      <g transform="rotate(-34 50 77)">
        <path d="M31 73.4q-1.2 0-1.2 1.2v4.8q0 1.2 1.2 1.2h4v-7.2Z" fill="#f29ab4" />
        <path d="M35 73.2h3.2v7.6H35Z" fill="#c9ccd6" />
        <path d="M36.2 73.2v7.6" fill="none" stroke="#eef0f5" strokeWidth=".7" />
        <path d="M38.2 73.2h22.6v7.6H38.2Z" fill="#ffd25e" />
        <path d="M38.2 75.7h22.6M38.2 78.3h22.6" fill="none" stroke="#efb53a" strokeWidth=".7" />
        <path d="M60.8 73.2 69 77l-8.2 3.8Z" fill="#f2c99a" />
        <path d="M66.4 75.8 69 77l-2.6 1.2Z" fill="#4a3b3a" stroke="none" />
      </g>
    </>
  ),
  prop_star_notebook: (
    <>
      <rect x="39.5" y="66.5" width="21" height="22" rx="1.6" fill="#7fc4a8" />
      <rect x="45" y="70.5" width="12" height="6" rx=".8" fill="#fffaf0" strokeWidth=".7" />
      <path
        d="M47 72.6h8M47 74.6h5.5"
        fill="none"
        stroke="#9aa5b8"
        strokeWidth=".6"
        strokeLinecap="round"
      />
      {/* Spiral rings along the left edge. */}
      <path
        d="M38 69.5q1.8-1.5 3.5 0M38 73.5q1.8-1.5 3.5 0M38 77.5q1.8-1.5 3.5 0M38 81.5q1.8-1.5 3.5 0M38 85.5q1.8-1.5 3.5 0"
        fill="none"
        strokeWidth=".8"
        strokeLinecap="round"
      />
      <path d={starShape(55.5, 84, 2.2)} fill="#ffe08a" strokeWidth=".6" />
    </>
  ),
};

// Pin badges in a 20 × 20 box centered on the origin. Other badges show their glyph.
export const starBadges: Partial<Record<string, ReactNode>> = {
  badge_level_bloom: (
    <>
      <circle r="9" fill="#faf0da" />
      <g fill="#dca2c7">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cy="-3.4" rx="2.2" ry="3.2" transform={`rotate(${angle})`} />
        ))}
      </g>
      <circle r="2.4" fill="#ffe19a" />
      <circle cx="-.7" cy="-.8" r=".7" fill="#fffaf3" stroke="none" />
    </>
  ),
  badge_star_clover: (
    <>
      <circle r="9" fill="#fff6d8" />
      <path d="M.6.6q2 3.2 4.6 4.8" fill="none" stroke="#4f9a63" strokeWidth="1.2" />
      <g fill="#6cc985">
        <circle cy="-2.6" r="2.7" />
        <circle cx="2.6" r="2.7" />
        <circle cy="2.6" r="2.7" />
        <circle cx="-2.6" r="2.7" />
      </g>
      <circle r="1" fill="#9fe0a8" stroke="none" />
    </>
  ),
  badge_star_ghost: (
    <>
      <circle r="9" fill="#5b4a7a" />
      <path
        d="M0-5.5c3 0 4.5 2.3 4.5 5.2V5L3 3.8 1.5 5 0 3.8-1.5 5-3 3.8-4.5 5V-.3C-4.5-3.2-3-5.5 0-5.5Z"
        fill="#fffaff"
      />
      <g fill="#3c2622" stroke="none">
        <ellipse cx="-1.6" cy="-.8" rx=".7" ry=".95" />
        <ellipse cx="1.6" cy="-.8" rx=".7" ry=".95" />
      </g>
      <g fill="#f094ae" stroke="none" opacity=".7">
        <ellipse cx="-2.8" cy=".8" rx=".9" ry=".5" />
        <ellipse cx="2.8" cy=".8" rx=".9" ry=".5" />
      </g>
    </>
  ),
  badge_star_bell: (
    <>
      <circle r="9" fill="#4fa36b" />
      <path d="M0-5q3.6 0 3.8 4.2l.4 2.6 1.6 1.4H-5.8l1.6-1.4.4-2.6Q-3.6-5 0-5Z" fill="#ffd76a" />
      <circle cy="4.7" r="1.1" fill="#ffd76a" />
      <path d="M-1.6-3.4q-1.4 1.4-1.2 3.6" fill="none" stroke="#fff3c4" strokeWidth=".7" />
      <circle cy="-5.6" r="1.1" fill="#e2545f" />
    </>
  ),
  badge_star_medal: (
    <>
      <path d="M-5.5 2-7.3 9.2-4.6 8.1-2.9 9.8-1 3Z" fill="#e2545f" />
      <path d="M5.5 2 7.3 9.2 4.6 8.1 2.9 9.8 1 3Z" fill="#5f86cf" />
      <circle cy="-1.5" r="7.2" fill="#f2c24e" />
      <circle cy="-1.5" r="5.4" fill="none" stroke="#d99b2b" strokeWidth=".8" />
      <path d={starShape(0, -1.2, 3.8)} fill="#fff3b0" strokeWidth=".7" />
    </>
  ),
  badge_star_moon: (
    <>
      <circle r="9" fill="#34407e" />
      <path d="M1.8-5.6A5.8 5.8 0 1 0 2.6 5.4 4.6 4.6 0 0 1 1.8-5.6Z" fill="#ffe08a" />
      <g fill="#fff6d0" stroke="none">
        <path d={sparkle(4.4, -2.6, 1.7)} />
        <circle cx="5" cy="3.2" r=".7" />
      </g>
    </>
  ),
  badge_star_ribbon: (
    <>
      <circle r="9" fill="#fff0f4" />
      <path d="M-1 .5-3.5 6.8-1.6 6-.5 7.6.6 1Zm2 0L3.5 6.8 1.6 6 .5 7.6-.6 1Z" fill="#e66e93" />
      <path
        d="M0 0C-2-3.5-6.8-4.5-6.8-1.2S-2.5 2.2 0 0Zm0 0C2-3.5 6.8-4.5 6.8-1.2S2.5 2.2 0 0Z"
        fill="#f28aa8"
      />
      <circle r="1.7" fill="#ff9fbc" />
    </>
  ),
};

// The round face of each pin, for the passing glint. Most pins fill a radius-9 circle.
const badgeFaces: Partial<Record<string, readonly [cx: number, cy: number, r: number]>> = {
  badge_star_medal: [0, -1.5, 7.2],
};

// Pendulum angles, one per walking frame, so the pin swings with each stride.
const badgeSwing = [0, 7, 7, 0, -7, -7];
// Pin size relative to its 20 × 20 drawing box.
const badgeScale = 0.72;

// Badges without their own drawing become a gold-rimmed medal showing their glyph.
function GlyphMedal({ icon, id }: { icon: string; id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-rim`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset=".55" stopColor="#f2c24e" />
          <stop offset="1" stopColor="#c98a23" />
        </radialGradient>
        <radialGradient id={`${id}-face`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9defc" />
        </radialGradient>
      </defs>
      <circle r="9" fill={`url(#${id}-rim)`} />
      <circle r="6.6" fill={`url(#${id}-face)`} stroke="#b7862c" strokeWidth=".7" />
      <text
        y=".4"
        fill="#6653e8"
        stroke="none"
        fontSize="8.6"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {icon}
      </text>
    </>
  );
}

// A pin worn on the chest. It sits inside the pose, so it follows the body as it bobs and turns;
// the art itself is never mirrored. Walking swings it and leaves short speed lines behind.
export function StarBadge({
  id,
  x,
  y,
  flipped,
  walking,
  step,
  squash,
  uid,
  outline,
}: {
  id: string;
  x: number;
  y: number;
  flipped: boolean;
  walking: boolean;
  step: number;
  squash: number;
  uid: string;
  outline: string;
}) {
  const art = starBadges[id];
  const icon = ITEM_CATALOG[id]?.icon;
  if (id === "badge_none" || (!art && !icon)) return null;
  const [cx, cy, r] = badgeFaces[id] ?? [0, 0, 9];
  const clipId = `${uid}-badge-face`;
  const swing = walking ? badgeSwing[step % badgeSwing.length] : 0;
  return (
    <g data-layer="badge" data-badge={id} transform={`translate(${x} ${y}) scale(1 ${1 / squash})`}>
      {walking && (
        // Behind the pin: the pose faces +x, and the whole pose is mirrored when walking left.
        <path
          className="commet-badge-trail"
          d="M-8.5-2.4h-4.2M-9.2.9h-6M-8.5 4.2h-3.4"
          fill="none"
          stroke="#a58fc2"
          strokeWidth=".95"
          strokeLinecap="round"
          opacity={step % 2 ? 0.85 : 0.5}
        />
      )}
      <g
        className="commet-badge-swing"
        style={{ transform: `rotate(${swing}deg)`, transformOrigin: "0px -5px" }}
      >
        <g transform={`scale(${flipped ? -badgeScale : badgeScale} ${badgeScale})`}>
          <defs>
            <clipPath id={clipId}>
              <circle cx={cx} cy={cy} r={r} />
            </clipPath>
          </defs>
          <ellipse cx="1" cy="1.8" rx="9" ry="8.6" fill="#4a2f45" opacity=".18" />
          <g stroke={outline} strokeWidth="1" strokeLinejoin="round">
            {art ?? <GlyphMedal icon={icon!} id={`${uid}-badge`} />}
          </g>
          <g clipPath={`url(#${clipId})`} stroke="none">
            <path
              className="commet-badge-glint"
              d="M-3-12h3.2L-4 12h-3.2ZM2.2-12h1.4L-.6 12h-1.4Z"
              fill="#fff"
              opacity=".75"
            />
          </g>
          <path
            className="commet-badge-sparkle"
            d={sparkle(cx + r * 0.72, cy - r * 0.72, 2.6)}
            fill="#fffbe8"
            stroke="#e6b94a"
            strokeWidth=".45"
          />
        </g>
      </g>
    </g>
  );
}

export function StarProp({ id, outline }: { id: string; outline: string }) {
  const art = heldProps[id];
  if (!art) return null;
  return (
    <g data-layer="prop" data-part={id} stroke={outline} strokeWidth="1.05" strokeLinejoin="round">
      {art}
    </g>
  );
}

export function StarHat({ id, crown, outline }: { id: string; crown: number; outline: string }) {
  const art = hats[id];
  if (!art) return null;
  return (
    <g
      data-layer="hat"
      data-hat={id}
      transform={`translate(50 ${crown + 3})`}
      stroke={outline}
      strokeWidth="1.1"
      strokeLinejoin="round"
    >
      {art}
    </g>
  );
}
