/**
 * Integration test: panel orientation
 *
 * When a DraggablePanel is docked to the left or right edge it must expose
 * `orientation = 'vertical'` to its children via PanelOrientationContext.
 * Top/bottom/floating must be `'horizontal'`.
 *
 * Toolbars (Toolbar2D, Toolbar3D, ToolbarBoolean, ToolbarFile) read this
 * context to flip their flex direction. This test verifies both the context
 * value and that Toolbar2D actually renders with `flex-col` class when vertical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DraggablePanel from '@/components/ui/DraggablePanel';
import { usePanelOrientation } from '@/components/ui/panelOrientation';
import { useUIStore } from '@/stores/uiStore';
import Toolbar2D from '@/components/toolbar/Toolbar2D';

function OrientationProbe() {
  const o = usePanelOrientation();
  return <span data-testid="probe">{o}</span>;
}

describe('PanelOrientationContext', () => {
  beforeEach(() => {
    // Reset the panel registry — sidebar starts docked LEFT by default, so reuse it.
    useUIStore.setState({
      panels: {
        ...useUIStore.getState().panels,
        sidebar: { visible: true, position: { x: 0, y: 0 }, dock: 'left', order: 0 },
        toolbar2d: { visible: true, position: { x: 0, y: 0 }, dock: 'top', order: 0 },
        toolbar3d: { visible: true, position: { x: 0, y: 0 }, dock: 'right', order: 0 },
        toolbarBoolean: { visible: true, position: { x: 0, y: 0 }, dock: 'floating', order: 0 },
      },
    });
  });

  it('panelOrientation_whenDockLeft_thenIsVertical', () => {
    render(
      <DraggablePanel id="sidebar" title="Sidebar">
        <OrientationProbe />
      </DraggablePanel>
    );
    expect(screen.getByTestId('probe').textContent).toBe('vertical');
  });

  it('panelOrientation_whenDockRight_thenIsVertical', () => {
    render(
      <DraggablePanel id="toolbar3d" title="3D">
        <OrientationProbe />
      </DraggablePanel>
    );
    expect(screen.getByTestId('probe').textContent).toBe('vertical');
  });

  it('panelOrientation_whenDockTop_thenIsHorizontal', () => {
    render(
      <DraggablePanel id="toolbar2d" title="2D">
        <OrientationProbe />
      </DraggablePanel>
    );
    expect(screen.getByTestId('probe').textContent).toBe('horizontal');
  });

  it('panelOrientation_whenFloating_thenIsHorizontal', () => {
    render(
      <DraggablePanel id="toolbarBoolean" title="Bool">
        <OrientationProbe />
      </DraggablePanel>
    );
    expect(screen.getByTestId('probe').textContent).toBe('horizontal');
  });

  it('toolbar2D_whenDockedLeft_thenContainerIsFlexCol', () => {
    useUIStore.setState({
      panels: {
        ...useUIStore.getState().panels,
        toolbar2d: { visible: true, position: { x: 0, y: 0 }, dock: 'left', order: 0 },
      },
    });

    render(
      <DraggablePanel id="toolbar2d" title="2D">
        <Toolbar2D />
      </DraggablePanel>
    );
    const root = screen.getByTestId('toolbar-2d');
    expect(root.className).toMatch(/flex-col/);
  });

  it('toolbar2D_whenDockedTop_thenContainerIsRowFlex', () => {
    render(
      <DraggablePanel id="toolbar2d" title="2D">
        <Toolbar2D />
      </DraggablePanel>
    );
    const root = screen.getByTestId('toolbar-2d');
    expect(root.className).not.toMatch(/flex-col/);
    expect(root.className).toMatch(/flex/);
  });
});
