import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DockSide, PanelId } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';

interface DockZoneProps {
  side: Exclude<DockSide, 'floating'>;
  /** Map of panel id -> rendered panel node */
  children: Partial<Record<PanelId, ReactNode>>;
}

/**
 * Renders all visible panels currently docked to a given side.
 * Top/bottom -> horizontal stacking. Left/right -> vertical stacking.
 */
export default function DockZone({ side, children }: DockZoneProps) {
  const panels = useUIStore((s) => s.panels);

  const dockedIds = (Object.keys(panels) as PanelId[])
    .filter((id) => panels[id].dock === side && panels[id].visible)
    .sort((a, b) => panels[a].order - panels[b].order);

  if (dockedIds.length === 0) return null;

  const horizontal = side === 'top' || side === 'bottom';

  return (
    <div
      className={cn(
        'flex shrink-0 gap-1 bg-background/40 p-1',
        horizontal ? 'flex-row flex-wrap items-start' : 'flex-col items-stretch w-72',
        side === 'top' && 'border-b border-border',
        side === 'bottom' && 'border-t border-border',
        side === 'left' && 'border-r border-border',
        side === 'right' && 'border-l border-border'
      )}
    >
      {dockedIds.map((id) => (
        <div key={id} className={cn(horizontal ? 'shrink-0' : 'w-full')}>
          {children[id]}
        </div>
      ))}
    </div>
  );
}
