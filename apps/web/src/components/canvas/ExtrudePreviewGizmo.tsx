/**
 * ExtrudePreviewGizmo — Estilo TinkerCAD
 *
 * Muestra en la escena 3D:
 *   1. Preview semi-transparente azul de la extrusión.
 *   2. Handle cuadrado plano sobre la cara superior (arrastrable).
 *   3. Cono de dirección sobre el handle.
 *   4. Línea de dimensión lateral con ticks.
 *   5. Badge Html con el valor actual.
 *
 * Sistema de coordenadas:
 *   - El sketch está en el plano XZ (y = 0).
 *   - La extrusión crece en +Y.
 *   - THREE.ExtrudeGeometry trabaja en XY → rotateX(-PI/2) → base XZ, extrusión +Y.
 */
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useSketchStore } from '@/stores/sketchStore';
import { useUIStore } from '@/stores/uiStore';
import {
  SketchEntityType,
  type SketchEntity,
  type Circle as CircleEntity,
  type Rectangle as RectangleEntity,
  type Polygon as PolygonEntity,
  type Arc as ArcEntity,
} from '@capycad/shared-types';

const PPU = 50;

// ─── Conversión de entidades de sketch a THREE.Shape ─────────────────────────

/**
 * Convierte entidades de sketch a un THREE.Shape en el plano XY de Three.js.
 * Mapeo:
 *   shape.x = (fabricX - cw/2) / PPU   →  world X
 *   shape.y = -(fabricY - ch/2) / PPU  →  -world Z  (flip para que +shape.y = -world.Z)
 *
 * Después de rotateX(-PI/2) en la geometría:
 *   (x, sy, 0)  → (x, 0, -sy)  = (worldX, 0, worldZ)  ✓
 *   (x, sy, d)  → (x, d, -sy)  = (worldX, d, worldZ)  ✓ (extrusión en +Y)
 */
