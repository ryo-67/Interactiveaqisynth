import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The three.js routes are lazy so their bundle never ships to /. /scene is the Listen page as the scene (D-19); / stays the typographic page until the scene passes review.
const SceneTestPage = lazy(() => import("./scene/SceneTestPage"));
const ScenePage = lazy(() => import("./scene/ScenePage"));

const path = window.location.pathname;
const Root = path === "/scene-test" ? SceneTestPage : path === "/scene" ? ScenePage : App;

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div style={{ background: "#05050a", position: "fixed", inset: 0 }} />}>
    <Root />
  </Suspense>,
);
