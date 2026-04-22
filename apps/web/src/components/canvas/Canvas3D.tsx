import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { useFeatureStore } from '../../stores/featureStore';
import { useSketchStore } from '../../stores/sketchStore';
import { useRenderStore, TONE_MAPPING_THREE } from '../../stores/renderStore';
import { getMaterialPreset } from '../../lib/materials/materialPresets';
import { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import SketchIn3D from './SketchIn3D';

export type ViewMode = 'shaded' | 'wireframe' | 'edges' | 'rendered';

// ─── Renderer setup: tone mapping + exposure ──────────────────────────────────
function RendererSetup() {
  const { gl } = useThree();
  const toneMapping = useRenderStore((s) => s.toneMapping);
  const exposure = useRenderStore((s) => s.exposure);

  useEffect(() => {
    gl.toneMapping = TONE_MAPPING_THREE[toneMapping];
    gl.toneMappingExposure = exposure;
  }, [gl, toneMapping, exposure]);

  return null;
}

// ─── Screenshot: captura el canvas como PNG y lo descarga ─────────────────────
function ScreenshotCapture() {
  const { gl } = useThree();
  const setScreenshotHandler = useRenderStore((s) => s.setScreenshotHandler);

  useEffect(() => {
    const capture = () => {
      const dataUrl = gl.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `render-${Date.now()}.png`;
      link.click();
    };
    setScreenshotHandler(capture);
    return () => setScreenshotHandler(null);
  }, [gl, setScreenshotHandler]);

  return null;
}

/**
 * Plano invisible para capturar clicks en modo placement (click-to-place primitivas).
 * Muestra un marcador en la posición del cursor sobre el grid.
 */
function PlacementPlane() {
  const placementMode = useFeatureStore((s) => s.placementMode);
  const confirmPlacement = useFeatureStore((s) => s.confirmPlacement);
  const cancelPlacement = useFeatureStore((s) => s.cancelPlacement);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!placementMode) setHoverPoint(null);
  }, [placementMode]);

  // Escape cancela el placement
  useEffect(() => {
    if (!placementMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelPlacement();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placementMode, cancelPlacement]);

  if (!placementMode) return null;

  return (
    <group>
      {/* Plano invisible grande para capturar raycast en Y=0 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHoverPoint(e.point.clone());
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          confirmPlacement({ x: e.point.x, y: 0, z: e.point.z });
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Marcador visual en posición del cursor */}
      {hoverPoint && (
        <group position={[hoverPoint.x, 0.02, hoverPoint.z]}>
          {/* Cruz en el piso */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.4, 32]} />
            <meshBasicMaterial color="#7c3aed" opacity={0.8} transparent />
          </mesh>
          {/* Línea vertical para indicar el punto */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 4, 8]} />
            <meshBasicMaterial color="#7c3aed" opacity={0.5} transparent />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Renderiza todas las features 3D (extrusiones, revoluciones, etc.)
 */
function FeatureMeshes({ viewMode }: { viewMode: ViewMode }) {
  const geometries = useFeatureStore((state) => state.geometries);
  const features = useFeatureStore((state) => state.features);
  const selectedFeatureId = useFeatureStore((state) => state.selectedFeatureId);
  const featureMaterials = useFeatureStore((state) => state.featureMaterials);
  const isRendered = viewMode === 'rendered';

  const geometryArray = useMemo(() => {
    return Array.from(geometries.values()).filter((featureGeom) => {
      const feature = features.find((f) => f.id === featureGeom.featureId);
      return feature && feature.visible && !feature.suppressed;
    });
  }, [geometries, features]);

  return (
    <>
      {geometryArray.map((featureGeom) => {
        const isSelected = featureGeom.featureId === selectedFeatureId;
        const feature = features.find((f) => f.id === featureGeom.featureId);
        const material = getMaterialPreset(
          featureMaterials.get(featureGeom.featureId)?.id ?? 'default'
        );
        const edgesGeometry =
          viewMode === 'edges' ? new THREE.EdgesGeometry(featureGeom.geometry) : null;
        const pos = feature?.position ?? { x: 0, y: 0, z: 0 };
        const rot = feature?.rotation ?? { x: 0, y: 0, z: 0 };

        return (
          <group
            key={featureGeom.featureId}
            position={[pos.x, pos.y, pos.z]}
            rotation={[rot.x, rot.y, rot.z]}
          >
            <mesh
              geometry={featureGeom.geometry}
              castShadow
              receiveShadow
              onClick={() => {
                useFeatureStore.getState().selectFeature(featureGeom.featureId);
              }}
            >
              <meshStandardMaterial
                color={isSelected ? '#fbbf24' : material.color}
                metalness={isRendered ? material.metalness : Math.min(material.metalness, 0.5)}
                roughness={material.roughness}
                opacity={viewMode === 'wireframe' ? 0.1 : material.opacity}
                transparent={viewMode === 'wireframe' ? true : material.transparent}
                emissive={material.emissive ?? '#000000'}
                emissiveIntensity={material.emissiveIntensity ?? 0}
                wireframe={viewMode === 'wireframe'}
                envMapIntensity={isRendered ? 1.0 : 0}
                side={THREE.DoubleSide}
              />
            </mesh>
            {viewMode === 'edges' && edgesGeometry && (
              <lineSegments geometry={edgesGeometry}>
                <lineBasicMaterial color={isSelected ? '#fbbf24' : '#ffffff'} />
              </lineSegments>
            )}
          </group>
        );
      })}
    </>
  );
}

export default function Canvas3D() {
  const activeTool = useSketchStore((s) => s.activeTool);
  const isDrawingMode = activeTool !== 'select';
  const placementMode = useFeatureStore((s) => s.placementMode);

  // ─ Render store ──────────────────────────────────────────────────
  const viewMode = useRenderStore((s) => s.viewMode);
  const setViewMode = useRenderStore((s) => s.setViewMode);
  const hdriPreset = useRenderStore((s) => s.hdriPreset);
  const hdriIntensity = useRenderStore((s) => s.hdriIntensity);
  const hdriBackground = useRenderStore((s) => s.hdriBackground);
  const shadowsEnabled = useRenderStore((s) => s.shadowsEnabled);
  const postProcess = useRenderStore((s) => s.postProcess);
  const lightConfig = useRenderStore((s) => s.lightConfig);

  // Shortcuts para modos de visualización (S/W/E/R) — solo en modo 3D
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 's':
          setViewMode('shaded');
          break;
        case 'w':
          setViewMode('wireframe');
          break;
        case 'e':
          setViewMode('edges');
          break;
        case 'r':
          setViewMode('rendered');
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setViewMode]);

  // Estilo de viñeta CSS in-canvas
  const vignetteStyle =
    postProcess.vignetteEnabled && viewMode === 'rendered'
      ? {
          boxShadow: `inset 0 0 ${Math.round(postProcess.vignetteIntensity * 120)}px rgba(0,0,0,${postProcess.vignetteIntensity.toFixed(2)})`,
        }
      : {};

  return (
    <div
      id="canvas-container"
      className="relative h-full w-full"
      style={{ ...vignetteStyle, cursor: placementMode ? 'crosshair' : undefined }}
    >
      {/* Indicador de modo placement (click-to-place) */}
      {placementMode && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow-md pointer-events-none">
          Haz click en el plano para colocar la figura —{' '}
          <span className="opacity-70">ESC para cancelar</span>
        </div>
      )}
      {/* Indicador de modo dibujo */}
      {isDrawingMode && !placementMode && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md bg-card px-4 py-2 text-sm shadow-md pointer-events-none">
          {activeTool === 'line' && 'Click y arrastra en el plano para dibujar una línea'}
          {activeTool === 'circle' && 'Click y arrastra en el plano para definir el círculo'}
          {activeTool === 'rectangle' && 'Click y arrastra en el plano para dibujar un rectángulo'}
        </div>
      )}

      {/* Selector de modos de visualización */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 rounded-md border border-border bg-card/80 p-1 backdrop-blur-sm">
        {(
          [
            { mode: 'shaded', label: 'S', title: 'Sombreado (S)' },
            { mode: 'wireframe', label: 'W', title: 'Alámbrico (W)' },
            { mode: 'edges', label: 'E', title: 'Aristas (E)' },
            { mode: 'rendered', label: 'R', title: 'Renderizado (R)' },
          ] as { mode: ViewMode; label: string; title: string }[]
        ).map(({ mode, label, title }) => (
          <button
            key={mode}
            title={title}
            onClick={() => setViewMode(mode)}
            className={`h-7 w-7 rounded text-xs font-semibold transition-colors ${
              viewMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Indicador de modo renderizado */}
      {viewMode === 'rendered' && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Renderizado PBR activo
        </div>
      )}

      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows={shadowsEnabled}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        {/* Configuración del renderer (tone mapping, exposición) */}
        <RendererSetup />
        <ScreenshotCapture />

        {/* Iluminación configurable — reducida en modo rendered (HDRI toma el rol) */}
        <ambientLight
          intensity={
            viewMode === 'rendered'
              ? lightConfig.ambientIntensity * 0.3
              : lightConfig.ambientIntensity
          }
        />
        <directionalLight
          position={[10, 10, 5]}
          intensity={
            viewMode === 'rendered'
              ? lightConfig.directionalIntensity * 0.6
              : lightConfig.directionalIntensity
          }
          color={lightConfig.directionalColor}
          castShadow={shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight
          position={[-10, -10, -5]}
          intensity={
            viewMode === 'rendered' ? lightConfig.pointIntensity * 0.4 : lightConfig.pointIntensity
          }
          color={lightConfig.pointColor}
        />

        {/* Entorno HDRI — solo en modo rendered y si no es 'none' */}
        {viewMode === 'rendered' && hdriPreset !== 'none' && (
          <Environment
            preset={hdriPreset}
            background={hdriBackground}
            environmentIntensity={hdriIntensity}
          />
        )}

        {/* Grid helper */}
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6e6e6e"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={100}
          fadeStrength={1}
          followCamera={false}
        />

        {/* Controles de cámara — deshabilitados mientras se dibuja */}
        <OrbitControls
          makeDefault
          enabled={!isDrawingMode}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          panSpeed={0.5}
          zoomSpeed={0.5}
        />

        {/* Gizmo de orientación */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ff0000', '#00ff00', '#0000ff']} labelColor="white" />
        </GizmoHelper>

        {/* Features 3D (extrusiones, revoluciones, etc.) */}
        <FeatureMeshes viewMode={viewMode} />

        {/* Plano de placement para click-to-place */}
        <PlacementPlane />

        {/* Sketch 2D en el plano 3D */}
        <SketchIn3D />

        {/* Plano para sombras */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      </Canvas>
    </div>
  );
}
