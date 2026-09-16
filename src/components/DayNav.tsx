// DayNav — scrubbing older days (§2.2, UX-03 as page-level navigation): pagination one day at a time, the measured pins as chips, and a hand-built month calendar. Range is January 2020 to the archive's last available day (the static archive plus the live-year route; EPA lags real time, so yesterday is never assumed); "Live" returns to the last 24 hours. No component libraries; tokens only; copy from content.ts.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme, themeColors, families, typeScale, space, CONTROL, motion } from "../utils/theme";
import { chipStyle } from "./chip";
import { PINS, NAV_LIVE, NAV_CALENDAR, NAV_LAST_24H, CAL_AVAILABLE_UNTIL, PICK_OR_DATE } from "../content";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from "./icons";
import { setPopoverOpen, markOutsideDismiss } from "./popoverStore";

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


// The popover is rendered at the document level (a portal), not inside the pill: the pill has its own backdrop blur, and a blur nested inside another blurred element can only sample what is painted inside its parent, so the graph beneath showed through sharp. Fixed under the anchor, kept inside the viewport, re-measured every frame while open (cheap: one rect) so it follows the anchor through any reflow, zoom or resize.
function usePopoverPosition(open: boolean, anchorRef: React.RefObject<HTMLDivElement>, width: number): { left: number; top: number } {
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open) return;
    const margin = parseInt(space.sm), gap = parseInt(space.xs);
    let raf = 0;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r && r.width > 0) {
        const w = Math.min(width, window.innerWidth - margin * 2);
        // Narrow viewports centre it in the viewport; wider ones centre it on the picker bar's own vertical centreline (2026-09-15), kept inside the viewport.
        const left = window.innerWidth < 576 ? (window.innerWidth - w) / 2 : Math.max(margin, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - margin));
        const top = r.bottom + gap;
        setPos((p) => (p.left === left && p.top === top ? p : { left, top }));
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [open, anchorRef, width]);
  return pos;
}
// The panel's own strings (month, hints, the menu) are on the UI face like the chips; the calendar grid inside sets the data face for itself.
const popoverStyle = (c: ReturnType<typeof themeColors>, visible: boolean): React.CSSProperties => ({
  position: "fixed", padding: space.sm, zIndex: 20, fontFamily: families.ui, letterSpacing: CONTROL.chipTracking, fontSize: typeScale.caption.size, color: c.textSecondary, width: `min(${POPOVER_WIDTH}px, calc(100vw - ${parseInt(space.sm) * 2}px))`, whiteSpace: "normal",
  // In and out (2026-09-15): opacity with a 4 px settle from above, motion.popoverMs, origin at the top where it hangs from the bar; .scene-popover in index.css drops the transition under prefers-reduced-motion.
  opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(-4px) scale(0.98)", transformOrigin: "top center", transition: `opacity ${motion.popoverMs}ms ease, transform ${motion.popoverMs}ms cubic-bezier(0.2, 0.8, 0.2, 1)`, pointerEvents: visible ? "auto" : "none",
});

// Dismissal: Escape, or a press outside both the popover and its anchor. Choosing a day closes it already (the callers watch `date`).
function useDismiss(open: boolean, close: () => void, anchorRef: React.RefObject<HTMLDivElement>): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if ((t as Element).closest?.(".scene-popover")) return;
      markOutsideDismiss(); // the same press must not also toggle the sky
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown, true); };
  }, [open, close, anchorRef]);
}

// Presence with an entrance and an exit: mounted a frame before it shows, so the transition has a start state to leave from, and kept mounted through its exit for motion.popoverMs.
function usePresence(open: boolean): { mounted: boolean; visible: boolean } {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => setPopoverOpen(open), [open]); // the page knows while one is open
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), motion.popoverMs);
    return () => clearTimeout(t);
  }, [open]);
  return { mounted, visible };
}

