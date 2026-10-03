export const DEG = Math.PI / 180;

// Equatorial (RA/Dec, degrees) -> point on a sphere seen from inside.
// +Y = north celestial pole, RA 0h = +X, RA increases toward -Z,
// so east appears to the left of north, as it does in the real sky.
export function raDecToVector(raDeg, decDeg, radius = 1) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return [radius * c * Math.cos(ra), radius * Math.sin(dec), -radius * c * Math.sin(ra)];
}

// B-V color index -> effective temperature (Ballesteros 2012, EPL 97, 34008).
export function bvToTemperature(bv) {
  const b = Math.min(Math.max(bv, -0.4), 2.0);
  return 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
}

// Temperature (K) -> approximate blackbody RGB, 0..1 (Helland approximation).
export function temperatureToRGB(kelvin) {
  const t = Math.min(Math.max(kelvin, 1000), 40000) / 100;
  let r;
  let g;
  let b;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }

  const clamp = (v) => Math.min(Math.max(v, 0), 255) / 255;
  return [clamp(r), clamp(g), clamp(b)];
}

// Star color for display: blackbody hue, softened toward white,
// because the eye sees star colors as gentle tints, not saturated hues.
export function bvToDisplayRGB(bv, softness = 0.22) {
  const rgb = temperatureToRGB(bvToTemperature(bv ?? 0.6));
  const mixed = rgb.map((c) => c * (1 - softness) + softness);
  const max = Math.max(...mixed);
  return mixed.map((c) => c / max);
}
