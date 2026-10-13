import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ScenePage from "./scene/ScenePage";
import { Fallback } from "./components/Fallback";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FALLBACK } from "./content";
import { MOCK } from "./utils/mock";
import "./index.css";

// The scene is the page (D-40, 2026-09-15): / and /scene both render it, /scene kept so earlier links still land. The typographic page it replaced (App.tsx) is gone with its own components. The harness stays lazy at /scene-test so its extras never ship to the page.
const SceneTestPage = lazy(() => import("./scene/SceneTestPage"));

const path = window.location.pathname;
const Root = path === "/scene-test" ? SceneTestPage : ScenePage;
// Whether this browser can draw the sky at all. Asked once, before anything mounts, on a canvas that is thrown away (its context released at once): without WebGL the sky's renderer threw inside its first effect and the page went blank (2026-10-12). WebGL 2 specifically, since three.js has refused WebGL 1 since r163. A context lost later is the sky's own watchdog's business (SkyView.tsx).
function hasWebGL(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl != null;
  } catch {
    return false;
  }
}

// The two screen states (Fallback): no WebGL replaces the page before it mounts; any error the page throws replaces it after. ?mock=crashed and ?mock=no-webgl force them on the dev server (utils/mock.ts).
const crashed = <Fallback line={FALLBACK.crashed} reload />;
const screen = MOCK === "crashed" ? crashed : MOCK === "no-webgl" || !hasWebGL() ? <Fallback line={FALLBACK.noWebgl} reload={false} /> : null;

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div style={{ background: "#05050a", position: "fixed", inset: 0 }} />}>
    <ErrorBoundary fallback={crashed}>{screen ?? <Root />}</ErrorBoundary>
    <Analytics />
    <SpeedInsights />
  </Suspense>,
);
