/**
 * Tests para uiStore
 *
 * Cubre:
 * - Estado inicial de paneles
 * - togglePanel / setPanelPosition / setPanelDock
 * - showAllPanels / hideAllPanels / resetLayout
 * - selectionToolActive / toggleSelectionTool
 * - BooleanWizard: start, cancel, setBooleanTarget
 * - ModifierPicker: start, setEdges, toggleEdge, selectAll, clear
 * - ExtrudePreview: setActive, setEntityIds, setDistance, setDirection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/uiStore';

/** Constantes de paneles esperados */
const PANEL_IDS = [
  'sidebar',
  'properties',
  'toolbarFile',
  'toolbarSelect',
  'toolbar2d',
  'toolbar3d',
  'toolbarExtrude',
  'toolbarBoolean',
  'toolbarModifiers',
] as const;

/** Helper: reset completo del store */
function resetStore() {
  useUIStore.setState({
    selectionToolActive: true,
    booleanWizard: null,
    modifierPicker: null,
    extrudePreviewActive: false,
    extrudePreviewEntityIds: [],
    extrudePreviewDistance: 2.0,
    extrudePreviewDirection: 'positive',
    panels: {
      toolbarFile:     { visible: true, position: { x: 8, y: 8 },    dock: 'top',   order: 0 },
      toolbarSelect:   { visible: true, position: { x: 8, y: 38 },   dock: 'top',   order: 1 },
      toolbar2d:       { visible: true, position: { x: 8, y: 68 },   dock: 'top',   order: 2 },
      toolbar3d:       { visible: true, position: { x: 8, y: 122 },  dock: 'top',   order: 3 },
      toolbarExtrude:  { visible: true, position: { x: 8, y: 176 },  dock: 'top',   order: 4 },
      toolbarBoolean:  { visible: true, position: { x: 8, y: 230 },  dock: 'top',   order: 5 },
      toolbarModifiers:{ visible: true, position: { x: 8, y: 284 },  dock: 'top',   order: 6 },
      sidebar:         { visible: true, position: { x: 8, y: 300 },  dock: 'left',  order: 0 },
      properties:      { visible: true, position: { x: 800, y: 110 }, dock: 'right', order: 0 },
    },
  });
}

