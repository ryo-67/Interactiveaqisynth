// sunPath — how the sun moves during a change of day (D-33, amending D-31). The path is planned in the CAMERA'S SCREEN SPACE, because that is where the viewer judges it: a straight line on screen is monotonic in both axes by construction, whereas a path chosen in azimuth and elevation is bent by the rectilinear projection — constant-elevation paths curve upward toward the frame's edges, so a setting sun swinging toward the edge dipped and then climbed on screen. What the viewer cannot see (the sun behind the camera or below the horizon) is not judged, so those legs are interpolated in angles, with elevation monotonic.
//
// Four cases, by which endpoints are visible in the frame:
//   both visible          → one straight screen line from A to B.
//   A visible, B not      → a straight screen line from A to the EXIT point on the frame's edge, in B's direction, then angles from there to B (unseen).
//   A not visible, B is   → angles from A to the ENTRY point on the edge (unseen), then a straight screen line from there to B.
//   neither visible       → angles only; only the sky's light changes.
// The visible leg takes VISIBLE_SHARE of the time so it never looks rushed; the unseen leg takes the rest.
import { SKY_CAMERA } from "../utils/theme";
import type { SunAngles } from "./solar";

export interface SunCamera { facingDeg: number; aspect: number }
export const VISIBLE_SHARE = 0.65;
const rad = Math.PI / 180;

interface Screen { x: number; y: number } // the frame is [-1, 1] on both axes
interface Basis { f: [number, number, number]; u: [number, number, number]; r: [number, number, number]; tanH: number; tanV: number }

function basis(cam: SunCamera): Basis {
  const p = (SKY_CAMERA.fovDeg / 2 + SKY_CAMERA.horizonMarginDeg) * rad; // pitch up
  const tanV = Math.tan((SKY_CAMERA.fovDeg / 2) * rad);
  return { f: [0, Math.sin(p), -Math.cos(p)], u: [0, Math.cos(p), Math.sin(p)], r: [1, 0, 0], tanH: tanV * cam.aspect, tanV };
}
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Direction in the camera's world: azimuth measured as an offset from the facing (positive to the right), +y up, looking along −z.
function dirOf(s: SunAngles, cam: SunCamera): [number, number, number] {
  const el = s.elevationDeg * rad, phi = (s.azimuthDeg - cam.facingDeg) * rad;
  return [Math.cos(el) * Math.sin(phi), Math.sin(el), -Math.cos(el) * Math.cos(phi)];
}
function anglesOf(d: [number, number, number], cam: SunCamera): SunAngles {
  const el = Math.asin(Math.max(-1, Math.min(1, d[1]))) / rad;
  const phi = Math.atan2(d[0], -d[2]) / rad;
  return { elevationDeg: el, azimuthDeg: ((cam.facingDeg + phi) % 360 + 360) % 360 };
}
export function project(s: SunAngles, cam: SunCamera): Screen | null {
  const b = basis(cam), d = dirOf(s, cam), f = dot(d, b.f);
  if (f <= 1e-6) return null; // behind the camera
  return { x: dot(d, b.r) / f / b.tanH, y: dot(d, b.u) / f / b.tanV };
}
export function unproject(p: Screen, cam: SunCamera): SunAngles {
  const b = basis(cam);
  const d: [number, number, number] = [
    b.f[0] + p.x * b.tanH * b.r[0] + p.y * b.tanV * b.u[0],
    b.f[1] + p.x * b.tanH * b.r[1] + p.y * b.tanV * b.u[1],
    b.f[2] + p.x * b.tanH * b.r[2] + p.y * b.tanV * b.u[2],
  ];
  const n = Math.hypot(d[0], d[1], d[2]);
  return anglesOf([d[0] / n, d[1] / n, d[2] / n], cam);
}
export function visible(s: SunAngles, cam: SunCamera): boolean {
  const p = project(s, cam);
  return !!p && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
}

// Where a screen line from `from` toward `toward` leaves the frame [-1, 1]². `toward` may lie outside the frame.
function edgePoint(from: Screen, toward: Screen): Screen {
  const dx = toward.x - from.x, dy = toward.y - from.y;
  let t = Infinity;
  for (const [d, o] of [[dx, from.x], [dy, from.y]] as const) {
    if (d > 1e-9) t = Math.min(t, (1 - o) / d);
    else if (d < -1e-9) t = Math.min(t, (-1 - o) / d);
  }
  if (!Number.isFinite(t)) return { x: Math.max(-1, Math.min(1, from.x)), y: Math.max(-1, Math.min(1, from.y)) };
  return { x: from.x + dx * t, y: from.y + dy * t };
}

// A stand-in screen point for a sun that has no projection (behind the camera) or sits far outside the frame: its azimuth side, and its elevation seen at the frame's edge. Used only to aim the exit or entry.
function aim(s: SunAngles, cam: SunCamera): Screen {
  const p = project(s, cam);
  if (p && Math.abs(p.x) < 4 && Math.abs(p.y) < 4) return p;
  const phi = ((s.azimuthDeg - cam.facingDeg + 540) % 360) - 180; // −180..180
  const side = phi >= 0 ? 1 : -1;
  const edgePhi = Math.atan(basis(cam).tanH) / rad; // the frame's horizontal half-angle
  const atEdge = project({ azimuthDeg: cam.facingDeg + side * Math.min(edgePhi, 80), elevationDeg: Math.max(-5, Math.min(60, s.elevationDeg)) }, cam);
  return { x: side * 3, y: atEdge ? atEdge.y : -1 };
}

const angleLerp = (a: SunAngles, b: SunAngles, t: number): SunAngles => {
  let d = (b.azimuthDeg - a.azimuthDeg) % 360; if (d > 180) d -= 360; if (d < -180) d += 360;
  return { elevationDeg: a.elevationDeg + (b.elevationDeg - a.elevationDeg) * t, azimuthDeg: ((a.azimuthDeg + d * t) % 360 + 360) % 360 };
};
const screenLerp = (a: Screen, b: Screen, t: number): Screen => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// The sun's position at progress t (0..1, already eased) along the path from A to B.
export function sunAlongPath(A: SunAngles, B: SunAngles, t: number, cam: SunCamera): SunAngles {
  const pa = project(A, cam), pb = project(B, cam);
  const visA = visible(A, cam), visB = visible(B, cam);
  if (visA && visB && pa && pb) return unproject(screenLerp(pa, pb, t), cam);
  if (visA && pa) {
    const exit = edgePoint(pa, aim(B, cam));
    if (t < VISIBLE_SHARE) return unproject(screenLerp(pa, exit, t / VISIBLE_SHARE), cam);
    return angleLerp(unproject(exit, cam), B, (t - VISIBLE_SHARE) / (1 - VISIBLE_SHARE));
  }
  if (visB && pb) {
    const entry = edgePoint(pb, aim(A, cam));
    const hidden = 1 - VISIBLE_SHARE;
    if (t < hidden) return angleLerp(A, unproject(entry, cam), t / hidden);
    return unproject(screenLerp(entry, pb, (t - hidden) / VISIBLE_SHARE), cam);
  }
  return angleLerp(A, B, t);
}
