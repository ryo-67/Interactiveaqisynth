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
}

// Dev-only handle so the renderer and scene can be inspected from the console (?dev=1 harness only).
function DevHandle() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    (window as unknown as Record<string, unknown>).__sky = { gl, scene };
  }, [gl, scene]);
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

export function SkyView({ params, sunPosition, starOpacity, groundMode = "above", style, live = true, model = "preetham" }: Props) {
  // "above": tilt the camera up so only sky above the horizon is in frame. "edge"/"fade": horizon sits at the vertical middle.
  const cameraRotationX = groundMode === "above" ? 0.32 : 0;
  const stars = Math.round(SKY_RANGES.starsCount * starOpacity);

  return (
    <div style={{ position: "relative", ...style }}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 62, rotation: [cameraRotationX, 0, 0] }}
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
          <HosekSky sunPosition={sunPosition} turbidity={params.turbidity} />
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
