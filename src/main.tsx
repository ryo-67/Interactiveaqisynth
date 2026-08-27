import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The three.js routes are lazy so their bundle never ships to /.
// /scene itself is being rebuilt on the physically based sky (D-19); the Canvas-2D version that failed review is deleted, so only the test harness exists right now.
const SceneTestPage = lazy(() => import("./scene/SceneTestPage"));

const Root = window.location.pathname === "/scene-test" ? SceneTestPage : App;

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div style={{ background: "#05050a", position: "fixed", inset: 0 }} />}>
    <Root />
  </Suspense>,
);
