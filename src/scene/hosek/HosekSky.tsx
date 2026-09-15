// HosekSky — the Hosek-Wilkie sky as a drop-in alternative to drei's Preetham <Sky>. Same call shape (sunPosition, turbidity), so SkyView can switch models on a flag.
// Shader ported from diharaw/sky-models (MIT); coefficients computed on the CPU per frame-of-change and passed as uniforms, which is how the reference implementation drives it.
import React, { useEffect, useMemo, useRef } from "react";
import type {} from "@react-three/fiber"; // pulls in the r3f JSX intrinsics (mesh, shaderMaterial, ...)
import { BackSide, ShaderMaterial, Vector3 } from "three";
import { hosekCoefficients } from "./hosekWilkie";

const vertexShader = /* glsl */ `
varying vec3 vWorldDirection;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldDirection = normalize(worldPosition.xyz - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w; // keep the dome at the far plane
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 A, B, C, D, E, F, G, H, I, Z;
uniform vec3 sunDirection;
uniform float opacity; // the D-20 cross-fade: this dome draws over Preetham, and this is how much of it shows
varying vec3 vWorldDirection;

vec3 hosekWilkie(float cosTheta, float gamma, float cosGamma) {
  vec3 chi = (1.0 + cosGamma * cosGamma) / pow(1.0 + H * H - 2.0 * cosGamma * H, vec3(1.5));
  return (1.0 + A * exp(B / (cosTheta + 0.01))) *
         (C + D * exp(E * gamma) + F * (cosGamma * cosGamma) + G * chi + I * sqrt(max(0.0, cosTheta)));
}

void main() {
  vec3 v = normalize(vWorldDirection);
  float cosTheta = clamp(v.y, 0.0, 1.0);
  float cosGamma = clamp(dot(v, sunDirection), 0.0, 1.0);
  float gamma = acos(cosGamma);
  vec3 radiance = Z * hosekWilkie(cosTheta, gamma, cosGamma);

  // Below the horizon the analytic model is undefined; fade to its horizon value so the dome does not tear.
  float belowHorizon = smoothstep(0.0, -0.06, v.y);
  radiance = mix(radiance, radiance * 0.35, belowHorizon);

  gl_FragColor = vec4(max(radiance, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.a = opacity; // after tone mapping, so the blend happens in display space against the tone-mapped Preetham beneath
}
`;

interface Props {
  sunPosition: [number, number, number];
  turbidity: number;
  albedo?: number;
  normalizedSunY?: number;
  distance?: number;
  opacity?: number; // 1 = full daylight model; drives the cross-fade to Preetham at dusk
}

export function HosekSky({ sunPosition, turbidity, albedo = 0.1, normalizedSunY = 1.15, distance = 450000, opacity = 1 }: Props) {
  const materialRef = useRef<ShaderMaterial>(null);

  // Opacity changes every beat at dusk; write the uniform in place rather than rebuilding the material (the coefficient uniforms below are keyed on sun/turbidity and rebuild only when those move).
  useEffect(() => {
    if (materialRef.current) materialRef.current.uniforms.opacity.value = opacity;
  }, [opacity]);

  const uniforms = useMemo(() => {
    const dir = new Vector3(...sunPosition).normalize();
    // Sun zenith angle from its elevation; the dataset is only defined above the horizon, so clamp there and let exposure carry the night.
    const sunTheta = Math.acos(Math.min(1, Math.max(0, dir.y)));
    const c = hosekCoefficients(sunTheta, Math.min(10, Math.max(1, turbidity)), albedo, normalizedSunY);
    const v3 = (t: [number, number, number]) => new Vector3(t[0], t[1], t[2]);
    return {
      A: { value: v3(c.A) }, B: { value: v3(c.B) }, C: { value: v3(c.C) },
      D: { value: v3(c.D) }, E: { value: v3(c.E) }, F: { value: v3(c.F) },
      G: { value: v3(c.G) }, H: { value: v3(c.H) }, I: { value: v3(c.I) },
      Z: { value: v3(c.Z) },
      sunDirection: { value: dir },
      opacity: { value: opacity },
    };
  }, [sunPosition, turbidity, albedo, normalizedSunY]);

  return (
    // renderOrder 1: draw after Preetham (0) so alpha blends over it.
    <mesh scale={[distance, distance, distance]} frustumCulled={false} renderOrder={1}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        key={JSON.stringify(sunPosition) + turbidity + albedo}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
        transparent
        toneMapped
      />
    </mesh>
  );
}
