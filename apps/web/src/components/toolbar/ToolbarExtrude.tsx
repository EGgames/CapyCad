import { Box, RotateCcw, Route, Layers } from 'lucide-react';
import { useState } from 'react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { usePanelOrientation } from '../ui/panelOrientation';
import {
  RevolveDialog,
  SweepDialog,
  LoftDialog,
} from './Tool3DDialogs';
import { FeatureType, type SketchEntity, type ExtrudeFeature } from '@capycad/shared-types';

type ExtrudeAction = 'extrude' | 'revolve' | 'sweep' | 'loft';

export default function ToolbarExtrude() {
  const { activeSketch, setEditMode, selectedEntities } = useSketchStore();
  const { createExtrude, createRevolve, createSweep, createLoft, isProcessing } =
    useFeatureStore();
  const selectedFeatureId = useFeatureStore((s) => s.selectedFeatureId);
  const features = useFeatureStore((s) => s.features);
  const setExtrudePreviewActive = useUIStore((s) => s.setExtrudePreviewActive);
  const setExtrudePreviewEntityIds = useUIStore((s) => s.setExtrudePreviewEntityIds);
  const [activeDialog, setActiveDialog] = useState<Exclude<ExtrudeAction, 'extrude'> | null>(null);

  /** Feature 3D seleccionada cuyo sketch base sirve como "cara" para extruir. */
  const selectedExtrudableFeature = (() => {
    if (!selectedFeatureId) return null;
    const f = features.find((feat) => feat.id === selectedFeatureId);
    // Solo aceptamos features que conserven el sketch base (Extrude/Revolve/Sweep).
    if (f && f.type === FeatureType.EXTRUDE) {
      return f as ExtrudeFeature;
    }
    return null;
  })();

  const requireSketch = (): boolean => {
    if (!activeSketch || activeSketch.entities.length === 0) {
      alert('No hay un sketch activo con entidades');
      return false;
    }
    return true;
  };

  const handleExtrude = async (
    distance: number,
    direction: 'positive' | 'negative' | 'both'
  ) => {
    // Caso 1: hay un sketch 2D activo con entidades seleccionadas → las extruimos.
    if (activeSketch && selectedEntities.length > 0) {
      const entitiesToExtrude = activeSketch.entities.filter((e) =>
        selectedEntities.includes(e.id)
      );
      if (entitiesToExtrude.length === 0) {
        alert('Las entidades seleccionadas no son válidas');
        return;
      }
      try {
        await createExtrude(activeSketch.id, entitiesToExtrude, distance, direction);
        setEditMode('3d');
      } catch (error) {
        console.error('Error al extruir:', error);
        alert('Error al extruir. Ver consola para detalles.');
      }
      return;
    }
    // Caso 2: hay una feature 3D seleccionada con sketch base → re-extruimos esa cara.
    if (selectedExtrudableFeature) {
      const baseSketch = selectedExtrudableFeature.sketch;
      const entities: SketchEntity[] = baseSketch.entities;
      if (entities.length === 0) {
        alert('La cara seleccionada no tiene un perfil válido para extruir');
        return;
      }
      try {
        await createExtrude(baseSketch.id, entities, distance, direction);
        setEditMode('3d');
      } catch (error) {
        console.error('Error al extruir desde cara 3D:', error);
        alert('Error al extruir. Ver consola para detalles.');
      }
      return;
    }
    alert('Selecciona un sketch 2D o una cara de una figura 3D para extruir');
  };

  const handleRevolve = async (axis: 'X' | 'Y' | 'Z', angle: number) => {
    if (!requireSketch()) return;
    try {
      await createRevolve(activeSketch!.id, activeSketch!.entities, axis, angle);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al revolucionar:', error);
      alert('Error al revolucionar. Ver consola para detalles.');
    }
  };

  const handleSweep = async (
    pathPoints: Array<{ x: number; y: number; z: number }>
  ) => {
    if (!requireSketch()) return;
    try {
      await createSweep(activeSketch!.entities, pathPoints);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear sweep:', error);
      alert('Error al crear sweep. Ver consola para detalles.');
    }
  };

  const handleLoft = async (heightBetween: number, topRadius: number, closed: boolean) => {
    try {
      const sections = [
        {
          entities: [
            { id: 'loft-s1', type: 'circle' as const, center: { x: 0, y: 0 }, radius: 10 },
          ],
          zOffset: 0,
        },
        {
          entities: [
            {
              id: 'loft-s2',
              type: 'circle' as const,
              center: { x: 0, y: 0 },
              radius: topRadius,
            },
          ],
          zOffset: heightBetween,
        },
      ];
      await createLoft(sections, closed);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear loft:', error);
      alert('Error al crear loft. Ver consola para detalles.');
    }
  };

  const tools: Array<{
    icon: typeof Box;
    label: string;
    action: ExtrudeAction;
  }> = [
    { icon: Box, label: 'Extruir', action: 'extrude' },
    { icon: RotateCcw, label: 'Revolución', action: 'revolve' },
    { icon: Route, label: 'Sweep', action: 'sweep' },
    { icon: Layers, label: 'Loft', action: 'loft' },
  ];

  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';

  // Las herramientas generativas que NO sean Extruir requieren un sketch 2D con selección.
  const hasSketch = !!activeSketch && activeSketch.entities.length > 0;
  // Extruir requiere además que haya entidades seleccionadas en el sketch 2D,
  // o una cara de figura 3D seleccionada.
  const hasSelection = selectedEntities.length > 0;
  const canExtrude = (hasSketch && hasSelection) || !!selectedExtrudableFeature;

  /** ¿Está deshabilitada esta acción? */
  const isActionDisabled = (action: ExtrudeAction): boolean => {
    if (isProcessing) return true;
    if (action === 'extrude') return !canExtrude;
    return !hasSketch;
  };

  /** Tooltip según estado. */
  const tooltipFor = (action: ExtrudeAction, label: string): string => {
    if (action === 'extrude' && !canExtrude) {
      if (hasSketch && !hasSelection)
        return `${label} — selecciona una o más entidades del sketch primero`;
      return `${label} — requiere un sketch 2D con entidades seleccionadas o una cara de figura 3D seleccionada`;
    }
    if (action !== 'extrude' && !hasSketch) {
      return `${label} — requiere un sketch 2D con entidades`;
    }
    return label;
  };

  return (
    <div
      data-testid="toolbar-extrude"
      className={cn(
        'gap-1 px-2 sm:px-4',
        isVertical
          ? 'flex flex-col items-stretch py-2'
          : 'flex items-center overflow-x-auto'
      )}
    >
      <div
        className={cn(
          isVertical
            ? 'flex flex-col items-stretch space-y-1'
            : 'flex items-center space-x-1'
        )}
      >
        <span
          className={cn(
            'text-xs font-medium text-muted-foreground',
            isVertical ? 'mb-1' : 'mr-2'
          )}
        >
          Extrusión:
        </span>
        {tools.map((tool) => {
          const disabled = isActionDisabled(tool.action);
          const dimmed = !isProcessing && disabled;
          return (
            <button
              key={tool.action}
              className={cn(
                isVertical
                  ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
                  : 'flex h-9 w-9 items-center justify-center rounded-md',
                isProcessing
                  ? 'cursor-wait opacity-50'
                  : dimmed
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-muted'
              )}
              title={tooltipFor(tool.action, tool.label)}
              onClick={() => {
                if (tool.action === 'extrude') {
                  // Snapshot de las entidades seleccionadas ANTES de activar el preview,
                  // para que Gizmo y HUD usen exactamente esas entidades aunque la
                  // selección se limpie al interactuar con la escena 3D.
                  setExtrudePreviewEntityIds([...selectedEntities]);
                  setExtrudePreviewActive(true);
                } else {
                  setActiveDialog(tool.action as Exclude<ExtrudeAction, 'extrude'>);
                }
              }}
              disabled={disabled}
            >
              <tool.icon className="h-4 w-4" />
              {isVertical && <span className="text-sm">{tool.label}</span>}
            </button>
          );
        })}
      </div>

      <RevolveDialog
        open={activeDialog === 'revolve'}
        onClose={() => setActiveDialog(null)}
        onApply={handleRevolve}
      />
      <SweepDialog
        open={activeDialog === 'sweep'}
        onClose={() => setActiveDialog(null)}
        onApply={handleSweep}
      />
      <LoftDialog
        open={activeDialog === 'loft'}
        onClose={() => setActiveDialog(null)}
        onApply={handleLoft}
      />
    </div>
  );
}
