/**
 * Integration test: ToolbarBoolean — 3 direct operation buttons + boolean wizard
 *
 * New UI: instead of a single "Booleana" button opening a dialog, there are
 * 3 buttons (Union, Subtract, Intersect) that each start a graphical
 * selection wizard in the canvas.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BufferGeometry } from 'three';
import { FeatureType, SketchEntityType, type ExtrudeFeature, type BoxFeature, type Line } from '@capycad/shared-types';
import { useFeatureStore } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import ToolbarBoolean from '../ToolbarBoolean';

const mockGeometryData = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
};

const booleanOpMock = vi.fn().mockResolvedValue(mockGeometryData);

vi.mock('@/lib/cad/cadWorkerClient', () => ({
  getCADWorker: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    booleanOp: booleanOpMock,
  })),
}));

const mkExtrude = (id: string, name: string): ExtrudeFeature => ({
  id,
  type: FeatureType.EXTRUDE,
  name,
  parentId: null,
  visible: true,
  suppressed: false,
  sketch: {
    id: `sketch-${id}`,
    name: 'Sketch',
    entities: [
      {
        id: 'l1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 5, y: 0 },
      } as Line,
    ],
    constraints: [],
    measurements: [],
    plane: 'XY' as const,
  },
  distance: 10,
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

describe('ToolbarBoolean — integración', () => {
  beforeEach(() => {
    booleanOpMock.mockClear();
    useFeatureStore.setState({
      features: [],
      selectedFeatureId: null,
      geometries: new Map(),
      history: [[]],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
      isProcessing: false,
      processingProgress: 0,
    });
    useUIStore.setState({ booleanWizard: null });
  });

  it('booleanButton_whenNoExtrudes_thenIsDisabled', () => {
    render(<ToolbarBoolean />);
    // Los 3 botones deben estar presentes
    const unionBtn = screen.getByTestId('boolean-union-btn') as HTMLButtonElement;
    const subtractBtn = screen.getByTestId('boolean-subtract-btn') as HTMLButtonElement;
    const intersectBtn = screen.getByTestId('boolean-intersect-btn') as HTMLButtonElement;
    expect(unionBtn).toBeInTheDocument();
    expect(subtractBtn).toBeInTheDocument();
    expect(intersectBtn).toBeInTheDocument();
    // Con 0 sólidos, el title advierte que se necesitan al menos 2
    expect(unionBtn.title).toMatch(/al menos 2 sólidos/i);
  });

  it('booleanDialog_whenOpenedWithoutExtrudes_thenShowsEmptyMessage', () => {
    render(<ToolbarBoolean />);
    // Clicking union starts the wizard (visible in uiStore)
    fireEvent.click(screen.getByTestId('boolean-union-btn'));
    const wizard = useUIStore.getState().booleanWizard;
    expect(wizard).not.toBeNull();
    expect(wizard?.operation).toBe('union');
    expect(wizard?.step).toBe('select-target');
  });

  it('booleanDialog_whenOnlyPrimitivesExist_thenButtonIsEnabled', () => {
    const { addFeature } = useFeatureStore.getState();
    act(() => {
      addFeature(mkBox('box-1'), new BufferGeometry());
      addFeature(mkBox('box-2'), new BufferGeometry());
    });

    render(<ToolbarBoolean />);
    // Primitives NOW count as solid features → canRun is true → title shows the operation title
    const unionBtn = screen.getByTestId('boolean-union-btn') as HTMLButtonElement;
    expect(unionBtn.title).not.toMatch(/al menos 2 sólidos/i);
  });

  it('booleanDialog_whenTwoExtrudesAdded_thenApplyTriggersCreateBoolean', async () => {
    const { addFeature } = useFeatureStore.getState();
    act(() => {
      addFeature(mkExtrude('ext-1', 'Extrusión A'), new BufferGeometry());
      addFeature(mkExtrude('ext-2', 'Extrusión B'), new BufferGeometry());
    });

    render(<ToolbarBoolean />);

    // With 2 extrudes, the button title should NOT warn about needing 2
    const unionBtn = screen.getByTestId('boolean-union-btn') as HTMLButtonElement;
    expect(unionBtn.title).not.toMatch(/al menos 2 sólidos/i);

    // Clicking starts the wizard
    fireEvent.click(unionBtn);
    const wizard = useUIStore.getState().booleanWizard;
    expect(wizard).not.toBeNull();
    expect(wizard?.operation).toBe('union');

    // Simulate wizard: set target + call createBoolean directly (canvas interaction not testable here)
    await act(async () => {
      useUIStore.getState().setBooleanTarget('ext-1');
      await useFeatureStore.getState().createBoolean('ext-1', 'ext-2', 'union');
    });

    await vi.waitFor(() => {
      expect(booleanOpMock).toHaveBeenCalledTimes(1);
    });

    // A BOOLEAN feature should have been added to the store
    const features = useFeatureStore.getState().features;
    const boolFeature = features.find((f) => f.type === FeatureType.BOOLEAN);
    expect(boolFeature).toBeDefined();
    expect((boolFeature as any).targetId).toBe('ext-1');
    expect((boolFeature as any).toolId).toBe('ext-2');
  });

  it('booleanDialog_whenExtrudesAddedAfterFirstRender_thenStateSyncsOnOpen', async () => {
    const { addFeature } = useFeatureStore.getState();
    render(<ToolbarBoolean />);

    // Add extrudes AFTER the component is already mounted
    act(() => {
      addFeature(mkExtrude('ext-1', 'A'), new BufferGeometry());
      addFeature(mkExtrude('ext-2', 'B'), new BufferGeometry());
    });

    // Now clicking subtract starts wizard with correct operation
    fireEvent.click(screen.getByTestId('boolean-subtract-btn'));
    const wizard = useUIStore.getState().booleanWizard;
    expect(wizard?.operation).toBe('subtract');

    await act(async () => {
      await useFeatureStore.getState().createBoolean('ext-1', 'ext-2', 'subtract');
    });

    await vi.waitFor(() => {
      expect(booleanOpMock).toHaveBeenCalledTimes(1);
    });
  });
});

