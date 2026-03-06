import { AtlasManifest, SpectralData } from '@/types/atlas';
import { VersionData, ContrastDiff } from '@/types/contrast';
import { HeightmapData } from '@/types/terrain';

const BASE_PATH = '/data';

export async function fetchManifest(): Promise<AtlasManifest> {
  const res = await fetch(`${BASE_PATH}/atlas/manifest.json`);
  return res.json();
}

export async function fetchSongData(albumSlug: string, songSlug: string): Promise<SpectralData> {
  const res = await fetch(`${BASE_PATH}/atlas/${albumSlug}/songs/${songSlug}.json`);
  return res.json();
}

export async function fetchContrastVersion(version: 'released' | 'unreleased'): Promise<VersionData> {
  const res = await fetch(`${BASE_PATH}/contrast/${version}.json`);
  return res.json();
}

export async function fetchContrastDiff(): Promise<ContrastDiff> {
  const res = await fetch(`${BASE_PATH}/contrast/diff.json`);
  return res.json();
}

export async function fetchHeightmap(version: 'released' | 'unreleased'): Promise<HeightmapData> {
  const res = await fetch(`${BASE_PATH}/terrain/${version}-heightmap.json`);
  return res.json();
}

export function getHeatmapUrl(albumSlug: string, songSlug: string): string {
  return `${BASE_PATH}/atlas/${albumSlug}/songs/${songSlug}-heatmap.png`;
}

export function getContrastHeatmapUrl(version: 'released' | 'unreleased'): string {
  return `${BASE_PATH}/contrast/${version}-heatmap.png`;
}
