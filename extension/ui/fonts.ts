import { browser } from "wxt/browser";

// Register on the document so the same faces work inside the overlay's Shadow DOM.
// The private family name keeps the host page's typography unchanged.
for (const [weight, path] of [
  ["400", "/fonts/zen-maru-gothic-regular.woff2"],
  ["500", "/fonts/zen-maru-gothic-medium.woff2"],
  ["700", "/fonts/zen-maru-gothic-bold.woff2"],
] as const) {
  document.fonts.add(
    new FontFace("Commet Zen Maru Gothic", `url("${browser.runtime.getURL(path)}")`, {
      weight,
      style: "normal",
      display: "swap",
    }),
  );
}
