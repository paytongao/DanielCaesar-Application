uniform float uColorMode; // 0.0 = purple, 1.0 = grey
uniform float uMaxHeight;
uniform float uTime;
uniform float uAudioReactive;

varying float vHeight;
varying vec2 vUv;
varying float vFreqBin;
varying float vFreqAmp;

vec3 purpleDeep = vec3(0.176, 0.039, 0.306);   // #2D0A4E
vec3 purpleMid = vec3(0.486, 0.227, 0.929);     // #7C3AED
vec3 purpleLight = vec3(0.847, 0.706, 0.996);    // #D8B4FE
vec3 ember = vec3(0.961, 0.620, 0.043);          // #F59E0B

vec3 greyFlat = vec3(0.502, 0.502, 0.502);       // #808080
vec3 greyDark = vec3(0.290, 0.290, 0.290);       // #4A4A4A

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float hp = h / 60.0;
  float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
  float m = l - c * 0.5;
  vec3 rgb;
  if (hp < 1.0) rgb = vec3(c, x, 0.0);
  else if (hp < 2.0) rgb = vec3(x, c, 0.0);
  else if (hp < 3.0) rgb = vec3(0.0, c, x);
  else if (hp < 4.0) rgb = vec3(0.0, x, c);
  else if (hp < 5.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + m;
}

vec3 chromesthesiaColor(float freqNorm, float amp) {
  float notePos = mod(freqNorm * 24.0, 12.0);
  float hue;
  // Piecewise interpolation through Scriabin hues
  // C=0°, C#=20°, D=35°, D#=50°, E=60°, F=120°, F#=165°, G=180°, G#=210°, A=240°, A#=270°, B=290°
  if (notePos < 1.0) hue = mix(0.0, 20.0, notePos);
  else if (notePos < 2.0) hue = mix(20.0, 35.0, notePos - 1.0);
  else if (notePos < 3.0) hue = mix(35.0, 50.0, notePos - 2.0);
  else if (notePos < 4.0) hue = mix(50.0, 60.0, notePos - 3.0);
  else if (notePos < 5.0) hue = mix(60.0, 120.0, notePos - 4.0);
  else if (notePos < 6.0) hue = mix(120.0, 165.0, notePos - 5.0);
  else if (notePos < 7.0) hue = mix(165.0, 180.0, notePos - 6.0);
  else if (notePos < 8.0) hue = mix(180.0, 210.0, notePos - 7.0);
  else if (notePos < 9.0) hue = mix(210.0, 240.0, notePos - 8.0);
  else if (notePos < 10.0) hue = mix(240.0, 270.0, notePos - 9.0);
  else if (notePos < 11.0) hue = mix(270.0, 290.0, notePos - 10.0);
  else hue = mix(290.0, 360.0, notePos - 11.0);

  float sat = 0.7 + amp * 0.3;
  float lit = 0.25 + amp * 0.4;
  return hsl2rgb(hue, sat, lit);
}

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

  // Chromesthesia overlay when audio is playing
  if (uAudioReactive > 0.5 && vFreqAmp > 0.01) {
    vec3 chromaColor = chromesthesiaColor(vFreqBin, vFreqAmp);
    finalColor = mix(finalColor, chromaColor, vFreqAmp * 0.7);
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
