// PageIndicator (D-43) — the two page icons: Lucide's cloud-sun for the scene and audio-lines for the monitor, in a glass pill (the page puts them in one): stacked along the pages' axis, vertical at the left of the band above the phone width, horizontal in the transport row on phones. The active page's icon at the primary text colour, the other at the muted alpha, the transport's own treatment; hover brightens the inactive one (index.css) and the press is the cursor's dot, as everywhere. Buttons, so they are the accessible route beside the wheel, the swipe and the arrows.
import { useTheme, themeColors, CONTROL, MONITOR } from "../utils/theme";
import { VIEW_LABELS, VIEW_ROW_LABEL } from "../content";
import { CloudSunIcon, AudioLinesIcon } from "./icons";
import { iconButtonStyle } from "./chip";

export type View = "scene" | "monitor";
export const VIEWS: View[] = ["scene", "monitor"];

export function PageIndicator({ view, onView, vertical }: { view: View; onView: (v: View) => void; vertical: boolean }) {
  const c = themeColors(useTheme());
  const s = `var(--ctl-inner, ${CONTROL.inner}px)`;
  return (
    <div className="scene-views" role="tablist" aria-label={VIEW_ROW_LABEL} aria-orientation={vertical ? "vertical" : "horizontal"} data-vertical={vertical}>
      {VIEWS.map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            className="scene-view-btn"
            role="tab"
            aria-selected={active}
            aria-label={VIEW_LABELS[v]}
            onClick={() => onView(v)}
            style={iconButtonStyle(s, active ? c.textPrimary : `rgba(255,255,255,${MONITOR.iconInactive})`, { transition: `color ${CONTROL.stateMs}ms ease` })}
          >
            {v === "scene" ? <CloudSunIcon size={MONITOR.icon} /> : <AudioLinesIcon size={MONITOR.icon} />}
          </button>
        );
      })}
    </div>
  );
}
