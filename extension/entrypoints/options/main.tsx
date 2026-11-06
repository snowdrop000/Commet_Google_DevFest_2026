import { createRoot } from "react-dom/client";
import { Dashboard } from "../../ui/Dashboard";
import "../../ui/style.css";

const root = document.querySelector("#root");
if (root) createRoot(root).render(<Dashboard developer />);
