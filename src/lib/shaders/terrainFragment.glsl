uniform float uColorMode; // 0.0 = purple, 1.0 = grey
uniform float uMaxHeight;
uniform float uTime;

varying float vHeight;
varying vec2 vUv;

vec3 purpleDeep = vec3(0.176, 0.039, 0.306);   // #2D0A4E
vec3 purpleMid = vec3(0.486, 0.227, 0.929);     // #7C3AED
vec3 purpleLight = vec3(0.847, 0.706, 0.996);    // #D8B4FE
vec3 ember = vec3(0.961, 0.620, 0.043);          // #F59E0B

vec3 greyFlat = vec3(0.502, 0.502, 0.502);       // #808080
vec3 greyDark = vec3(0.290, 0.290, 0.290);       // #4A4A4A

void main() {
  float normalizedHeight = clamp(vHeight / uMaxHeight, 0.0, 1.0);

  // Purple gradient: deep -> mid -> light -> ember at peaks
  vec3 purpleColor;
  if (normalizedHeight < 0.33) {
    purpleColor = mix(purpleDeep, purpleMid, normalizedHeight / 0.33);
  } else if (normalizedHeight < 0.66) {
    purpleColor = mix(purpleMid, purpleLight, (normalizedHeight - 0.33) / 0.33);
  } else {
    purpleColor = mix(purpleLight, ember, (normalizedHeight - 0.66) / 0.34);
  }

  // Grey gradient: minimal variation
  vec3 greyColor = mix(greyDark, greyFlat, normalizedHeight * 0.3);

  // Blend between purple and grey based on mode
  vec3 finalColor = mix(purpleColor, greyColor, uColorMode);

  // Subtle ambient animation
  float glow = sin(uTime * 0.5 + vUv.x * 3.14) * 0.05 * (1.0 - uColorMode);
  finalColor += glow;

  gl_FragColor = vec4(finalColor, 1.0);
}
