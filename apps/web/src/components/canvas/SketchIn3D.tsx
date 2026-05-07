import { useState, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Line, TransformControls } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { nanoid } from 'nanoid';
import { useSketchStore } from '../../stores/sketchStore';
import { useUIStore } from '../../stores/uiStore';
import { useFeatureStore } from '../../stores/featureStore';
import {
  SketchEntityType,
  Line as LineEntity,
  Circle as CircleEntity,
  Rectangle as RectangleEntity,
  Arc as ArcEntity,
  Polygon as PolygonEntity,
  SketchEntity,
} from '@stl-model/shared-types';

/**
 * 1 Three.js unit = PIXELS_PER_UNIT Fabric canvas pixels
 * Permite que las entidades dibujadas en 2D y en 3D compartan el mismo sistema de coordenadas.
 */
const PIXELS_PER_UNIT = 50;

/** Convierte coordenadas Fabric (píxeles) → mundo 3D en el plano XZ (y=0) */
function fabricToWorld(px: number, py: number, cw: number, ch: number): [number, number, number] {
  return [(px - cw / 2) / PIXELS_PER_UNIT, 0, (py - ch / 2) / PIXELS_PER_UNIT];
}

/** Convierte coordenadas mundo 3D (XZ) → Fabric píxeles */
function worldToFabric(wx: number, wz: number, cw: number, ch: number): [number, number] {
  return [wx * PIXELS_PER_UNIT + cw / 2, wz * PIXELS_PER_UNIT + ch / 2];
}

// ---------------------------------------------------------------------------
// Renderizado de entidades en el plano 3D
// ---------------------------------------------------------------------------

/** Color de la línea según estado de selección. */
const COLOR_DEFAULT = '#7c3aed';
const COLOR_SELECTED = '#fbbf24';

/** Crea un handler de click reutilizable para entidades 2D en 3D. */
function useEntityPicker(entityId: string) {
  const selectionToolActive = useUIStore((s) => s.selectionToolActive);
  return (e: ThreeEvent<MouseEvent>) => {
    if (selectionToolActive === false) return;
    e.stopPropagation();
    // Cualquier herramienta de dibujo en curso queda deseleccionada al elegir
    // un objeto: la herramienta activa pasa a 'select'.
    useSketchStore.getState().setActiveTool('select');
    useSketchStore.getState().clearSelection();
    useSketchStore.getState().selectEntity(entityId);
    // Excluyente con la selección 3D.
    useFeatureStore.getState().selectFeature(null);
  };
}

function SketchLine({
  entity,
  cw,
  ch,
  selected,
}: {
  entity: LineEntity;
  cw: number;
  ch: number;
  selected: boolean;
}) {
  const start = fabricToWorld(entity.start.x, entity.start.y, cw, ch);
  const end = fabricToWorld(entity.end.x, entity.end.y, cw, ch);
  const onClick = useEntityPicker(entity.id);
  return (
    <Line
      points={[start, end]}
      color={selected ? COLOR_SELECTED : COLOR_DEFAULT}
      lineWidth={selected ? 4 : 2}
      onClick={onClick}
    />
  );
}

function SketchCircle({
  entity,
  cw,
  ch,
  selected,
}: {
  entity: CircleEntity;
  cw: number;
  ch: number;
  selected: boolean;
}) {
  const [cx, , cz] = fabricToWorld(entity.center.x, entity.center.y, cw, ch);
  const worldRadius = entity.radius / PIXELS_PER_UNIT;
  const onClick = useEntityPicker(entity.id);

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push([cx + Math.cos(angle) * worldRadius, 0, cz + Math.sin(angle) * worldRadius]);
    }
    return pts;
  }, [cx, cz, worldRadius]);

  return (
    <Line
      points={points}
      color={selected ? COLOR_SELECTED : COLOR_DEFAULT}
      lineWidth={selected ? 4 : 2}
      onClick={onClick}
    />
  );
}

