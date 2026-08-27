// SkyView — one physically based sky, rendered with the real drei <Sky>, <Stars>, and postprocessing <Bloom>. Used by the /scene-test harness and (next sprint) by the scene itself. Static: no engine, no clock; the caller passes the hour.
import React, { useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { SKY_RANGES } from "../utils/theme";
import type { SkyParams } from "./skyParams";

export type GroundMode = "above" | "fade" | "edge";

interface Props {
  params: SkyParams;
  sunPosition: [number, number, number];
  starOpacity: number;
  groundMode?: GroundMode;
  style?: React.CSSProperties;
}

// Tone-mapping exposure is a renderer setting, not a <Sky> prop.
function Exposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

export function SkyView({ params, sunPosition, starOpacity, groundMode = "edge", style }: Props) {
  // "above": tilt the camera up so only sky above the horizon is in frame. "edge"/"fade": horizon sits at the vertical middle.
  const cameraRotationX = groundMode === "above" ? 0.32 : 0;
  const stars = Math.round(SKY_RANGES.starsCount * starOpacity);

  return (
    <div style={{ position: "relative", ...style }}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 62, rotation: [cameraRotationX, 0, 0] }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Exposure value={params.exposure} />
        <Sky
          distance={450000}
          sunPosition={sunPosition}
          turbidity={params.turbidity}
          rayleigh={params.rayleigh}
          mieCoefficient={params.mieCoefficient}
          mieDirectionalG={params.mieDirectionalG}
        />
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
