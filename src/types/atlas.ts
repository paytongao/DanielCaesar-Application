export interface Album {
  slug: string;
  title: string;
  year: number;
  coverUrl: string;
  palette: Palette;
  songs: Song[];
}

export interface Song {
  slug: string;
  title: string;
  duration: number;
  audioUrl?: string;
  dataUrl: string;
  heatmapUrl: string;
}

export interface Palette {
  dominantColors: string[];
}

export interface SpectralData {
  frequencyBins: number[][];
  sampleRate: number;
  fftSize: number;
  hopSize: number;
  duration: number;
  gradient?: [number[][], number[][]];
}

export interface AtlasManifest {
  albums: Album[];
}
