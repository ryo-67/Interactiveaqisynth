// App — the typographic Listen page (sprint 3a). Its state lives in useListenSession, shared with the scene at /scene (D-19), so the two pages play the same data through the same engine. The scene replaces this page once it passes review.
import React, { useState } from "react";
import { BoroughToggle } from "./components/BoroughToggle";
import { AQINumber } from "./components/AQINumber";
import { MoodLine } from "./components/MoodLine";
import { Graph, TRACK_ORDER, type TrackKey } from "./components/Graph";
import { SourceLine } from "./components/SourceLine";
import { PHASE0_DAYS } from "./fixtures/phase0-days";
import { ThemeContext, themeColors, space, type Theme } from "./utils/theme";
import { STATUS_LIVE, STATUS_ARCHIVE } from "./content";
import { useListenSession, DEV } from "./scene/useListenSession";

export default function App() {
  const [theme] = useState<Theme>("dark"); // dark is the default; light stays reachable through tokens (DSN-06 is Phase 2)
  const { borough, setBorough, snapshot, anchors: a, day, live, beat, playing, playheadHour, subscribePulse, togglePlay, displayAqi, moodTier, moodHour, dominant, devDayKey, setDevDayKey } = useListenSession();
  const [tab, setTab] = useState<TrackKey>(TRACK_ORDER[0]);

  const c = themeColors(theme);

  const lastTs = day?.[day.length - 1]?.ts ?? null;
  const dateLabel = lastTs
    ? new Date(lastTs).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";
  const hourLabel = lastTs ? lastTs.slice(11, 16) : "—";

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ minHeight: "100vh", background: c.bg, color: c.textPrimary }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: `${space.lg} ${space.md}` }}>
          <BoroughToggle
            selected={borough}
            onSelect={setBorough}
            dateLabel={dateLabel}
            hourLabel={hourLabel}
            status={live ? STATUS_LIVE : STATUS_ARCHIVE}
          />

          <div style={{ marginTop: space.xl }}>
            <AQINumber value={displayAqi} />
          </div>

          <div style={{ marginTop: space.lg }}>
            <MoodLine tierIndex={moodTier} hour={moodHour} dominant={dominant} />
          </div>

          <div style={{ marginTop: space.xl }}>
            {day && day.length > 0 && (
              <Graph
                day={day}
                anchors={a}
                playheadHour={playing ? playheadHour : null}
                live={live}
                tab={tab}
                onTab={setTab}
                subscribePulse={subscribePulse}
                onToggle={togglePlay}
              />
            )}
          </div>

          {/* Timeline (3b) and footer lines one–two (3c) land here; the space is reserved, not stubbed. */}
          <div style={{ height: space.xl }} />
          <div style={{ height: space.xl }} />

          {day && <SourceLine borough={borough} hours={day} fallback={snapshot?.fallback ?? null} />}

          {DEV && (
            <div style={{ marginTop: space.lg }}>
              <select value={devDayKey} onChange={(e) => setDevDayKey(e.target.value)}>
                <option value="live">Live: NYC (last 24 h)</option>
                {PHASE0_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label} (fixture)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
