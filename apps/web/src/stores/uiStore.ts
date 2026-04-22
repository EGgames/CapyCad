import { create } from 'zustand';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelConfig {
  visible: boolean;
  position: PanelPosition;
  /** Width/height are controlled by the panel itself; store only tracks position */
}

export type PanelId = 'sidebar' | 'properties' | 'toolbar2d' | 'toolbar3d';

interface UIState {
  panels: Record<PanelId, PanelConfig>;
  togglePanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: PanelPosition) => void;
  showAllPanels: () => void;
  hideAllPanels: () => void;
}

const DEFAULT_PANELS: Record<PanelId, PanelConfig> = {
  toolbar2d: { visible: true, position: { x: 8, y: 56 } },
  toolbar3d: { visible: true, position: { x: 8, y: 110 } },
  sidebar: { visible: true, position: { x: 8, y: 300 } },
  properties: { visible: true, position: { x: -1, y: 110 } }, // -1 = auto right
};

export const useUIStore = create<UIState>((set) => ({
  panels: DEFAULT_PANELS,

  togglePanel: (id) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], visible: !state.panels[id].visible },
      },
    })),

  setPanelPosition: (id, position) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], position },
      },
    })),

  showAllPanels: () =>
    set((state) => {
      const panels = { ...state.panels };
      for (const key of Object.keys(panels) as PanelId[]) {
        panels[key] = { ...panels[key], visible: true };
      }
      return { panels };
    }),

  hideAllPanels: () =>
    set((state) => {
      const panels = { ...state.panels };
      for (const key of Object.keys(panels) as PanelId[]) {
        panels[key] = { ...panels[key], visible: false };
      }
      return { panels };
    }),
}));
