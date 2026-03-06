export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

export function createAnalyser(ctx: AudioContext, fftSize = 2048): AnalyserNode {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.8;
  return analyser;
}

export async function loadAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export function getFrequencyData(analyser: AnalyserNode): Float32Array {
  const data = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(data);
  return data;
}

export function getWaveformData(analyser: AnalyserNode): Float32Array {
  const data = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatTimeDomainData(data);
  return data;
}

export function normalizeFrequencyData(data: Float32Array): Float32Array {
  const normalized = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    // Convert from dB (-100 to 0) to 0-1 range
    normalized[i] = Math.max(0, Math.min(1, (data[i] + 100) / 100));
  }
  return normalized;
}
