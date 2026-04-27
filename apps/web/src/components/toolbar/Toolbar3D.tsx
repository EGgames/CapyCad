import {
  Box,
  RotateCcw,
  Layers,
  CircleDot,
  PenTool,
  BoxSelect,
  Route,
  Grid3x3,
  RefreshCw,
  Slice,
  ArrowUpDown,
  Cuboid,
  Globe,
  Cylinder,
  Triangle,
  Donut,
} from 'lucide-react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { usePanelOrientation } from '../ui/panelOrientation';
import {
  ExtrudeDialog,
  RevolveDialog,
  FilletDialog,
  ChamferDialog,
  ShellDialog,
  SweepDialog,
  LoftDialog,
  LinearPatternDialog,
  CircularPatternDialog,
  DraftDialog,
  OffsetDialog,
  BoxDialog,
  SphereDialog,
  CylinderDialog,
  ConeDialog,
  TorusDialog,
} from './Tool3DDialogs';

type Tool3DAction =
  | 'extrude'
  | 'revolve'
  | 'loft'
  | 'fillet'
  | 'chamfer'
  | 'shell'
  | 'sweep'
  | 'pattern_linear'
  | 'pattern_circular'
  | 'draft'
  | 'offset'
  | 'primitive_box'
  | 'primitive_sphere'
  | 'primitive_cylinder'
  | 'primitive_cone'
  | 'primitive_torus';