function SketchRect({
  entity,
  cw,
  ch,
  selected,
}: {
  entity: RectangleEntity;
  cw: number;
  ch: number;
  selected: boolean;
}) {
  const [x1, , z1] = fabricToWorld(entity.topLeft.x, entity.topLeft.y, cw, ch);
  const [x2, , z2] = fabricToWorld(entity.bottomRight.x, entity.bottomRight.y, cw, ch);
  const onClick = useEntityPicker(entity.id);

  const points: [number, number, number][] = [
    [x1, 0, z1],
    [x2, 0, z1],
    [x2, 0, z2],
    [x1, 0, z2],
    [x1, 0, z1],
  ];

  return (
    <Line
      points={points}
      color={selected ? COLOR_SELECTED : COLOR_DEFAULT}
      lineWidth={selected ? 4 : 2}
      onClick={onClick}
    />
  );
}

function SketchPolygon({
  entity,
  cw,
  ch,
  selected,
}: {
  entity: PolygonEntity;
  cw: number;
  ch: number;
  selected: boolean;
}) {
  const [cx, , cz] = fabricToWorld(entity.center.x, entity.center.y, cw, ch);
  const worldRadius = entity.radius / PIXELS_PER_UNIT;
  const rotation = entity.rotation ?? 0;
  const onClick = useEntityPicker(entity.id);

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= entity.sides; i++) {
      const angle = (i / entity.sides) * Math.PI * 2 + rotation;
      pts.push([cx + Math.cos(angle) * worldRadius, 0, cz + Math.sin(angle) * worldRadius]);
    }
    return pts;
  }, [cx, cz, worldRadius, entity.sides, rotation]);

  return (
    <Line
      points={points}
      color={selected ? COLOR_SELECTED : COLOR_DEFAULT}
      lineWidth={selected ? 4 : 2}
      onClick={onClick}
    />
  );
}

function SketchArc({
  entity,
  cw,
  ch,
  selected,
}: {
  entity: ArcEntity;
  cw: number;
  ch: number;
  selected: boolean;
}) {
  const [cx, , cz] = fabricToWorld(entity.center.x, entity.center.y, cw, ch);
  const worldRadius = entity.radius / PIXELS_PER_UNIT;
  const onClick = useEntityPicker(entity.id);

  const points = useMemo(() => {
    const segments = 48;
    const start = (entity.startAngle * Math.PI) / 180;
    const end = (entity.endAngle * Math.PI) / 180;
    const span = end > start ? end - start : end - start + Math.PI * 2;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = start + (i / segments) * span;
      pts.push([cx + Math.cos(angle) * worldRadius, 0, cz + Math.sin(angle) * worldRadius]);
    }
    return pts;
  }, [cx, cz, worldRadius, entity.startAngle, entity.endAngle]);

  return (
    <Line
      points={points}
      color={selected ? COLOR_SELECTED : COLOR_DEFAULT}
      lineWidth={selected ? 4 : 2}
      onClick={onClick}
    />
  );
}

// ---------------------------------------------------------------------------
// Gizmo de transformación para entidad 2D seleccionada (en plano 3D)
// ---------------------------------------------------------------------------

/** Centro de la entidad en coordenadas de mundo 3D (XZ, y=0). */
function entityCenterWorld(
  entity: SketchEntity,
  cw: number,
  ch: number
): [number, number, number] {
  switch (entity.type) {
    case SketchEntityType.LINE: {
      const l = entity as LineEntity;
      return fabricToWorld((l.start.x + l.end.x) / 2, (l.start.y + l.end.y) / 2, cw, ch);
    }
    case SketchEntityType.CIRCLE: {
      const c = entity as CircleEntity;
      return fabricToWorld(c.center.x, c.center.y, cw, ch);
    }
    case SketchEntityType.RECTANGLE: {
      const r = entity as RectangleEntity;
      return fabricToWorld(
        (r.topLeft.x + r.bottomRight.x) / 2,
        (r.topLeft.y + r.bottomRight.y) / 2,
        cw,
        ch
      );
    }
    case SketchEntityType.POLYGON: {
      const p = entity as PolygonEntity;
      return fabricToWorld(p.center.x, p.center.y, cw, ch);
    }
    case SketchEntityType.ARC: {
      const a = entity as ArcEntity;
      return fabricToWorld(a.center.x, a.center.y, cw, ch);
    }
    default:
      return [0, 0, 0];
  }
}

