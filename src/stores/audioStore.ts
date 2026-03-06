'use client';

import { create } from 'zustand';

interface AudioState {
  isPlaying: boolean;
  currentTrack: string | null;
  currentTime: number;
  duration: number;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  sourceNode: AudioBufferSourceNode | null;
  audioBuffer: AudioBuffer | null;
  startedAt: number;
  pausedAt: number;

  initAudio: () => AudioContext;
  loadTrack: (url: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  getAnalyser: () => AnalyserNode | null;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isPlaying: false,
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  audioContext: null,
  analyserNode: null,
  sourceNode: null,
  audioBuffer: null,
  startedAt: 0,
  pausedAt: 0,

  initAudio: () => {
    const state = get();
    if (state.audioContext) return state.audioContext;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(ctx.destination);

    set({ audioContext: ctx, analyserNode: analyser });
    return ctx;
  },

  loadTrack: async (url: string) => {
    const state = get();
    const ctx = state.audioContext || get().initAudio();

    if (state.sourceNode) {
      state.sourceNode.stop();
      state.sourceNode.disconnect();
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    set({
      audioBuffer,
      currentTrack: url,
      duration: audioBuffer.duration,
      currentTime: 0,
      pausedAt: 0,
      isPlaying: false,
    });
  },

  play: () => {
    const state = get();
    if (!state.audioBuffer || !state.audioContext || !state.analyserNode) return;

    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }

    const source = state.audioContext.createBufferSource();
    source.buffer = state.audioBuffer;
    source.connect(state.analyserNode);

    const offset = state.pausedAt;
    source.start(0, offset);

    source.onended = () => {
      const current = get();
      if (current.isPlaying) {
        set({ isPlaying: false, pausedAt: 0, currentTime: 0 });
      }
    };

    set({
      sourceNode: source,
      isPlaying: true,
      startedAt: state.audioContext.currentTime - offset,
    });
  },

  pause: () => {
    const state = get();
    if (!state.sourceNode || !state.audioContext) return;

    const elapsed = state.audioContext.currentTime - state.startedAt;
    state.sourceNode.stop();
    state.sourceNode.disconnect();

    set({
      isPlaying: false,
      pausedAt: elapsed,
      currentTime: elapsed,
      sourceNode: null,
    });
  },

  stop: () => {
    const state = get();
    if (state.sourceNode) {
      state.sourceNode.stop();
      state.sourceNode.disconnect();
    }

    set({
      isPlaying: false,
      pausedAt: 0,
      currentTime: 0,
      sourceNode: null,
    });
  },

  seek: (time: number) => {
    const state = get();
    const wasPlaying = state.isPlaying;

    if (state.sourceNode) {
      state.sourceNode.stop();
      state.sourceNode.disconnect();
    }

    set({ pausedAt: time, currentTime: time, isPlaying: false, sourceNode: null });

    if (wasPlaying) {
      get().play();
    }
  },

  getAnalyser: () => get().analyserNode,
}));
