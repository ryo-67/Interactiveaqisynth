// DayNav — scrubbing older days (§2.2, UX-03 as page-level navigation): pagination one day at a time, the measured pins as chips, and a hand-built month calendar. Range is January 2020 to yesterday (the archive plus the live-year route); "Live" returns to the last 24 hours. No component libraries; tokens only; copy from content.ts.
import React, { useMemo, useState } from "react";
import { useTheme, themeColors, families, typeScale, space, CONTROL } from "../utils/theme";
import { chipStyle } from "./chip";
import { PINS, NAV_LIVE, NAV_PREV, NAV_NEXT, NAV_CALENDAR } from "../content";

interface Props {
  date: string | null; // null = live
  onChange: (date: string | null) => void;
  loading?: boolean;
}

const MIN_DATE = "2020-01-01";

// New York's calendar day, not the browser's: a visitor in Tokyo should see the same "yesterday" the archive has.
function nyToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function labelOf(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function DayNav({ date, onChange, loading }: Props) {
  const c = themeColors(useTheme());
  const [open, setOpen] = useState(false);
  const yesterday = useMemo(() => addDays(nyToday(), -1), []);
  const [view, setView] = useState(() => (date ?? yesterday).slice(0, 7)); // YYYY-MM shown in the calendar

  const chip = (active: boolean) => chipStyle(c, active);

  const prev = () => onChange(addDays(date ?? nyToday(), -1) < MIN_DATE ? MIN_DATE : addDays(date ?? nyToday(), -1));
  const next = () => {
    if (!date) return;
    const n = addDays(date, 1);
    onChange(n > yesterday ? null : n);
  };

  // Calendar grid for the viewed month.
  const grid = useMemo(() => {
    const [y, m] = view.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const startDow = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: Array<string | null> = Array(startDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${view}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [view]);
  const monthLabel = new Date(view + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const shiftMonth = (n: number) => {
    const [y, m] = view.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setView(d.toISOString().slice(0, 7));
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: CONTROL.gap, height: `var(--ctl-inner, ${CONTROL.inner}px)`, whiteSpace: "nowrap" }}>
      {/* Order per the scaffold: Calendar ‹ date › Live. */}
      <button style={chip(open)} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{NAV_CALENDAR}</button>
      <button style={chip(false)} onClick={prev} aria-label="previous day">{NAV_PREV}</button>
      <span style={{ fontFamily: families.data, fontSize: typeScale.caption.size, lineHeight: `var(--ctl-inner, ${CONTROL.inner}px)`, color: c.textPrimary, minWidth: "8em", textAlign: "center", opacity: loading ? 0.5 : 1 }}>
        {labelOf(date ?? nyToday())}
      </span>
      <button style={chip(false)} onClick={next} aria-label="next day" disabled={!date}>{NAV_NEXT}</button>
      <button style={chip(date === null)} onClick={() => onChange(null)}>{NAV_LIVE}</button>

      {open && (
        <div className="glass frosted" style={{ position: "absolute", top: "100%", left: 0, marginTop: space.xs, padding: space.sm, zIndex: 3, fontFamily: families.data, fontSize: typeScale.caption.size, color: c.textSecondary, width: 288, whiteSpace: "normal" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
            <button style={chip(false)} onClick={() => shiftMonth(-1)} disabled={view <= MIN_DATE.slice(0, 7)} aria-label="previous month">{NAV_PREV}</button>
            <span style={{ color: c.textPrimary }}>{monthLabel}</span>
            <button style={chip(false)} onClick={() => shiftMonth(1)} disabled={view >= yesterday.slice(0, 7)} aria-label="next month">{NAV_NEXT}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: space.xxs }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((dd, i) => (
              <span key={i} style={{ textAlign: "center", color: c.textFaint }}>{dd}</span>
            ))}
            {grid.map((iso, i) => {
              if (!iso) return <span key={`e${i}`} />;
              const out = iso < MIN_DATE || iso > yesterday;
              const sel = iso === date;
              return (
                <button
                  key={iso}
                  disabled={out}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  style={{
                    fontFamily: families.data, fontSize: typeScale.caption.size, textAlign: "center", height: `var(--ctl-inner, ${CONTROL.inner}px)`, padding: 0,
                    color: out ? c.textFaint : sel ? "#05050a" : c.textPrimary,
                    background: sel ? "rgba(255,255,255,0.9)" : "none",
                    border: "none", borderRadius: 4, cursor: out ? "default" : "pointer",
                  }}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// PinStrip — the measured days as chips in one scrolling line (§2.2), its own pill in the scaffold.
export function PinStrip({ date, onChange }: { date: string | null; onChange: (date: string | null) => void }) {
  const c = themeColors(useTheme());
  return (
    <div className="scene-strip" style={{ display: "flex", gap: CONTROL.gap, height: `var(--ctl-inner, ${CONTROL.inner}px)`, whiteSpace: "nowrap", maxWidth: "100%" }}>
      {PINS.map((p) => {
        const active = date === p.date;
        return (
          <button
            key={p.date}
            onClick={() => onChange(p.date)}
            title={labelOf(p.date)}
            style={chipStyle(c, active)}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
