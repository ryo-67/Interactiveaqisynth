// About — the liner notes (D-56, 2026-09-16): what the piece is, how each pollutant becomes sound, what the sky and the air are drawn from, where the data comes from, and who made it. Opened from the Patch notes button. Not a panel over the page but the page receding behind a scrim: a full-viewport backdrop blur of everything beneath (the sky, the plume, the panels, all still moving under it: theme.ts ABOUT) under a dark tint that holds AA for the text on the brightest sky (ABOUT.tintAlpha). The reading is one left-aligned column in the page's own type (the heading face for the title, the caption caps for the labels, the body size for everything else), ending as a letter does, the credit at the column's right with its links, glyphs alone, in a row beneath (below laptop, centred); it rises a few pixels as it dissolves in with the scrim, all at once. Under prefers-reduced-motion the fade is ABOUT.reducedMs.
// The way out is the Patch notes button itself (Shoro, 2026-09-16; Transport.tsx AboutButton morphs in place, stacked above this overlay). The overlay is drawn inside the scaffold, not in a portal, so that stacking is one z-order. A mask band across the scroll surface's bottom, the button's row, keeps the reading from showing behind it below laptop. Escape and a press on the scrim close the overlay too. Focus goes to the title on open and back to the button on close; everything else in the scaffold is inert behind it (ScenePage). The overlay scrolls on its own; the page never does.
import React, { useEffect, useLayoutEffect, useRef, useState, memo } from "react";
import { useTheme, themeColors, families, typeScale, CONTROL, ABOUT as T, REDUCED_MOTION, ABOUT_FADE_MS } from "../utils/theme";
import { ABOUT, CREDIT_URL, LINKEDIN_URL, GITHUB_URL, PORTFOLIO_RECORD_URL, RECORD_LINK } from "../content";
import { chipStyle } from "./chip";
import { weeksBehind } from "../utils/time";
import { CircleUserRoundIcon, LinkedinIcon, GithubIcon } from "./icons";
import { usePresence } from "./usePresence";

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>; // the Patch notes button: focus returns to it on close, and the mask band below laptop is sized from its slot
  latestDate: string | null; // the archive's last day: the calendar footer's own value, from which {weeks} is computed
}


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

export const About = memo(function About({ open, onClose, anchorRef, latestDate }: Props) {
  const c = themeColors(useTheme());
  const { mounted, visible } = usePresence(open, ABOUT_FADE_MS);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [top, setTop] = useState(0); // where the phone's close sits in the overlay (D-64): the reading's title is set on its row
  const [band, setBand] = useState(0); // the mask band's height below laptop: from the button's row to the bottom edge

  // The mask band: from the button's row up to the bottom edge, with a margin. Re-read on every resize.
  useLayoutEffect(() => {
    if (!mounted) return;
    const measure = () => {
      const slot = anchorRef.current?.closest(".scene-patch-slot")?.getBoundingClientRect();
      const bottom = rootRef.current?.getBoundingClientRect().bottom ?? window.innerHeight; // the overlay's own bottom, which is the reading's: the window between Safari's bars, not innerHeight, whose meaning under the bars is Safari's (BUG-57)
      // A slot in the upper half of the overlay is the phone's notebook in the top bar (D-64): the title is set on its row and the reading runs on below it, and nothing sits at the bottom to fade under, so there is no band. A slot in the lower half is the footer's pill, as before.
      const rootTop = rootRef.current?.getBoundingClientRect().top ?? 0;
      const upper = !!slot && slot.top - rootTop < (bottom - rootTop) / 2;
      setTop(upper && slot ? Math.max(0, slot.top - rootTop) : 0);
      setBand(slot && !upper ? Math.max(0, bottom - slot.top) : 0);
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
    "--about-ms": `${ABOUT_FADE_MS}ms`,
    "--about-blur": T.blur,
    "--about-saturate": String(T.saturate),
    "--about-rise": `${T.rise}px`,
    "--about-col": `${T.column}px`,
    "--about-band": `${band}px`,
    "--about-top": `${top}px`,
    "--chip-hover": String(CONTROL.hoverAlpha),
    "--chip-hover-active": String(CONTROL.hoverActiveAlpha),
    "--state-ms": `${CONTROL.stateMs}ms`,
  } as React.CSSProperties;
  const bodyStyle: React.CSSProperties = { fontFamily: families.ui, fontSize: typeScale.body.size, lineHeight: typeScale.body.line, color: c.textSecondary };
  const labelStyle: React.CSSProperties = { fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: typeScale.caption.line, letterSpacing: CONTROL.capsTracking, textTransform: "uppercase", color: c.textMuted, fontWeight: 400 }; // muted, like the page's labels; the tint is set so it still holds AA on the brightest sky (theme.ts ABOUT.tintAlpha)
  const creditStyle: React.CSSProperties = { ...bodyStyle, fontSize: typeScale.caption.size, lineHeight: 1.6 }; // the credit a size below the body (Shoro, 2026-09-16)
  // The link chips: the chip style in its inactive state at the control height, a glyph before each label, the chips' own hover (the scene-chip class) and the button family's press.
  // Round, the glyph alone (Shoro, 2026-09-16: the labels did not fit every width); the name is the accessible label and the title. The size is a custom property so the breakpoint can set it: on a touch screen these are the only targets on the page without a row of their own, and 32 is under the 44 a thumb wants (Shoro, 2026-09-17).
  const linkStyle = { ...chipStyle(c, false, { padding: 0, width: "var(--about-link-size)", height: "var(--about-link-size)", borderRadius: "999px" }), textDecoration: "none", color: c.textSecondary } as React.CSSProperties;
  return (
    <div ref={rootRef} className="scene-about" data-visible={visible} data-reduced={REDUCED_MOTION} style={vars}>
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
            {/* The record (2026-10-13): this piece's own entry on the portfolio, under the credit it belongs to. A plain link in the credit's size, a step brighter than the muted line above it so it holds 4.5:1 on the brightest sky behind the scrim (about 6:1); the site's name in the data face, and no record number (D-72: the portfolio renumbers its records). It opens a new tab, so the phrase playing underneath is never interrupted. */}
            <a className="scene-about-record" href={PORTFOLIO_RECORD_URL} target="_blank" rel="noopener noreferrer" aria-label={RECORD_LINK.name} style={{ ...creditStyle, color: c.textSecondary }}>
              <span>{RECORD_LINK.before}<span className="scene-about-record-mark" style={{ fontFamily: families.data }}>{RECORD_LINK.mark}</span>{RECORD_LINK.after}</span>
              <span aria-hidden="true">↗</span>
            </a>
            <div className="scene-about-links">
              <a className="scene-chip scene-about-link" href={CREDIT_URL} target="_blank" rel="noreferrer" aria-label={ABOUT.links.website} title={ABOUT.links.website} style={linkStyle}><CircleUserRoundIcon size={16} /></a>
              <a className="scene-chip scene-about-link" href={LINKEDIN_URL} target="_blank" rel="noreferrer" aria-label={ABOUT.links.linkedin} title={ABOUT.links.linkedin} style={linkStyle}><LinkedinIcon size={16} /></a>
              <a className="scene-chip scene-about-link" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={ABOUT.links.github} title={ABOUT.links.github} style={linkStyle}><GithubIcon size={16} /></a>
            </div>
            <p className="scene-about-body scene-about-made" style={{ ...creditStyle, color: c.textMuted }}>{ABOUT.made}</p>
          </footer>
        </article>
      </div>
    </div>
  );
});
