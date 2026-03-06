'use client';

import { useCallback, useRef } from 'react';
import { useAudioStore } from '@/stores/audioStore';

export function useAudioAnalyser() {
  const analyserNode = useAudioStore((s) => s.analyserNode);
  const frequencyData = useRef(new Float32Array(1024));
  const waveformData = useRef(new Float32Array(1024));
  const normalizedFrequency = useRef(new Float32Array(1024));

  const update = useCallback(() => {
    if (!analyserNode) return;

    if (frequencyData.current.length !== analyserNode.frequencyBinCount) {
      frequencyData.current = new Float32Array(analyserNode.frequencyBinCount);
      waveformData.current = new Float32Array(analyserNode.frequencyBinCount);
      normalizedFrequency.current = new Float32Array(analyserNode.frequencyBinCount);
    }

    analyserNode.getFloatFrequencyData(frequencyData.current);
    analyserNode.getFloatTimeDomainData(waveformData.current);

    // Normalize frequency data from dB (-100..0) to 0..1
    for (let i = 0; i < frequencyData.current.length; i++) {
      normalizedFrequency.current[i] = Math.max(0, Math.min(1, (frequencyData.current[i] + 100) / 100));
    }
  }, [analyserNode]);

  return {
    frequencyData: frequencyData.current,
    waveformData: waveformData.current,
    normalizedFrequency: normalizedFrequency.current,
    update,
  };
}
