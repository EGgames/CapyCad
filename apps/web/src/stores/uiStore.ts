import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PanelPosition {
  x: number;
  y: number;
}

export type DockSide = 'floating' | 'top' | 'bottom' | 'left' | 'right';

export interface PanelConfig {
  visible: boolean;
  position: PanelPosition;
  dock: DockSide;
  /** Order within its dock zone (lower = first) */
  order: number;
}

export type PanelId =
  | 'sidebar'
  | 'properties'
  | 'toolbarFile'
  | 'toolbar2d'
  | 'toolbar3d'
  | 'toolbarBoolean';

interface UIState {
  panels: Record<PanelId, PanelConfig>;
  togglePanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: PanelPosition) => void;
  setPanelDock: (id: PanelId, dock: DockSide, position?: PanelPosition) => void;
  showAllPanels: () => void;
  hideAllPanels: () => void;
  resetLayout: () => void;
}

const DEFAULT_PANELS: Record<PanelId, PanelConfig> = {
  toolbarFile: { visible: true, position: { x: 8, y: 8 }, dock: 'top', order: 0 },
  toolbar2d: { visible: true, position: { x: 8, y: 56 }, dock: 'top', order: 1 },
  toolbar3d: { visible: true, position: { x: 8, y: 110 }, dock: 'top', order: 2 },
  toolbarBoolean: { visible: true, position: { x: 8, y: 164 }, dock: 'top', order: 3 },
  sidebar: { visible: true, position: { x: 8, y: 300 }, dock: 'left', order: 0 },
  properties: { visible: true, position: { x: 800, y: 110 }, dock: 'right', order: 0 },
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
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

      setPanelDock: (id, dock, position) =>
        set((state) => {
          const current = state.panels[id];
          const orders = (Object.values(state.panels) as PanelConfig[])
            .filter((p) => p.dock === dock)
            .map((p) => p.order);
          const nextOrder = orders.length === 0 ? 0 : Math.max(...orders) + 1;
          return {
            panels: {
              ...state.panels,
              [id]: {
                ...current,
                dock,
                order: nextOrder,
                position: position ?? current.position,
              },
            },
          };
        }),

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

      resetLayout: () => set({ panels: DEFAULT_PANELS }),
    }),
    {
      name: 'stl-model-ui-layout',
      version: 2,
    }
  )
);
