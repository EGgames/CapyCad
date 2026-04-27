import { cn } from '@/lib/utils';
import { useDockDragStore } from './dockDragStore';

/**
 * Visual overlay shown while a panel is being dragged.
 * Highlights screen edges that act as drop targets for docking.
 */
export default function DockDropOverlay() {
  const active = useDockDragStore((s) => s.active);
  const hover = useDockDragStore((s) => s.hover);

  if (!active) return null;

  const baseEdge = 'absolute pointer-events-none border-2 border-dashed transition-colors';
  const inactive = 'border-primary/30 bg-primary/5';
  const activeCls = 'border-primary bg-primary/30';

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Top */}
      <div
        className={cn(
          baseEdge,
          'left-0 right-0 top-0 h-14',
          hover === 'top' ? activeCls : inactive
        )}
      />
      {/* Bottom */}
      <div
        className={cn(
          baseEdge,
          'left-0 right-0 bottom-0 h-14',
          hover === 'bottom' ? activeCls : inactive
        )}
      />
      {/* Left */}
      <div
        className={cn(
          baseEdge,
          'left-0 top-14 bottom-14 w-14',
          hover === 'left' ? activeCls : inactive
        )}
      />
      {/* Right */}
      <div
        className={cn(
          baseEdge,
          'right-0 top-14 bottom-14 w-14',
          hover === 'right' ? activeCls : inactive
        )}
      />
    </div>
  );
}
