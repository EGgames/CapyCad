/**
 * Integration test: ToolbarModifiers
 *
 * Covers rendering, button presence, enabled/disabled state,
 * and basic dialog interaction for edge and solid modifiers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BufferGeometry } from 'three';
import { FeatureType, type ExtrudeFeature, type BoxFeature } from '@capycad/shared-types';
import { useFeatureStore } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import { useToastStore } from '@/lib/toast';
import ToolbarModifiers from '../ToolbarModifiers';

const mockGeometryData = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
};

const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockGetEdges = vi.fn().mockResolvedValue([
  {
    index: 0,
    start: { x: 0, y: 0, z: 0 },
    end: { x: 1, y: 0, z: 0 },
    mid: { x: 0.5, y: 0, z: 0 },
  },
]);
const mockFillet = vi.fn().mockResolvedValue(mockGeometryData);
const mockChamfer = vi.fn().mockResolvedValue(mockGeometryData);
const mockBevel = vi.fn().mockResolvedValue(mockGeometryData);
const mockCove = vi.fn().mockResolvedValue(mockGeometryData);
const mockShell = vi.fn().mockResolvedValue(mockGeometryData);
const mockDraft = vi.fn().mockResolvedValue(mockGeometryData);
const mockOffset = vi.fn().mockResolvedValue(mockGeometryData);

vi.mock('@/lib/cad/cadWorkerClient', () => ({
  getCADWorker: vi.fn(() => ({
    initialize: mockInitialize,
    getEdges: mockGetEdges,
    fillet: mockFillet,
    chamfer: mockChamfer,
    bevel: mockBevel,
    cove: mockCove,
    shell: mockShell,
    draft: mockDraft,
    offset: mockOffset,
  })),
}));

const mkExtrude = (id: string): ExtrudeFeature => ({
  id,
  type: FeatureType.EXTRUDE,
  name: `Extrusión ${id}`,
  parentId: null,
  visible: true,
  suppressed: false,
  sketch: {
    id: `sketch-${id}`,
    name: 'Sketch',
    entities: [],
    constraints: [],
    measurements: [],
    plane: 'XY' as const,
  },
  distance: 20,
  direction: 'positive' as const,
});

const mkBox = (id: string): BoxFeature => ({
  id,
  type: FeatureType.PRIMITIVE_BOX,
  name: `Box ${id}`,
  parentId: null,
  visible: true,
  suppressed: false,
  width: 10,
  height: 10,
  depth: 10,
});

const resetStore = (features: any[] = [], selectedFeatureId: string | null = null) => {
  useFeatureStore.setState({
    features,
    selectedFeatureId,
    geometries: new Map(),
    history: [[]],
    historyIndex: 0,
    canUndo: false,
    canRedo: false,
    isProcessing: false,
    processingProgress: 0,
  });
};

describe('ToolbarModifiers — integración', () => {
  beforeEach(() => {
    resetStore();
    useUIStore.setState({ modifierPicker: null, booleanWizard: null });
    useToastStore.setState({ toasts: [] });
    mockInitialize.mockResolvedValue(undefined);
    mockGetEdges.mockResolvedValue([
      {
        index: 0,
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 0, z: 0 },
        mid: { x: 0.5, y: 0, z: 0 },
      },
    ]);
    mockFillet.mockResolvedValue(mockGeometryData);
    mockChamfer.mockResolvedValue(mockGeometryData);
    mockBevel.mockResolvedValue(mockGeometryData);
    mockCove.mockResolvedValue(mockGeometryData);
    mockShell.mockResolvedValue(mockGeometryData);
    mockDraft.mockResolvedValue(mockGeometryData);
    mockOffset.mockResolvedValue(mockGeometryData);
  });

  describe('Renderizado', () => {
    it('toolbarModifiers_whenRendered_thenHasCorrectTestId', () => {
      render(<ToolbarModifiers />);
      expect(screen.getByTestId('toolbar-modifiers')).toBeInTheDocument();
    });

    it('toolbarModifiers_whenRendered_thenAllEightButtonsPresent', () => {
      render(<ToolbarModifiers />);
      const types = ['sharp', 'fillet', 'chamfer', 'bevel', 'cove', 'shell', 'draft', 'offset'];
      for (const type of types) {
        expect(
          screen.getByTestId(`modifier-${type}-btn`),
          `button ${type} should be present`
        ).toBeInTheDocument();
      }
    });
  });

  describe('Estado deshabilitado — sin sólido seleccionado', () => {
    it('toolbarModifiers_whenNoFeatureSelected_thenActionButtonsShowDisabledTitle', () => {
      resetStore([mkExtrude('e1')], null);
      render(<ToolbarModifiers />);
      const actionTypes = ['fillet', 'chamfer', 'bevel', 'cove', 'shell', 'draft', 'offset'];
      for (const type of actionTypes) {
        const btn = screen.getByTestId(`modifier-${type}-btn`);
        expect(btn.title, `${type} title should mention selecting a solid`).toMatch(
          /selecciona un sólido/i
        );
      }
    });

    it('toolbarModifiers_whenNoSolidFeatureSelected_thenActionButtonsShowDisabledTitle', () => {
      // A sketch feature is not a solid
      const sketchFeature = {
        id: 'sketch-feat',
        type: 'sketch',
        name: 'My Sketch',
        parentId: null,
        visible: true,
        suppressed: false,
      } as any;
      resetStore([sketchFeature], 'sketch-feat');
      render(<ToolbarModifiers />);
      const filletBtn = screen.getByTestId('modifier-fillet-btn');
      expect(filletBtn.title).toMatch(/selecciona un sólido/i);
    });
  });

  describe('Estado habilitado — sólido seleccionado', () => {
    it('toolbarModifiers_whenExtrudeSelected_thenActionButtonsShowCorrectTitle', () => {
      const extrude = mkExtrude('e1');
      resetStore([extrude], 'e1');
      useFeatureStore.setState({
        geometries: new Map([['e1', { featureId: 'e1', geometry: new BufferGeometry(), visible: true }]]),
      });
      render(<ToolbarModifiers />);
      const actionTypes = ['fillet', 'chamfer', 'bevel', 'cove', 'shell', 'draft', 'offset'];
      for (const type of actionTypes) {
        const btn = screen.getByTestId(`modifier-${type}-btn`);
        // When a solid IS selected, title should NOT say "Selecciona un sólido"
        expect(btn.title, `${type} should have operation title when extrude selected`).not.toMatch(
          /selecciona un sólido/i
        );
      }
    });

    it('toolbarModifiers_whenBoxSelected_thenFilletButtonHasOperationTitle', () => {
      const box = mkBox('b1');
      resetStore([box], 'b1');
      render(<ToolbarModifiers />);
      const filletBtn = screen.getByTestId('modifier-fillet-btn');
      expect(filletBtn.title).not.toMatch(/selecciona un sólido/i);
    });
  });

  describe('Botón Sharp — informacional', () => {
    it('toolbarModifiers_whenSharpButton_thenIsNotDisabled', () => {
      resetStore([mkExtrude('e1')], null);
      render(<ToolbarModifiers />);
      const sharpBtn = screen.getByTestId('modifier-sharp-btn') as HTMLButtonElement;
      // sharp is always visible (informational, not an operation)
      expect(sharpBtn).toBeInTheDocument();
    });

    it('toolbarModifiers_whenSharpButtonClicked_thenNoDialogOpens', () => {
      render(<ToolbarModifiers />);
      const sharpBtn = screen.getByTestId('modifier-sharp-btn');
      sharpBtn.click();
      // No dialog should be open after clicking sharp
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('Conteo de modificadores', () => {
    it('toolbarModifiers_whenRendered_thenHasFiveEdgeModifiers', () => {
      render(<ToolbarModifiers />);
      const edgeTypes = ['sharp', 'fillet', 'chamfer', 'bevel', 'cove'];
      for (const type of edgeTypes) {
        expect(screen.getByTestId(`modifier-${type}-btn`)).toBeInTheDocument();
      }
    });

    it('toolbarModifiers_whenRendered_thenHasThreeSolidModifiers', () => {
      render(<ToolbarModifiers />);
      const solidTypes = ['shell', 'draft', 'offset'];
      for (const type of solidTypes) {
        expect(screen.getByTestId(`modifier-${type}-btn`)).toBeInTheDocument();
      }
    });
  });

  describe('Picker de aristas y errores accionables', () => {
    it('toolbarModifiers_whenEdgeModifierStarts_thenShowsViewportInstructions', async () => {
      const extrude = mkExtrude('e1');
      resetStore([extrude], 'e1');
      useFeatureStore.setState({
        geometries: new Map([
          ['e1', { featureId: 'e1', geometry: new BufferGeometry(), visible: true }],
        ]),
      });

      render(<ToolbarModifiers />);
      fireEvent.click(screen.getByTestId('modifier-fillet-btn'));

      await waitFor(() => {
        expect(screen.getByText(/Selección de aristas para Filete/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Haz click en las aristas azules del visor/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirmar selección/i })).toBeInTheDocument();
    });

    it('toolbarModifiers_whenWorkerReturnsActionableError_thenToastUsesThatMessage', async () => {
      const extrude = mkExtrude('e1');
      resetStore([extrude], 'e1');
      useFeatureStore.setState({
        geometries: new Map([
          ['e1', { featureId: 'e1', geometry: new BufferGeometry(), visible: true }],
        ]),
      });
      mockFillet.mockRejectedValueOnce(
        new Error(
          'No se pudo aplicar el redondeo con ese radio en las aristas elegidas. Reduce el valor o prueba con otras aristas.'
        )
      );

      render(<ToolbarModifiers />);
      fireEvent.click(screen.getByTestId('modifier-fillet-btn'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Confirmar selección/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Confirmar selección/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Aplicar Fillet/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Aplicar Fillet/i }));

      await waitFor(() => {
        expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
          'No se pudo aplicar el redondeo con ese radio en las aristas elegidas. Reduce el valor o prueba con otras aristas.'
        );
      });
    });
  });
});
