// cursors — the page's cursors as SVG data URIs (CURSOR in theme.ts): a ring by default, a heavier ring over clickables, and the Lucide play or pause glyph over the sky. Each carries a soft shadow so it reads over a bright noon and a night alike. Set once at the scene root as custom properties; index.css assigns them.
import { CURSOR } from "../utils/theme";

const S = CURSOR.size, C = S / 2;
const svg = (inner: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="${CURSOR.shadow}"/></filter></defs><g filter="url(#s)">${inner}</g></svg>`)}") ${C} ${C}`;

const ring = (r: number, w: number) => svg(`<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${CURSOR.colour}" stroke-width="${w}"/>`);
// Lucide's play and pause on the 24 grid, centred in the 32 box; the play triangle shifted a unit right to sit on its optical centre.
const play = () => svg(`<g transform="translate(${C - 12 + 1} ${C - 12})"><polygon points="6 3 20 12 6 21 6 3" fill="${CURSOR.colour}" stroke="${CURSOR.colour}" stroke-width="2" stroke-linejoin="round"/></g>`);
const pause = () => svg(`<g transform="translate(${C - 12} ${C - 12})"><rect x="14" y="4" width="4" height="16" rx="1" fill="${CURSOR.colour}"/><rect x="6" y="4" width="4" height="16" rx="1" fill="${CURSOR.colour}"/></g>`);

export function cursorVars(): Record<string, string> {
  return {
    "--cursor-ring": ring(CURSOR.ring.radius, CURSOR.ring.stroke),
    "--cursor-pointer": ring(CURSOR.pointer.radius, CURSOR.pointer.stroke),
    "--cursor-play": play(),
    "--cursor-pause": pause(),
  };
}
