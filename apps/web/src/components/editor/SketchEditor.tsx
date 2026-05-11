import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Line as FabricLine } from 'fabric';
import { Canvas as ThreeCanvas } from '@react-three/fiber';
import { OrbitControls as ThreeOrbitControls } from '@react-three/drei';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import { snapToGrid } from '@/lib/sketch/geometry';
import {
  BaseTool,
  LineTool,
  CircleTool,
  RectangleTool,
  PolygonTool,
  ArcTool,
  MeasureTool,
  SplineTool,
  EllipseTool,
} from '@/lib/sketch/tools';
import {
  Vector2,
  SketchEntity,
  SketchEntityType,
  Rectangle as RectangleEntity,
  Polygon as PolygonEntity,
  Circle as CircleEntity,
  Line as LineEntity,
  Arc as ArcEntity,
  Ellipse as EllipseEntity,
} from '@stl-model/shared-types';
import { ZoomIn, ZoomOut, Maximize2, Box, X } from 'lucide-react';
import { useMemo } from 'react';
import ConstraintOverlay from './ConstraintOverlay';

export default function SketchEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const currentToolRef = useRef<BaseTool | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Vector2 | null>(null);
  /** ID de la entidad Fabric seleccionada actualmente */
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  /** Transform del viewport de Fabric para dibujar los ejes ghost */
  const [vt, setVt] = useState<number[]>([1, 0, 0, 1, 0, 0]);
  /** Posición del mouse en coordenadas del canvas (para cursor) */
  const [mousePos, setMousePos] = useState<Vector2 | null>(null);

  const {
    activeTool,
    setActiveTool,
    snapOptions,
    addEntity,
    updateEntity,
    undo,
    redo,
    canUndo,
    canRedo,
    setCanvasDimensions,
    polygonSides,
    activeSketch,
    measureUnit,
    pixelsPerMm,
    addMeasurement,
    selectEntity,
    clearSelection,
  } = useSketchStore();

  // Toggle global de la herramienta Selección. Si está OFF, no permitir clicks 2D.
  const selectionToolActive = useUIStore((s) => s.selectionToolActive);

  // Inicializar canvas de Fabric.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const container = containerRef.current;
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width: w,
      height: h,
      backgroundColor: '#1a1a1a',
      selection: activeTool === 'select',
      renderOnAddRemove: true,
    });

    fabricCanvasRef.current = fabricCanvas;
    setCanvasDimensions(w, h);
    drawGrid(fabricCanvas, snapOptions.gridSize);

    const handleResize = () => {
      const c = containerRef.current;
      const width = c ? c.clientWidth : window.innerWidth;
      const height = c ? c.clientHeight : window.innerHeight;
      fabricCanvas.setDimensions({ width, height });
      setCanvasDimensions(width, height);
      drawGrid(fabricCanvas, snapOptions.gridSize);
    };

    // Use ResizeObserver for container-aware resizing
    let ro: ResizeObserver | null = null;
    if (container) {
      ro = new ResizeObserver(handleResize);
      ro.observe(container);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
      fabricCanvas.dispose();
    };
  }, []);

  // Habilitar/deshabilitar selección Fabric según herramienta y toggle global
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const isSelect = activeTool === 'select' && selectionToolActive;
    fabricCanvasRef.current.selection = isSelect;
    fabricCanvasRef.current.getObjects().forEach((obj: any) => {
      if (!obj.data?.isGrid) {
        obj.selectable = isSelect;
        obj.evented = isSelect;
      }
    });
    if (!isSelect) {
      fabricCanvasRef.current.discardActiveObject();
      setSelectedEntityId(null);
      clearSelection();
    }
    fabricCanvasRef.current.renderAll();
  }, [activeTool, selectionToolActive, clearSelection]);

  // Registrar evento de selección en Fabric — sincroniza con sketchStore
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    const onSelected = (e: any) => {
      const selected = e.selected ?? [];
      const entityIds: string[] = selected
        .map((obj: any) => obj?.data?.entityId)
        .filter((id: string | undefined): id is string => !!id);
      const firstId = entityIds[0] ?? null;
      setSelectedEntityId(firstId);
      // Sincronizar con sketchStore: reemplaza la selección con la actual de Fabric.
      clearSelection();
      entityIds.forEach((id, idx) => selectEntity(id, idx > 0));
      // Limpiar selección 3D cuando hay selección 2D activa.
      if (entityIds.length > 0) {
        useFeatureStore.getState().selectFeature(null);
      }
    };
    const onDeselected = () => {
      setSelectedEntityId(null);
      clearSelection();
    };

    canvas.on('selection:created', onSelected);
    canvas.on('selection:updated', onSelected);
    canvas.on('selection:cleared', onDeselected);
    return () => {
      canvas.off('selection:created', onSelected);
      canvas.off('selection:updated', onSelected);
      canvas.off('selection:cleared', onDeselected);
    };
  }, [selectEntity, clearSelection]);

  // Actualizar herramienta activa
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    if (currentToolRef.current) currentToolRef.current.cleanup();

    switch (activeTool) {
      case 'line':
        currentToolRef.current = new LineTool(fabricCanvasRef.current);
        break;
      case 'circle':
        currentToolRef.current = new CircleTool(fabricCanvasRef.current);
        break;
      case 'rectangle':
        currentToolRef.current = new RectangleTool(fabricCanvasRef.current);
        break;
      case 'polygon':
        currentToolRef.current = new PolygonTool(fabricCanvasRef.current, polygonSides);
        break;
      case 'arc':
        currentToolRef.current = new ArcTool(fabricCanvasRef.current);
        break;
      case 'measure':
        currentToolRef.current = new MeasureTool(fabricCanvasRef.current, {
          unit: measureUnit,
          pixelsPerMm,
          onMeasure: addMeasurement,
        });
        break;
      case 'spline':
        currentToolRef.current = new SplineTool(fabricCanvasRef.current);
        break;
      case 'ellipse':
        currentToolRef.current = new EllipseTool(fabricCanvasRef.current);
        break;
      default:
        currentToolRef.current = null;
    }
  }, [activeTool, polygonSides, measureUnit, pixelsPerMm]);

  // Sincronizar objetos Fabric cuando cambian las entidades del store
  useEffect(() => {
    if (!fabricCanvasRef.current || !activeSketch) return;
    syncFabricObjects(fabricCanvasRef.current, activeSketch.entities);
  }, [activeSketch?.entities]);

  // Event handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = (e: any) => {
    if (!fabricCanvasRef.current) return;
    // Paneo solo con botón central (scroll wheel click)
    if ((e.e as MouseEvent)?.button === 1) {
      setIsPanning(true);
      setLastPanPoint(e.viewportPoint ?? e.pointer);
      return;
    }
    // En modo selección, Fabric maneja los eventos; no interceptar
    if (activeTool === 'select') return;
    let canvasPoint: Vector2 = e.scenePoint ?? e.absolutePointer ?? e.pointer;
    if (snapOptions.enabled && snapOptions.snapToGrid) {
      canvasPoint = snapToGrid(canvasPoint, snapOptions.gridSize);
    }
    if (currentToolRef.current) currentToolRef.current.onMouseDown(canvasPoint);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (e: any) => {
    if (!fabricCanvasRef.current) return;
    const viewportPoint = e.viewportPoint ?? e.pointer;
    if (isPanning && lastPanPoint) {
      const dx = viewportPoint.x - lastPanPoint.x;
      const dy = viewportPoint.y - lastPanPoint.y;
      fabricCanvasRef.current.relativePan({ x: dx, y: dy } as any);
      setLastPanPoint(viewportPoint);
      setVt([...(fabricCanvasRef.current.viewportTransform ?? [1, 0, 0, 1, 0, 0])]);
      return;
    }
    let canvasPoint: Vector2 = e.scenePoint ?? e.absolutePointer ?? e.pointer;
    if (snapOptions.enabled && snapOptions.snapToGrid) {
      canvasPoint = snapToGrid(canvasPoint, snapOptions.gridSize);
    }
    if (currentToolRef.current) currentToolRef.current.onMouseMove(canvasPoint);
    // Actualizar posición del cursor para coordenadas
    setMousePos(canvasPoint);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseUp = (e: any) => {
    if (!fabricCanvasRef.current) return;
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }
    let canvasPoint: Vector2 = e.scenePoint ?? e.absolutePointer ?? e.pointer;
    if (snapOptions.enabled && snapOptions.snapToGrid) {
      canvasPoint = snapToGrid(canvasPoint, snapOptions.gridSize);
    }
    if (currentToolRef.current) {
      const entity = currentToolRef.current.onMouseUp(canvasPoint);
      if (entity) {
        addEntity(entity);
        // Auto-switch to select so the user can immediately see the properties panel
        setActiveTool('select');
        // Pre-select the new Fabric object
        setTimeout(() => {
          if (!fabricCanvasRef.current) return;
          const obj = fabricCanvasRef.current
            .getObjects()
            .find((o: any) => o.data?.entityId === entity.id);
          if (obj) {
            fabricCanvasRef.current.setActiveObject(obj);
            fabricCanvasRef.current.renderAll();
            setSelectedEntityId(entity.id);
          }
        }, 0);
      }
    }
  };

  // Registrar event listeners
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    canvas.on('mouse:down', handleMouseDown as any);
    canvas.on('mouse:move', handleMouseMove as any);
    canvas.on('mouse:up', handleMouseUp as any);
    return () => {
      canvas.off('mouse:down', handleMouseDown as any);
      canvas.off('mouse:move', handleMouseMove as any);
      canvas.off('mouse:up', handleMouseUp as any);
    };
  }, [activeTool, zoom, pan, isPanning, lastPanPoint, snapOptions, polygonSides]);

  // Shortcuts de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey && canUndo()) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'y' || (e.key === 'z' && e.shiftKey)) && canRedo()) {
          e.preventDefault();
          redo();
        }
        return;
      }
      if (e.key === 'Escape' && currentToolRef.current) {
        currentToolRef.current.cancel();
        return;
      }
      // Shortcuts de herramientas (solo si el foco no está en un input)
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'p':
          setActiveTool('polygon');
          break;
        case 'a':
          setActiveTool('arc');
          break;
        case 'm':
          setActiveTool('measure');
          break;
        case 'b':
          setActiveTool('spline');
          break;
        case 'e':
          setActiveTool('ellipse');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, setActiveTool]);

  // Zoom
  const handleZoomIn = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const newZoom = Math.min(canvas.getZoom() * 1.2, 10);
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 } as any, newZoom);
    setZoom(newZoom);
    setVt([...(canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0])]);
  };
  const handleZoomOut = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const newZoom = Math.max(canvas.getZoom() / 1.2, 0.1);
    canvas.zoomToPoint({ x: canvas.width! / 2, y: canvas.height! / 2 } as any, newZoom);
    setZoom(newZoom);
    setVt([...(canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0])]);
  };
  const handleResetView = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVt([1, 0, 0, 1, 0, 0]);
  };

  // Zoom con rueda del mouse
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const handleWheel = (opt: any) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom() * (delta > 0 ? 0.9 : 1.1);
      newZoom = Math.min(Math.max(newZoom, 0.1), 10);
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY } as any, newZoom);
      setZoom(newZoom);
      setVt([...(canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0])]);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    };
    canvas.on('mouse:wheel', handleWheel);
    return () => {
      canvas.off('mouse:wheel', handleWheel);
    };
  }, []);

  // Entidad seleccionada del store para el panel inline
  const selectedEntity = activeSketch?.entities.find((e) => e.id === selectedEntityId) ?? null;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} />

      {/* Ghost ejes X/Y — SVG overlay que sigue el viewport de Fabric */}
      <AxisGhost vt={vt} canvasRef={canvasRef} />

      {/* Indicadores visuales de restricciones */}
      {activeSketch && activeSketch.constraints.length > 0 && (
        <ConstraintOverlay
          constraints={activeSketch.constraints}
          entities={activeSketch.entities}
          vt={vt}
          canvasRef={canvasRef}
        />
      )}

      {/* Coordenadas del cursor */}
      {mousePos && (
        <div className="pointer-events-none absolute left-14 bottom-4 rounded bg-card/80 px-2 py-1 font-mono text-[11px] text-muted-foreground shadow">
          X {mousePos.x.toFixed(1)} Y {mousePos.y.toFixed(1)}
        </div>
      )}

      {/* Panel de propiedades inline de la entidad seleccionada */}
      {selectedEntity && (
        <EntityPropertiesPanel
          entity={selectedEntity}
          onUpdate={(updates) => updateEntity(selectedEntityId!, updates)}
          fabricCanvas={fabricCanvasRef.current}
        />
      )}

      {/* Preview 3D en esquina inferior izquierda */}
      <Feature3DPreview />

      {/* Controles de visualización */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <button
          onClick={handleZoomIn}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-card shadow-md hover:bg-muted"
          title="Acercar"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-card shadow-md hover:bg-muted"
          title="Alejar"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={handleResetView}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-card shadow-md hover:bg-muted"
          title="Restablecer vista"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 rounded-md bg-card px-3 py-2 text-sm shadow-md">
        Zoom: {(zoom * 100).toFixed(0)}%
      </div>

      {activeTool !== 'select' && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-card px-4 py-2 text-sm shadow-md">
          {activeTool === 'line' && 'Click: inicio → fin'}
          {activeTool === 'circle' && 'Click centro → arrastra radio'}
          {activeTool === 'rectangle' && 'Click esquina → arrastra opuesta'}
          {activeTool === 'polygon' && 'Click centro → arrastra radio'}
          {activeTool === 'arc' && '1° click: centro · 2°: inicio arco · 3°: fin arco'}
          {activeTool === 'measure' && '1° click: punto A · 2° click: punto B'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel de propiedades inline de la entidad seleccionada
// ---------------------------------------------------------------------------

interface EntityPropsPanelProps {
  entity: SketchEntity;
  onUpdate: (updates: Partial<SketchEntity>) => void;
  fabricCanvas: FabricCanvas | null;
}

function EntityPropertiesPanel({ entity, onUpdate, fabricCanvas }: EntityPropsPanelProps) {
  const handleRotationChange = (deg: number) => {
    // Actualizar en Fabric inmediatamente para feedback visual
    if (fabricCanvas) {
      const obj = fabricCanvas.getObjects().find((o: any) => o.data?.entityId === entity.id);
      if (obj) {
        obj.set({ angle: deg });
        obj.setCoords?.();
        fabricCanvas.renderAll();
      }
    }
    onUpdate({ rotation: deg });
  };

  return (
    <div className="absolute right-4 top-4 z-10 w-60 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {labelForType(entity.type)}
        </span>
      </div>

      <div className="space-y-3 p-3">
        {/* ID */}
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase">ID</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{entity.id}</p>
        </div>

        {/* Rotación — disponible para todas las entidades */}
        <NumField
          label="Rotación (°)"
          value={entity.rotation ?? 0}
          step={1}
          onChange={handleRotationChange}
        />

        {/* Propiedades específicas por tipo */}
        {entity.type === SketchEntityType.LINE && (
          <LineProps entity={entity as LineEntity} onUpdate={onUpdate} />
        )}
        {entity.type === SketchEntityType.CIRCLE && (
          <CircleProps entity={entity as CircleEntity} onUpdate={onUpdate} />
        )}
        {entity.type === SketchEntityType.ARC && <ArcProps entity={entity as ArcEntity} />}
        {entity.type === SketchEntityType.RECTANGLE && (
          <RectProps entity={entity as RectangleEntity} onUpdate={onUpdate} />
        )}
        {entity.type === SketchEntityType.POLYGON && (
          <PolygonProps entity={entity as PolygonEntity} onUpdate={onUpdate} />
        )}
        {entity.type === SketchEntityType.ELLIPSE && (
          <EllipseProps entity={entity as EllipseEntity} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

function labelForType(type: SketchEntityType) {
  const labels: Record<SketchEntityType, string> = {
    [SketchEntityType.LINE]: 'Línea',
    [SketchEntityType.CIRCLE]: 'Círculo',
    [SketchEntityType.ARC]: 'Arco',
    [SketchEntityType.RECTANGLE]: 'Rectángulo',
    [SketchEntityType.POLYGON]: 'Polígono',
    [SketchEntityType.SPLINE]: 'Spline',
    [SketchEntityType.ELLIPSE]: 'Elipse',
  };
  return labels[type] ?? type;
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase">{label}</p>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function LineProps({ entity, onUpdate }: { entity: LineEntity; onUpdate: (u: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="X1"
          value={entity.start.x}
          onChange={(v) => onUpdate({ start: { ...entity.start, x: v } })}
        />
        <NumField
          label="Y1"
          value={entity.start.y}
          onChange={(v) => onUpdate({ start: { ...entity.start, y: v } })}
        />
        <NumField
          label="X2"
          value={entity.end.x}
          onChange={(v) => onUpdate({ end: { ...entity.end, x: v } })}
        />
        <NumField
          label="Y2"
          value={entity.end.y}
          onChange={(v) => onUpdate({ end: { ...entity.end, y: v } })}
        />
      </div>
    </>
  );
}

function CircleProps({ entity, onUpdate }: { entity: CircleEntity; onUpdate: (u: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="CX"
          value={entity.center.x}
          onChange={(v) => onUpdate({ center: { ...entity.center, x: v } })}
        />
        <NumField
          label="CY"
          value={entity.center.y}
          onChange={(v) => onUpdate({ center: { ...entity.center, y: v } })}
        />
      </div>
      <NumField
        label="Radio (px)"
        value={entity.radius}
        onChange={(v) => onUpdate({ radius: Math.max(v, 1) })}
        min={1}
      />
    </>
  );
}

function ArcProps({ entity }: { entity: ArcEntity }) {
  const deg = (r: number) => (((r * 180) / Math.PI + 360) % 360).toFixed(1);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-[10px] text-muted-foreground">CX</p>
          <p>{entity.center.x.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">CY</p>
          <p>{entity.center.y.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Radio</p>
          <p>{entity.radius.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Ángulo</p>
          <p>
            {deg(entity.startAngle)}° → {deg(entity.endAngle)}°
          </p>
        </div>
      </div>
    </>
  );
}

function RectProps({ entity, onUpdate }: { entity: RectangleEntity; onUpdate: (u: any) => void }) {
  const w = entity.bottomRight.x - entity.topLeft.x;
  const h = entity.bottomRight.y - entity.topLeft.y;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="X"
          value={entity.topLeft.x}
          step={1}
          onChange={(v) =>
            onUpdate({
              topLeft: { ...entity.topLeft, x: v },
              bottomRight: { ...entity.bottomRight, x: v + w },
            })
          }
        />
        <NumField
          label="Y"
          value={entity.topLeft.y}
          step={1}
          onChange={(v) =>
            onUpdate({
              topLeft: { ...entity.topLeft, y: v },
              bottomRight: { ...entity.bottomRight, y: v + h },
            })
          }
        />
        <NumField
          label="Ancho"
          value={w}
          step={1}
          min={1}
          onChange={(v) =>
            onUpdate({
              bottomRight: { ...entity.bottomRight, x: entity.topLeft.x + Math.max(v, 1) },
            })
          }
        />
        <NumField
          label="Alto"
          value={h}
          step={1}
          min={1}
          onChange={(v) =>
            onUpdate({
              bottomRight: { ...entity.bottomRight, y: entity.topLeft.y + Math.max(v, 1) },
            })
          }
        />
      </div>
      <NumField
        label="Redondeo de esquinas (px)"
        value={entity.cornerRadius ?? 0}
        step={1}
        min={0}
        onChange={(v) => onUpdate({ cornerRadius: Math.max(0, v) })}
      />
    </>
  );
}

function PolygonProps({ entity, onUpdate }: { entity: PolygonEntity; onUpdate: (u: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="CX"
          value={entity.center.x}
          onChange={(v) => onUpdate({ center: { ...entity.center, x: v } })}
        />
        <NumField
          label="CY"
          value={entity.center.y}
          onChange={(v) => onUpdate({ center: { ...entity.center, y: v } })}
        />
      </div>
      <NumField
        label="Radio (px)"
        value={entity.radius}
        min={1}
        onChange={(v) => onUpdate({ radius: Math.max(v, 1) })}
      />
      <NumField
        label="Lados"
        value={entity.sides}
        step={1}
        min={3}
        onChange={(v) => onUpdate({ sides: Math.max(3, Math.round(v)) })}
      />
      <NumField
        label="Rotación (°)"
        value={((entity.rotation ?? 0) * 180) / Math.PI}
        step={1}
        onChange={(v) => onUpdate({ rotation: (v * Math.PI) / 180 })}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sincronización de objetos Fabric con las entidades del store
// cuando el usuario edita propiedades numéricas

function EllipseProps({ entity, onUpdate }: { entity: EllipseEntity; onUpdate: (u: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="CX"
          value={entity.center.x}
          onChange={(v) => onUpdate({ center: { ...entity.center, x: v } })}
        />
        <NumField
          label="CY"
          value={entity.center.y}
          onChange={(v) => onUpdate({ center: { ...entity.center, y: v } })}
        />
      </div>
      <NumField
        label="Radio X (px)"
        value={entity.radiusX}
        min={1}
        onChange={(v) => onUpdate({ radiusX: Math.max(v, 1) })}
      />
      <NumField
        label="Radio Y (px)"
        value={entity.radiusY}
        min={1}
        onChange={(v) => onUpdate({ radiusY: Math.max(v, 1) })}
      />
    </>
  );
}
// ---------------------------------------------------------------------------

function syncFabricObjects(canvas: FabricCanvas, entities: SketchEntity[]) {
  // Eliminar objetos Fabric cuya entityId ya no esté en el store
  const existingIds = new Set(entities.map((e) => e.id));
  canvas.getObjects().forEach((obj: any) => {
    if (obj.data?.entityId && !existingIds.has(obj.data.entityId)) {
      canvas.remove(obj);
    }
  });
  // Nota: re-dibujo completo de entidades modificadas no es necesario en este MVP;
  // los cambios numéricos se reflejan vía undo/redo que regenera la vista completa.
  canvas.renderAll();
}

// ---------------------------------------------------------------------------
// Widget preview 3D
// ---------------------------------------------------------------------------

function Feature3DPreview() {
  const [expanded, setExpanded] = useState(false);
  const features = useFeatureStore((s) => s.features);
  const geometries = useFeatureStore((s) => s.geometries);

  const visibleGeometries = useMemo(
    () =>
      Array.from(geometries.values()).filter((fg) => {
        const feat = features.find((f) => f.id === fg.featureId);
        return feat && feat.visible && !feat.suppressed;
      }),
    [geometries, features]
  );

  if (features.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-4 z-10">
      {expanded ? (
        <div
          className="relative overflow-hidden rounded-md border border-border shadow-lg"
          style={{ width: 220, height: 220 }}
        >
          <button
            onClick={() => setExpanded(false)}
            className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 hover:bg-black/80"
            title="Cerrar preview 3D"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
          <span className="absolute left-2 top-1 z-10 text-[10px] text-white/60">
            Vista 3D (cenital)
          </span>
          <ThreeCanvas
            camera={{ position: [0, 25, 0], up: [0, 0, -1], near: 0.1, far: 500 }}
            style={{ background: '#111' }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 10, 5]} intensity={0.8} />
            <ThreeOrbitControls enablePan enableZoom enableRotate={false} />
            {visibleGeometries.map((fg) => (
              <mesh key={fg.featureId} geometry={fg.geometry}>
                <meshStandardMaterial color="#7c3aed" metalness={0.2} roughness={0.5} />
              </mesh>
            ))}
          </ThreeCanvas>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm shadow-md hover:bg-muted"
          title="Ver resultado 3D"
        >
          <Box className="h-4 w-4" />
          <span>Ver 3D ({features.length})</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ejes ghost X/Y (SVG overlay sobre el canvas de Fabric)
// ---------------------------------------------------------------------------

function AxisGhost({
  vt,
  canvasRef,
}: {
  vt: number[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const canvas = canvasRef.current;
  if (!canvas) return null;

  const W = canvas.width;
  const H = canvas.height;
  // viewportTransform = [scaleX, 0, 0, scaleY, translateX, translateY]
  const originX = vt[4] ?? 0;
  const originY = vt[5] ?? 0;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={W}
      height={H}
      style={{ overflow: 'hidden' }}
    >
      {/* Eje X — rojo */}
      <line
        x1={0}
        y1={originY}
        x2={W}
        y2={originY}
        stroke="#ef4444"
        strokeWidth={1}
        strokeOpacity={0.55}
        strokeDasharray="4 4"
      />
      {/* Eje Y — verde */}
      <line
        x1={originX}
        y1={0}
        x2={originX}
        y2={H}
        stroke="#22c55e"
        strokeWidth={1}
        strokeOpacity={0.55}
        strokeDasharray="4 4"
      />
      {/* Punto de origen */}
      <circle cx={originX} cy={originY} r={3} fill="#ffffff" fillOpacity={0.7} />
      {/* Etiquetas */}
      {originX >= 0 && originX <= W && (
        <text
          x={Math.min(originX + 6, W - 20)}
          y={Math.max(originY - 6, 12)}
          fill="#22c55e"
          fontSize={10}
          fontFamily="monospace"
          opacity={0.8}
        >
          Y
        </text>
      )}
      {originY >= 0 && originY <= H && (
        <text
          x={Math.min(W - 16, W - 16)}
          y={originY - 5}
          fill="#ef4444"
          fontSize={10}
          fontFamily="monospace"
          opacity={0.8}
        >
          X
        </text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function drawGrid(canvas: FabricCanvas, gridSize: number) {
  const existingGrid = canvas.getObjects().filter((obj) => (obj as any).data?.isGrid);
  existingGrid.forEach((obj) => canvas.remove(obj));
  const width = canvas.width!;
  const height = canvas.height!;
  for (let x = 0; x <= width; x += gridSize) {
    const line = new FabricLine([x, 0, x, height], {
      stroke: '#2a2a2a',
      strokeWidth: x % (gridSize * 5) === 0 ? 1 : 0.5,
      selectable: false,
      evented: false,
      data: { isGrid: true },
    });
    canvas.add(line);
  }
  for (let y = 0; y <= height; y += gridSize) {
    const line = new FabricLine([0, y, width, y], {
      stroke: '#2a2a2a',
      strokeWidth: y % (gridSize * 5) === 0 ? 1 : 0.5,
      selectable: false,
      evented: false,
      data: { isGrid: true },
    });
    canvas.add(line);
  }
  canvas.renderAll();
}