/** Aplica un desplazamiento (en píxeles Fabric) a la entidad. */
function translateEntityFabric(
  entity: SketchEntity,
  dx: number,
  dy: number
): Partial<SketchEntity> {
  switch (entity.type) {
    case SketchEntityType.LINE: {
      const l = entity as LineEntity;
      return {
        start: { x: l.start.x + dx, y: l.start.y + dy },
        end: { x: l.end.x + dx, y: l.end.y + dy },
      } as Partial<SketchEntity>;
    }
    case SketchEntityType.CIRCLE: {
      const c = entity as CircleEntity;
      return { center: { x: c.center.x + dx, y: c.center.y + dy } } as Partial<SketchEntity>;
    }
    case SketchEntityType.RECTANGLE: {
      const r = entity as RectangleEntity;
      return {
        topLeft: { x: r.topLeft.x + dx, y: r.topLeft.y + dy },
        bottomRight: { x: r.bottomRight.x + dx, y: r.bottomRight.y + dy },
      } as Partial<SketchEntity>;
    }
    case SketchEntityType.POLYGON: {
      const p = entity as PolygonEntity;
      return { center: { x: p.center.x + dx, y: p.center.y + dy } } as Partial<SketchEntity>;
    }
    case SketchEntityType.ARC: {
      const a = entity as ArcEntity;
      return { center: { x: a.center.x + dx, y: a.center.y + dy } } as Partial<SketchEntity>;
    }
    default:
      return {};
  }
}

/**
 * Renderiza un TransformControls anclado a la entidad 2D seleccionada para
 * permitir trasladarla en el plano XZ. La traslación se persiste en sketchStore.
 */
