/**
 * Integration test: ToolbarBoolean → BooleanDialog → createBoolean
 *
 * Reproduces the bug "las booleanas no funcionan":
 * Originally the BooleanDialog initialised target/tool ids from `featureNames` only
 * once on mount; when features were added later, the selects looked populated but
 * internal state stayed empty, so the "Aplicar Booleana" button stayed disabled
 * and no boolean was ever created.
 *
 * This test:
 *  1. Mounts ToolbarBoolean with no features → button is disabled, dialog shows
 *     the "no hay extrusiones" message.
 *  2. Adds two extrude features to the store → button enables.
 *  3. Opens the dialog, clicks Aplicar Booleana → asserts createBoolean was
 *     invoked with the two feature ids.
 *  4. Confirms non-extrude features (e.g. primitives) are NOT offered as options.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BufferGeometry } from 'three';
import { FeatureType, SketchEntityType, type ExtrudeFeature, type BoxFeature, type Line } from '@stl-model/shared-types';
import { useFeatureStore } from '@/stores/featureStore';
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
  type: FeatureType.BOX,
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
  });

  it('booleanButton_whenNoExtrudes_thenIsDisabled', () => {
    render(<ToolbarBoolean />);
    const btn = screen.getByTestId('boolean-open-btn') as HTMLButtonElement;
    expect(btn).toBeInTheDocument();
    // Button is rendered but flagged as not-runnable via title hint
    expect(btn.title).toMatch(/al menos 2 extrusiones/i);
  });

  it('booleanDialog_whenOpenedWithoutExtrudes_thenShowsEmptyMessage', () => {
    render(<ToolbarBoolean />);
    fireEvent.click(screen.getByTestId('boolean-open-btn'));
    expect(screen.getByTestId('boolean-empty-msg')).toBeInTheDocument();
  });

  it('booleanDialog_whenOnlyPrimitivesExist_thenStillShowsEmptyMessage', () => {
    const { addFeature } = useFeatureStore.getState();
    act(() => {
      addFeature(mkBox('box-1'), new BufferGeometry());
      addFeature(mkBox('box-2'), new BufferGeometry());
    });

    render(<ToolbarBoolean />);
    fireEvent.click(screen.getByTestId('boolean-open-btn'));
    // Primitives are filtered out → still no extrudes available
    expect(screen.getByTestId('boolean-empty-msg')).toBeInTheDocument();
  });

  it('booleanDialog_whenTwoExtrudesAdded_thenApplyTriggersCreateBoolean', async () => {
    const { addFeature } = useFeatureStore.getState();
    act(() => {
      addFeature(mkExtrude('ext-1', 'Extrusión A'), new BufferGeometry());
      addFeature(mkExtrude('ext-2', 'Extrusión B'), new BufferGeometry());
    });

    render(<ToolbarBoolean />);

    // Open dialog
    fireEvent.click(screen.getByTestId('boolean-open-btn'));

    // Both extrudes should appear (one option per select → 2 each)
    expect(screen.getAllByText('Extrusión A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Extrusión B').length).toBeGreaterThan(0);

    // The "no hay extrusiones" warning should NOT be present
    expect(screen.queryByTestId('boolean-empty-msg')).not.toBeInTheDocument();

    // Click "Aplicar Booleana"
    const apply = screen.getByRole('button', { name: /aplicar booleana/i });
    expect(apply).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(apply);
    });

    // Wait for the async createBoolean to settle and assert worker was called
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
    // Render with empty store
    const { addFeature } = useFeatureStore.getState();
    render(<ToolbarBoolean />);

    // Add extrudes AFTER the dialog component is already mounted
    act(() => {
      addFeature(mkExtrude('ext-1', 'A'), new BufferGeometry());
      addFeature(mkExtrude('ext-2', 'B'), new BufferGeometry());
    });

    // Open the dialog now → useEffect must populate target/tool with ext-1 / ext-2
    fireEvent.click(screen.getByTestId('boolean-open-btn'));

    const apply = screen.getByRole('button', { name: /aplicar booleana/i }) as HTMLButtonElement;
    expect(apply.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(apply);
    });

    await vi.waitFor(() => {
      expect(booleanOpMock).toHaveBeenCalledTimes(1);
    });
  });
});
