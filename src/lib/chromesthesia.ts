/**
 * Chromesthesia — frequency-to-color mapping and audio analysis utilities.
 */

/**
 * Map a frequency bin to an HSL color.
 * Low frequencies → warm purples/reds, mid → blues/cyans, high → greens/yellows.
 */
export function frequencyToColor(
  binIndex: number,
  amplitude: number,
  totalBins: number
): [number, number, number] {
  // Hue: 270 (purple) for low freq → 60 (yellow) for high freq
  const t = binIndex / totalBins;
  const hue = 270 - t * 210; // 270 → 60
  const saturation = 60 + amplitude * 40; // 60-100%
  const lightness = 20 + amplitude * 50; // 20-70%
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
    // Logarithmic spacing: lower bands cover fewer bins, upper bands cover more
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
 * Returns true if current frame is a beat.
 */
export function detectBeat(
  fftData: Float32Array,
  history: number[],
  threshold: number = 1.4
): boolean {
  // Compute current frame energy (focus on bass: first 1/8 of bins)
  const bassEnd = Math.floor(fftData.length / 8);
  let energy = 0;
  for (let i = 0; i < bassEnd; i++) {
    energy += fftData[i] * fftData[i];
  }
  energy = Math.sqrt(energy / bassEnd);

  // Rolling average
  history.push(energy);
  if (history.length > 60) history.shift(); // ~1 second at 60fps

  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  return energy > avg * threshold;
}
