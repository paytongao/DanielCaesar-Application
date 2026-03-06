uniform sampler2D uFrequencyTexture;
uniform float uAudioReactive;
uniform float uMaxHeight;

varying float vHeight;
varying vec2 vUv;

void main() {
  vec3 pos = position;

  if (uAudioReactive > 0.5) {
    float freq = texture2D(uFrequencyTexture, vec2(uv.x, 0.5)).r;
    pos.z += freq * uMaxHeight;
  }

  vHeight = pos.z;
  vUv = uv;

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
