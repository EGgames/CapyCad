'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFeatureStore } from '@/stores/featureStore';
import { FeatureType } from '@stl-model/shared-types';

const SOLID_TYPES = [
  FeatureType.EXTRUDE,
  FeatureType.REVOLVE,
  FeatureType.SWEEP,
  FeatureType.LOFT,
  FeatureType.PRIMITIVE_BOX,
  FeatureType.PRIMITIVE_SPHERE,
  FeatureType.PRIMITIVE_CYLINDER,
  FeatureType.PRIMITIVE_CONE,
  FeatureType.PRIMITIVE_TORUS,
  FeatureType.BOOLEAN,
] as const;

const OP_LABELS: Record<string, string> = {
  union: 'Unión',
  subtract: 'Resta',
  intersect: 'Intersección',
};

const OP_ICONS: Record<string, React.ReactNode> = {
  union: (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </svg>
  ),
  subtract: (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" className="fill-current opacity-25" />
    </svg>
  ),
  intersect: (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </svg>
  ),
};

/**
 * Overlay HUD que guía al usuario durante el wizard de selección gráfica
 * para operaciones booleanas. Aparece cuando `booleanWizard` está activo.
 */
export default function BooleanSelectionHUD() {
  const booleanWizard = useUIStore((s) => s.booleanWizard);
  const cancelBooleanWizard = useUIStore((s) => s.cancelBooleanWizard);
  const features = useFeatureStore((s) => s.features);
  const solidFeatures = features.filter((f) =>
    (SOLID_TYPES as readonly string[]).includes(f.type)
  );

  // Cerrar con ESC
  useEffect(() => {
    if (!booleanWizard) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelBooleanWizard();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [booleanWizard, cancelBooleanWizard]);

  if (!booleanWizard) return null;

  const { operation, step, targetId } = booleanWizard;
  const opLabel = OP_LABELS[operation] ?? operation;
  const isSelectingTarget = step === 'select-target';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center">
      {/* Mensaje cuando no hay sólidos disponibles */}
      {solidFeatures.length < 2 && (
        <p
          data-testid="boolean-empty-msg"
          className="pointer-events-auto mt-4 rounded border border-yellow-500/40 bg-yellow-950/90 px-4 py-3 text-sm text-yellow-300 shadow-xl"
        >
          {solidFeatures.length === 0
            ? 'No hay extrusiones disponibles. Crea al menos dos extrusiones (Extrude) para aplicar una operación booleana.'
            : 'Solo hay una extrusión. Necesitas al menos dos extrusiones para una operación booleana.'}
        </p>
      )}
      {/* Banner superior — instrucción actual */}
      <div className="pointer-events-auto mt-4 flex items-center gap-3 rounded-xl border border-border bg-card/90 px-5 py-3 shadow-xl backdrop-blur-sm">
        {/* Icono de operación */}
        <span className="text-primary">{OP_ICONS[operation]}</span>

        {/* Etiqueta de operación */}
        <span className="text-sm font-semibold text-primary">{opLabel}</span>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* Paso actual */}
        <div className="flex items-center gap-2">
          {/* Paso 1 */}
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              isSelectingTarget
                ? 'bg-primary text-primary-foreground'
                : 'bg-green-500 text-white'
            }`}
          >
            {isSelectingTarget ? '1' : '✓'}
          </div>
          <span
            className={`text-sm ${
              isSelectingTarget ? 'font-medium text-foreground' : 'text-muted-foreground line-through'
            }`}
          >
            Cuerpo A (objetivo)
          </span>

          <span className="mx-1 text-muted-foreground">→</span>

          {/* Paso 2 */}
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              !isSelectingTarget
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground'
            }`}
          >
            2
          </div>
          <span
            className={`text-sm ${
              !isSelectingTarget ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            Cuerpo B (herramienta)
          </span>
        </div>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* Botón cancelar */}
        <button
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          onClick={cancelBooleanWizard}
          title="Cancelar (ESC)"
        >
          Cancelar
        </button>
      </div>

      {/* Indicador de instrucción en el centro inferior del canvas */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
        <div className="pointer-events-none flex items-center gap-2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          <span className="animate-pulse">●</span>
          {isSelectingTarget
            ? 'Haz click en el cuerpo OBJETIVO (A) para la operación'
            : `Cuerpo A seleccionado · Haz click en la HERRAMIENTA (B) para completar`}
        </div>
      </div>

      {/* Indicador visual del cuerpo A ya elegido (cuando estamos en paso 2) */}
      {!isSelectingTarget && targetId && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2">
          <div className="pointer-events-none rounded bg-cyan-500/20 px-3 py-1 text-xs text-cyan-300 border border-cyan-500/40">
            A: <code className="font-mono">{targetId.slice(-6)}</code>
          </div>
        </div>
      )}
    </div>
  );
}
