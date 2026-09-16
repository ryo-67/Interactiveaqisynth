// frost — the registry of glass rectangles the sky blurs behind (D-50, 2026-09-16). Every Glass registers its element; each frame the sky reads where they are, how round they are and how much material they carry (--glass-on, which a page animates to dissolve its panels), and FrostEffect draws the blurred sky inside exactly those shapes. The browser's backdrop-filter is gone from the panels: Chromium re-rasterised a blur in tiles and Firefox re-blurred only the strip a moving cursor had dirtied, each painting bands across the frost that no CSS could reach. Rectangles are in the canvas's own CSS pixels, y down from its top left.
const els = new Set<HTMLElement>();

export function registerFrost(el: HTMLElement): () => void {
  els.add(el);
  return () => { els.delete(el); };
}

// Fills `rect` (centre x, centre y, half width, half height) and `radiusOn` (corner radius, material amount) for every registered element that is on the canvas and has any material; returns the count. Called every animation frame, so it reads only what it must: one computed style and one rect per element.
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