export default function Toolbar3D() {
  const { activeSketch, setEditMode } = useSketchStore();
  const {
    createExtrude,
    createRevolve,
    createLoft,
    createFillet,
    createChamfer,
    createShell,
    createSweep,
    createLinearPattern,
    createCircularPattern,
    createDraft,
    createOffset,
    createPrimitiveBox,
    createPrimitiveSphere,
    createPrimitiveCylinder,
    createPrimitiveCone,
    createPrimitiveTorus,
    startPlacement,
    placementMode,
    placementPosition,
    placementRotation,
    setPlacementRotation,
    cancelPlacement,
    isProcessing,
    selectedFeatureId,
  } = useFeatureStore();
  const [activeDialog, setActiveDialog] = useState<Tool3DAction | null>(null);

  // Cuando se confirma posición en el canvas, abrir diálogo de dimensiones
  useEffect(() => {
    if (placementPosition && placementMode) {
      setActiveDialog(placementMode.type as Tool3DAction);
    }
  }, [placementPosition, placementMode]);

  // ── Handlers 3D ──

  const requireSketch = (): boolean => {
    if (!activeSketch || activeSketch.entities.length === 0) {
      alert('No hay un sketch activo con entidades');
      return false;
    }
    return true;
  };

  const requireSelectedFeature = (): string | null => {
    if (!selectedFeatureId) {
      alert('Selecciona una feature 3D primero');
      return null;
    }
    return selectedFeatureId;
  };

  const handleExtrude = async (distance: number, direction: 'positive' | 'negative' | 'both') => {
    if (!requireSketch()) return;
    try {
      await createExtrude(activeSketch!.id, activeSketch!.entities, distance, direction);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al extruir:', error);
      alert('Error al extruir. Ver consola para detalles.');
    }
  };

  const handleRevolve = async (axis: 'X' | 'Y' | 'Z', angle: number) => {
    if (!requireSketch()) return;
    try {
      await createRevolve(activeSketch!.id, activeSketch!.entities, axis, angle);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear revolución:', error);
      alert('Error al crear revolución. Ver consola para detalles.');
    }
  };

  const handleFillet = async (radius: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createFillet(featureId, radius);
    } catch (error) {
      console.error('Error al aplicar fillet:', error);
      alert('Error al aplicar fillet. Ver consola para detalles.');
    }
  };

  const handleChamfer = async (distance: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createChamfer(featureId, distance);
    } catch (error) {
      console.error('Error al aplicar chamfer:', error);
      alert('Error al aplicar chamfer. Ver consola para detalles.');
    }
  };

  const handleShell = async (thickness: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createShell(featureId, thickness);
    } catch (error) {
      console.error('Error al aplicar shell:', error);
      alert('Error al aplicar shell. Ver consola para detalles.');
    }
  };

  const handleSweep = async (pathPoints: Array<{ x: number; y: number; z: number }>) => {
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
            { id: 'loft-s2', type: 'circle' as const, center: { x: 0, y: 0 }, radius: topRadius },
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

  const handleLinearPattern = async (
    direction: { x: number; y: number; z: number },
    spacing: number,
    instances: number
  ) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createLinearPattern(featureId, direction, spacing, instances);
    } catch (error) {
      console.error('Error al crear patrón lineal:', error);
      alert('Error al crear patrón lineal. Ver consola para detalles.');
    }
  };

  const handleCircularPattern = async (
    axis: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } },
    instances: number,
    totalAngle: number
  ) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createCircularPattern(featureId, axis, instances, totalAngle);
    } catch (error) {
      console.error('Error al crear patrón circular:', error);
      alert('Error al crear patrón circular. Ver consola para detalles.');
    }
  };

  const handleDraft = async (angle: number, neutralPlane: 'XY' | 'XZ' | 'YZ') => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createDraft(featureId, angle, neutralPlane);
    } catch (error) {
      console.error('Error al aplicar draft:', error);
      alert('Error al aplicar draft. Ver consola para detalles.');
    }
  };

  const handleOffset = async (distance: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createOffset(featureId, distance);
    } catch (error) {
      console.error('Error al aplicar offset:', error);
      alert('Error al aplicar offset. Ver consola para detalles.');
    }
  };

  const handlePrimitiveBox = async (width: number, height: number, depth: number) => {
    try {
      await createPrimitiveBox(
        width,
        height,
        depth,
        placementPosition ?? undefined,
        placementRotation ?? undefined
      );
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear cubo:', error);
      alert('Error al crear cubo. Ver consola para detalles.');
    } finally {
      cancelPlacement();
    }
  };

  const handlePrimitiveSphere = async (radius: number) => {
    try {
      await createPrimitiveSphere(
        radius,
        placementPosition ?? undefined,
        placementRotation ?? undefined
      );
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear esfera:', error);
      alert('Error al crear esfera. Ver consola para detalles.');
    } finally {
      cancelPlacement();
    }
  };

  const handlePrimitiveCylinder = async (radius: number, height: number) => {
    try {
      await createPrimitiveCylinder(
        radius,
        height,
        placementPosition ?? undefined,
        placementRotation ?? undefined
      );
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear cilindro:', error);
      alert('Error al crear cilindro. Ver consola para detalles.');
    } finally {
      cancelPlacement();
    }
  };

  const handlePrimitiveCone = async (baseRadius: number, topRadius: number, height: number) => {
    try {
      await createPrimitiveCone(
        baseRadius,
        topRadius,
        height,
        placementPosition ?? undefined,
        placementRotation ?? undefined
      );
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear cono:', error);
      alert('Error al crear cono. Ver consola para detalles.');
    } finally {
      cancelPlacement();
    }
  };

  const handlePrimitiveTorus = async (majorRadius: number, minorRadius: number) => {
    try {
      await createPrimitiveTorus(
        majorRadius,
        minorRadius,
        placementPosition ?? undefined,
        placementRotation ?? undefined
      );
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear toroide:', error);
      alert('Error al crear toroide. Ver consola para detalles.');
    } finally {
      cancelPlacement();
    }
  };

  const handle3DToolClick = (action: Tool3DAction) => {
    if (action.startsWith('primitive_')) {
      startPlacement(action);
      return;
    }
    if ((action === 'extrude' || action === 'revolve' || action === 'sweep') && !requireSketch()) {
      return;
    }
    if (
      (action === 'fillet' ||
        action === 'chamfer' ||
        action === 'shell' ||
        action === 'pattern_linear' ||
        action === 'pattern_circular' ||
        action === 'draft' ||
        action === 'offset') &&
      !requireSelectedFeature()
    ) {
      return;
    }
    setActiveDialog(action);
  };

  const tools3D: Array<{
    icon: typeof Box;
    label: string;
    action: Tool3DAction;
    needsFeature?: boolean;
  }> = [
    { icon: Box, label: 'Extruir', action: 'extrude' },
    { icon: RotateCcw, label: 'Revolución', action: 'revolve' },
    { icon: Route, label: 'Sweep', action: 'sweep' },
    { icon: Layers, label: 'Loft', action: 'loft' },
    { icon: CircleDot, label: 'Fillet', action: 'fillet', needsFeature: true },
    { icon: PenTool, label: 'Chamfer', action: 'chamfer', needsFeature: true },
    { icon: BoxSelect, label: 'Shell', action: 'shell', needsFeature: true },
    { icon: Grid3x3, label: 'Patrón Lineal', action: 'pattern_linear', needsFeature: true },
    { icon: RefreshCw, label: 'Patrón Circular', action: 'pattern_circular', needsFeature: true },
    { icon: Slice, label: 'Draft', action: 'draft', needsFeature: true },
    { icon: ArrowUpDown, label: 'Offset', action: 'offset', needsFeature: true },
  ];

  const toolsPrimitives: Array<{
    icon: typeof Box;
    label: string;
    action: Tool3DAction;
  }> = [
    { icon: Cuboid, label: 'Cubo', action: 'primitive_box' },
    { icon: Globe, label: 'Esfera', action: 'primitive_sphere' },
    { icon: Cylinder, label: 'Cilindro', action: 'primitive_cylinder' },
    { icon: Triangle, label: 'Cono', action: 'primitive_cone' },
    { icon: Donut, label: 'Toroide', action: 'primitive_torus' },
  ];

  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';

  return (
    <div
      data-testid="toolbar-3d"
      className={cn(
        'gap-1 px-2 sm:px-4',
        isVertical
          ? 'flex flex-col items-stretch py-2'
          : 'flex items-center overflow-x-auto'
      )}
    >
      {/* Herramientas 3D */}
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
          3D:
        </span>
        {tools3D.map((tool) => (
          <button
            key={tool.action}
            className={cn(
              isVertical
                ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
                : 'flex h-9 w-9 items-center justify-center rounded-md',
              isProcessing
                ? 'cursor-wait opacity-50'
                : tool.needsFeature && !selectedFeatureId
                  ? 'opacity-40 hover:bg-muted'
                  : 'hover:bg-muted'
            )}
            title={tool.label}
            onClick={() => handle3DToolClick(tool.action)}
            disabled={isProcessing}
          >
            <tool.icon className="h-4 w-4" />
            {isVertical && <span className="text-sm">{tool.label}</span>}
          </button>
        ))}
      </div>

      {/* Separador */}
      <div
        className={cn(
          isVertical ? 'my-2 h-px w-full bg-border' : 'mx-4 h-8 w-px bg-border'
        )}
      />

      {/* Primitivas 3D */}
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
          Figuras:
        </span>
        {toolsPrimitives.map((tool) => (
          <button
            key={tool.action}
            className={cn(
              isVertical
                ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
                : 'flex h-9 w-9 items-center justify-center rounded-md',
              isProcessing ? 'cursor-wait opacity-50' : 'hover:bg-muted'
            )}
            title={tool.label}
            onClick={() => handle3DToolClick(tool.action)}
            disabled={isProcessing}
          >
            <tool.icon className="h-4 w-4" />
            {isVertical && <span className="text-sm">{tool.label}</span>}
          </button>
        ))}
      </div>

      {/* 3D Tool Dialogs */}
      <ExtrudeDialog
        open={activeDialog === 'extrude'}
        onClose={() => setActiveDialog(null)}
        onApply={handleExtrude}
      />
      <RevolveDialog
        open={activeDialog === 'revolve'}
        onClose={() => setActiveDialog(null)}
        onApply={handleRevolve}
      />
      <FilletDialog
        open={activeDialog === 'fillet'}
        onClose={() => setActiveDialog(null)}
        onApply={handleFillet}
      />
      <ChamferDialog
        open={activeDialog === 'chamfer'}
        onClose={() => setActiveDialog(null)}
        onApply={handleChamfer}
      />
      <ShellDialog
        open={activeDialog === 'shell'}
        onClose={() => setActiveDialog(null)}
        onApply={handleShell}
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
      <LinearPatternDialog
        open={activeDialog === 'pattern_linear'}
        onClose={() => setActiveDialog(null)}
        onApply={handleLinearPattern}
      />
      <CircularPatternDialog
        open={activeDialog === 'pattern_circular'}
        onClose={() => setActiveDialog(null)}
        onApply={handleCircularPattern}
      />
      <DraftDialog
        open={activeDialog === 'draft'}
        onClose={() => setActiveDialog(null)}
        onApply={handleDraft}
      />
      <OffsetDialog
        open={activeDialog === 'offset'}
        onClose={() => setActiveDialog(null)}
        onApply={handleOffset}
      />
      <BoxDialog
        open={activeDialog === 'primitive_box'}
        onClose={() => {
          setActiveDialog(null);
          cancelPlacement();
        }}
        onApply={handlePrimitiveBox}
        position={placementPosition}
        onOrientationChange={setPlacementRotation}
      />
      <SphereDialog
        open={activeDialog === 'primitive_sphere'}
        onClose={() => {
          setActiveDialog(null);
          cancelPlacement();
        }}
        onApply={handlePrimitiveSphere}
        position={placementPosition}
        onOrientationChange={setPlacementRotation}
      />
      <CylinderDialog
        open={activeDialog === 'primitive_cylinder'}
        onClose={() => {
          setActiveDialog(null);
          cancelPlacement();
        }}
        onApply={handlePrimitiveCylinder}
        position={placementPosition}
        onOrientationChange={setPlacementRotation}
      />
      <ConeDialog
        open={activeDialog === 'primitive_cone'}
        onClose={() => {
          setActiveDialog(null);
          cancelPlacement();
        }}
        onApply={handlePrimitiveCone}
        position={placementPosition}
        onOrientationChange={setPlacementRotation}
      />
      <TorusDialog
        open={activeDialog === 'primitive_torus'}
        onClose={() => {
          setActiveDialog(null);
          cancelPlacement();
        }}
        onApply={handlePrimitiveTorus}
        position={placementPosition}
        onOrientationChange={setPlacementRotation}
      />
    </div>
  );
}
