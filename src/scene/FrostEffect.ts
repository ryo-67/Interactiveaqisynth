// FrostEffect — the glass material's blur, rendered by the sky itself (D-50, 2026-09-16). The last effect in the sky's chain: it blurs the finished frame with a mipmap (dual-filter) blur, the pass the bloom uses, and inside every registered glass rectangle (frost.ts) replaces the sharp sky with the blurred one, saturated as the CSS filter saturated it. The DOM panel over it keeps its tint, edge, shadow, dither and contents; only the blur moved. Why: the browser's backdrop-filter is computed in the compositor's tiles, and both Chromium (tile seams under a moving layer) and Firefox (a re-blur of only the strip the cursor dirtied, on a different sampling grid from the cached rest) painted bands across it. A blur the scene draws itself is the same on every frame and every browser.
// MAPPING: none. The frost carries no data; it is the material the readouts sit on (§5.3).
import { Effect, MipmapBlurPass } from "postprocessing";
import { Uniform, Vector2, type WebGLRenderer, type WebGLRenderTarget, type TextureDataType } from "three";
import { GLASS } from "../utils/theme";
import { collectFrost } from "./frost";

export const MAX_FROST_RECTS = 24; // every glass on the page at once: the bars' pills, the page pill, the hero pair, the graph, the monitor's seven cards

const fragment = /* glsl */ `
uniform sampler2D frostMap;      // the full blur
uniform sampler2D frostLightMap; // a light blur, the way station a dissolving panel passes through
uniform vec4 uRect[${MAX_FROST_RECTS}];     // centre x, centre y, half width, half height, in the canvas's CSS pixels, y down
uniform vec2 uRadiusOn[${MAX_FROST_RECTS}]; // corner radius in CSS pixels; how much material there is (--glass-on)
uniform int uCount;
uniform vec2 uCssSize;                      // the canvas's CSS size: the mask is drawn in the page's own pixels, so its edge lands on the panel's
uniform float uSaturate;

// Signed distance to a rounded rectangle: negative inside.
float roundRect(vec2 p, vec2 hs, float r) { // hs: the half size (\`half\` is reserved in GLSL)
  vec2 q = abs(p) - hs + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
// CSS filter: saturate(s), the matrix the spec gives (the same one panelLuminance.ts uses).
vec3 saturateCss(vec3 c, float s) {
  return vec3(
    (0.213 + 0.787 * s) * c.r + (0.715 - 0.715 * s) * c.g + (0.072 - 0.072 * s) * c.b,
    (0.213 - 0.213 * s) * c.r + (0.715 + 0.285 * s) * c.g + (0.072 - 0.072 * s) * c.b,
    (0.213 - 0.213 * s) * c.r + (0.715 - 0.715 * s) * c.g + (0.072 + 0.928 * s) * c.b);
}

// The chain runs in linear light; the CSS filter saturated sRGB values, where the same matrix moves colour further. The saturation is applied in sRGB and converted back, so the token means what it meant.
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uCssSize;
  float m = 0.0;
  for (int i = 0; i < ${MAX_FROST_RECTS}; i++) {
    if (i >= uCount) break;
    vec4 R = uRect[i];
    vec2 ro = uRadiusOn[i];
    float d = roundRect(p - R.xy, R.zw, ro.x);
    m = max(m, (1.0 - smoothstep(-0.5, 0.5, d)) * ro.y); // one CSS pixel of anti-aliasing at the edge; a dissolving panel shows that much less blur
  }
  if (m <= 0.0) { outputColor = inputColor; return; }
  // A panel with part of its material (a page dissolving, --glass-on between 0 and 1) is drawn with a SMALLER blur, not with the full blur at part strength: the CSS filter scaled its radius with --glass-on, and a straight mix of the sharp sky with its full blur is a double exposure, which read as a ghost of the panel through the switch (Shoro, 2026-09-16). The way station is a light blur: from the sharp sky to it over the first half of the material, from it to the full blur over the second.
  vec3 light = texture2D(frostLightMap, uv).rgb;
  vec3 blurred = m < 0.5 ? mix(inputColor.rgb, light, m * 2.0) : mix(light, texture2D(frostMap, uv).rgb, (m - 0.5) * 2.0);
  vec3 f = toLinear(saturateCss(toSrgb(blurred), 1.0 + (uSaturate - 1.0) * m));
  outputColor = vec4(f, inputColor.a);
}
`;

