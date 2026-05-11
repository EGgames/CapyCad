import { MousePointer2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFeatureStore } from '@/stores/featureStore';
import { useSketchStore } from '@/stores/sketchStore';
import { cn } from '@/lib/utils';
import { usePanelOrientation, usePanelCompact } from '../ui/panelOrientation';

/**
 * Barra dedicada a la herramienta de SELECCIÓN.
 *
 * - Cuando está activa: los clicks sobre meshes 3D y entidades 2D seleccionan,
 *   y se renderiza el TransformGizmo (axis) sobre la figura 3D seleccionada.
 * - Cuando está inactiva: las demás herramientas que requieran selección quedan
 *   visualmente deshabilitadas.
 *
 * Muestra qué hay seleccionado actualmente y permite limpiar la selección.
 */
export default function ToolbarSelect() {
  const selectionToolActive = useUIStore((s) => s.selectionToolActive);
  const toggleSelectionTool = useUIStore((s) => s.toggleSelectionTool);

  const selectedFeatureId = useFeatureStore((s) => s.selectedFeatureId);
  const features = useFeatureStore((s) => s.features);
  const selectFeature = useFeatureStore((s) => s.selectFeature);

  const selectedEntities = useSketchStore((s) => s.selectedEntities);
  const clearSketchSelection = useSketchStore((s) => s.clearSelection);
  const sketchActiveTool = useSketchStore((s) => s.activeTool);
  const setSketchActiveTool = useSketchStore((s) => s.setActiveTool);

  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';
  const isCompact = usePanelCompact();

  const selectedFeature = selectedFeatureId
    ? features.find((f) => f.id === selectedFeatureId)
    : null;

  const has3DSelection = !!selectedFeature;
  const has2DSelection = selectedEntities.length > 0;
  const hasAnySelection = has3DSelection || has2DSelection;

  const selectionLabel = has3DSelection
    ? `3D: ${selectedFeature.name}`
    : has2DSelection
      ? `2D: ${selectedEntities.length} entidad${selectedEntities.length > 1 ? 'es' : ''}`
      : 'Sin selección';

  const handleToggle = () => {
    const next = !selectionToolActive;
    toggleSelectionTool();
    // Sincronizar con sketchStore: si activamos selección global,
    // poner también la herramienta de sketch en 'select'.
    if (next && sketchActiveTool !== 'select') {
      setSketchActiveTool('select');
    }
  };

  const handleClear = () => {
    selectFeature(null);
    clearSketchSelection();
  };

  // Tecla Escape: limpia cualquier selección activa (2D y 3D) globalmente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (selectedFeatureId || selectedEntities.length > 0) {
        selectFeature(null);
        clearSketchSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedFeatureId, selectedEntities.length, selectFeature, clearSketchSelection]);

  return (
    <div
      data-testid="toolbar-select"
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
            Selección:
          </span>
        )}

        <button
          data-testid="select-tool-btn"
          aria-pressed={selectionToolActive}
          className={cn(
            isVertical && !isCompact
              ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
              : 'flex h-9 w-9 items-center justify-center rounded-md',
            selectionToolActive
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'hover:bg-muted'
          )}
          title={
            selectionToolActive
              ? 'Herramienta Seleccionar activa — click para desactivar'
              : 'Activar herramienta Seleccionar'
          }
          onClick={handleToggle}
        >
          <MousePointer2 className="h-4 w-4" />
          {isVertical && !isCompact && <span className="text-sm">Seleccionar</span>}
        </button>

        {/* Estado actual de la selección — oculto en modo compacto */}
        {!isCompact && (
          <div
            data-testid="selection-status"
            className={cn(
              'flex items-center gap-1.5 text-xs',
              isVertical ? 'mt-1 px-2' : 'ml-2',
              hasAnySelection ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <span className="truncate max-w-[160px]" title={selectionLabel}>
              {selectionLabel}
            </span>
            {hasAnySelection && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted"
                title="Limpiar selección"
                aria-label="Limpiar selección"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
