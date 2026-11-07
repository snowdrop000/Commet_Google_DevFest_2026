import { createRoot } from "react-dom/client";
import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { findPlatform, snsMatches } from "../sns/platforms";
import { Overlay } from "../ui/Overlay";
import "../ui/style.css";
import "../ui/wardrobe.css";
import "../ui/overlay.css";
import "../ui/theme.css";

export default defineContentScript({
  matches: snsMatches,
  cssInjectionMode: "ui",
  async main(ctx) {
    const platform = findPlatform(location.hostname);
    if (!platform) return;
    const ui = await createShadowRootUi(ctx, {
      name: "commet-pet",
      position: "inline",
      anchor: "body",
      onMount(container) {
        const shell = document.createElement("div");
        container.append(shell);
        const root = createRoot(shell);
        root.render(<Overlay platform={platform} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
