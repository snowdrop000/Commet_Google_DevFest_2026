import type { ReactNode } from "react";

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
};

export const pixelStarEar = (
  <>
    <path d="M-10-9h8v2h4v5h2v5h-8v-2h-6Z" fill="#b9a8e6" />
    <path d="M-8-7h5v2h3v3h-5v-2h-3Z" fill="#efe6ff" stroke="none" />
    <path d="M-12-18h3v4h5v3h-3v5h-4v-2h-4v-4h2v-3h1Z" fill="#ffe185" />
  </>
);

const hats: Partial<Record<string, ReactNode>> = {
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
      <path d="m-1-18 1 2.7 2.7 1-2.7 1L-1-11l-1-2.4-2.7-1 2.7-1Z" fill="#ffe49a" stroke="none" />
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
};

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
