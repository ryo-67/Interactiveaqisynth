// DayNav — scrubbing older days (§2.2, UX-03 as page-level navigation): pagination one day at a time, the measured pins as chips, and a hand-built month calendar. Range is January 2020 to the archive's last available day (the static archive plus the live-year route; EPA lags real time, so yesterday is never assumed); "Live" returns to the last 24 hours. No component libraries; tokens only; copy from content.ts.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme, themeColors, families, typeScale, space, CONTROL } from "../utils/theme";
import { chipStyle } from "./chip";
import { PINS, NAV_LIVE, NAV_PREV, NAV_NEXT, NAV_CALENDAR, NAV_LAST_24H, CAL_AVAILABLE_UNTIL } from "../content";

interface Props {
  date: string | null; // null = live
  onChange: (date: string | null) => void;
  loading?: boolean;
  latestDate: string | null; // the last day the archive can play; null until known
}

const POPOVER_WIDTH = 288; // 4 px grid; seven 36 px columns plus the panel padding
const MIN_DATE = "2020-01-01";

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function labelOf(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// A 12 px calendar glyph in the current text colour: a frame with two binding rings and a row of days. Sized on the 4 px grid, drawn inline so it takes the chip's colour.
function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false" style={{ flex: "0 0 auto" }}>
      <rect x="1" y="2.5" width="10" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1" />
      <line x1="3.5" y1="1" x2="3.5" y2="3.5" stroke="currentColor" strokeWidth="1" />
      <line x1="8.5" y1="1" x2="8.5" y2="3.5" stroke="currentColor" strokeWidth="1" />
      <rect x="3" y="6.5" width="1.5" height="1.5" fill="currentColor" />
      <rect x="5.25" y="6.5" width="1.5" height="1.5" fill="currentColor" />
      <rect x="7.5" y="6.5" width="1.5" height="1.5" fill="currentColor" />
    </svg>
  );
}

