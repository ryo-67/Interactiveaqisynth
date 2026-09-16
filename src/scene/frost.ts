// frost — the registry of glass rectangles the sky blurs behind (D-50, 2026-09-16). Every Glass registers its element; the sky reads where they are, how round they are and how much material they carry (--glass-on, which a page animates to dissolve its panels), and FrostEffect draws the blurred sky inside exactly those shapes. The browser's backdrop-filter is gone from the panels: Chromium re-rasterised a blur in tiles and Firefox re-blurred only the strip a moving cursor had dirtied, each painting bands across the frost that no CSS could reach. Rectangles are in the canvas's own CSS pixels, y down from its top left.
// When the sky reads them (2026-09-16): every frame while anything can move a panel, and four times a second otherwise. Reading sixteen rectangles and styles a frame forced layout right after every React commit; at rest nothing moves, so the slow poll is the safety net and the busy window is the rule. The scene declares the windows it knows (a page switch and its fade, a drag, a resize, the fonts arriving); a glass changing size (the hero cards' measured widths, a row re-flowing) declares its own through a ResizeObserver here.
const els = new Set<HTMLElement>();
let busyUntil = 0;
const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => frostBusy(500)) : null;

export function registerFrost(el: HTMLElement): () => void {
  els.add(el);
  observer?.observe(el);
  frostBusy(500);
  return () => { els.delete(el); observer?.unobserve(el); frostBusy(500); };
}

// Ask for per-frame reads for the next `ms`: a movement is under way or about to be.
export function frostBusy(ms: number): void {
  busyUntil = Math.max(busyUntil, performance.now() + ms);
}
export function frostIsBusy(now: number): boolean {
  return now < busyUntil;
}

// Fills `rect` (centre x, centre y, half width, half height) and `radiusOn` (corner radius, material amount) for every registered element that is on the canvas and has any material; returns the count. One computed style and one rect per element.
export function collectFrost(canvas: DOMRect, rect: Float32Array, radiusOn: Float32Array, max: number): number {
  let n = 0;
  for (const el of els) {
    if (n >= max) break;
    const cs = getComputedStyle(el);
    const on = parseFloat(cs.getPropertyValue("--glass-on"));
    if (!(on > 0.001)) continue; // dissolved: a page that is off screen or mid-travel
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.bottom <= canvas.top || r.top >= canvas.bottom || r.right <= canvas.left || r.left >= canvas.right) continue;
    const radius = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.width / 2, r.height / 2); // a pill's 999px is its half height
    rect[n * 4] = r.left - canvas.left + r.width / 2;
    rect[n * 4 + 1] = r.top - canvas.top + r.height / 2;
    rect[n * 4 + 2] = r.width / 2;
    rect[n * 4 + 3] = r.height / 2;
    radiusOn[n * 2] = radius;
    radiusOn[n * 2 + 1] = Math.min(1, on);
    n++;
  }
  return n;
}
