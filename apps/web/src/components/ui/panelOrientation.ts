import { createContext, useContext } from 'react';

export type PanelOrientation = 'horizontal' | 'vertical';

/**
 * Provides the current panel orientation to children of a `DraggablePanel`.
 * Toolbars and other panel content can read this to flip their flex direction
 * when the panel is docked to the left or right edges of the workspace.
 */
export const PanelOrientationContext = createContext<PanelOrientation>('horizontal');

export function usePanelOrientation(): PanelOrientation {
  return useContext(PanelOrientationContext);
}

/**
 * True when the panel is too narrow to show text labels (< 160 px).
 * Toolbars collapse to icon-only mode when compact.
 */
export const PanelCompactContext = createContext<boolean>(false);

export function usePanelCompact(): boolean {
  return useContext(PanelCompactContext);
}
