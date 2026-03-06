'use client';

import { create } from 'zustand';

type Section = 'hero' | 'atlas' | 'contrast' | 'terrain';

interface NavigationState {
  activeSection: Section;
  scrollProgress: number;
  setActiveSection: (section: Section) => void;
  setScrollProgress: (progress: number) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeSection: 'hero',
  scrollProgress: 0,
  setActiveSection: (section) => set({ activeSection: section }),
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
}));
