import { createRoot } from "react-dom/client";
import { Dashboard } from "../../ui/Dashboard";
import "../../ui/fonts";
import "../../ui/style.css";
import "../../ui/theme.css";

const root = document.querySelector("#root");
if (root) createRoot(root).render(<Dashboard />);
