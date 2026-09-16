// SkyView — one physically based sky, rendered with the real drei <Sky>, <Stars>, and postprocessing <Bloom>. Used by the /scene-test harness and (next sprint) by the scene itself. Static: no engine, no clock; the caller passes the hour.
import React, { useLayoutEffect, useMemo, useCallback, useRef, useEffect } from "react";
import { Canvas, useThree, useFrame, invalidate } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction, BloomEffect, HueSaturationEffect, ChromaticAberrationEffect, NoiseEffect, ToneMappingEffect, EffectPass, type Effect, type EffectComposer as EffectComposerImpl } from "postprocessing";
import { ACESFilmicToneMapping, AdditiveBlending, CanvasTexture, BufferGeometry, Float32BufferAttribute, Quaternion, Vector2, Vector3 } from "three";
import { LensFieldEffect } from "./LensFieldEffect";
import { FrostEffect } from "./FrostEffect";
import { SKY_RANGES, SUN_DISC, SKY_GRADE, PARTICLES, GRAIN, NYC_LAT, SKY_CAMERA } from "../utils/theme";
import { HosekSky } from "./hosek/HosekSky";
import { daylightBlend, type SkyParams } from "./skyParams";

export type GroundMode = "above" | "fade" | "edge";

// Framing rule (row 5, option (a)): only above-horizon sky in frame, at every viewport size.
// three's `fov` is the VERTICAL field of view and does not change with aspect, so the visible vertical span is always ±FOV_DEG/2 around the camera pitch. Pitching up by half the fov puts the bottom edge exactly on the horizon; the margin pushes it just below, so the horizon sits at or under the bottom edge and never inside the frame. Being vertical-only, this holds at any aspect ratio or box height without further work.
const FOV_DEG = SKY_CAMERA.fovDeg;
const HORIZON_MARGIN_DEG = SKY_CAMERA.horizonMarginDeg;
const ABOVE_HORIZON_PITCH_RAD = ((FOV_DEG / 2 + HORIZON_MARGIN_DEG) * Math.PI) / 180;
// "auto" is the D-20 split: Hosek-Wilkie above the fade band, Preetham below it, cross-faded between. The two fixed values remain for the harness, so either model can be inspected alone.
export type SkyModel = "auto" | "preetham" | "hosek";

interface Props {
  params: SkyParams;
  sunPosition: [number, number, number];
  starOpacity: number;
  groundMode?: GroundMode;
  style?: React.CSSProperties;
  // Static grid cells render on demand (once, then on prop change); the live preview renders continuously so dragging a slider is smooth.
  live?: boolean;
  model?: SkyModel;
  // Hosek-Wilkie's third input beside turbidity and solar elevation: ground albedo, the bounce light the lower atmosphere sees.
  albedo?: number;
  // The literal sun sprite (§5.1). Size under benchmark: the harness passes discDeg; the page uses the token.
  disc?: boolean;
  discDeg?: number;
  // Saturation grade on the sky (SKY_GRADE.saturation); the harness overrides it.
  saturation?: number;
  // Coarse-particulate level, 0..1, from ABSOLUTE PM2.5 via particleLevel() (PM10 once it is a channel): the lens field and the frame's chromatic aberration.
  particles?: number;
  // Fine-particulate level, 0..1, from ABSOLUTE PM2.5 via grainLevel(): film grain.
  grain?: number;
  // Local hour (fractional) for the star field's rotation. Stars turn about the celestial pole 15° an hour, so facing south they rise on the left and set on the right; continuous across midnight.
  hour?: number;

  // Which way the camera looks. The default camera faces north (−Z), which in New York puts the daytime sun behind the viewer — no disc, Preetham's included, was ever in frame. "south" faces the sun's arc so it crosses left to right; "sun" yaws to the sun's azimuth so it is always horizontally centered. UNDER BENCHMARK with the disc.
  facing?: CameraFacing;
  // The glass panels' blur, drawn by the sky inside every registered glass rectangle (FrostEffect, D-50). Off for the harness and the ?fx=noblur bisect.
  frost?: boolean;
}

export type CameraFacing = "north" | "south" | "sun";

// Pitch and yaw applied in YXZ order: yaw about the world up axis first, then pitch — so pitching up never tilts the horizon. Camera looks along −Z at yaw 0 (north); east is +X, so facing azimuth `az` is a yaw of −az.
function CameraRig({ pitch, yaw }: { pitch: number; yaw: number }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    invalidate();
  }, [camera, pitch, yaw]);
  return null;
}

