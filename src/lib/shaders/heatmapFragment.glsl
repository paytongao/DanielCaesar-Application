uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);

  // Subtle pulse
  float pulse = sin(uTime * 0.8) * 0.05 + 1.0;
  texColor.rgb *= pulse;
  texColor.a *= uOpacity;

  gl_FragColor = texColor;
}
