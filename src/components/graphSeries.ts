// graphSeries — the curve through the graph's hourly points. The AQI series itself comes from the session (engine/aqi.ts, the hourly composite), so the line, the word and the number are one computation.
// A smooth curve through the hourly points that never overshoots them — a monotone cubic (Fritsch–Carlson), so an AQI on the curve is never higher than any reading around it. Null hours break the curve into runs; between runs there is no line. Returns the value at a fractional index, or null in a gap. Used for the line and for the fill's height under it, so the two always agree.
export function monotoneCurve(vals: ReadonlyArray<number | null>): (index: number) => number | null {
  const n = vals.length;
  // Slopes per point, per run of non-null values.
  const m: number[] = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    if (vals[i] == null) { i++; continue; }
    let j = i; while (j + 1 < n && vals[j + 1] != null) j++;
    const len = j - i + 1;
    if (len >= 2) {
      const d: number[] = [];
      for (let k = i; k < j; k++) d.push((vals[k + 1] as number) - (vals[k] as number));
      m[i] = d[0]; m[j] = d[d.length - 1];
      for (let k = i + 1; k < j; k++) {
        const a = d[k - 1 - i], b = d[k - i];
        m[k] = a * b <= 0 ? 0 : (a + b) / 2; // a local extremum gets a flat tangent
      }
      for (let k = i; k < j; k++) {
        const dk = d[k - i];
        if (dk === 0) { m[k] = 0; m[k + 1] = 0; continue; }
        const alpha = m[k] / dk, beta = m[k + 1] / dk, h = Math.hypot(alpha, beta);
        if (h > 3) { const tau = 3 / h; m[k] = tau * alpha * dk; m[k + 1] = tau * beta * dk; }
      }
    }
    i = j + 1;
  }
  return (x: number) => {
    if (x < 0 || x > n - 1) return null;
    const k = Math.min(n - 2, Math.floor(x));
    const va = vals[k], vb = vals[k + 1];
    if (va == null) return x === k ? null : null;
    if (vb == null) return x === k ? va : null;
    const t = x - k, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * va + (t3 - 2 * t2 + t) * m[k] + (-2 * t3 + 3 * t2) * vb + (t3 - t2) * m[k + 1];
  };
}

// fitTicks — which y-axis labels fit the plot (Shoro, 2026-10-05: a short phone or landscape plot does not need every label). The ticks are the values the gridlines mark; a label is kept only if it sits at least minGapPx below the last label kept, walking down from the highest tick on the scale, so the top of the scale is always named and the rest thin out evenly as the plot gets shorter. innerPx is the height the scale spans; the gridlines themselves all stay. Returned in ascending order, like the input.
export function fitTicks(ticks: readonly number[], max: number, innerPx: number, minGapPx: number): number[] {
  const onScale = ticks.filter((v) => v / max <= 1.001).sort((a, b) => b - a);
  const kept: number[] = [];
  let lastY = -Infinity;
  for (const v of onScale) {
    const y = (1 - v / max) * innerPx; // px below the top of the scale
    if (kept.length === 0 || y - lastY >= minGapPx) { kept.push(v); lastY = y; }
  }
  return kept.reverse();
}
