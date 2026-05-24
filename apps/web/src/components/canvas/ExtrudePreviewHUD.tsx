/**
 * ExtrudePreviewHUD
 *
 * Overlay React (DOM, fuera del <Canvas>) que aparece cuando el modo de
 * preview interactivo de extrusión está activo.
 * Muestra:
 *   - Valor de distancia editable (sincronizado con la flecha arrastrable).
 *   - Selector de dirección (positivo / negativo / ambos).
 *   - Botones Confirmar y Cancelar.
 *   - Atajos de teclado: Escape → cancelar.
 */
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFeatureStore } from '@/stores/featureStore';
import { useSketchStore } from '@/stores/sketchStore';
import { FeatureType, type ExtrudeFeature } from '@capycad/shared-types';
import { cn } from '@/lib/utils';

type Direction = 'positive' | 'negative' | 'both';

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'positive', label: '↑ Arriba' },
  { value: 'negative', label: '↓ Abajo' },
  { value: 'both', label: '↕ Ambos' },
];

export default function ExtrudePreviewHUD() {
  const extrudePreviewActive = useUIStore((s) => s.extrudePreviewActive);
  const setExtrudePreviewActive = useUIStore((s) => s.setExtrudePreviewActive);
  const distance = useUIStore((s) => s.extrudePreviewDistance);
  const setDistance = useUIStore((s) => s.setExtrudePreviewDistance);
  // Dirección compartida con el Gizmo via store
  const dir = useUIStore((s) => s.extrudePreviewDirection);
  const setDir = useUIStore((s) => s.setExtrudePreviewDirection);

  const { createExtrude, isProcessing, selectedFeatureId, features } = useFeatureStore();
  const { activeSketch, setEditMode, selectedEntities } = useSketchStore();
  // Snapshot de IDs capturado al activar el preview (inmune a limpiezas de selección)
  const previewEntityIds = useUIStore((s) => s.extrudePreviewEntityIds);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset y auto-focus al abrir
  useEffect(() => {
    if (extrudePreviewActive) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [extrudePreviewActive]);

  // Escape → cancelar
  useEffect(() => {
    if (!extrudePreviewActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExtrudePreviewActive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [extrudePreviewActive, setExtrudePreviewActive]);

  if (!extrudePreviewActive) return null;

  const handleConfirm = async () => {
    // Caso 1: sketch 2D activo
    if (activeSketch && activeSketch.entities.length > 0) {
      // Prioridad: snapshot de IDs capturado al activar el preview (robusto ante
      // limpiezas de selección causadas por drag del gizmo o click en canvas).
      // Fallback en cascada: selectedEntities actuales → todas las entidades.
      const ids =
        previewEntityIds.length > 0
          ? previewEntityIds
          : selectedEntities.length > 0
            ? selectedEntities
            : null;
      const entitiesToExtrude = ids
        ? activeSketch.entities.filter((e) => ids.includes(e.id))
        : activeSketch.entities;
      if (entitiesToExtrude.length === 0) {
        alert('No hay entidades válidas para extruir');
        return;
      }
      setExtrudePreviewActive(false);
      try {
        await createExtrude(activeSketch.id, entitiesToExtrude, distance, dir);
        setEditMode('3d');
      } catch (err) {
        console.error('Error al extruir:', err);        alert(`Error al extruir: ${err instanceof Error ? err.message : String(err)}`);        alert(`Error al extruir: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }
    // Caso 2: feature 3D seleccionada con sketch base
    const feat = features.find((f) => f.id === selectedFeatureId);
    if (feat && feat.type === FeatureType.EXTRUDE) {
      const base = (feat as ExtrudeFeature).sketch;
      if (base.entities.length > 0) {
        setExtrudePreviewActive(false);
        try {
          await createExtrude(base.id, base.entities, distance, dir);
          setEditMode('3d');
        } catch (err) {
          console.error('Error al extruir desde cara 3D:', err);
        }
        return;
      }
    }
    alert('No hay un perfil 2D válido para extruir');
  };

  return (
    /* Barra compacta de una fila — estilo TinkerCAD */
    <div
      className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Distancia */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={0.1}
          step={0.1}
          value={Math.round(distance * 10) / 10}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v > 0) setDistance(v);
          }}
          className="w-20 rounded border border-input bg-background px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">u</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Dirección */}
      {DIRECTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setDir(value)}
          className={cn(
            'rounded px-2 py-1 text-xs transition-colors',
            dir === value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {label}
        </button>
      ))}

      <div className="h-4 w-px bg-border" />

      {/* Acciones */}
      <button
        onClick={() => setExtrudePreviewActive(false)}
        className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
      >
        Esc
      </button>
      <button
        onClick={handleConfirm}
        disabled={isProcessing}
        className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
      >
        {isProcessing ? '…' : '✓ Extruir'}
      </button>
    </div>
  );
}