export function DayNav({ date, onChange, loading, latestDate }: Props) {
  const c = themeColors(useTheme());
  const [open, setOpen] = useState(false);
  // The popover is rendered at the document level (a portal), not inside the pill: the pill has its own backdrop blur, and a blur nested inside another blurred element can only sample what is painted inside its parent, so the graph beneath showed through sharp. Fixed under the Calendar chip, kept inside the viewport, re-placed on resize.
  const anchorRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open) return;
    const margin = parseInt(space.sm), gap = parseInt(space.xs);
    let raf = 0;
    // Re-measured every frame while open (cheap: one rect), so the popover follows the chip through any reflow, zoom or resize without a listener for each.
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r && r.width > 0) {
        const left = Math.max(margin, Math.min(r.left, window.innerWidth - POPOVER_WIDTH - margin));
        const top = r.bottom + gap;
        setPos((p) => (p.left === left && p.top === top ? p : { left, top }));
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [open]);
  // Any choice of day closes the calendar — a date in it, a preset chip (PinStrip, a sibling), or Live — because each one lands as a new `date`.
  useEffect(() => { setOpen(false); }, [date]);
  // The last day that can be played: the archive's last available day, never simply yesterday (EPA publishes with a lag). Until it is known, nothing past the pins is offered.
  const last = latestDate;
  const [view, setView] = useState(() => (date ?? latestDate ?? PINS[0].date).slice(0, 7)); // YYYY-MM shown in the calendar
  // Opening the calendar from live shows the last available day's month.
  useEffect(() => { if (open && !date && last) setView(last.slice(0, 7)); }, [open, date, last]);

  const chip = (active: boolean) => chipStyle(c, active);

  // ‹ from live is the last available day; › past it is live again.
  const prev = () => {
    if (!date) { if (last) onChange(last); return; }
    const p = addDays(date, -1);
    onChange(p < MIN_DATE ? MIN_DATE : p);
  };
  const next = () => {
    if (!date) return;
    const n = addDays(date, 1);
    onChange(!last || n > last ? null : n);
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
    <div ref={anchorRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: `var(--chip-inset, ${CONTROL.gap}px)`, height: `var(--ctl-inner, ${CONTROL.inner}px)`, whiteSpace: "nowrap" }}>
      {/* Order: ‹ [calendar icon + date] › Live. The date itself opens the calendar; live reads "Last 24h" with the next arrow disabled. ‹ from live is yesterday's full day; › from yesterday is live again. */}
      <button style={chip(false)} onClick={prev} aria-label="previous day" disabled={!date && !last}>{NAV_PREV}</button>
      <button
        style={{ ...chip(open), display: "inline-flex", alignItems: "center", gap: 6, minWidth: "8.5em", justifyContent: "center", opacity: loading ? 0.5 : 1 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${NAV_CALENDAR}: ${date ? labelOf(date) : NAV_LAST_24H}`}
      >
        <CalendarIcon />
        <span style={{ color: c.textPrimary }}>{date ? labelOf(date) : NAV_LAST_24H}</span>
      </button>
      <button style={chip(false)} onClick={next} aria-label="next day" disabled={!date}>{NAV_NEXT}</button>
      <button style={chip(date === null)} onClick={() => onChange(null)}>{NAV_LIVE}</button>

      {open && createPortal(
        <div className="glass frosted" role="dialog" aria-label={NAV_CALENDAR} style={{ position: "fixed", left: pos.left, top: pos.top, padding: space.sm, zIndex: 20, fontFamily: families.data, fontSize: typeScale.caption.size, color: c.textSecondary, width: POPOVER_WIDTH, whiteSpace: "normal" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
            <button style={chip(false)} onClick={() => shiftMonth(-1)} disabled={view <= MIN_DATE.slice(0, 7)} aria-label="previous month">{NAV_PREV}</button>
            <span style={{ color: c.textPrimary }}>{monthLabel}</span>
            <button style={chip(false)} onClick={() => shiftMonth(1)} disabled={!last || view >= last.slice(0, 7)} aria-label="next month">{NAV_NEXT}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: space.xxs }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((dd, i) => (
              <span key={i} style={{ textAlign: "center", color: c.textFaint }}>{dd}</span>
            ))}
            {grid.map((iso, i) => {
              if (!iso) return <span key={`e${i}`} />;
              const out = iso < MIN_DATE || !last || iso > last;
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
          {/* What the range is, stated: the archive's last available day. */}
          <div style={{ marginTop: space.xs, textAlign: "center", color: c.textMuted }}>
            {CAL_AVAILABLE_UNTIL.replace("{date}", last ? labelOf(last) : "…")}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// PinStrip — the measured days as chips (§2.2), its own pill in the scaffold. The chips wrap onto further rows when the pill is narrow, rather than scrolling or clipping.
export function PinStrip({ date, onChange }: { date: string | null; onChange: (date: string | null) => void }) {
  const c = themeColors(useTheme());
  const ref = useRef<HTMLDivElement>(null);

  // Hug the chips even when they wrap. CSS fit-content on a wrapping row means "all chips on one line", which clamps to the container and fills it; so after layout the pill (the parent glass) is sized to its widest row plus the inset. Every row is at most that wide, so the new width cannot re-wrap anything. Re-measured on resize.
  useLayoutEffect(() => {
    const strip = ref.current;
    const pill = strip?.parentElement;
    if (!strip || !pill) return;
    const fit = () => {
      pill.style.width = "";
      const chips = [...strip.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
      if (!chips.length) return;
      const left = Math.min(...chips.map((r) => r.left)), right = Math.max(...chips.map((r) => r.right));
      const inset = parseFloat(getComputedStyle(pill).paddingLeft) || 0;
      const w = Math.ceil(right - left + inset * 2);
      if (Math.abs(pill.getBoundingClientRect().width - w) > 1) pill.style.width = `${w}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(pill.parentElement ?? pill);
    return () => { ro.disconnect(); pill.style.width = ""; };
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", flexWrap: "wrap", gap: `var(--chip-inset, ${CONTROL.gap}px)`, maxWidth: "100%" }}>
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