// The star field. drei's <Stars> re-rolls its geometry whenever count changes, and a count driven by the eased hour changed every frame at dusk — so the sky re-shuffled 1,400 stars sixty times a second. This one is built once from a seeded generator (the same sky every night, every mount) and fades through material opacity alone.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let starGeometry: BufferGeometry | null = null;
function getStarGeometry(count: number): BufferGeometry {
  if (starGeometry) return starGeometry;
  const rnd = mulberry32(20230607);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Uniform on the upper hemisphere, radius ~ 100..150 so the field has depth against the dome at the far plane.
    const u = rnd(), v = rnd();
    const theta = 2 * Math.PI * u;
    const y = 2 * v - 1; // the whole sphere: the field rotates, so anything below the horizon now rises later
    const r = Math.sqrt(1 - y * y);
    const d = 100 + 50 * rnd();
    pos[i * 3] = d * r * Math.cos(theta);
    pos[i * 3 + 1] = d * y;
    pos[i * 3 + 2] = d * r * Math.sin(theta);
  }
  starGeometry = new BufferGeometry();
  starGeometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return starGeometry;
}
// The field turns about the celestial pole, which sits due north at an altitude equal to the latitude: axis (0, sin φ, −cos φ) in a frame where north is −Z. Positive rotation about that axis would carry a southern star east, so the angle is negative: 15° an hour westward.
const POLE_AXIS = new Vector3(0, Math.sin((NYC_LAT * Math.PI) / 180), -Math.cos((NYC_LAT * Math.PI) / 180)).normalize();
function StarField({ opacity, count, hour }: { opacity: number; count: number; hour: number }) {
  const geometry = getStarGeometry(count);
  const q = useMemo(() => new Quaternion().setFromAxisAngle(POLE_AXIS, -(hour / 24) * Math.PI * 2), [hour]);
  return (
    <group quaternion={q}>
      <points geometry={geometry} renderOrder={1} frustumCulled={false}>
        <pointsMaterial size={1.6} sizeAttenuation={false} color="#ffffff" transparent opacity={opacity} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </points>
    </group>
  );
}

// 0 below PARTICLES.visibleFromUgm3, 1 at fullAtUgm3.
export function particleLevel(pm25: number | null | undefined): number {
  if (pm25 == null) return 0;
  return Math.max(0, Math.min(1, (pm25 - PARTICLES.visibleFromUgm3) / (PARTICLES.fullAtUgm3 - PARTICLES.visibleFromUgm3)));
}
// 0 below GRAIN.visibleFromUgm3, 1 at fullAtUgm3, on the grain's curve.
export function grainLevel(pm25: number | null | undefined): number {
  if (pm25 == null) return 0;
  const l = Math.max(0, Math.min(1, (pm25 - GRAIN.visibleFromUgm3) / (GRAIN.fullAtUgm3 - GRAIN.visibleFromUgm3)));
  return Math.pow(l, GRAIN.curve);
}

