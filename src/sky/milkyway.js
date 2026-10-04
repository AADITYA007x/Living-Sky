import * as THREE from 'three';
import { raDecToVector } from './astro.js';

// A soft, procedural Milky Way laid along the real galactic plane, with the
// bright bulge toward Sagittarius, the dark Great Rift, and both Magellanic
// Clouds. Positions are real; the brightness texture is an artistic approximation.

const vec = (ra, dec) => new THREE.Vector3(...raDecToVector(ra, dec, 1));

function galacticBasis() {
  const z = vec(192.85948, 27.12825); // north galactic pole (J2000)
  const gc = vec(266.4051, -28.93617); // galactic centre
  const x = gc.clone().sub(z.clone().multiplyScalar(gc.dot(z))).normalize();
  let y = new THREE.Vector3().crossVectors(z, x);
  const cygnus = vec(318.004, 48.33); // galactic longitude 90°, latitude 0°
  if (y.dot(cygnus) < 0) y.negate();
  return { x, y, z };
}

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uX;
  uniform vec3 uY;
  uniform vec3 uZ;
  uniform vec3 uLMC;
  uniform vec3 uSMC;
  uniform float uOpacity;
  uniform float uDim;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      s += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return s;
  }

  float blob(vec3 d, vec3 c, float r) {
    float ang = acos(clamp(dot(d, c), -1.0, 1.0));
    return exp(-pow(ang / r, 2.0));
  }

  void main() {
    vec3 d = normalize(vDir);
    float b = asin(clamp(dot(d, uZ), -1.0, 1.0));
    float l = atan(dot(d, uY), dot(d, uX));

    float core = exp(-pow(l / 0.75, 2.0));
    float width = 0.11 + 0.17 * core;
    float band = exp(-pow(b / width, 2.0));

    float n = fbm(d * 5.0);
    float fine = fbm(d * 16.0 + 7.0);

    float intensity = band * (0.5 + 1.0 * core) * (0.45 + 0.85 * n);

    // The Great Rift: dust lanes from Cygnus down to Sagittarius
    float rift = exp(-pow((b + 0.006) / 0.04, 2.0)) * smoothstep(-0.55, -0.15, l) * (1.0 - smoothstep(1.35, 1.75, l));
    intensity *= 1.0 - 0.65 * rift * clamp(0.5 + 0.8 * fine, 0.0, 1.0);

    // Magellanic Clouds
    intensity += 0.6 * blob(d, uLMC, 0.075) * (0.55 + 0.6 * fine);
    intensity += 0.4 * blob(d, uSMC, 0.04) * (0.55 + 0.6 * fine);

    vec3 cool = vec3(0.66, 0.74, 1.0);
    vec3 warm = vec3(1.0, 0.85, 0.66);
    vec3 color = mix(cool, warm, clamp(core * 0.9 + 0.1, 0.0, 1.0));

    float dither = (hash(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 255.0;
    float a = intensity * uOpacity * mix(1.0, 0.35, uDim) + dither;
    gl_FragColor = vec4(color, max(a, 0.0));
  }
`;

export function createMilkyWay() {
  const { x, y, z } = galacticBasis();
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uX: { value: x },
      uY: { value: y },
      uZ: { value: z },
      uLMC: { value: vec(80.894, -69.756) },
      uSMC: { value: vec(13.187, -72.829) },
      uOpacity: { value: 0 },
      uDim: { value: 0 },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 96, 48), material);
  mesh.renderOrder = -2;
  mesh.frustumCulled = false;

  const target = 0.15;
  return {
    mesh,
    update(dt, focus) {
      const u = material.uniforms;
      u.uOpacity.value = Math.min(target, u.uOpacity.value + dt * 0.05);
      if (focus) u.uDim.value = focus.dim;
    },
  };
}
