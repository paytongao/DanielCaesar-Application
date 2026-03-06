/**
 * Chromesthesia — pitch detection, frequency-to-color mapping, and audio analysis utilities.
 * Implements a Scriabin-inspired chromesthesia color wheel for mapping musical pitch to color.
 */

import { hslToRgb } from '@/components/shared/ColorUtils';

// Scriabin-inspired hue wheel: maps each semitone (0-11) to a hue angle
// C=Red, C#=RedOrange, D=Orange, D#=YellowOrange, E=Yellow, F=Green,
// F#=Teal, G=Cyan, G#=SkyBlue, A=Blue, A#=BlueViolet, B=Violet
const SCRIABIN_HUES = [0, 20, 35, 50, 60, 120, 165, 180, 210, 240, 270, 290];

/**
 * Convert an FFT bin index to its corresponding frequency in Hz.
 */
export function fftBinToHz(
  binIndex: number,
  sampleRate: number = 44100,
  fftSize: number = 2048
): number {
  return binIndex * (sampleRate / fftSize);
}

/**
 * Convert a frequency in Hz to a MIDI note number.
 * A4 = 440 Hz = MIDI note 69.
 */
export function hzToMidiNote(hz: number): number {
  if (hz <= 0) return -1;
  return Math.round(69 + 12 * Math.log2(hz / 440));
}

/**
 * Map a MIDI note to a Scriabin-inspired chromesthesia HSL color.
 * Returns [hue (0-360), saturation (0-100), lightness (0-100)].
 */
export function noteToChromesthesiaColor(
  midiNote: number,
  amplitude: number
): [number, number, number] {
  const semitone = ((midiNote % 12) + 12) % 12;
  const hue = SCRIABIN_HUES[semitone];
  const saturation = 70 + amplitude * 30; // 70-100%
  const lightness = 25 + amplitude * 40;  // 25-65%
  return [hue, saturation, lightness];
}

/**
 * Convert an FFT bin index + amplitude directly to an RGB color (0-1 range).
 * Chains: bin → Hz → MIDI note → Scriabin color → RGB.
 */
export function frequencyBinToColor(
  binIndex: number,
  amplitude: number,
  sampleRate: number = 44100,
  fftSize: number = 2048
): [number, number, number] {
  const hz = fftBinToHz(binIndex, sampleRate, fftSize);
  const midi = hzToMidiNote(hz);
  if (midi < 0) return [0.1, 0.1, 0.1]; // Below audible range
  const [h, s, l] = noteToChromesthesiaColor(midi, amplitude);
  return hslToRgb(h, s / 100, l / 100);
}

/**
 * Original simple frequency-to-color mapping (linear hue sweep).
 * Kept for backward compatibility.
 */
export function frequencyToColor(
  binIndex: number,
  amplitude: number,
  totalBins: number
): [number, number, number] {
  const t = binIndex / totalBins;
  const hue = 270 - t * 210;
  const saturation = 60 + amplitude * 40;
  const lightness = 20 + amplitude * 50;
  return [((hue % 360) + 360) % 360, saturation, lightness];
}

/**
 * Catmull-Rom cubic spline interpolation.
 * Interpolates between p1 and p2 using p0, p3 as tangent control points.
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/**
 * Smooth continuous chromesthesia color using Catmull-Rom spline
 * interpolation through Scriabin hue control points.
 *
 * Unlike frequencyBinToColor (which rounds to discrete MIDI semitones),
 * this produces C∞-smooth flowing color gradients — no hard band edges.
 *
 * @param freqNorm  Normalized frequency position ∈ [0, 1]
 * @param amplitude Signal amplitude ∈ [0, 1]
 */
export function smoothChromesthesiaColor(
  freqNorm: number,
  amplitude: number
): [number, number, number] {
  // Two octave cycles across the spectrum for richer color variation
  const notePos = ((freqNorm * 24) % 12 + 12) % 12;
  const i = Math.floor(notePos);
  const f = notePos - i;

  // 4 control point indices for Catmull-Rom (wrapping circularly)
  const indices = [
    ((i - 1) + 12) % 12,
    i % 12,
    (i + 1) % 12,
    (i + 2) % 12,
  ];

  const points = indices.map(idx => SCRIABIN_HUES[idx]);

  // Fix circular wrapping: ensure all points are within ±180° of p1
  // so the spline takes the shortest hue path
  const ref = points[1];
  for (let k = 0; k < 4; k++) {
    while (points[k] - ref > 180) points[k] -= 360;
    while (points[k] - ref < -180) points[k] += 360;
  }

  const hue = catmullRom(points[0], points[1], points[2], points[3], f);
  const finalHue = ((hue % 360) + 360) % 360;

  const saturation = 0.7 + amplitude * 0.3;
  const lightness = 0.25 + amplitude * 0.4;

  return hslToRgb(finalHue, saturation, lightness);
}