// The grade, created once. The r3f effect wrappers rebuild an effect whenever a prop changes (their constructor args are keyed on a JSON of the props), so the eased bloom, saturation, aberration and grain were disposing and re-creating effects and passes on nearly every frame; a frame drawn between the old pass leaving and the new one arriving is the raw render, no bloom and no tone mapping, which is the intermittent washed-out sky (2026-09-15). Now each effect is one instance for the life of the canvas and its values are set in place; the composer's children never change, so its pass chain is built once.
interface Fx { bloom: BloomEffect; hueSat: HueSaturationEffect; lens: LensFieldEffect; aberration: ChromaticAberrationEffect; noise: NoiseEffect; tone: ToneMappingEffect; frost: FrostEffect }
function makeFx(): Fx {
  return {
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0, luminanceThreshold: 0.55, luminanceSmoothing: 0.35, mipmapBlur: true }),
    hueSat: new HueSaturationEffect({ saturation: 0 }),
    lens: new LensFieldEffect(),
    aberration: new ChromaticAberrationEffect({ offset: new Vector2(0, 0), radialModulation: true, modulationOffset: 0.3 }),
    noise: new NoiseEffect({ blendFunction: BlendFunction.VIVID_LIGHT, premultiply: false }), // see GRAIN in theme.ts for the blend
    tone: new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
    frost: new FrostEffect(),
  };
}
// The frost's rectangles (D-50): every animation frame the registered glass elements are read against the canvas and, when any has moved, grown, or changed its material amount, the effect is fed and an on-demand canvas told to repaint, so the frost follows a page's drift and a resize while the sky itself is still. A rAF loop rather than useFrame: useFrame does not run on a demand-rendered canvas until something invalidates it, and the panels moving is that something.
function FrostFeed({ effect, enabled }: { effect: FrostEffect; enabled: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!enabled) { effect.clear(); invalidate(); return; }
    let raf = 0;
    const tick = () => { if (effect.feed(gl.domElement)) invalidate(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gl, effect, enabled]);
  return null;
}
// Pushes the frame's values into the effects. Set on change and the canvas told to repaint (an on-demand canvas repaints only when told); the lens field also needs the clock, so it is fed every frame.
const REDUCED_MOTION = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function Grade({ fx, bloom, saturation, particles, grain }: { fx: Fx; bloom: number; saturation: number; particles: number; grain: number }) {
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    fx.bloom.intensity = bloom;
    fx.hueSat.saturation = saturation;
    // MAPPING (particulate → chromatic aberration): the offset rises with the lens level, zero when there is none, so at wildfire density the whole frame fringes toward its edges.
    const ab = PARTICLES.aberrationMax * particles;
    fx.aberration.offset.set(ab, ab);
    // MAPPING (fine particulate → grain): film grain over the frame at every hour, GRAIN.opacityBase as the material's own texture, rising to opacityMax with the grain level on GRAIN's curve.
    fx.noise.blendMode.opacity.value = GRAIN.opacityBase + (GRAIN.opacityMax - GRAIN.opacityBase) * grain;
    invalidate();
  }, [fx, bloom, saturation, particles, grain]);
  useFrame((state, dt) => fx.lens.setState(particles, size.width / size.height, state.clock.elapsedTime, dt, !REDUCED_MOTION));
  return null;
}

// Watchdog for the washed-out sky: every frame it checks that the composer's pass chain still carries the bloom and the tone-mapping effect, that the exposure is finite, and that the WebGL context is alive. (The renderer's own toneMapping flag is not checked: three applies it only when drawing to the canvas, and the composer draws the scene to a target, so the flag is inert while the chain is whole.) The first anomaly is logged once, with a snapshot of the inputs, so the next occurrence names its cause instead of being a screenshot.
function SkyWatchdog({ composerRef, fx, snapshot }: { composerRef: React.RefObject<EffectComposerImpl>; fx: Fx; snapshot: () => Record<string, unknown> }) {
  const gl = useThree((s) => s.gl);
  const reported = useRef(false);
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); console.error("[sky] WebGL context lost", snapshot()); };
    const restored = () => { console.warn("[sky] WebGL context restored", snapshot()); invalidate(); };
    el.addEventListener("webglcontextlost", lost);
    el.addEventListener("webglcontextrestored", restored);
    return () => { el.removeEventListener("webglcontextlost", lost); el.removeEventListener("webglcontextrestored", restored); };
  }, [gl, snapshot]);
  useFrame(() => {
    if (reported.current) return;
    const bad: string[] = [];
    const composer = composerRef.current;
    if (!composer) bad.push("no composer");
    else {
      const effects = composer.passes.flatMap((p) => (p instanceof EffectPass && p.enabled ? (p as unknown as { effects: Effect[] }).effects : [])); // the pass keeps its list private; read for the check only
      if (!effects.includes(fx.bloom)) bad.push("bloom pass missing");
      if (!effects.includes(fx.tone)) bad.push("tone-mapping pass missing");
    }
    if (!Number.isFinite(gl.toneMappingExposure)) bad.push(`exposure=${gl.toneMappingExposure}`);
    if (gl.getContext().isContextLost()) bad.push("context lost");
    if (bad.length) { reported.current = true; console.error(`[sky] renderer anomaly: ${bad.join(", ")}`, snapshot()); }
  });
  return null;
}

// A soft radial sprite: bright core, fast falloff. Built once; the bloom pass does the glow.
let discTexture: CanvasTexture | null = null;
function getDiscTexture(): CanvasTexture {
  if (discTexture) return discTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.42, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  discTexture = new CanvasTexture(c);
  return discTexture;
}

