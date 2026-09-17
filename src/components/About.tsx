// About — the liner notes (D-56, 2026-09-16): what the piece is, how each pollutant becomes sound, what the sky and the air are drawn from, where the data comes from, and who made it. Opened from the Patch notes button. Not a panel over the page but the page receding behind a scrim: a full-viewport backdrop blur of everything beneath (the sky, the plume, the panels, all still moving under it: theme.ts ABOUT) under a dark tint that holds AA for the text on the brightest sky (ABOUT.tintAlpha). The reading is one left-aligned column in the page's own type (the heading face for the title, the caption caps for the labels, the body size for everything else), ending as a letter does, the credit at the column's right with its links, glyphs alone, in a row beneath (below laptop, centred); it rises a few pixels as it dissolves in with the scrim, all at once. Under prefers-reduced-motion the fade is ABOUT.reducedMs.
// The way out is the Patch notes button itself (Shoro, 2026-09-16; Transport.tsx AboutButton morphs in place, stacked above this overlay). The overlay is drawn inside the scaffold, not in a portal, so that stacking is one z-order. A mask band across the scroll surface's bottom, the button's row, keeps the reading from showing behind it below laptop. Escape and a press on the scrim close the overlay too. Focus goes to the title on open and back to the button on close; everything else in the scaffold is inert behind it (ScenePage). The overlay scrolls on its own; the page never does.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme, themeColors, families, typeScale, motion, CONTROL, ABOUT as T } from "../utils/theme";
import { ABOUT, CREDIT_URL, LINKEDIN_URL, GITHUB_URL } from "../content";
import { chipStyle } from "./chip";
import { CircleUserRoundIcon, LinkedinIcon, GithubIcon } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>; // the Patch notes button: focus returns to it on close, and the mask band below laptop is sized from its slot
  latestDate: string | null; // the archive's last day: the calendar footer's own value, from which {weeks} is computed
}

const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const FADE_MS = REDUCED ? T.reducedMs : motion.beatMs * T.fadeBeats;

// How far the archive runs behind today, in whole weeks, from its last available day: "about {weeks} weeks behind".
// No paragraph ends on a word by itself, at any width (Shoro, 2026-09-17). The last space in a run of prose becomes a non-breaking one, which is the only way to say it that a wrap cannot ignore: text-wrap: pretty below asks the browser to even out the last lines, but it is a preference, not a rule, and it says nothing at a width where the last line can only hold one word. Tying the last two words means the pair goes over together instead.
function noOrphan(text: string): string {
  const i = text.lastIndexOf(" ");
  return i < 0 ? text : `${text.slice(0, i)}\u00a0${text.slice(i + 1)}`;
}

// A line with one phrase held together: the phrase goes in a nowrap run, so a wrap puts it on the next line whole rather than breaking it up (content.ts ABOUT.creditKeep). If the phrase is not in the line, the line is returned untouched.
function keepTogether(line: string, phrase: string): React.ReactNode {
  const i = phrase ? line.indexOf(phrase) : -1;
  if (i < 0) return line;
  return (<>{line.slice(0, i)}<span style={{ whiteSpace: "nowrap" }}>{phrase}</span>{line.slice(i + phrase.length)}</>);
}

export function weeksBehind(latestDate: string | null, now = Date.now()): number | null {
  if (!latestDate) return null;
  const t = Date.parse(`${latestDate}T12:00:00`);
  return Number.isFinite(t) ? Math.max(1, Math.round((now - t) / (7 * 86400e3))) : null;
}

