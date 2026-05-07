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
  | 'toolbarSelect'
  | 'toolbar2d'
  | 'toolbar3d'
  | 'toolbarExtrude'
  | 'toolbarBoolean';

export type BooleanOperation = 'union' | 'subtract' | 'intersect';

export interface BooleanWizard {
  /** Operación que se está configurando */
  operation: BooleanOperation;
  /** 'select-target' → esperando el cuerpo A; 'select-tool' → esperando el cuerpo B */
  step: 'select-target' | 'select-tool';
  /** ID de la feature seleccionada como cuerpo objetivo (A) */
  targetId: string | null;
}

interface UIState {
  panels: Record<PanelId, PanelConfig>;
  /**
   * Cuando está activa, los clicks sobre meshes 3D y entidades 2D seleccionan,
   * y se muestra el gizmo de transformación. Cuando está inactiva, los clicks
   * NO seleccionan; el resto de toolbars que requieran selección quedan disabled.
   */
  selectionToolActive: boolean;
  setSelectionToolActive: (active: boolean) => void;
  toggleSelectionTool: () => void;
  /** Wizard de selección gráfica para operaciones booleanas. null = inactivo. */
  booleanWizard: BooleanWizard | null;
  startBooleanWizard: (operation: BooleanOperation) => void;
  cancelBooleanWizard: () => void;
  setBooleanTarget: (featureId: string) => void;
  /** Modo de preview interactivo de extrusión (flecha arrastrable en la escena). */
  extrudePreviewActive: boolean;
  setExtrudePreviewActive: (v: boolean) => void;
  /** Snapshot de IDs de entidades seleccionadas al activar el preview. */
  extrudePreviewEntityIds: string[];
  setExtrudePreviewEntityIds: (ids: string[]) => void;
  /** Distancia de extrusión en unidades de mundo (se sincroniza con la flecha y el HUD). */
  extrudePreviewDistance: number;
  setExtrudePreviewDistance: (d: number) => void;
  /** Dirección de extrusión — compartida entre HUD y Gizmo. */
  extrudePreviewDirection: 'positive' | 'negative' | 'both';
  setExtrudePreviewDirection: (d: 'positive' | 'negative' | 'both') => void;
  togglePanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: PanelPosition) => void;
  setPanelDock: (id: PanelId, dock: DockSide, position?: PanelPosition) => void;
  showAllPanels: () => void;
  hideAllPanels: () => void;
  resetLayout: () => void;
}

const DEFAULT_PANELS: Record<PanelId, PanelConfig> = {
  toolbarFile: { visible: true, position: { x: 8, y: 8 }, dock: 'top', order: 0 },
  toolbarSelect: { visible: true, position: { x: 8, y: 38 }, dock: 'top', order: 1 },
  toolbar2d: { visible: true, position: { x: 8, y: 68 }, dock: 'top', order: 2 },
  toolbar3d: { visible: true, position: { x: 8, y: 122 }, dock: 'top', order: 3 },
  toolbarExtrude: { visible: true, position: { x: 8, y: 176 }, dock: 'top', order: 4 },
  toolbarBoolean: { visible: true, position: { x: 8, y: 230 }, dock: 'top', order: 5 },
  sidebar: { visible: true, position: { x: 8, y: 300 }, dock: 'left', order: 0 },
  properties: { visible: true, position: { x: 800, y: 110 }, dock: 'right', order: 0 },
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      panels: DEFAULT_PANELS,
      selectionToolActive: true,
      booleanWizard: null,
      extrudePreviewActive: false,
      extrudePreviewEntityIds: [] as string[],
      extrudePreviewDistance: 2.0,
      extrudePreviewDirection: 'positive' as 'positive' | 'negative' | 'both',

      setSelectionToolActive: (active) => set({ selectionToolActive: active }),
      toggleSelectionTool: () =>
        set((state) => ({ selectionToolActive: !state.selectionToolActive })),

      startBooleanWizard: (operation) =>
        set({ booleanWizard: { operation, step: 'select-target', targetId: null } }),
      cancelBooleanWizard: () => set({ booleanWizard: null }),
      setBooleanTarget: (featureId) =>
        set((state) =>
          state.booleanWizard
            ? { booleanWizard: { ...state.booleanWizard, step: 'select-tool', targetId: featureId } }
            : {}
        ),

      setExtrudePreviewActive: (v) =>
        set({
          extrudePreviewActive: v,
          ...(v ? {} : { extrudePreviewDistance: 2.0, extrudePreviewDirection: 'positive', extrudePreviewEntityIds: [] }),
        }),
      setExtrudePreviewEntityIds: (ids) => set({ extrudePreviewEntityIds: ids }),
      setExtrudePreviewDistance: (d) => set({ extrudePreviewDistance: d }),
      setExtrudePreviewDirection: (d) => set({ extrudePreviewDirection: d }),

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
      version: 5,
      // Migración: garantiza valores por defecto para campos nuevos cuando el
      // usuario tiene un layout persistido de una versión previa.
      migrate: (persistedState: unknown, _version: number) => {
        const state = (persistedState ?? {}) as Partial<UIState>;
        return {
          ...state,
          panels: { ...DEFAULT_PANELS, ...(state.panels ?? {}) },
          selectionToolActive:
            typeof state.selectionToolActive === 'boolean' ? state.selectionToolActive : true,
        } as UIState;
      },
      // Merge robusto: si el storage carece de campos nuevos, se completan con
      // los valores del estado inicial (evita `undefined` en flags booleanos).
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<UIState>;
        return {
          ...currentState,
          ...persisted,
          panels: { ...currentState.panels, ...(persisted.panels ?? {}) },
          selectionToolActive:
            typeof persisted.selectionToolActive === 'boolean'
              ? persisted.selectionToolActive
              : currentState.selectionToolActive,
        };
      },
    }
  )
);
