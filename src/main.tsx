import { createRoot } from "react-dom/client";
import App from "./App";
import ScenePage from "./scene/ScenePage";
import "./index.css";

// /scene is the D-19 scene prototype; it replaces / in a later sprint. One path, no router.
const Root = window.location.pathname === "/scene" ? ScenePage : App;

createRoot(document.getElementById("root")!).render(<Root />);
