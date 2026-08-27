// SkyView — one physically based sky, rendered with the real drei <Sky>, <Stars>, and postprocessing <Bloom>. Used by the /scene-test harness and (next sprint) by the scene itself. Static: no engine, no clock; the caller passes the hour.
import React, { useLayoutEffect } from "react";
import { Canvas, useThree, invalidate } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { ACESFilmicToneMapping } from "three";
import { SKY_RANGES } from "../utils/theme";
import { HosekSky } from "./hosek/HosekSky";
import type { SkyParams } from "./skyParams";

export type GroundMode = "above" | "fade" | "edge";

// Framing rule (row 5, option (a)): only above-horizon sky in frame, at every viewport size.
// three's `fov` is the VERTICAL field of view and does not change with aspect, so the visible vertical span is always ±FOV_DEG/2 around the camera pitch. Pitching up by half the fov puts the bottom edge exactly on the horizon; the margin pushes it just below, so the horizon sits at or under the bottom edge and never inside the frame. Being vertical-only, this holds at any aspect ratio or box height without further work.
const FOV_DEG = 62;
const HORIZON_MARGIN_DEG = 1.5;
const ABOVE_HORIZON_PITCH_RAD = ((FOV_DEG / 2 + HORIZON_MARGIN_DEG) * Math.PI) / 180;
// Preetham is what three.js ships; Hosek-Wilkie is the 2012 replacement designed to fix exactly the two conditions this piece leans on, sunset and high turbidity.
export type SkyModel = "preetham" | "hosek";

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

export function SkyView({ params, sunPosition, starOpacity, groundMode = "above", style, live = true, model = "preetham", albedo = 0.1 }: Props) {
  // "above": pitch up by half the vertical fov plus a margin, so the horizon falls at or below the bottom edge. The previous fixed 0.32 rad left the bottom edge 12.7 degrees BELOW the horizon, which rendered the dome's ground half — invisible only while the control bar happened to cover it. "edge"/"fade": horizon sits at the vertical middle.
  const cameraRotationX = groundMode === "above" ? ABOVE_HORIZON_PITCH_RAD : 0;
  const stars = Math.round(SKY_RANGES.starsCount * starOpacity);

  return (
    <div style={{ position: "relative", ...style }}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: FOV_DEG, rotation: [cameraRotationX, 0, 0] }}
        // Tone mapping must be set explicitly: r3f v8 applies its ACES default through a pre-three-r155 code path (it writes outputEncoding alongside toneMapping), which no longer lands on three 0.172, leaving the renderer at NoToneMapping — and with no tone mapping the exposure value is inert, because the shaders' tonemapping_fragment compiles to a no-op.
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        // Cap device pixel ratio: at DPR 2 the bloom pass costs four times the pixels for no visible gain.
        dpr={[1, 1.75]}
        frameloop={live ? "always" : "demand"}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Exposure value={params.exposure} />
        <DevHandle />
        {model === "hosek" ? (
          // Hosek-Wilkie takes turbidity, ground albedo and solar elevation. It has no rayleigh or mie inputs: the fitted dataset carries the scattering.
          <HosekSky sunPosition={sunPosition} turbidity={params.turbidity} albedo={albedo} />
        ) : (
          <Sky
            distance={450000}
            sunPosition={sunPosition}
            turbidity={params.turbidity}
            rayleigh={params.rayleigh}
            mieCoefficient={params.mieCoefficient}
            mieDirectionalG={params.mieDirectionalG}
          />
        )}
        {stars > 0 && (
          <Stars radius={100} depth={50} count={stars} factor={4} saturation={0} fade speed={0.4} />
        )}
        {params.bloomIntensity > 0.01 && (
          <EffectComposer>
            <Bloom
              intensity={params.bloomIntensity}
              luminanceThreshold={0.55}
              luminanceSmoothing={0.35}
              mipmapBlur
            />
            {/* three applies material tone mapping only when rendering to the canvas (WebGLProgram: toneMapping stays NoToneMapping unless currentRenderTarget is null), and the composer renders the scene into a target — so with bloom on the sky reached the screen untonemapped and washed out. The composed output is tone mapped here instead; the effect reads the renderer's toneMappingExposure, so the exposure control still governs it. */}
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
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
