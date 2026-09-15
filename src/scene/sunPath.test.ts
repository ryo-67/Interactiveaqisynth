import { describe, expect, it } from "vitest";
import { project, sunAlongPath, visible } from "./sunPath";
import type { SunAngles } from "./solar";

const cam = { facingDeg: 180, aspect: 16 / 9 };
const sample = (A: SunAngles, B: SunAngles) => Array.from({ length: 101 }, (_, i) => sunAlongPath(A, B, i / 100, cam));

// On screen, while visible, the sun must never reverse vertically or horizontally.
function screenMonotonic(path: SunAngles[]) {
  const pts = path.map((s) => (visible(s, cam) ? project(s, cam) : null));
  let dyPrev = 0, dxPrev = 0, ok = true;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (!a || !b) continue;
    const dy = b.y - a.y, dx = b.x - a.x;
    if (Math.abs(dy) > 1e-9 && Math.abs(dyPrev) > 1e-9 && Math.sign(dy) !== Math.sign(dyPrev)) ok = false;
    if (Math.abs(dx) > 1e-9 && Math.abs(dxPrev) > 1e-9 && Math.sign(dx) !== Math.sign(dxPrev)) ok = false;
    if (Math.abs(dy) > 1e-9) dyPrev = dy;
    if (Math.abs(dx) > 1e-9) dxPrev = dx;
  }
  return ok;
}
const elevationMonotonic = (path: SunAngles[]) => {
  const d = path[path.length - 1].elevationDeg - path[0].elevationDeg;
  for (let i = 1; i < path.length; i++) { const s = path[i].elevationDeg - path[i - 1].elevationDeg; if (Math.abs(s) > 1e-6 && Math.sign(s) !== Math.sign(d)) return false; }
  return true;
};

describe("sunAlongPath", () => {
  const live4pm = { azimuthDeg: 241.4, elevationDeg: 33.5 };
  const ozone11pm = { azimuthDeg: 329.9, elevationDeg: -21.2 };
  const noon = { azimuthDeg: 159.1, elevationDeg: 51.2 };
  const evening = { azimuthDeg: 297.5, elevationDeg: 3.1 };
  const morning = { azimuthDeg: 150, elevationDeg: 30 }; // both inside the frame (the frame spans ±47° of azimuth about south at 16:9)
  const afternoon = { azimuthDeg: 215, elevationDeg: 40 };

  it("ends where it should", () => {
    for (const [A, B] of [[live4pm, ozone11pm], [ozone11pm, live4pm], [noon, evening], [morning, afternoon]]) {
      const end = sunAlongPath(A, B, 1, cam);
      expect(Math.abs(end.elevationDeg - B.elevationDeg)).toBeLessThan(0.01);
      expect(Math.abs(((end.azimuthDeg - B.azimuthDeg + 540) % 360) - 180)).toBeLessThan(0.01);
    }
  });
  it("a setting sun goes down and right on screen, never back up (live 4 pm → Ozone Spike 11 pm)", () => {
    const path = sample(live4pm, ozone11pm);
    expect(screenMonotonic(path)).toBe(true);
    expect(elevationMonotonic(path)).toBe(true);
  });
  it("a rising sun comes in at the edge and climbs, never back down (Ozone Spike 11 pm → live 4 pm)", () => {
    const path = sample(ozone11pm, live4pm);
    expect(screenMonotonic(path)).toBe(true);
    expect(elevationMonotonic(path)).toBe(true);
  });
  it("noon → evening behind the camera: down and right, then out", () => {
    const path = sample(noon, evening);
    expect(screenMonotonic(path)).toBe(true);
    // Never over the top. A straight screen line crossing the centre column can read a fraction of a degree higher in elevation at the same screen height; that is the projection, not a climb, so the tolerance is a degree.
    expect(path.some((s) => s.elevationDeg > noon.elevationDeg + 1)).toBe(false);
  });
  it("two visible suns: a straight screen line", () => {
    const path = sample(morning, afternoon);
    expect(path.every((s) => visible(s, cam))).toBe(true);
    expect(screenMonotonic(path)).toBe(true);
  });
  it("two hidden suns: angles only, elevation monotonic", () => {
    const path = sample({ azimuthDeg: 20, elevationDeg: -40 }, ozone11pm);
    expect(path.every((s) => !visible(s, cam))).toBe(true);
    expect(elevationMonotonic(path)).toBe(true);
  });
});