// MAPPING (clock → position, O3 → brightness): the disc sits on the sun vector; its brightness is the ozone-driven discBrightness, so a high-ozone afternoon has a harder sun. Additive, so it only ever adds light to the sky behind it.
function SunDisc({ sunPosition, brightness, deg }: { sunPosition: [number, number, number]; brightness: number; deg: number }) {
  const len = Math.hypot(...sunPosition) || 1;
  const pos = sunPosition.map((v) => (v / len) * SUN_DISC.distance) as [number, number, number];
  const size = 2 * SUN_DISC.distance * Math.tan(((deg / 2) * Math.PI) / 180);
  const halo = size * SUN_DISC.haloScale;
  return (
    <>
      {/* Halo first (renderOrder 2), core over it (3): both additive, so together they only ever add light. */}
      <sprite position={pos} scale={[halo, halo, 1]} renderOrder={2}>
        <spriteMaterial map={getDiscTexture()} color={SUN_DISC.coreColor} blending={AdditiveBlending} depthWrite={false} depthTest={false} opacity={Math.min(1, brightness) * SUN_DISC.haloAlpha} transparent toneMapped />
      </sprite>
      <sprite position={pos} scale={[size, size, 1]} renderOrder={3}>
        <spriteMaterial map={getDiscTexture()} color={SUN_DISC.coreColor} blending={AdditiveBlending} depthWrite={false} depthTest={false} opacity={Math.min(1, brightness)} transparent toneMapped />
      </sprite>
    </>
  );
}

// Dev-only handle so the renderer and scene can be inspected from the console (?dev=1 harness only).
function DevHandle({ composerRef, fx }: { composerRef: React.RefObject<EffectComposerImpl>; fx: Fx }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    (window as unknown as Record<string, unknown>).__sky = { gl, scene, camera, composerRef, fx };
  }, [gl, scene, camera, composerRef, fx]);
  return null;
}

// Tone-mapping exposure is a renderer setting, not a <Sky> prop. On-demand cells must be told to repaint after it changes.
function Exposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.toneMappingExposure = value;
    invalidate();
    // One more after materials compile, so an on-demand cell is never left blank on first paint.
    const t = setTimeout(() => invalidate(), 60);
    return () => clearTimeout(t);
  }, [gl, value]);
  return null;
}

// The renderer's configuration, one object for the life of the module: r3f compares the gl prop with the renderer on every render and re-applies it when they differ, and the composer sets the renderer's toneMapping to none, so a fresh object literal here had r3f writing toneMapping back every render (harmless in the composer's pass, three only tone-maps when drawing to the canvas, but churn all the same). Tone mapping is set explicitly because r3f v8's ACES default goes through a pre-three-r155 path that no longer lands on three 0.172. preserveDrawingBuffer so the scene can snapshot the last frame for a dissolve (D-32).
const GL_CONFIG = { antialias: true, toneMapping: ACESFilmicToneMapping, preserveDrawingBuffer: true } as const;

