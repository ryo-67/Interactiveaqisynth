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

  // Uniforms are allocated once. Every prop change writes into them in place: keying the material on the sun vector rebuilt the material — and recompiled the shader — on every frame the sun moved, which is every frame during playback.
  const uniforms = useMemo(() => ({
    A: { value: new Vector3() }, B: { value: new Vector3() }, C: { value: new Vector3() },
    D: { value: new Vector3() }, E: { value: new Vector3() }, F: { value: new Vector3() },
    G: { value: new Vector3() }, H: { value: new Vector3() }, I: { value: new Vector3() },
    Z: { value: new Vector3() },
    sunDirection: { value: new Vector3(0, 1, 0) },
    opacity: { value: 1 },
  }), []);

  useEffect(() => {
    const dir = new Vector3(...sunPosition).normalize();
    // Sun zenith angle from its elevation; the dataset is only defined above the horizon, so clamp there and let exposure carry the night.
    const sunTheta = Math.acos(Math.min(1, Math.max(0, dir.y)));
    const c = hosekCoefficients(sunTheta, Math.min(10, Math.max(1, turbidity)), albedo, normalizedSunY);
    (["A", "B", "C", "D", "E", "F", "G", "H", "I", "Z"] as const).forEach((k) => uniforms[k].value.set(...c[k]));
    uniforms.sunDirection.value.copy(dir);
  }, [uniforms, sunPosition, turbidity, albedo, normalizedSunY]);

  useEffect(() => {
    uniforms.opacity.value = opacity;
  }, [uniforms, opacity]);

  return (
    // renderOrder 1: draw after Preetham (0) so alpha blends over it.
    <mesh scale={[distance, distance, distance]} frustumCulled={false} renderOrder={1}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
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
