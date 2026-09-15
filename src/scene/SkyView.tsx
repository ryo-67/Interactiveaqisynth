// SkyView — one physically based sky, rendered with the real drei <Sky>, <Stars>, and postprocessing <Bloom>. Used by the /scene-test harness and (next sprint) by the scene itself. Static: no engine, no clock; the caller passes the hour.
import React, { useLayoutEffect, useMemo } from "react";
import { Canvas, useThree, invalidate } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { EffectComposer, Bloom, HueSaturation, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { ACESFilmicToneMapping, AdditiveBlending, CanvasTexture, BufferGeometry, Float32BufferAttribute, Quaternion, Vector3 } from "three";
import { SKY_RANGES, SUN_DISC, SKY_GRADE, NYC_LAT } from "../utils/theme";
import { HosekSky } from "./hosek/HosekSky";
import { daylightBlend, type SkyParams } from "./skyParams";

export type GroundMode = "above" | "fade" | "edge";

// Framing rule (row 5, option (a)): only above-horizon sky in frame, at every viewport size.
// three's `fov` is the VERTICAL field of view and does not change with aspect, so the visible vertical span is always ±FOV_DEG/2 around the camera pitch. Pitching up by half the fov puts the bottom edge exactly on the horizon; the margin pushes it just below, so the horizon sits at or under the bottom edge and never inside the frame. Being vertical-only, this holds at any aspect ratio or box height without further work.
const FOV_DEG = 62;
const HORIZON_MARGIN_DEG = 1.5;
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
  // Local hour (fractional) for the star field's rotation. Stars turn about the celestial pole 15° an hour, so facing south they rise on the left and set on the right; continuous across midnight.
  hour?: number;

  // Which way the camera looks. The default camera faces north (−Z), which in New York puts the daytime sun behind the viewer — no disc, Preetham's included, was ever in frame. "south" faces the sun's arc so it crosses left to right; "sun" yaws to the sun's azimuth so it is always horizontally centered. UNDER BENCHMARK with the disc.
  facing?: CameraFacing;
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
function DevHandle() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    (window as unknown as Record<string, unknown>).__sky = { gl, scene, camera };
  }, [gl, scene, camera]);
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

export function SkyView({ params, sunPosition, starOpacity, groundMode = "above", style, live = true, model = "auto", albedo = 0.1, disc = false, discDeg = SUN_DISC.angularDiameterDeg, facing = "north", hour = 0, saturation = SKY_GRADE.saturation }: Props) {
  // Sun elevation and azimuth from the vector itself, so every caller that already passes a sun position gets the fade and the facing for free.
  const len = Math.hypot(...sunPosition) || 1;
  const sunElevationDeg = (Math.asin(Math.max(-1, Math.min(1, sunPosition[1] / len))) * 180) / Math.PI;
  const sunAzimuthRad = Math.atan2(sunPosition[0], -sunPosition[2]); // 0 = north (−Z), π/2 = east (+X)
  const yaw = facing === "north" ? 0 : facing === "south" ? Math.PI : -sunAzimuthRad;
  // How much Hosek shows: 1 in daylight, 0 at night, the band between (D-20). The fixed models pin it.
  const hosekAlpha = model === "hosek" ? 1 : model === "preetham" ? 0 : daylightBlend(sunElevationDeg);
  // "above": pitch up by half the vertical fov plus a margin, so the horizon falls at or below the bottom edge. The previous fixed 0.32 rad left the bottom edge 12.7 degrees BELOW the horizon, which rendered the dome's ground half — invisible only while the control bar happened to cover it. "edge"/"fade": horizon sits at the vertical middle.
  const cameraRotationX = groundMode === "above" ? ABOVE_HORIZON_PITCH_RAD : 0;

  return (
    <div style={{ position: "relative", ...style }}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: FOV_DEG }}
        // Tone mapping must be set explicitly: r3f v8 applies its ACES default through a pre-three-r155 code path (it writes outputEncoding alongside toneMapping), which no longer lands on three 0.172, leaving the renderer at NoToneMapping — and with no tone mapping the exposure value is inert, because the shaders' tonemapping_fragment compiles to a no-op.
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        // Cap device pixel ratio: at DPR 2 the bloom pass costs four times the pixels for no visible gain.
        dpr={[1, 1.75]}
        frameloop={live ? "always" : "demand"}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <CameraRig pitch={cameraRotationX} yaw={yaw} />
        <Exposure value={params.exposure} />
        <DevHandle />
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
        {/* The composer always mounts: the grade and the tone-mapping pass are part of the sky at every hour, not only when bloom is on. */}
        <EffectComposer>
          <Bloom
            intensity={params.bloomIntensity}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
          {/* Saturation grade before tone mapping, so it lifts the sky's own colour rather than the mapped result. */}
          <HueSaturation saturation={saturation} />
            {/* three applies material tone mapping only when rendering to the canvas (WebGLProgram: toneMapping stays NoToneMapping unless currentRenderTarget is null), and the composer renders the scene into a target — so with bloom on the sky reached the screen untonemapped and washed out. The composed output is tone mapped here instead; the effect reads the renderer's toneMappingExposure, so the exposure control still governs it. */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
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
