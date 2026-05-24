import { type ReactNode, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { DockSide, PanelId } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';

interface DockZoneProps {
  side: Exclude<DockSide, 'floating'>;
  /** Map of panel id -> rendered panel node */
  children: Partial<Record<PanelId, ReactNode>>;
}

const MIN_SIZE: Record<Exclude<DockSide, 'floating'>, number> = {
  left: 160,
  right: 160,
  top: 36,
  bottom: 36,
};

const MAX_FRACTION = 0.55; // max 55% of viewport

/**
 * Renders all visible panels currently docked to a given side.
 * Top/bottom -> horizontal stacking. Left/right -> vertical stacking.
 * The inner edge has a drag handle to resize the zone.
 */
export default function DockZone({ side, children }: DockZoneProps) {
  const panels = useUIStore((s) => s.panels);

  const dockedIds = (Object.keys(panels) as PanelId[])
    .filter((id) => panels[id].dock === side && panels[id].visible)
    .sort((a, b) => panels[a].order - panels[b].order);

  const horizontal = side === 'top' || side === 'bottom';
  const containerRef = useRef<HTMLDivElement>(null);
  // 0 = auto (content-driven size)
  const [size, setSize] = useState(0);
  const dragRef = useRef<{ startPos: number; startSize: number } | null>(null);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragRef.current = {
        startPos: horizontal ? e.clientY : e.clientX,
        startSize: horizontal ? rect.height : rect.width,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = (horizontal ? ev.clientY : ev.clientX) - dragRef.current.startPos;
        const directedDelta = side === 'right' || side === 'bottom' ? -delta : delta;
        const maxSize = horizontal
          ? window.innerHeight * MAX_FRACTION
          : window.innerWidth * MAX_FRACTION;
        const next = Math.max(
          MIN_SIZE[side],
          Math.min(maxSize, dragRef.current.startSize + directedDelta)
        );
        setSize(next);
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [horizontal, side]
  );

  if (dockedIds.length === 0) return null;

  const sizeStyle = horizontal
    ? size > 0
      ? { height: size, overflowY: 'auto' as const }
      : {}
    : { width: size > 0 ? size : 288 };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex gap-1 bg-background/40 p-1',
        horizontal
          ? 'flex-row flex-wrap items-start shrink-0 overflow-x-auto'
          : 'flex-col items-stretch overflow-y-auto overflow-x-hidden',
        side === 'top' && 'border-b border-border',
        side === 'bottom' && 'border-t border-border',
        side === 'left' && 'border-r border-border',
        side === 'right' && 'border-l border-border'
      )}
      style={sizeStyle}
    >
      {dockedIds.map((id) => (
        <div key={id} className={cn(horizontal ? 'shrink-0' : 'w-full')}>
          {children[id]}
        </div>
      ))}

      {/* Resize handle — inner edge of the dock zone */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Arrastrar para redimensionar"
        className={cn(
          'absolute z-20 select-none bg-transparent transition-colors',
          'hover:bg-primary/25 active:bg-primary/40',
          side === 'left' && 'right-0 top-0 bottom-0 w-1.5 cursor-col-resize',
          side === 'right' && 'left-0 top-0 bottom-0 w-1.5 cursor-col-resize',
          side === 'top' && 'left-0 right-0 bottom-0 h-1.5 cursor-row-resize',
          side === 'bottom' && 'left-0 right-0 top-0 h-1.5 cursor-row-resize'
        )}
      />
    </div>
  );
}