describe('uiStore', () => {
  beforeEach(resetStore);

  // ── Estado inicial ─────────────────────────────────────────────────────────

  describe('Estado inicial', () => {
    it('todos los paneles están visibles por defecto', () => {
      const { panels } = useUIStore.getState();
      for (const id of PANEL_IDS) {
        expect(panels[id].visible).toBe(true);
      }
    });

    it('selectionToolActive es true por defecto', () => {
      expect(useUIStore.getState().selectionToolActive).toBe(true);
    });

    it('booleanWizard es null por defecto', () => {
      expect(useUIStore.getState().booleanWizard).toBeNull();
    });

    it('modifierPicker es null por defecto', () => {
      expect(useUIStore.getState().modifierPicker).toBeNull();
    });

    it('extrudePreviewActive es false por defecto', () => {
      expect(useUIStore.getState().extrudePreviewActive).toBe(false);
    });

    it('extrudePreviewDistance es 2.0 por defecto', () => {
      expect(useUIStore.getState().extrudePreviewDistance).toBe(2.0);
    });

    it('extrudePreviewDirection es "positive" por defecto', () => {
      expect(useUIStore.getState().extrudePreviewDirection).toBe('positive');
    });

    it('extrudePreviewEntityIds es [] por defecto', () => {
      expect(useUIStore.getState().extrudePreviewEntityIds).toHaveLength(0);
    });

    it('existen exactamente 9 paneles', () => {
      const { panels } = useUIStore.getState();
      expect(Object.keys(panels)).toHaveLength(9);
    });
  });

  // ── togglePanel ────────────────────────────────────────────────────────────

  describe('togglePanel', () => {
    it('oculta un panel visible', () => {
      const { togglePanel } = useUIStore.getState();
      togglePanel('sidebar');
      expect(useUIStore.getState().panels.sidebar.visible).toBe(false);
    });

    it('muestra un panel oculto', () => {
      useUIStore.setState((s) => ({
        panels: { ...s.panels, sidebar: { ...s.panels.sidebar, visible: false } },
      }));
      useUIStore.getState().togglePanel('sidebar');
      expect(useUIStore.getState().panels.sidebar.visible).toBe(true);
    });

    it('no afecta a otros paneles', () => {
      useUIStore.getState().togglePanel('sidebar');
      expect(useUIStore.getState().panels.properties.visible).toBe(true);
    });

    it('puede alternar el mismo panel varias veces', () => {
      const { togglePanel } = useUIStore.getState();
      togglePanel('toolbar2d');
      togglePanel('toolbar2d');
      expect(useUIStore.getState().panels.toolbar2d.visible).toBe(true);
    });
  });

  // ── setPanelPosition ───────────────────────────────────────────────────────

  describe('setPanelPosition', () => {
    it('actualiza la posición de un panel', () => {
      useUIStore.getState().setPanelPosition('sidebar', { x: 200, y: 300 });
      expect(useUIStore.getState().panels.sidebar.position).toEqual({ x: 200, y: 300 });
    });

    it('no modifica otros campos del panel', () => {
      const before = useUIStore.getState().panels.sidebar;
      useUIStore.getState().setPanelPosition('sidebar', { x: 0, y: 0 });
      const after = useUIStore.getState().panels.sidebar;
      expect(after.visible).toBe(before.visible);
      expect(after.dock).toBe(before.dock);
    });
  });

  // ── setPanelDock ───────────────────────────────────────────────────────────

  describe('setPanelDock', () => {
    it('cambia el dock de un panel', () => {
      useUIStore.getState().setPanelDock('sidebar', 'bottom');
      expect(useUIStore.getState().panels.sidebar.dock).toBe('bottom');
    });

    it('asigna order basado en la cantidad de paneles en esa dock zone', () => {
      // Solo toolbar2d usa 'top' en el reset inicial, hay varios en top
      // Al mover sidebar a 'floating' el order debe ser >= 0
      useUIStore.getState().setPanelDock('sidebar', 'floating');
      expect(useUIStore.getState().panels.sidebar.order).toBeGreaterThanOrEqual(0);
    });

    it('puede actualizar la posición al mismo tiempo', () => {
      useUIStore.getState().setPanelDock('sidebar', 'right', { x: 900, y: 200 });
      const { panels } = useUIStore.getState();
      expect(panels.sidebar.dock).toBe('right');
      expect(panels.sidebar.position).toEqual({ x: 900, y: 200 });
    });

    it('conserva la posición original si no se pasa nueva posición', () => {
      const originalPos = useUIStore.getState().panels.sidebar.position;
      useUIStore.getState().setPanelDock('sidebar', 'bottom');
      expect(useUIStore.getState().panels.sidebar.position).toEqual(originalPos);
    });
  });

  // ── showAllPanels / hideAllPanels ──────────────────────────────────────────

  describe('showAllPanels', () => {
    it('hace visible todos los paneles', () => {
      // Ocultar algunos primero
      useUIStore.setState((s) => ({
        panels: {
          ...s.panels,
          sidebar: { ...s.panels.sidebar, visible: false },
          properties: { ...s.panels.properties, visible: false },
        },
      }));
      useUIStore.getState().showAllPanels();
      const { panels } = useUIStore.getState();
      for (const id of PANEL_IDS) {
        expect(panels[id].visible).toBe(true);
      }
    });
  });

  describe('hideAllPanels', () => {
    it('oculta todos los paneles', () => {
      useUIStore.getState().hideAllPanels();
      const { panels } = useUIStore.getState();
      for (const id of PANEL_IDS) {
        expect(panels[id].visible).toBe(false);
      }
    });
  });

  // ── resetLayout ────────────────────────────────────────────────────────────

  describe('resetLayout', () => {
    it('restaura todos los paneles a su estado por defecto', () => {
      useUIStore.getState().hideAllPanels();
      useUIStore.getState().setPanelPosition('sidebar', { x: 999, y: 999 });
      useUIStore.getState().resetLayout();
      const { panels } = useUIStore.getState();
      expect(panels.sidebar.visible).toBe(true);
      expect(panels.sidebar.position).toEqual({ x: 8, y: 300 });
    });
  });

  // ── selectionToolActive ────────────────────────────────────────────────────

  describe('setSelectionToolActive', () => {
    it('desactiva la herramienta de selección', () => {
      useUIStore.getState().setSelectionToolActive(false);
      expect(useUIStore.getState().selectionToolActive).toBe(false);
    });

    it('activa la herramienta de selección', () => {
      useUIStore.setState({ selectionToolActive: false });
      useUIStore.getState().setSelectionToolActive(true);
      expect(useUIStore.getState().selectionToolActive).toBe(true);
    });
  });

  describe('toggleSelectionTool', () => {
    it('invierte el estado de selección (true → false)', () => {
      useUIStore.getState().toggleSelectionTool();
      expect(useUIStore.getState().selectionToolActive).toBe(false);
    });

    it('invierte el estado de selección (false → true)', () => {
      useUIStore.setState({ selectionToolActive: false });
      useUIStore.getState().toggleSelectionTool();
      expect(useUIStore.getState().selectionToolActive).toBe(true);
    });
  });

  // ── BooleanWizard ──────────────────────────────────────────────────────────

  describe('startBooleanWizard', () => {
    it('crea el wizard con la operación dada', () => {
      useUIStore.getState().startBooleanWizard('union');
      const { booleanWizard } = useUIStore.getState();
      expect(booleanWizard).not.toBeNull();
      expect(booleanWizard?.operation).toBe('union');
    });

    it('inicia en step "select-target"', () => {
      useUIStore.getState().startBooleanWizard('subtract');
      expect(useUIStore.getState().booleanWizard?.step).toBe('select-target');
    });

    it('inicia con targetId null', () => {
      useUIStore.getState().startBooleanWizard('intersect');
      expect(useUIStore.getState().booleanWizard?.targetId).toBeNull();
    });

    it('soporta las tres operaciones booleanas', () => {
      for (const op of ['union', 'subtract', 'intersect'] as const) {
        useUIStore.getState().startBooleanWizard(op);
        expect(useUIStore.getState().booleanWizard?.operation).toBe(op);
      }
    });
  });

  describe('cancelBooleanWizard', () => {
    it('cancela el wizard activo', () => {
      useUIStore.getState().startBooleanWizard('union');
      useUIStore.getState().cancelBooleanWizard();
      expect(useUIStore.getState().booleanWizard).toBeNull();
    });

    it('no lanza error si no hay wizard activo', () => {
      expect(() => useUIStore.getState().cancelBooleanWizard()).not.toThrow();
    });
  });

  describe('setBooleanTarget', () => {
    it('establece el targetId y avanza al step "select-tool"', () => {
      useUIStore.getState().startBooleanWizard('union');
      useUIStore.getState().setBooleanTarget('feature-abc');
      const { booleanWizard } = useUIStore.getState();
      expect(booleanWizard?.targetId).toBe('feature-abc');
      expect(booleanWizard?.step).toBe('select-tool');
    });

    it('no hace nada si no hay wizard activo', () => {
      expect(() => useUIStore.getState().setBooleanTarget('feature-abc')).not.toThrow();
      expect(useUIStore.getState().booleanWizard).toBeNull();
    });

    it('preserva la operación original', () => {
      useUIStore.getState().startBooleanWizard('subtract');
      useUIStore.getState().setBooleanTarget('feature-xyz');
      expect(useUIStore.getState().booleanWizard?.operation).toBe('subtract');
    });
  });

  // ── ModifierPicker ─────────────────────────────────────────────────────────

  describe('startModifierPicker', () => {
    it('crea el picker con el featureId dado', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      const { modifierPicker } = useUIStore.getState();
      expect(modifierPicker?.featureId).toBe('feature-1');
    });

    it('inicia con aristas vacías', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      expect(useUIStore.getState().modifierPicker?.edges).toHaveLength(0);
    });

    it('inicia con selectedIndices vacíos', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      expect(useUIStore.getState().modifierPicker?.selectedIndices).toHaveLength(0);
    });

    it('inicia con loading=true', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      expect(useUIStore.getState().modifierPicker?.loading).toBe(true);
    });
  });

  describe('setModifierPickerEdges', () => {
    const mockEdges = [
      { index: 0, start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, mid: { x: 0.5, y: 0, z: 0 } },
      { index: 1, start: { x: 1, y: 0, z: 0 }, end: { x: 1, y: 1, z: 0 }, mid: { x: 1, y: 0.5, z: 0 } },
    ];

    it('asigna las aristas al picker', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      useUIStore.getState().setModifierPickerEdges(mockEdges);
      expect(useUIStore.getState().modifierPicker?.edges).toHaveLength(2);
    });

    it('desactiva el flag loading', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      useUIStore.getState().setModifierPickerEdges(mockEdges);
      expect(useUIStore.getState().modifierPicker?.loading).toBe(false);
    });

    it('no hace nada si no hay picker activo', () => {
      expect(() => useUIStore.getState().setModifierPickerEdges(mockEdges)).not.toThrow();
      expect(useUIStore.getState().modifierPicker).toBeNull();
    });
  });

  describe('toggleModifierPickerEdge', () => {
    beforeEach(() => {
      useUIStore.getState().startModifierPicker('feature-1');
    });

    it('agrega un índice al seleccionar', () => {
      useUIStore.getState().toggleModifierPickerEdge(2);
      expect(useUIStore.getState().modifierPicker?.selectedIndices).toContain(2);
    });

    it('elimina un índice al deseleccionar', () => {
      useUIStore.getState().toggleModifierPickerEdge(2);
      useUIStore.getState().toggleModifierPickerEdge(2);
      expect(useUIStore.getState().modifierPicker?.selectedIndices).not.toContain(2);
    });

    it('puede seleccionar múltiples índices', () => {
      useUIStore.getState().toggleModifierPickerEdge(0);
      useUIStore.getState().toggleModifierPickerEdge(1);
      useUIStore.getState().toggleModifierPickerEdge(3);
      expect(useUIStore.getState().modifierPicker?.selectedIndices).toHaveLength(3);
    });

    it('no hace nada si no hay picker activo', () => {
      useUIStore.getState().clearModifierPicker();
      expect(() => useUIStore.getState().toggleModifierPickerEdge(0)).not.toThrow();
    });
  });

  describe('selectAllModifierEdges', () => {
    it('limpia la selección de aristas (toggle-all comportamiento)', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      useUIStore.getState().toggleModifierPickerEdge(0);
      useUIStore.getState().toggleModifierPickerEdge(1);
      useUIStore.getState().selectAllModifierEdges();
      expect(useUIStore.getState().modifierPicker?.selectedIndices).toHaveLength(0);
    });
  });

  describe('clearModifierPicker', () => {
    it('elimina el picker', () => {
      useUIStore.getState().startModifierPicker('feature-1');
      useUIStore.getState().clearModifierPicker();
      expect(useUIStore.getState().modifierPicker).toBeNull();
    });

    it('no lanza error si no hay picker activo', () => {
      expect(() => useUIStore.getState().clearModifierPicker()).not.toThrow();
    });
  });

  // ── ExtrudePreview ─────────────────────────────────────────────────────────

  describe('setExtrudePreviewActive', () => {
    it('activa el modo preview', () => {
      useUIStore.getState().setExtrudePreviewActive(true);
      expect(useUIStore.getState().extrudePreviewActive).toBe(true);
    });

    it('al desactivar resetea distancia a 2.0', () => {
      useUIStore.getState().setExtrudePreviewDistance(10);
      useUIStore.getState().setExtrudePreviewActive(false);
      expect(useUIStore.getState().extrudePreviewDistance).toBe(2.0);
    });

    it('al desactivar resetea dirección a "positive"', () => {
      useUIStore.getState().setExtrudePreviewDirection('both');
      useUIStore.getState().setExtrudePreviewActive(false);
      expect(useUIStore.getState().extrudePreviewDirection).toBe('positive');
    });

    it('al desactivar limpia los entityIds', () => {
      useUIStore.getState().setExtrudePreviewEntityIds(['e1', 'e2']);
      useUIStore.getState().setExtrudePreviewActive(false);
      expect(useUIStore.getState().extrudePreviewEntityIds).toHaveLength(0);
    });

    it('al activar no resetea la distancia', () => {
      useUIStore.getState().setExtrudePreviewDistance(5);
      useUIStore.getState().setExtrudePreviewActive(true);
      expect(useUIStore.getState().extrudePreviewDistance).toBe(5);
    });
  });

  describe('setExtrudePreviewEntityIds', () => {
    it('guarda los IDs de entidades', () => {
      useUIStore.getState().setExtrudePreviewEntityIds(['id-1', 'id-2', 'id-3']);
      expect(useUIStore.getState().extrudePreviewEntityIds).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('puede vaciarse con array vacío', () => {
      useUIStore.getState().setExtrudePreviewEntityIds([]);
      expect(useUIStore.getState().extrudePreviewEntityIds).toHaveLength(0);
    });
  });

  describe('setExtrudePreviewDistance', () => {
    it('actualiza la distancia de preview', () => {
      useUIStore.getState().setExtrudePreviewDistance(7.5);
      expect(useUIStore.getState().extrudePreviewDistance).toBe(7.5);
    });

    it('acepta valores negativos (dirección negativa)', () => {
      useUIStore.getState().setExtrudePreviewDistance(-3);
      expect(useUIStore.getState().extrudePreviewDistance).toBe(-3);
    });
  });

  describe('setExtrudePreviewDirection', () => {
    it('cambia a "negative"', () => {
      useUIStore.getState().setExtrudePreviewDirection('negative');
      expect(useUIStore.getState().extrudePreviewDirection).toBe('negative');
    });

    it('cambia a "both"', () => {
      useUIStore.getState().setExtrudePreviewDirection('both');
      expect(useUIStore.getState().extrudePreviewDirection).toBe('both');
    });

    it('cambia a "positive"', () => {
      useUIStore.getState().setExtrudePreviewDirection('both');
      useUIStore.getState().setExtrudePreviewDirection('positive');
      expect(useUIStore.getState().extrudePreviewDirection).toBe('positive');
    });
  });
});
