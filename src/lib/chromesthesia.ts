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