// CalendarGrid — the month view with its bounds (January 2020 to the archive's last available day) and the line that states the bound. Owns the month it shows; mounts on the month of the chosen day, else the last available day's.
function CalendarGrid({ date, latestDate, onPick }: { date: string | null; latestDate: string | null; onPick: (iso: string) => void }) {
  const c = themeColors(useTheme());
  const chip = (active: boolean) => chipStyle(c, active);
  const last = latestDate;
  const [view, setView] = useState(() => (date ?? latestDate ?? PINS[0].date).slice(0, 7)); // YYYY-MM shown
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
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
        <button className="scene-chip" style={chip(false)} onClick={() => shiftMonth(-1)} disabled={view <= MIN_DATE.slice(0, 7)} aria-label="previous month"><ChevronLeftIcon /></button>
        <span style={{ color: c.textPrimary }}>{monthLabel}</span>
        <button className="scene-chip" style={chip(false)} onClick={() => shiftMonth(1)} disabled={!last || view >= last.slice(0, 7)} aria-label="next month"><ChevronRightIcon /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: space.xxs, fontFamily: families.data, letterSpacing: 0 }}>
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
              className="scene-cal-day" // not scene-day: that is the top bar's day group, and the cell's hover once lit the whole group (2026-09-15)
              data-active={sel}
              disabled={out}
              onClick={() => onPick(iso)}
              // A 32 px square centred in its column (the columns are a fraction wider): the cells are one shape whatever the number in them. Left to the grid they shrank to their text.
              style={{
                fontFamily: families.data, fontSize: typeScale.caption.size, display: "inline-flex", alignItems: "center", justifyContent: "center", justifySelf: "center", width: `var(--ctl-inner, ${CONTROL.inner}px)`, height: `var(--ctl-inner, ${CONTROL.inner}px)`, padding: 0,
                color: out ? c.textFaint : sel ? "#05050a" : c.textPrimary,
                background: sel ? "rgba(255,255,255,0.9)" : "none",
                border: "none", borderRadius: "var(--chip-radius, 8px)", // the small readouts' corner, stepped with the breakpoint (index.css)
              }}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
      {/* What the range is, stated: the archive's last available day. */}
      <div style={{ marginTop: space.xs, textAlign: "center", color: c.textHint, fontSize: typeScale.micro.size }}>
        {CAL_AVAILABLE_UNTIL.replace("{date}", last ? labelOf(last) : "…")}
      </div>
    </>
  );
}