function entitiesToShape(
  entities: SketchEntity[],
  cw: number,
  ch: number
): THREE.Shape | null {
  for (const e of entities) {
    if (e.type === SketchEntityType.CIRCLE) {
      const c = e as CircleEntity;
      const sx = (c.center.x - cw / 2) / PPU;
      const sy = -(c.center.y - ch / 2) / PPU;
      const r = c.radius / PPU;
      const shape = new THREE.Shape();
      shape.absarc(sx, sy, r, 0, Math.PI * 2, false);
      return shape;
    }

    if (e.type === SketchEntityType.RECTANGLE) {
      const rect = e as RectangleEntity;
      const x1 = (rect.topLeft.x - cw / 2) / PPU;
      const y1 = -(rect.topLeft.y - ch / 2) / PPU;
      const x2 = (rect.bottomRight.x - cw / 2) / PPU;
      const y2 = -(rect.bottomRight.y - ch / 2) / PPU;
      const shape = new THREE.Shape();
      shape.moveTo(x1, y1);
      shape.lineTo(x2, y1);
      shape.lineTo(x2, y2);
      shape.lineTo(x1, y2);
      shape.closePath();
      return shape;
    }

    if (e.type === SketchEntityType.POLYGON) {
      const p = e as PolygonEntity;
      const sx = (p.center.x - cw / 2) / PPU;
      const sy = -(p.center.y - ch / 2) / PPU;
      const r = p.radius / PPU;
      const rot = p.rotation ?? 0;
      const shape = new THREE.Shape();
      for (let i = 0; i <= p.sides; i++) {
        const angle = (i / p.sides) * Math.PI * 2 + rot;
        const px = sx + r * Math.cos(angle);
        const py = sy + r * Math.sin(angle);
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();
      return shape;
    }

    if (e.type === SketchEntityType.ARC) {
      const arc = e as ArcEntity;
      const sx = (arc.center.x - cw / 2) / PPU;
      const sy = -(arc.center.y - ch / 2) / PPU;
      const r = arc.radius / PPU;
      const shape = new THREE.Shape();
      shape.absarc(sx, sy, r, arc.startAngle, arc.endAngle, false);
      shape.closePath();
      return shape;
    }
  }
  return null;
}

/** Centroide del primer shape en coordenadas de mundo (worldX, worldZ). */
function entityCentroid(
  entities: SketchEntity[],
  cw: number,
  ch: number
): [number, number] {
  for (const e of entities) {
    if (e.type === SketchEntityType.CIRCLE) {
      const c = e as CircleEntity;
      return [(c.center.x - cw / 2) / PPU, (c.center.y - ch / 2) / PPU];
    }
    if (e.type === SketchEntityType.RECTANGLE) {
      const r = e as RectangleEntity;
      const mx = (r.topLeft.x + r.bottomRight.x) / 2;
      const my = (r.topLeft.y + r.bottomRight.y) / 2;
      return [(mx - cw / 2) / PPU, (my - ch / 2) / PPU];
    }
    if (e.type === SketchEntityType.POLYGON) {
      const p = e as PolygonEntity;
      return [(p.center.x - cw / 2) / PPU, (p.center.y - ch / 2) / PPU];
    }
    if (e.type === SketchEntityType.ARC) {
      const a = e as ArcEntity;
      return [(a.center.x - cw / 2) / PPU, (a.center.y - ch / 2) / PPU];
    }
  }
  return [0, 0];
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ExtrudePreviewGizmoProps {
  onTransformingChange?: (t: boolean) => void;
}

export default function ExtrudePreviewGizmo({
  onTransformingChange,
}: ExtrudePreviewGizmoProps) {
  const extrudePreviewActive = useUIStore((s) => s.extrudePreviewActive);
  const distance = useUIStore((s) => s.extrudePreviewDistance);
  const setDistance = useUIStore((s) => s.setExtrudePreviewDistance);
  // Dirección compartida con el HUD
  const direction = useUIStore((s) => s.extrudePreviewDirection);
  // Snapshot de IDs seleccionados al activar el preview
  const previewEntityIds = useUIStore((s) => s.extrudePreviewEntityIds);
  const activeSketch = useSketchStore((s) => s.activeSketch);
  const canvasWidth = useSketchStore((s) => s.canvasWidth);
  const canvasHeight = useSketchStore((s) => s.canvasHeight);
  const { gl } = useThree();

  // ── Estado de hover/drag ──────────────────────────────────────────────────
  const [hovered, setHovered] = useState(false);
  const isDragging = useRef(false);
  const startScreenY = useRef(0);
  const startDistance = useRef(distance);

  // ── Cursor del canvas ─────────────────────────────────────────────────────
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'ns-resize' : '';
  }, [hovered, gl]);

  // ── Datos del sketch ──────────────────────────────────────────────────────
  const allEntities = activeSketch?.entities ?? [];
  // Filtrar por snapshot de IDs; si el snapshot está vacío usar todas las entidades
  const entities =
    previewEntityIds.length > 0
      ? allEntities.filter((e) => previewEntityIds.includes(e.id))
      : allEntities;

  const shape = useMemo(() => {
    if (!extrudePreviewActive || entities.length === 0) return null;
    return entitiesToShape(entities, canvasWidth, canvasHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extrudePreviewActive, canvasWidth, canvasHeight, JSON.stringify(entities)]);

  const [cx, cz] = useMemo(() => {
    if (!extrudePreviewActive || entities.length === 0) return [0, 0] as [number, number];
    return entityCentroid(entities, canvasWidth, canvasHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extrudePreviewActive, canvasWidth, canvasHeight, JSON.stringify(entities)]);

  // ── Geometría de preview ──────────────────────────────────────────────────
  const geoRef = useRef<THREE.ExtrudeGeometry | null>(null);

  const previewGeometry = useMemo(() => {
    if (geoRef.current) {
      geoRef.current.dispose();
      geoRef.current = null;
    }
    if (!shape) return null;
    // Para 'both': extruir el doble (±distance centrado en y=0)
    const geoDist = direction === 'both' ? distance * 2 : distance;
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, geoDist),
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    geoRef.current = geo;
    return geo;
  }, [shape, distance, direction]);

  useEffect(() => {
    return () => {
      geoRef.current?.dispose();
      geoRef.current = null;
    };
  }, []);

  // ── Drag via pointer capture en el canvas ─────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaY = startScreenY.current - e.clientY;
      const newDist = Math.max(0.1, startDistance.current + deltaY / 50);
      setDistance(newDist);
    };

    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onTransformingChange?.(false);
      }
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [gl, setDistance, onTransformingChange]);

  if (!extrudePreviewActive || !previewGeometry) return null;

  const handleDragStart = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isDragging.current = true;
    startScreenY.current = e.nativeEvent.clientY;
    startDistance.current = distance;
    gl.domElement.setPointerCapture(e.nativeEvent.pointerId);
    onTransformingChange?.(true);
  };

  /**
   * Offset Y del grupo completo según la dirección:
   *   positive: base en y=0, crece hacia +Y  → groupY = 0
   *   negative: base en y=0, crece hacia -Y  → groupY = -distance
   *   both:     crece ±distance centrado en y=0 → groupY = -distance
   */
  const groupY = direction === 'positive' ? 0 : -distance;

  // Posición Y del handle (siempre en la cara "libre", lejos del sketch)
  const handleTopY = direction === 'negative'
    ? -(distance + 0.12)   // cara inferior para negativo
    : distance + 0.12;     // cara superior para positivo y both

  // El cono apunta en la dirección de extrusión
  const coneRotX = direction === 'negative' ? Math.PI : 0;
  const coneOffsetY = direction === 'negative' ? -0.22 : 0.22;

  // Offset lateral para la línea de dimensión
  const dimOffset = 0.7;

  return (
    <group>
      {/* ── Preview mesh desplazado según dirección ── */}
      <group position={[0, groupY, 0]}>

        {/* Preview semi-transparente azul */}
        <mesh geometry={previewGeometry} renderOrder={1}>
          <meshStandardMaterial
            color="#3b82f6"
            opacity={0.28}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Aristas wireframe azul claro */}
        <mesh geometry={previewGeometry} renderOrder={2}>
          <meshBasicMaterial
            color="#93c5fd"
            wireframe
            opacity={0.4}
            transparent
          />
        </mesh>

      </group>

      {/* ══ Línea de dimensión lateral ══ */}

      {/* Shaft de la línea (siempre entre y=groupY y y=groupY+geoDist) */}
      <mesh position={[cx + dimOffset, groupY + (direction === 'both' ? distance : distance / 2), cz]}>
        <cylinderGeometry args={[0.015, 0.015, Math.max(0.02, distance * (direction === 'both' ? 2 : 1)), 4]} />
        <meshBasicMaterial color="#ffffff" opacity={0.65} transparent />
      </mesh>

      {/* Tick base */}
      <mesh position={[cx + dimOffset, groupY + 0.001, cz]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.32, 4]} />
        <meshBasicMaterial color="#ffffff" opacity={0.65} transparent />
      </mesh>

      {/* Tick tope */}
      <mesh
        position={[cx + dimOffset, groupY + (direction === 'both' ? distance * 2 : distance), cz]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.015, 0.015, 0.32, 4]} />
        <meshBasicMaterial color="#ffffff" opacity={0.65} transparent />
      </mesh>

      {/* Badge de medida */}
      <Html
        position={[cx + dimOffset + 0.26, groupY + (direction === 'both' ? distance : distance / 2), cz]}
        style={{ pointerEvents: 'none', transform: 'translateY(-50%)' }}
        occlude={false}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#ffffff',
            padding: '2px 7px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.18)',
            userSelect: 'none',
          }}
        >
          {distance.toFixed(2)} u
        </div>
      </Html>

      {/* ══ Flecha arrastrable estilo TinkerCAD ══ */}

      {/* Shaft de la flecha */}
      <mesh position={[cx, handleTopY + (direction === 'negative' ? -0.25 : 0.25), cz]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
        <meshBasicMaterial color={hovered ? '#fbbf24' : '#e2e8f0'} />
      </mesh>

      {/* Cabeza cónica */}
      <mesh
        position={[cx, handleTopY + coneOffsetY, cz]}
        rotation={[coneRotX, 0, 0]}
      >
        <coneGeometry args={[0.15, 0.36, 12]} />
        <meshBasicMaterial
          color={hovered ? '#fbbf24' : '#e2e8f0'}
          opacity={0.95}
          transparent
        />
      </mesh>

      {/* Área de click invisible (cilindro grande, más fácil de agarrar) */}
      <mesh
        position={[cx, handleTopY + (direction === 'negative' ? -0.25 : 0.25), cz]}
        onPointerDown={handleDragStart}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.28, 0.28, 0.9, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Para dirección 'both': segunda flecha hacia abajo */}
      {direction === 'both' && (
        <>
          <mesh position={[cx, -(distance + 0.37), cz]}>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
            <meshBasicMaterial color={hovered ? '#fbbf24' : '#e2e8f0'} />
          </mesh>
          <mesh position={[cx, -(distance + 0.6), cz]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.15, 0.36, 12]} />
            <meshBasicMaterial color={hovered ? '#fbbf24' : '#e2e8f0'} opacity={0.95} transparent />
          </mesh>
        </>
      )}

    </group>
  );
}
