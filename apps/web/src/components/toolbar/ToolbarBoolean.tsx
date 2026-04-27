import { Combine } from 'lucide-react';
import { useFeatureStore } from '@/stores/featureStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { FeatureType } from '@stl-model/shared-types';
import { BooleanDialog } from './Tool3DDialogs';
import { usePanelOrientation } from '../ui/panelOrientation';

export default function ToolbarBoolean() {
  const { createBoolean, isProcessing, features } = useFeatureStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';

  // Boolean operations only support EXTRUDE features (the worker re-extrudes both sketches).
  const extrudeFeatures = features.filter((f) => f.type === FeatureType.EXTRUDE);
  const canRun = extrudeFeatures.length >= 2 && !isProcessing;

  const handleApply = async (
    targetId: string,
    toolId: string,
    operation: 'union' | 'subtract' | 'intersect'
  ) => {
    try {
      await createBoolean(targetId, toolId, operation);
    } catch (error) {
      console.error('Error al aplicar booleana:', error);
      alert(
        `Error al aplicar operación booleana: ${(error as Error).message ?? 'desconocido'}`
      );
    }
  };

  return (
    <div
      data-testid="toolbar-boolean"
      className={cn(
        'gap-1 px-2 sm:px-4',
        isVertical ? 'flex flex-col items-stretch py-2' : 'flex items-center overflow-x-auto'
      )}
    >
      <div
        className={cn(
          isVertical ? 'flex flex-col items-stretch space-y-1' : 'flex items-center space-x-1'
        )}
      >
        <span
          className={cn(
            'text-xs font-medium text-muted-foreground',
            isVertical ? 'mb-1' : 'mr-2'
          )}
        >
          Booleanas:
        </span>
        <button
          data-testid="boolean-open-btn"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md px-3',
            isVertical && 'justify-start',
            isProcessing
              ? 'cursor-wait opacity-50'
              : !canRun
                ? 'opacity-40 hover:bg-muted'
                : 'hover:bg-muted'
          )}
          title={
            !canRun
              ? 'Necesitas al menos 2 extrusiones para una operación booleana'
              : 'Operación booleana (unión / resta / intersección)'
          }
          onClick={() => setDialogOpen(true)}
          disabled={isProcessing}
        >
          <Combine className="h-4 w-4" />
          <span className="text-sm">Booleana</span>
        </button>
      </div>

      <BooleanDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onApply={handleApply}
        featureNames={extrudeFeatures.map((f) => ({ id: f.id, name: f.name }))}
      />
    </div>
  );
}
