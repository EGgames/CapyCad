import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { nanoid } from 'nanoid';
import { useSketchStore } from '../../stores/sketchStore';
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

function SketchLine({ entity, cw, ch }: { entity: LineEntity; cw: number; ch: number }) {
  const start = fabricToWorld(entity.start.x, entity.start.y, cw, ch);
  const end = fabricToWorld(entity.end.x, entity.end.y, cw, ch);
  return <Line points={[start, end]} color="#7c3aed" lineWidth={2} />;
}

function SketchCircle({ entity, cw, ch }: { entity: CircleEntity; cw: number; ch: number }) {
  const [cx, , cz] = fabricToWorld(entity.center.x, entity.center.y, cw, ch);
  const worldRadius = entity.radius / PIXELS_PER_UNIT;

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push([cx + Math.cos(angle) * worldRadius, 0, cz + Math.sin(angle) * worldRadius]);
    }
    return pts;
  }, [cx, cz, worldRadius]);

  return <Line points={points} color="#7c3aed" lineWidth={2} />;
}

function SketchRect({ entity, cw, ch }: { entity: RectangleEntity; cw: number; ch: number }) {
  const [x1, , z1] = fabricToWorld(entity.topLeft.x, entity.topLeft.y, cw, ch);
  const [x2, , z2] = fabricToWorld(entity.bottomRight.x, entity.bottomRight.y, cw, ch);

  const points: [number, number, number][] = [
    [x1, 0, z1],
    [x2, 0, z1],
    [x2, 0, z2],
    [x1, 0, z2],
    [x1, 0, z1],
  ];

  return <Line points={points} color="#7c3aed" lineWidth={2} />;
}

function SketchPolygon({ entity, cw, ch }: { entity: PolygonEntity; cw: number; ch: number }) {
  const [cx, , cz] = fabricToWorld(entity.center.x, entity.center.y, cw, ch);
  const worldRadius = entity.radius / PIXELS_PER_UNIT;
  const rotation = entity.rotation ?? 0;

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= entity.sides; i++) {
      const angle = (i / entity.sides) * Math.PI * 2 + rotation;
      pts.push([cx + Math.cos(angle) * worldRadius, 0, cz + Math.sin(angle) * worldRadius]);
    }
    return pts;
  }, [cx, cz, worldRadius, entity.sides, rotation]);

  return <Line points={points} color="#7c3aed" lineWidth={2} />;
}

function SketchArc({ entity, cw, ch }: { entity: ArcEntity; cw: number; ch: number }) {
  const [cx, , cz] = fabricToWorld(entity.center.x, entity.center.y, cw, ch);
  const worldRadius = entity.radius / PIXELS_PER_UNIT;

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

  return <Line points={points} color="#7c3aed" lineWidth={2} />;
}

function SketchEntityRenderer({
  entity,
  cw,
  ch,
}: {
  entity: SketchEntity;
  cw: number;
  ch: number;
}) {
  switch (entity.type) {
    case SketchEntityType.LINE:
      return <SketchLine entity={entity as LineEntity} cw={cw} ch={ch} />;
    case SketchEntityType.CIRCLE:
      return <SketchCircle entity={entity as CircleEntity} cw={cw} ch={ch} />;
    case SketchEntityType.RECTANGLE:
      return <SketchRect entity={entity as RectangleEntity} cw={cw} ch={ch} />;
    case SketchEntityType.POLYGON:
      return <SketchPolygon entity={entity as PolygonEntity} cw={cw} ch={ch} />;
    case SketchEntityType.ARC:
      return <SketchArc entity={entity as ArcEntity} cw={cw} ch={ch} />;
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
 */
export default function SketchIn3D() {
  const activeTool = useSketchStore((s) => s.activeTool);
  const entities = useSketchStore((s) => s.activeSketch?.entities ?? []);
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
      {/* Plano invisible de hit testing para capturar clics de dibujo */}
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

      {/* Entidades del sketch activo en el plano XZ */}
      {entities.map((entity) => (
        <SketchEntityRenderer key={entity.id} entity={entity} cw={canvasWidth} ch={canvasHeight} />
      ))}

      {/* Preview mientras se dibuja */}
      {isDrawing && drawStart && drawCurrent && (
        <DrawPreview tool={activeTool} start={drawStart} current={drawCurrent} />
      )}
    </group>
  );
}
