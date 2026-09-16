// LensFieldEffect — particulate as a refraction of the sky itself (§5.2 item 2). A screen-space field of soft lenses displaces the rendered frame beneath each one, magnifying and bending the sky, with each colour channel displaced by a slightly different amount so the warp disperses into spectrum, and a faint caustic at each rim. Nothing is drawn as an object: no geometry, so no perspective ellipses and nothing that reads as a bubble — the sky is what refracts.
// MAPPING (PM2.5 → lens count and strength): level 0..1 from absolute PM2.5 (particleLevel); the number of active lenses and their strength rise with it. Lenses drift slowly; drift stops under prefers-reduced-motion.
import { Effect, BlendFunction, EffectAttribute } from "postprocessing";
import { Uniform, Vector4 } from "three";
import { PARTICLES } from "../utils/theme";

const MAX = PARTICLES.max;

const fragment = /* glsl */ `
uniform vec4 uLens[${MAX}]; // x, y in uv; radius in units of frame height; strength
uniform float uLevel; // 0..1; lens i is fully in once uLevel·MAX exceeds i+1, and grows in over the unit before
uniform float uAspect;
uniform float uDispersion;
uniform float uRimLight;
uniform float uSwirl;
uniform float uWobble;
uniform float uTime;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // No lenses, no work (2026-09-16): at level zero every lens has zero weight and the loop below produced no displacement and no rim, the same pixel this returns; a clear day paid the loop's ${MAX} iterations per pixel for nothing.
  if (uLevel <= 0.0) { outputColor = inputColor; return; }
  vec2 disp = vec2(0.0);
  float rim = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    // Each lens GROWS in over its own slice of the level — radius from zero, bending with it — and shrinks back out the same way, rather than appearing whole and fading.
    float w = smoothstep(0.0, 1.0, uLevel * float(${MAX}) - float(i));
    if (w <= 0.0) continue;
    vec4 L = uLens[i];
    float g = 1.0 - (1.0 - w) * (1.0 - w); // ease-out on the size: quick to appear, slow to settle
    L.z *= g;
    L.w *= w;
    vec2 d = uv - L.xy;
    d.x *= uAspect; // circular lenses on a non-square frame
    float ang = atan(d.y, d.x);
    float ph = float(i) * 1.7;
    // The outline breathes: the radius varies around the rim with angle and time, so no lens is a disc for long.
    float wob = 1.0 + uWobble * sin(3.0 * ang + uTime + ph) + 0.5 * uWobble * sin(5.0 * ang - 0.7 * uTime + 2.0 * ph);
    float R = L.z * wob;
    float r = length(d) / R;
    if (r < 1.0) {
      // A sphere-like lens profile: displacement grows from the middle and returns to zero at the edge, so the sky inside is magnified and bent and the edge stays continuous with the frame around it. A tangential term turns the sky inside as well.
      float k = 4.0 * r * (1.0 - r) * (1.0 - r);
      vec2 dir = d / max(length(d), 1e-4);
      vec2 tang = vec2(-dir.y, dir.x);
      dir.x /= uAspect; tang.x /= uAspect;
      disp += (-dir + tang * uSwirl * sin(uTime * 0.3 + ph)) * k * L.w * R;
      rim += exp(-pow((r - 0.86) / 0.08, 2.0)) * L.w; // light piles up at the lens edge
    }
  }
  vec2 uvR = clamp(uv + disp * (1.0 + uDispersion), 0.0, 1.0);
  vec2 uvG = clamp(uv + disp, 0.0, 1.0);
  vec2 uvB = clamp(uv + disp * (1.0 - uDispersion), 0.0, 1.0);
  vec3 c = vec3(texture2D(inputBuffer, uvR).r, texture2D(inputBuffer, uvG).g, texture2D(inputBuffer, uvB).b);
  c += rim * uRimLight;
  outputColor = vec4(c, inputColor.a);
}
`;

export class LensFieldEffect extends Effect {
  private lens: Vector4[];
  private phase: Float32Array;

  constructor() {
    const lens = Array.from({ length: MAX }, () => new Vector4(0, 0, 0.1, 0));
    super("LensFieldEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      // CONVOLUTION: the shader samples inputBuffer at displaced coordinates, so it must run in a pass of its own that reads the previous pass's output. Without the attribute the composer merged it into the bloom's pass, where inputBuffer is the raw scene: the lens re-sampled that and handed on the raw pixels, discarding the bloom and the grade computed before it in the same pass. The r3f wrappers re-created effects on every change and appended each at the end of the list, so the order shuffled and bloom survived only when it happened to land after the lens — the intermittent washed-out sky (found 2026-09-15).
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["uLens", new Uniform(lens)],
        ["uLevel", new Uniform(0)],
        ["uAspect", new Uniform(1)],
        ["uDispersion", new Uniform(PARTICLES.dispersion)],
        ["uRimLight", new Uniform(PARTICLES.rimLight)],
        ["uSwirl", new Uniform(PARTICLES.swirl)],
        ["uWobble", new Uniform(PARTICLES.wobble)],
        ["uTime", new Uniform(0)],
      ]),
    });
    this.lens = lens;
    // Seeded start positions and radii: the same field every visit.
    let a = 19730607;
    const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    this.phase = new Float32Array(MAX);
    const lr = Math.log(PARTICLES.radius.max / PARTICLES.radius.min);
    for (let i = 0; i < MAX; i++) {
      lens[i].set(rnd(), rnd(), PARTICLES.radius.min * Math.exp(rnd() * lr), PARTICLES.strength);
      this.phase[i] = rnd() * Math.PI * 2;
    }
  }

  // Called each frame by the wrapper: level 0..1 sets how many lenses act and how strongly; time drives the drift.
  setState(level: number, aspect: number, time: number, dt: number, drift: boolean): void {
    const l = Math.max(0, Math.min(1, level));
    (this.uniforms.get("uLevel") as Uniform).value = l;
    (this.uniforms.get("uAspect") as Uniform).value = aspect;
    if (drift) (this.uniforms.get("uTime") as Uniform).value = time * PARTICLES.wobbleHz * Math.PI * 2;
    for (let i = 0; i < MAX; i++) {
      const L = this.lens[i];
      if (drift) {
        L.y -= PARTICLES.fallPerSec * dt; // uv y = 0 is the bottom of the frame, so falling is decreasing y
        L.x += Math.sin(time * 0.4 + this.phase[i]) * PARTICLES.swayPerSec * dt;
        if (L.y < -L.z) L.y += 1 + 2 * L.z;
        if (L.x > 1 + L.z) L.x -= 1 + 2 * L.z; else if (L.x < -L.z) L.x += 1 + 2 * L.z;
      }
      L.w = PARTICLES.strength * (0.6 + 0.4 * l); // stronger bending as the level rises
    }
  }
}