function Sketch2DGizmo({
  cw,
  ch,
  onTransformingChange,
}: {
  cw: number;
  ch: number;
  onTransformingChange: (transforming: boolean) => void;
}) {
  const selectedEntities = useSketchStore((s) => s.selectedEntities);
  const entities = useSketchStore((s) => s.activeSketch?.entities ?? []);
  const updateEntity = useSketchStore((s) => s.updateEntity);

  const [groupNode, setGroupNode] = useState<THREE.Group | null>(null);
  const initialEntity = useRef<SketchEntity | null>(null);
  const initialPos = useRef<THREE.Vector3 | null>(null);
  const isTransforming = useRef(false);

  const entityId = selectedEntities[0];
  const entity = entityId ? entities.find((e) => e.id === entityId) ?? null : null;

  const center = useMemo(
    () => (entity ? entityCenterWorld(entity, cw, ch) : ([0, 0, 0] as [number, number, number])),
    [entity, cw, ch]
  );

  // Re-sincroniza la posición del group con el centro real cuando cambia la
  // entidad seleccionada (y mientras no estemos arrastrando el gizmo).
  useEffect(() => {
    if (!groupNode || isTransforming.current) return;
    groupNode.position.set(center[0], center[1], center[2]);
  }, [groupNode, center]);

  if (!entity) return null;

  const handleMouseDown = () => {
    isTransforming.current = true;
    onTransformingChange(true);
    initialEntity.current = entity;
    initialPos.current = groupNode ? groupNode.position.clone() : null;
  };

  const handleMouseUp = () => {
    isTransforming.current = false;
    onTransformingChange(false);
    initialEntity.current = null;
    initialPos.current = null;
  };

  const handleObjectChange = () => {
    if (!groupNode || !initialEntity.current || !initialPos.current) return;
    const dx = groupNode.position.x - initialPos.current.x;
    const dz = groupNode.position.z - initialPos.current.z;
    const dxFabric = dx * PIXELS_PER_UNIT;
    const dyFabric = dz * PIXELS_PER_UNIT;
    const updates = translateEntityFabric(initialEntity.current, dxFabric, dyFabric);
    updateEntity(initialEntity.current.id, updates);
  };

  return (
    <>
      <group ref={setGroupNode} position={center} />
      {groupNode && (
        <TransformControls
          object={groupNode}
          mode="translate"
          showY={false}
          size={0.6}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  );
}

function SketchEntityRenderer({
  entity,
  cw,
  ch,
  selected,
}: {
  entity: SketchEntity;
  cw: number;
  ch: number;
  selected: boolean;
}) {
  switch (entity.type) {
    case SketchEntityType.LINE:
      return <SketchLine entity={entity as LineEntity} cw={cw} ch={ch} selected={selected} />;
    case SketchEntityType.CIRCLE:
      return <SketchCircle entity={entity as CircleEntity} cw={cw} ch={ch} selected={selected} />;
    case SketchEntityType.RECTANGLE:
      return <SketchRect entity={entity as RectangleEntity} cw={cw} ch={ch} selected={selected} />;
    case SketchEntityType.POLYGON:
      return (
        <SketchPolygon entity={entity as PolygonEntity} cw={cw} ch={ch} selected={selected} />
      );
    case SketchEntityType.ARC:
      return <SketchArc entity={entity as ArcEntity} cw={cw} ch={ch} selected={selected} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Preview de entidad mientras se dibuja
// ---------------------------------------------------------------------------

function DrawPreview({
  tool,
  start,
  current,
}: {
  tool: string;
  start: THREE.Vector3;
  current: THREE.Vector3;
}) {
  const previewColor = '#ffffff';

  if (tool === 'line') {
    return (
      <Line
        points={[
          [start.x, 0, start.z],
          [current.x, 0, current.z],
        ]}
        color={previewColor}
        lineWidth={1.5}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
    );
  }

  if (tool === 'circle') {
    const dx = current.x - start.x;
    const dz = current.z - start.z;
    const radius = Math.sqrt(dx * dx + dz * dz);
    if (radius < 0.01) return null;

    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push([start.x + Math.cos(angle) * radius, 0, start.z + Math.sin(angle) * radius]);
    }
    return (
      <Line points={pts} color={previewColor} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.1} />
    );
  }

  if (tool === 'rectangle') {
    const pts: [number, number, number][] = [
      [start.x, 0, start.z],
      [current.x, 0, start.z],
      [current.x, 0, current.z],
      [start.x, 0, current.z],
      [start.x, 0, start.z],
    ];
    return (
      <Line points={pts} color={previewColor} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.1} />
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * SketchIn3D: se renderiza dentro del Canvas de Three.js de Canvas3D.
 * - Muestra las entidades del sketch activo en el plano XZ (y=0).
 * - Cuando hay una herramienta de dibujo activa (≠ 'select'), captura los
 *   eventos de puntero sobre un plano invisible y crea entidades en el store.
 * - Cuando hay una entidad 2D seleccionada, monta un TransformControls que
 *   permite trasladarla en XZ.
 */
export default function SketchIn3D({
  onTransformingChange,
}: {
  onTransformingChange?: (transforming: boolean) => void;
} = {}) {
  const activeTool = useSketchStore((s) => s.activeTool);
  const entities = useSketchStore((s) => s.activeSketch?.entities ?? []);
  const selectedEntities = useSketchStore((s) => s.selectedEntities);
  const addEntity = useSketchStore((s) => s.addEntity);
  const canvasWidth = useSketchStore((s) => s.canvasWidth);
  const canvasHeight = useSketchStore((s) => s.canvasHeight);

  const isDrawing = activeTool !== 'select';
  const [drawStart, setDrawStart] = useState<THREE.Vector3 | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<THREE.Vector3 | null>(null);

  const handlePointerDown = (
    e: THREE.Event & { point: THREE.Vector3; stopPropagation: () => void }
  ) => {
    if (!isDrawing) return;
    e.stopPropagation();
    setDrawStart(e.point.clone());
    setDrawCurrent(e.point.clone());
  };

  const handlePointerMove = (
    e: THREE.Event & { point: THREE.Vector3; stopPropagation: () => void }
  ) => {
    if (!isDrawing || !drawStart) return;
    e.stopPropagation();
    setDrawCurrent(e.point.clone());
  };

  const handlePointerUp = (
    e: THREE.Event & { point: THREE.Vector3; stopPropagation: () => void }
  ) => {
    if (!isDrawing || !drawStart) return;
    e.stopPropagation();

    const end = e.point;
    const dx = Math.abs(end.x - drawStart.x);
    const dz = Math.abs(end.z - drawStart.z);

    // Ignorar clicks sin movimiento real
    if (dx < 0.02 && dz < 0.02) {
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    const [sx, sy] = worldToFabric(drawStart.x, drawStart.z, canvasWidth, canvasHeight);
    const [ex, ey] = worldToFabric(end.x, end.z, canvasWidth, canvasHeight);

    let entity: SketchEntity | null = null;

    if (activeTool === 'line') {
      const lineEntity: LineEntity = {
        id: nanoid(),
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: sx, y: sy },
        end: { x: ex, y: ey },
      };
      entity = lineEntity;
    } else if (activeTool === 'circle') {
      const wdx = end.x - drawStart.x;
      const wdz = end.z - drawStart.z;
      const worldRadius = Math.sqrt(wdx * wdx + wdz * wdz);
      const circleEntity: CircleEntity = {
        id: nanoid(),
        type: SketchEntityType.CIRCLE,
        selected: false,
        center: { x: sx, y: sy },
        radius: worldRadius * PIXELS_PER_UNIT,
      };
      entity = circleEntity;
    } else if (activeTool === 'rectangle') {
      const rectEntity: RectangleEntity = {
        id: nanoid(),
        type: SketchEntityType.RECTANGLE,
        selected: false,
        topLeft: { x: Math.min(sx, ex), y: Math.min(sy, ey) },
        bottomRight: { x: Math.max(sx, ex), y: Math.max(sy, ey) },
      };
      entity = rectEntity;
    }

    if (entity) {
      addEntity(entity);
    }

    setDrawStart(null);
    setDrawCurrent(null);
  };

  return (
    <group>
      {/* Plano invisible de hit testing para capturar clics de dibujo.
          Sólo se monta cuando hay una herramienta de dibujo activa; de lo
          contrario interceptaría el raycast de las entidades 2D, impidiendo
          su selección en la vista 3D. */}
      {isDrawing && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          visible={false}
          onPointerDown={handlePointerDown as any}
          onPointerMove={handlePointerMove as any}
          onPointerUp={handlePointerUp as any}
        >
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Entidades del sketch activo en el plano XZ */}
      {entities.map((entity) => (
        <SketchEntityRenderer
          key={entity.id}
          entity={entity}
          cw={canvasWidth}
          ch={canvasHeight}
          selected={selectedEntities.includes(entity.id)}
        />
      ))}

      {/* Preview mientras se dibuja */}
      {isDrawing && drawStart && drawCurrent && (
        <DrawPreview tool={activeTool} start={drawStart} current={drawCurrent} />
      )}

      {/* Gizmo de transformación para la entidad 2D seleccionada (XZ) */}
      <Sketch2DGizmo
        cw={canvasWidth}
        ch={canvasHeight}
        onTransformingChange={(t) => onTransformingChange?.(t)}
      />
    </group>
  );
}