export class FrostEffect extends Effect {
  private readonly blur = new MipmapBlurPass();
  private readonly blurLight = new MipmapBlurPass(); // GLASS.frost.lightLevels halvings: the small blur a dissolving panel passes through
  private readonly rect = new Float32Array(MAX_FROST_RECTS * 4);
  private readonly radiusOn = new Float32Array(MAX_FROST_RECTS * 2);
  private readonly scratchRect = new Float32Array(MAX_FROST_RECTS * 4);
  private readonly scratchRadiusOn = new Float32Array(MAX_FROST_RECTS * 2);
  private count = 0;

  constructor() {
    super("FrostEffect", fragment, {
      uniforms: new Map<string, Uniform>([
        ["frostMap", new Uniform(null)],
        ["frostLightMap", new Uniform(null)],
        ["uRect", new Uniform(new Float32Array(MAX_FROST_RECTS * 4))],
        ["uRadiusOn", new Uniform(new Float32Array(MAX_FROST_RECTS * 2))],
        ["uCount", new Uniform(0)],
        ["uCssSize", new Uniform(new Vector2(1, 1))],
        ["uSaturate", new Uniform(GLASS.frost.saturate)],
      ]),
    });
    this.blur.levels = GLASS.frost.levels;
    this.blur.radius = GLASS.frost.radius;
    this.blurLight.levels = GLASS.frost.lightLevels;
    this.blurLight.radius = GLASS.frost.radius;
    this.pixelRatio = 1;
    (this.uniforms.get("uRect") as Uniform).value = this.rect;
    (this.uniforms.get("uRadiusOn") as Uniform).value = this.radiusOn;
  }

  // Reads the registered glass rectangles against the canvas and pushes them to the shader; true when anything moved, so an on-demand canvas can be told to repaint (a page's drift moves every panel on it while the sky may be still).
  feed(canvas: HTMLCanvasElement): boolean {
    const box = canvas.getBoundingClientRect();
    const n = collectFrost(box, this.scratchRect, this.scratchRadiusOn, MAX_FROST_RECTS);
    let changed = n !== this.count;
    for (let i = 0; i < n * 4 && !changed; i++) if (this.scratchRect[i] !== this.rect[i]) changed = true;
    for (let i = 0; i < n * 2 && !changed; i++) if (this.scratchRadiusOn[i] !== this.radiusOn[i]) changed = true;
    const size = (this.uniforms.get("uCssSize") as Uniform).value as Vector2;
    if (size.x !== box.width || size.y !== box.height) { size.set(box.width, box.height); changed = true; }
    if (!changed) return false;
    this.rect.set(this.scratchRect.subarray(0, n * 4));
    this.radiusOn.set(this.scratchRadiusOn.subarray(0, n * 2));
    this.count = n;
    (this.uniforms.get("uCount") as Uniform).value = n;
    return true;
  }

  // No rectangles: the frame passes through untouched and the blur is not rendered.
  clear(): void {
    if (this.count === 0) return;
    this.count = 0;
    (this.uniforms.get("uCount") as Uniform).value = 0;
  }

  override update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget): void {
    if (this.count === 0) return;
    this.blur.render(renderer, inputBuffer, null);
    (this.uniforms.get("frostMap") as Uniform).value = this.blur.texture;
    // The light blur is needed only while some panel has part of its material; at rest every panel is whole and the pass is skipped.
    let partial = false;
    for (let i = 0; i < this.count; i++) if (this.radiusOn[i * 2 + 1] < 0.999) { partial = true; break; }
    if (partial) { this.blurLight.render(renderer, inputBuffer, null); (this.uniforms.get("frostLightMap") as Uniform).value = this.blurLight.texture; }
    else (this.uniforms.get("frostLightMap") as Uniform).value = this.blur.texture;
  }

  private pixelRatio: number;

  // The blur's targets are sized in CSS pixels, not device pixels: a mipmap blur's reach is a fixed number of its own pixels, so sized at device resolution it reached 1.75 times less far on a retina screen than on the pane it was tuned in (Shoro, 2026-09-16: less blur than the CSS filter). The first level is then a downsample by the pixel ratio, which is the first halving's work anyway.
  override setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width / this.pixelRatio)), h = Math.max(1, Math.round(height / this.pixelRatio));
    this.blur.setSize(w, h);
    this.blurLight.setSize(w, h);
  }

  override initialize(renderer: WebGLRenderer, alpha: boolean, frameBufferType: TextureDataType): void {
    this.pixelRatio = renderer.getPixelRatio();
    this.blur.initialize(renderer, alpha, frameBufferType);
    this.blurLight.initialize(renderer, alpha, frameBufferType);
  }
}
