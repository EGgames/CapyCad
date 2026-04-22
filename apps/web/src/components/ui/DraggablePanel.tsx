import { useRef, useCallback, useState, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { GripHorizontal, X } from 'lucide-react';
import type { PanelId, PanelPosition } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';

interface DraggablePanelProps {
  id: PanelId;
  title: string;
  children: ReactNode;
  className?: string;
  /** Initial position used only on first render */
  defaultPosition?: PanelPosition;
  /** Allow closing via X button */
  closable?: boolean;
  /** Extra header content (right side, before close button) */
  headerExtra?: ReactNode;
}

export default function DraggablePanel({
  id,
  title,
  children,
  className,
  closable = true,
  headerExtra,
}: DraggablePanelProps) {
  const panel = useUIStore((s) => s.panels[id]);
  const setPanelPosition = useUIStore((s) => s.setPanelPosition);
  const togglePanel = useUIStore((s) => s.togglePanel);

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Only primary button
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setIsDragging(true);

      const handleMouseMove = (ev: globalThis.MouseEvent) => {
        const newX = Math.max(
          0,
          Math.min(ev.clientX - dragOffset.current.x, window.innerWidth - 100)
        );
        const newY = Math.max(
          0,
          Math.min(ev.clientY - dragOffset.current.y, window.innerHeight - 40)
        );
        setPanelPosition(id, { x: newX, y: newY });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [id, setPanelPosition]
  );

  if (!panel.visible) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute z-30 flex flex-col rounded-lg border border-border bg-card shadow-xl pointer-events-none',
        isDragging && 'opacity-90 shadow-2xl',
        className
      )}
      style={{
        left: panel.position.x >= 0 ? panel.position.x : undefined,
        right: panel.position.x < 0 ? Math.abs(panel.position.x) * 8 : undefined,
        top: panel.position.y,
        maxHeight: `calc(100vh - ${panel.position.y + 16}px)`,
      }}
    >
      {/* Drag handle header */}
      <div
        className={cn(
          'flex h-9 items-center gap-2 rounded-t-lg border-b border-border bg-muted/50 px-2 pointer-events-none',
          isDragging && 'cursor-grabbing'
        )}
      >
        <div
          onMouseDown={handleMouseDown}
          className={cn('cursor-grab pointer-events-auto', isDragging && 'cursor-grabbing')}
        >
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="flex-1 select-none text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {headerExtra && <div className="pointer-events-auto">{headerExtra}</div>}
        {closable && (
          <button
            onClick={() => togglePanel(id)}
            className="rounded p-0.5 hover:bg-muted pointer-events-auto"
            title={`Ocultar ${title}`}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {/* Content */}
      <div className="overflow-auto pointer-events-auto">{children}</div>
    </div>
  );
}
