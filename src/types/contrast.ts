export interface VersionData {
  frequencyBins: number[][];
  sampleRate: number;
  fftSize: number;
  hopSize: number;
  duration: number;
}

export interface ContrastDiff {
  diff: number[][];
  maxDiff: number;
}

export interface ContrastConfig {
  released: {
    audioUrl: string;
    dataUrl: string;
    heatmapUrl: string;
    color: string;
  };
  unreleased: {
    audioUrl: string;
    dataUrl: string;
    heatmapUrl: string;
    color: string;
  };
}
