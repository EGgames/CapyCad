import { create } from 'zustand';
import type { DockSide } from '@/stores/uiStore';

interface DockDragState {
  active: boolean;
  hover: DockSide;
  setHover: (side: DockSide) => void;
}

export const useDockDragStore = create<DockDragState>((set) => ({
  active: false,
  hover: 'floating',
  setHover: (hover) => set({ hover }),
}));