export function SkyView({ params, sunPosition, starOpacity, groundMode = "above", style, live = true, model = "auto", albedo = 0.1, disc = false, discDeg = SUN_DISC.angularDiameterDeg, facing = "north", hour = 0, saturation = SKY_GRADE.saturation, particles = 0, grain = 0, frost = false }: Props) {
  // The grade's effects, once per canvas; the composer's children are one memoized element so its pass chain is never rebuilt (see Fx).
  // ORDER (2026-09-15, measured): lens; tone mapping; bloom; saturation; aberration; noise. This is the order the sky was tuned against. The wrappers re-appended every re-created effect at the end of the list, so after the first eased change the chain settled into this order, with tone mapping BEFORE the bloom and the grade: the bloom's blur is taken from the HDR input of its pass and added onto the mapped image with nothing mapping it again, so the sun's glow goes to white — that is the glow every exposure and bloom value was judged on. The physically ordered chain (bloom and grade before tone mapping) is what showed on a fresh mount before any change, and reads as the dim, washed-out sky. The lens comes first, in its own pass (CONVOLUTION), so the frame it refracts is the raw sky and nothing it re-samples is lost.
  const fx = useMemo(makeFx, []);
  const chain = useMemo(() => (
    <>
      <primitive object={fx.lens} />
      <primitive object={fx.tone} />
      <primitive object={fx.bloom} />
      <primitive object={fx.hueSat} />
      <primitive object={fx.aberration} />
      <primitive object={fx.noise} />
      {/* The frost last (D-50): it blurs the finished frame, grain and all, as the CSS filter blurred the finished canvas. */}
      <primitive object={fx.frost} />
    </>
  ), [fx]);
  const composerRef = useRef<EffectComposerImpl>(null);
  // Sun elevation and azimuth from the vector itself, so every caller that already passes a sun position gets the fade and the facing for free.
  const len = Math.hypot(...sunPosition) || 1;
  const sunElevationDeg = (Math.asin(Math.max(-1, Math.min(1, sunPosition[1] / len))) * 180) / Math.PI;
  const sunAzimuthRad = Math.atan2(sunPosition[0], -sunPosition[2]); // 0 = north (−Z), π/2 = east (+X)
  const yaw = facing === "north" ? 0 : facing === "south" ? Math.PI : -sunAzimuthRad;
  // How much Hosek shows: 1 in daylight, 0 at night, the band between (D-20). The fixed models pin it.
  const hosekAlpha = model === "hosek" ? 1 : model === "preetham" ? 0 : daylightBlend(sunElevationDeg);
  // "above": pitch up by half the vertical fov plus a margin, so the horizon falls at or below the bottom edge. The previous fixed 0.32 rad left the bottom edge 12.7 degrees BELOW the horizon, which rendered the dome's ground half — invisible only while the control bar happened to cover it. "edge"/"fade": horizon sits at the vertical middle.
  const cameraRotationX = groundMode === "above" ? ABOVE_HORIZON_PITCH_RAD : 0;
  // What the watchdog prints if the renderer misbehaves: every input this frame.
  const snapshot = useCallback(() => ({ params, sunPosition, sunElevationDeg, hosekAlpha, starOpacity, saturation, particles, grain, hour, live }), [params, sunPosition, sunElevationDeg, hosekAlpha, starOpacity, saturation, particles, grain, hour, live]);

  return (
    <div style={{ position: "relative", ...style }}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: FOV_DEG }}
        gl={GL_CONFIG}
        // Cap device pixel ratio: at DPR 2 the bloom pass costs four times the pixels for no visible gain.
        dpr={[1, 1.75]}
        frameloop={live ? "always" : "demand"}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <CameraRig pitch={cameraRotationX} yaw={yaw} />
        <Exposure value={params.exposure} />
        <Grade fx={fx} bloom={params.bloomIntensity} saturation={saturation} particles={particles} grain={grain} />
        <FrostFeed effect={fx.frost} enabled={frost} />
        <SkyWatchdog composerRef={composerRef} fx={fx} snapshot={snapshot} />
        <DevHandle composerRef={composerRef} fx={fx} />
        {/* Preetham always draws beneath (opaque, renderOrder 0); Hosek draws over it with alpha = hosekAlpha and is unmounted once fully faded, so night costs one dome, not two. */}
        {hosekAlpha < 1 && (
          <Sky
            distance={450000}
            sunPosition={sunPosition}
            turbidity={params.turbidity}
            rayleigh={params.rayleigh}
            mieCoefficient={params.mieCoefficient}
            mieDirectionalG={params.mieDirectionalG}
          />
        )}
        {hosekAlpha > 0 && (
          // Hosek-Wilkie takes turbidity, ground albedo and solar elevation. It has no rayleigh or mie inputs: the fitted dataset carries the scattering.
          <HosekSky sunPosition={sunPosition} turbidity={params.turbidity} albedo={albedo} opacity={hosekAlpha} />
        )}
        {disc && sunElevationDeg > -discDeg && (
          <SunDisc sunPosition={sunPosition} brightness={params.discBrightness} deg={discDeg} />
        )}
        {starOpacity > 0.001 && <StarField opacity={starOpacity} count={SKY_RANGES.starsCount} hour={hour} />}
        {/* The composer always mounts: the grade and the tone-mapping pass are part of the sky at every hour, not only when bloom is on. The order is fixed where `chain` is built. */}
        <EffectComposer ref={composerRef}>{chain}</EffectComposer>
      </Canvas>
      {groundMode === "fade" && (
        // A neutral band the sky fades into, instead of sky-below-horizon reading as fog.
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "34%",
            background: "linear-gradient(to bottom, rgba(10,10,16,0) 0%, rgba(10,10,16,0.72) 55%, rgba(10,10,16,0.92) 100%)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
