export interface HeightmapData {
  grid: number[][];
  rows: number;
  cols: number;
  maxHeight: number;
  minHeight: number;
}

export interface TerrainConfig {
  gridSize: number;
  maxElevation: number;
  colorMode: 'purple' | 'grey';
}