export function About({ open, onClose, anchorRef, latestDate }: Props) {
  const c = themeColors(useTheme());
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [band, setBand] = useState(0); // the mask band's height below laptop: from the button's row to the bottom edge
  // Mount, then a frame later declare visible so the transitions run from the base state; on close, leave the DOM once the fade is over.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  // The mask band: from the button's row up to the bottom edge, with a margin. Re-read on every resize.
  useLayoutEffect(() => {
    if (!mounted) return;
    const measure = () => {
      const slot = anchorRef.current?.closest(".scene-patch-slot")?.getBoundingClientRect();
      setBand(slot ? Math.max(0, window.innerHeight - slot.top) : 0); // the button's own row and the padding under it, nothing more (Shoro, 2026-09-17: the band was taller than it needed to be); the ramp above it is in index.css
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mounted, anchorRef]);

  // Focus: the title on open (tabIndex −1, so it takes focus without joining the tab order), the button on close.
  useEffect(() => {
    if (visible) titleRef.current?.focus({ preventScroll: true });
  }, [visible]);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) anchorRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open, anchorRef]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const weeks = weeksBehind(latestDate);
  const fill = (s: string) => s.replace("{weeks}", weeks == null ? "…" : String(weeks));
  const vars = {
    "--about-ms": `${FADE_MS}ms`,
    "--about-tint": T.tint,
    "--about-alpha": String(T.tintAlpha),
    "--about-blur": T.blur,
    "--about-saturate": String(T.saturate),
    "--about-rise": `${T.rise}px`,
    "--about-col": `${T.column}px`,
    "--about-band": `${band}px`,
    "--chip-hover": String(CONTROL.hoverAlpha),
    "--chip-hover-active": String(CONTROL.hoverActiveAlpha),
    "--state-ms": `${CONTROL.stateMs}ms`,
  } as React.CSSProperties;
  const bodyStyle: React.CSSProperties = { fontFamily: families.ui, fontSize: typeScale.body.size, lineHeight: typeScale.body.line, color: c.textSecondary };
  const labelStyle: React.CSSProperties = { fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: typeScale.caption.line, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted, fontWeight: 400 }; // muted, like the page's labels; the tint is set so it still holds AA on the brightest sky (theme.ts ABOUT.tintAlpha)
  const creditStyle: React.CSSProperties = { ...bodyStyle, fontSize: typeScale.caption.size, lineHeight: 1.6 }; // the credit a size below the body (Shoro, 2026-09-16)
  // The link chips: the chip style in its inactive state at the control height, a glyph before each label, the chips' own hover (the scene-chip class) and the button family's press.
  // Round, the glyph alone (Shoro, 2026-09-16: the labels did not fit every width); the name is the accessible label and the title. The size is a custom property so the breakpoint can set it: on a touch screen these are the only targets on the page without a row of their own, and 32 is under the 44 a thumb wants (Shoro, 2026-09-17).
  const linkStyle = { ...chipStyle(c, false, { padding: 0, width: "var(--about-link-size)", height: "var(--about-link-size)", borderRadius: "999px" }), textDecoration: "none", color: c.textSecondary } as React.CSSProperties;
  return (
    <div ref={rootRef} className="scene-about" data-visible={visible} data-reduced={REDUCED} style={vars}>
      <div className="scene-about-scrim" aria-hidden />
      {/* The scroll surface is the whole viewport; a press on it outside the column is a press on the scrim. */}
      <div className="scene-about-scroll" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <article className="scene-about-column" role="dialog" aria-modal="true" aria-labelledby="scene-about-title">
          <h1 id="scene-about-title" ref={titleRef} tabIndex={-1} className="scene-about-title" style={{ fontFamily: families.serifItalic, fontStyle: "italic", fontWeight: 400, fontSize: `var(--heading-size, ${typeScale.heading.size})`, lineHeight: `var(--heading-line, 40px)`, color: c.textPrimary }}>{ABOUT.title}</h1>
          <p className="scene-about-body" style={bodyStyle}>{noOrphan(ABOUT.intro)}</p>
          {ABOUT.groups.map((group) => group.map((sec) => (
            <section key={sec.label} className="scene-about-section">
              <h2 className="scene-about-label" style={labelStyle}>{sec.label}</h2>
              <p className="scene-about-body" style={bodyStyle}>{noOrphan(fill(sec.body))}</p>
            </section>
          )))}
          <footer className="scene-about-credit">
            <p className="scene-about-body" style={creditStyle}>{keepTogether(ABOUT.credit, ABOUT.creditKeep)}</p>
            <p className="scene-about-body" style={{ ...creditStyle, color: c.textMuted }}>{ABOUT.credit2}</p>
            <div className="scene-about-links">
              <a className="scene-chip scene-about-link" href={CREDIT_URL} target="_blank" rel="noreferrer" aria-label={ABOUT.links.website} title={ABOUT.links.website} style={linkStyle}><CircleUserRoundIcon size={16} /></a>
              <a className="scene-chip scene-about-link" href={LINKEDIN_URL} target="_blank" rel="noreferrer" aria-label={ABOUT.links.linkedin} title={ABOUT.links.linkedin} style={linkStyle}><LinkedinIcon size={16} /></a>
              <a className="scene-chip scene-about-link" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={ABOUT.links.github} title={ABOUT.links.github} style={linkStyle}><GithubIcon size={16} /></a>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
