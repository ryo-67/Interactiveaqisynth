import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ScenePage from "./scene/ScenePage";
import { Fallback } from "./components/Fallback";
import { FALLBACK } from "./content";
import { MOCK } from "./utils/mock";
import "./index.css";

// The scene is the page (D-40, 2026-09-15): / and /scene both render it, /scene kept so earlier links still land. The typographic page it replaced (App.tsx) is gone with its own components. The harness stays lazy at /scene-test so its extras never ship to the page.
const SceneTestPage = lazy(() => import("./scene/SceneTestPage"));

const path = window.location.pathname;
const Root = path === "/scene-test" ? SceneTestPage : ScenePage;
// The screen states, mocked (utils/mock.ts): in place of the page, as they would be when the page cannot run.
const screenMock = MOCK === "crashed" ? <Fallback line={FALLBACK.crashed} reload /> : MOCK === "no-webgl" ? <Fallback line={FALLBACK.noWebgl} reload={false} /> : null;

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div style={{ background: "#05050a", position: "fixed", inset: 0 }} />}>
    {screenMock ?? <Root />}
    <Analytics />
    <SpeedInsights />
  </Suspense>,
);
