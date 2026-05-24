import { Square, Circle, Minus, Move, Hexagon, Spline, Ruler, GitBranch } from 'lucide-react';

const EllipseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="12" rx="10" ry="6" />
  </svg>
);
import { useSketchStore } from '@/stores/sketchStore';
import { cn } from '@/lib/utils';
import { usePanelOrientation, usePanelCompact } from '../ui/panelOrientation';

export default function Toolbar2D() {
  const {
    activeTool,
    setActiveTool,
    polygonSides,
    setPolygonSides,
    measureUnit,
    setMeasureUnit,
    pixelsPerMm,
    setPixelsPerMm,
  } = useSketchStore();

  const tools2D = [
    { icon: Move, label: 'Selección', action: 'select' as const },
    { icon: Minus, label: 'Línea (L)', action: 'line' as const },
    { icon: Circle, label: 'Círculo (C)', action: 'circle' as const },
    { icon: Square, label: 'Rectángulo (R)', action: 'rectangle' as const },
    { icon: Hexagon, label: 'Polígono (P)', action: 'polygon' as const },
    { icon: Spline, label: 'Arco (A)', action: 'arc' as const },
    { icon: GitBranch, label: 'Spline (B)', action: 'spline' as const },
    { icon: EllipseIcon, label: 'Elipse (E)', action: 'ellipse' as const },
    { icon: Ruler, label: 'Medir (M)', action: 'measure' as const },
  ];

  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';
  const isCompact = usePanelCompact();

  return (
    <div
      data-testid="toolbar-2d"
      className={cn(
        'gap-1 px-2',
        isVertical ? 'flex flex-col items-stretch py-2' : 'flex items-center overflow-x-auto'
      )}
    >
      <div
        className={cn(
          isVertical
            ? isCompact
              ? 'flex flex-col items-center space-y-1'
              : 'flex flex-col items-stretch space-y-1'
            : 'flex items-center space-x-1'
        )}
      >
        {!isCompact && (
          <span
            className={cn(
              'text-xs font-medium text-muted-foreground',
              isVertical ? 'mb-1' : 'mr-2'
            )}
          >
            2D:
          </span>
        )}
        {tools2D.map((tool) => (
          <button
            key={tool.action}
            onClick={() => setActiveTool(tool.action)}
            className={cn(
              isVertical && !isCompact
                ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
                : 'flex h-9 w-9 items-center justify-center rounded-md',
              activeTool === tool.action ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
            {isVertical && !isCompact && <span className="text-sm">{tool.label}</span>}
          </button>
        ))}

        {/* Config medición: unidad y escala */}
        {activeTool === 'measure' && !isCompact && (
          <div className="ml-2 flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/30 px-2 py-0.5">
            <button
              onClick={() => setMeasureUnit('mm')}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold transition-colors',
                measureUnit === 'mm'
                  ? 'bg-amber-500 text-black'
                  : 'text-amber-400 hover:bg-amber-500/20'
              )}
              title="Milimetros"
            >
              mm
            </button>
            <button
              onClick={() => setMeasureUnit('ft')}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold transition-colors',
                measureUnit === 'ft'
                  ? 'bg-amber-500 text-black'
                  : 'text-amber-400 hover:bg-amber-500/20'
              )}
              title="Pies"
            >
              ft
            </button>
            <div className="mx-1 h-5 w-px bg-amber-500/30" />
            <span className="text-[10px] text-amber-400/70">1px =</span>
            <input
              type="number"
              value={pixelsPerMm}
              min={0.01}
              step={0.1}
              onChange={(e) => setPixelsPerMm(parseFloat(e.target.value) || 1)}
              className="w-14 rounded border border-amber-500/30 bg-transparent px-1 text-xs text-amber-300 focus:border-amber-400 focus:outline-none"
              title="Píxeles por milímetro"
            />
            <span className="text-[10px] text-amber-400/70">mm</span>
          </div>
        )}

        {activeTool === 'polygon' && !isCompact && (
          <div className="ml-1 flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">Lados:</span>
            <button
              onClick={() => setPolygonSides(Math.max(3, polygonSides - 1))}
              className="flex h-6 w-6 items-center justify-center rounded bg-muted text-sm font-bold hover:bg-muted/70"
              title="Menos lados"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold">{polygonSides}</span>
            <button
              onClick={() => setPolygonSides(Math.min(20, polygonSides + 1))}
              className="flex h-6 w-6 items-center justify-center rounded bg-muted text-sm font-bold hover:bg-muted/70"
              title="Más lados"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