/**
 * 1D Gaussian kernel convolution with reflected boundary conditions.
 * Smooths an array of values using a Gaussian window of width σ.
 *
 * Mathematical basis: G(x) = (1/σ√2π) exp(-x²/2σ²)
 * Discrete kernel truncated at ±3σ with normalization.
 */
export function gaussianSmooth1D(data: number[], sigma: number): number[] {
  const len = data.length;
  const result = new Array(len);
  const radius = Math.ceil(sigma * 3);

  // Precompute normalized Gaussian kernel
  const kernel: number[] = [];
  let kSum = 0;
  for (let k = -radius; k <= radius; k++) {
    const w = Math.exp(-(k * k) / (2 * sigma * sigma));
    kernel.push(w);
    kSum += w;
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= kSum;

  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) {
      // Reflected (Neumann) boundary conditions
      let j = i + k;
      if (j < 0) j = -j;
      if (j >= len) j = 2 * len - j - 2;
      j = Math.max(0, Math.min(len - 1, j));
      sum += data[j] * kernel[k + radius];
    }
    result[i] = sum;
  }

  return result;
}

/**
 * In-place Laplacian mesh smoothing on Y-coordinates of a grid.
 * Each vertex Y is averaged with its 4-connected neighbors.
 * Multiple iterations produce progressively smoother surfaces.
 */
export function laplacianSmoothY(
  positions: Float32Array,
  cols: number,
  rows: number,
  iterations: number = 2
): void {
  const temp = new Float32Array(cols * rows);
  for (let iter = 0; iter < iterations; iter++) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const vi = row * cols + col;
        let sum = positions[vi * 3 + 1];
        let count = 1;

        if (col > 0) { sum += positions[(vi - 1) * 3 + 1]; count++; }
        if (col < cols - 1) { sum += positions[(vi + 1) * 3 + 1]; count++; }
        if (row > 0) { sum += positions[(vi - cols) * 3 + 1]; count++; }
        if (row < rows - 1) { sum += positions[(vi + cols) * 3 + 1]; count++; }

        temp[vi] = sum / count;
      }
    }
    for (let i = 0; i < cols * rows; i++) {
      positions[i * 3 + 1] = temp[i];
    }
  }
}

/**
 * Aggregate FFT data into N frequency bands (logarithmically spaced).
 */
export function aggregateFrequencyBands(
  fftData: Float32Array,
  numBands: number
): number[] {
  const bands: number[] = new Array(numBands).fill(0);
  const len = fftData.length;
  if (len === 0) return bands;

  for (let band = 0; band < numBands; band++) {
    const startFrac = Math.pow(band / numBands, 2);
    const endFrac = Math.pow((band + 1) / numBands, 2);
    const startBin = Math.floor(startFrac * len);
    const endBin = Math.max(startBin + 1, Math.floor(endFrac * len));

    let sum = 0;
    let count = 0;
    for (let i = startBin; i < endBin && i < len; i++) {
      sum += fftData[i];
      count++;
    }
    bands[band] = count > 0 ? sum / count : 0;
  }

  return bands;
}

/**
 * Simple beat detection: compares current energy to a rolling average.
 */
export function detectBeat(
  fftData: Float32Array,
  history: number[],
  threshold: number = 1.4
): boolean {
  const bassEnd = Math.floor(fftData.length / 8);
  let energy = 0;
  for (let i = 0; i < bassEnd; i++) {
    energy += fftData[i] * fftData[i];
  }
  energy = Math.sqrt(energy / bassEnd);

  history.push(energy);
  if (history.length > 60) history.shift();

  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  return energy > avg * threshold;
}

/**
 * GLSL chromesthesia color function — inject into fragment shaders.
 * Maps a normalized frequency (0-1) to Scriabin-inspired chromesthesia colors.
 */
export const CHROMESTHESIA_GLSL = `
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
  // Scriabin-inspired: two octave cycles across the frequency spectrum
  float notePos = mod(freqNorm * 24.0, 12.0);
  float hue;
  // Piecewise Scriabin hue lookup with interpolation
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
`;
