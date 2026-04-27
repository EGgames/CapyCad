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
