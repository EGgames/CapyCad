import { useRef, useCallback, useState, useEffect, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { GripHorizontal, X, PinOff } from 'lucide-react';
import type { PanelId, DockSide } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';
import { useDockDragStore } from './dockDragStore';
import {
  PanelOrientationContext,
  PanelCompactContext,
  type PanelOrientation,
} from './panelOrientation';

type ResizeDir = 'w' | 'h' | 'both';

const COMPACT_THRESHOLD = 160; // px — below this width, hide text labels

interface DraggablePanelProps {
  id: PanelId;
  title: string;
  children: ReactNode;
  className?: string;
  closable?: boolean;
  headerExtra?: ReactNode;
}

const SNAP_THRESHOLD = 60; // px from edge to trigger dock

function detectDockSide(x: number, y: number): DockSide {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Order matters: top/bottom take precedence in corners
  if (y < SNAP_THRESHOLD) return 'top';
  if (h - y < SNAP_THRESHOLD) return 'bottom';
  if (x < SNAP_THRESHOLD) return 'left';
  if (w - x < SNAP_THRESHOLD) return 'right';
  return 'floating';
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
  const setPanelDock = useUIStore((s) => s.setPanelDock);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const setHoverDock = useDockDragStore((s) => s.setHover);

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Compact mode: true when panel width < COMPACT_THRESHOLD
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.getBoundingClientRect().width;
      setCompact(w < COMPACT_THRESHOLD);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resize state (floating panels only)
  const [panelSize, setPanelSize] = useState<{ w?: number; h?: number }>({});
  const panelSizeRef = useRef<{ w?: number; h?: number }>({});
  const resizeDragRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const startResize = useCallback((dir: ResizeDir, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeDragRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };
    const onMove = (ev: globalThis.MouseEvent) => {
      if (!resizeDragRef.current) return;
      const { dir: d, startX, startY, startW, startH } = resizeDragRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const next: { w?: number; h?: number } = {
        w: d !== 'h' ? Math.max(120, startW + dx) : panelSizeRef.current.w,
        h: d !== 'w' ? Math.max(60, startH + dy) : panelSizeRef.current.h,
      };
      panelSizeRef.current = next;
      setPanelSize(next);
    };
    const onUp = () => {
      resizeDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Avoid starting drag if click target is a button/input inside header
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a')) return;

      e.preventDefault();
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setIsDragging(true);
      useDockDragStore.setState({ active: true, hover: 'floating' });

      const handleMouseMove = (ev: globalThis.MouseEvent) => {
        const newX = ev.clientX - dragOffset.current.x;
        const newY = ev.clientY - dragOffset.current.y;
        setPanelPosition(id, { x: newX, y: newY });
        const side = detectDockSide(ev.clientX, ev.clientY);
        setHoverDock(side);
      };

      const handleMouseUp = (ev: globalThis.MouseEvent) => {
        setIsDragging(false);
        useDockDragStore.setState({ active: false, hover: 'floating' });
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const side = detectDockSide(ev.clientX, ev.clientY);
        if (side !== 'floating') {
          setPanelDock(id, side);
        } else {
          // Clamp into viewport
          const r = panelRef.current?.getBoundingClientRect();
          const w = r?.width ?? 200;
          const h = r?.height ?? 60;
          const clampedX = Math.max(
            0,
            Math.min(ev.clientX - dragOffset.current.x, window.innerWidth - w)
          );
          const clampedY = Math.max(
            0,
            Math.min(ev.clientY - dragOffset.current.y, window.innerHeight - h)
          );
          setPanelDock(id, 'floating', { x: clampedX, y: clampedY });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [id, setPanelPosition, setPanelDock, setHoverDock]
  );

  if (!panel.visible) return null;

  const isFloating = panel.dock === 'floating';
  const orientation: PanelOrientation =
    panel.dock === 'left' || panel.dock === 'right' ? 'vertical' : 'horizontal';

  return (
    <PanelOrientationContext.Provider value={orientation}>
      <PanelCompactContext.Provider value={compact}>
        <div
          ref={panelRef}
          className={cn(
            'flex flex-col rounded-lg border border-border bg-card shadow-xl',
            isFloating && 'fixed z-30',
            !isFloating && 'relative',
            isDragging && 'opacity-90 shadow-2xl ring-2 ring-primary/50',
            className
          )}
          style={
            isFloating
              ? {
                  left: panel.position.x,
                  top: panel.position.y,
                  ...(panelSize.w !== undefined && { width: panelSize.w }),
                  ...(panelSize.h !== undefined
                    ? { height: panelSize.h }
                    : { maxHeight: `calc(100vh - ${Math.max(panel.position.y, 0) + 16}px)` }),
                }
              : undefined
          }
        >
          {/* Drag handle header — full width */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              'flex h-8 items-center gap-2 rounded-t-lg border-b border-border bg-muted/50 px-2 select-none',
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            )}
          >
            <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
            </span>
            {headerExtra}
            {!isFloating && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelDock(id, 'floating', { x: 80, y: 80 });
                }}
                className="rounded p-0.5 hover:bg-muted"
                title="Desanclar"
              >
                <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            {closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePanel(id);
                }}
                className="rounded p-0.5 hover:bg-muted"
                title={`Ocultar ${title}`}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Content */}
          <div className="overflow-auto flex-1 min-h-0">{children}</div>

          {/* Resize handles — floating panels only */}
          {isFloating && (
            <>
              {/* Right edge */}
              <div
                onMouseDown={(e) => startResize('w', e)}
                className="absolute right-0 top-8 bottom-3 w-1.5 cursor-col-resize z-20 hover:bg-primary/25 active:bg-primary/40 transition-colors"
              />
              {/* Bottom edge */}
              <div
                onMouseDown={(e) => startResize('h', e)}
                className="absolute left-3 right-3 bottom-0 h-1.5 cursor-row-resize z-20 hover:bg-primary/25 active:bg-primary/40 transition-colors"
              />
              {/* Bottom-right corner */}
              <div
                onMouseDown={(e) => startResize('both', e)}
                className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize z-20 hover:bg-primary/40 active:bg-primary/60 transition-colors rounded-br-lg"
              />
            </>
          )}
        </div>
      </PanelCompactContext.Provider>
    </PanelOrientationContext.Provider>
  );
}
