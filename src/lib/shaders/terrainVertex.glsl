uniform sampler2D uFrequencyTexture;
uniform float uAudioReactive;
uniform float uMaxHeight;

varying float vHeight;
varying vec2 vUv;
varying float vFreqBin;
varying float vFreqAmp;

void main() {
  vec3 pos = position;

  float freq = 0.0;
  if (uAudioReactive > 0.5) {
    freq = texture2D(uFrequencyTexture, vec2(uv.x, 0.5)).r;
    pos.z += freq * uMaxHeight;
  }

  vHeight = pos.z;
  vUv = uv;
  vFreqBin = uv.x;
  vFreqAmp = freq;

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