// DayPicker — the phone's one control for the day (§2.2 on phones): a chip naming the current choice that opens a menu of Last 24h and the presets, then "or choose a date" and the calendar. Replaces the arrows, the date chip, the Live chip and the preset strip, which need more width than a phone has.
// The labels that size the phone chip: Last 24h, the presets, and the longest date the calendar can produce.
const WIDEST_DATE_LABEL = "Sep 30, 2026"; // the longest label a date chip can show in the monospaced data face: a two-digit day and the year
const WIDTH_LABELS = [NAV_LAST_24H, ...PINS.map((p) => p.name), WIDEST_DATE_LABEL];
export function DayPicker({ date, onChange, loading, latestDate }: Props) {
  const c = themeColors(useTheme());
  const chip = (active: boolean) => chipStyle(c, active);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(open);
  const pos = usePopoverPosition(presence.mounted, anchorRef, POPOVER_WIDTH);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, anchorRef);
  useEffect(() => { setOpen(false); }, [date]);
  const pin = PINS.find((p) => p.date === date);
  const label = date ? (pin ? pin.name : labelOf(date)) : NAV_LAST_24H;
  const options: Array<{ name: string; date: string | null }> = [{ name: NAV_LAST_24H, date: null }, ...PINS.map((p) => ({ name: p.name, date: p.date }))];
  return (
    <div ref={anchorRef} style={{ position: "relative", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
      {/* The trigger is the pill (Shoro, 2026-09-16): the Patch notes button's shape, padding, colour and hover fill, in place of a chip nested in a glass pill; the label keeps the data face (it is a reading, and the widest-label cell relies on its fixed pitch) and the caret its style. */}
      <button
        className="scene-play scene-about-btn"
        style={{ padding: "8px 14px 8px 16px", minHeight: `var(--ctl-pill, ${CONTROL.pillHeight}px)`, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", background: "none", border: "none", borderRadius: 999, color: c.textSecondary, fontSize: typeScale.caption.size, lineHeight: 1.5, opacity: loading ? 0.5 : 1 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${NAV_CALENDAR}: ${label}`}
      >
        {/* No calendar glyph on phones: the caret is the affordance, and the 18 px is what lets the chip share a row with the boroughs from 408 wide. Every label the chip can show is laid out in the same cell — the current one visible, the rest hidden — so the chip's width is the widest label's and never changes as the choice does. */}
        <span style={{ display: "inline-grid", textAlign: "center" }}>
          {[label, ...WIDTH_LABELS.filter((l) => l !== label)].map((l, i) => (
            <span key={l} style={{ gridArea: "1 / 1", color: c.textSecondary, fontFamily: families.data, letterSpacing: 0, visibility: i === 0 ? "visible" : "hidden" }} aria-hidden={i !== 0}>{l}</span>
          ))}
        </span>
        <span aria-hidden style={{ color: c.textMuted, marginLeft: 2, display: "inline-flex" }}>{open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}</span>
      </button>
      {presence.mounted && createPortal(
        <div className="glass frosted scene-popover" role="dialog" aria-label={NAV_CALENDAR} style={{ ...popoverStyle(c, presence.visible), left: pos.left, top: pos.top }}>
          <div role="listbox" aria-label="Day" style={{ display: "flex", flexDirection: "column", gap: space.xxs, marginBottom: space.sm }}>
            {options.map((o) => {
              const active = o.date === date;
              return (
                <button key={o.name} className="scene-chip" data-active={active} role="option" aria-selected={active} onClick={() => { onChange(o.date); setOpen(false); }} style={{ ...chip(active), width: "100%", justifyContent: "center", textAlign: "center", display: "flex" }}>
                  {o.name}
                </button>
              );
            })}
          </div>
          <div style={{ textAlign: "center", color: c.textHint, fontSize: typeScale.micro.size, marginBottom: space.xs }}>{PICK_OR_DATE}</div>
          <CalendarGrid date={date} latestDate={latestDate} onPick={(iso) => { onChange(iso); setOpen(false); }} />
        </div>,
        document.body,
      )}
    </div>
  );
}

export function DayNav({ date, onChange, loading, latestDate }: Props) {
  const c = themeColors(useTheme());
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(open);
  const pos = usePopoverPosition(presence.mounted, anchorRef, POPOVER_WIDTH);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, anchorRef);
  // Any choice of day closes the calendar — a date in it, a preset chip (PinStrip, a sibling), or Live — because each one lands as a new `date`.
  useEffect(() => { setOpen(false); }, [date]);
  // The last day that can be played: the archive's last available day, never simply yesterday (EPA publishes with a lag). Until it is known, nothing past the pins is offered.
  const last = latestDate;


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

  return (
    <div ref={anchorRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: `var(--chip-inset, ${CONTROL.gap}px)`, height: `var(--ctl-inner, ${CONTROL.inner}px)`, whiteSpace: "nowrap" }}>
      {/* Order: ‹ [calendar icon + date] › Live. The date itself opens the calendar; live reads "Last 24h" with the next arrow disabled. ‹ from live is yesterday's full day; › from yesterday is live again. */}
      <button className="scene-chip" style={chip(false)} onClick={prev} aria-label="previous day" disabled={!date && !last}><ChevronLeftIcon /></button>
      <button
        className="scene-chip"
        data-active={open}
        style={{ ...chip(open), display: "inline-flex", alignItems: "center", gap: 6, minWidth: "8em", justifyContent: "center", opacity: loading ? 0.5 : 1 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${NAV_CALENDAR}: ${date ? labelOf(date) : NAV_LAST_24H}`}
      >
        <CalendarIcon size={14} />
        {/* The date keeps the data face: it is a reading, not a control label. The widest label the chip can show is laid out in the same cell, hidden, so the chip is one width whatever the day (Shoro, 2026-09-16: it grew and shrank with the date's digits); the data face is monospaced, so the widest label is the longest, a two-digit day with the year. */}
        <span style={{ display: "inline-grid", textAlign: "center" }}>
          <span style={{ gridArea: "1 / 1", color: c.textPrimary, fontFamily: families.data, letterSpacing: 0 }}>{date ? labelOf(date) : NAV_LAST_24H}</span>
          <span aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden", fontFamily: families.data, letterSpacing: 0 }}>{WIDEST_DATE_LABEL}</span>
        </span>
      </button>
      <button className="scene-chip" style={chip(false)} onClick={next} aria-label="next day" disabled={!date}><ChevronRightIcon /></button>
      <button className="scene-chip" data-active={date === null} style={chip(date === null)} onClick={() => onChange(null)}>{NAV_LIVE}</button>

      {presence.mounted && createPortal(
        <div className="glass frosted scene-popover" role="dialog" aria-label={NAV_CALENDAR} style={{ ...popoverStyle(c, presence.visible), left: pos.left, top: pos.top }}>
          <CalendarGrid date={date} latestDate={latestDate} onPick={(iso) => { onChange(iso); setOpen(false); }} />
        </div>,
        document.body,
      )}
    </div>
  );
}

// PinStrip — the measured days as chips (§2.2), its own pill in the scaffold, always one row.
export function PinStrip({ date, onChange }: { date: string | null; onChange: (date: string | null) => void }) {
  const c = themeColors(useTheme());
  const ref = useRef<HTMLDivElement>(null);

  // One row, always (2026-09-15): the chips never wrap, so the pill's fit-content is exact and needs no script; when the day group cannot hold this pill beside the date pill, the group wraps the whole pill onto its own row (index.css). A chip folding onto a second line inside the pill read as an overflow.
  return (
    <div ref={ref} style={{ display: "flex", flexWrap: "nowrap", gap: `var(--chip-inset, ${CONTROL.gap}px)` }}>
      {PINS.map((p) => {
        const active = date === p.date;
        return (
          <button
            key={p.date}
            onClick={() => onChange(p.date)}
            title={labelOf(p.date)}
            className="scene-chip"
            data-active={active}
            style={chipStyle(c, active)}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
