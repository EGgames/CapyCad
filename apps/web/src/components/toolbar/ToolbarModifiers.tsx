'use client';

import { useState } from 'react';
import { useFeatureStore, SOLID_FEATURE_TYPES } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { usePanelOrientation } from '../ui/panelOrientation';
import {
  FilletDialog,
  ChamferDialog,
  BevelDialog,
  CoveDialog,
  ShellDialog,
  DraftDialog,
  OffsetDialog,
} from './Tool3DDialogs';

// ────────────────────────────────────────────────────────
// SVG edge-profile icons
// Each icon is a 24×24 cross-section view showing the
// characteristic shape of the edge treatment.
// ────────────────────────────────────────────────────────

const SharpIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Square corner (no treatment) */}
    <path d="M5 19 L5 5 L19 5" strokeLinecap="round" />
    <circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const FilletIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Rounded corner */}
    <path d="M5 19 L5 9 Q5 5 9 5 L19 5" strokeLinecap="round" />
  </svg>
);

const ChamferIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* 45° chamfer cut — symmetric */}
    <path d="M5 19 L5 9 L9 5 L19 5" strokeLinecap="round" />
  </svg>
);

const BevelIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Asymmetric chamfer: short distance on horizontal, longer on vertical */}
    <path d="M5 19 L5 11 L11 5 L19 5" strokeLinecap="round" />
    {/* Tick marks showing unequal distances */}
    <path d="M5 11 L3 11" strokeWidth="1.2" />
    <path d="M11 5 L11 3" strokeWidth="1.2" />
  </svg>
);

const CoveIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Concave (cove) profile — curves inward at corner */}
    <path d="M5 19 L5 9 Q9 9 9 5 L19 5" strokeLinecap="round" />
  </svg>
);

const ShellIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Hollow box (shell) */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <rect x="7" y="7" width="10" height="10" rx="1" strokeDasharray="2 1.5" />
  </svg>
);

const DraftIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Tapered trapezoid (draft angle) */}
    <path d="M8 19 L16 19 L14 5 L10 5 Z" />
    {/* Angle indicator */}
    <path d="M16 19 L19 19" strokeWidth="1.2" strokeDasharray="2 1" />
    <path d="M14 5 L19 5" strokeWidth="1.2" strokeDasharray="2 1" />
  </svg>
);

const OffsetIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {/* Concentric squares showing surface offset */}
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <rect x="3" y="3" width="18" height="18" rx="1" strokeOpacity="0.4" strokeDasharray="2 1.5" />
  </svg>
);

// ────────────────────────────────────────────────────────
// Modifier definitions
// ────────────────────────────────────────────────────────

type ModifierType = 'sharp' | 'fillet' | 'chamfer' | 'bevel' | 'cove' | 'shell' | 'draft' | 'offset';

const EDGE_MODIFIERS: {
  type: ModifierType;
  label: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'sharp',
    label: 'Arista Viva',
    title: 'Arista a 90° — sin modificación (referencia visual)',
    icon: <SharpIcon />,
  },
  {
    type: 'fillet',
    label: 'Filete',
    title: 'Redondeo suave de aristas (convexo)',
    icon: <FilletIcon />,
  },
  {
    type: 'chamfer',
    label: 'Chaflán',
    title: 'Corte a 45° en aristas (simétrico)',
    icon: <ChamferIcon />,
  },
  {
    type: 'bevel',
    label: 'Bisel',
    title: 'Chaflán asimétrico con dos distancias distintas',
    icon: <BevelIcon />,
  },
  {
    type: 'cove',
    label: 'Media Caña',
    title: 'Curva cóncava en aristas (perfil QuasiAngular)',
    icon: <CoveIcon />,
  },
];

const SOLID_MODIFIERS: {
  type: ModifierType;
  label: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'shell',
    label: 'Shell',
    title: 'Vaciado del sólido con espesor constante',
    icon: <ShellIcon />,
  },
  {
    type: 'draft',
    label: 'Desmoldeo',
    title: 'Ángulo de desmoldeo en caras laterales',
    icon: <DraftIcon />,
  },
  {
    type: 'offset',
    label: 'Offset',
    title: 'Desplazamiento uniforme de todas las superficies',
    icon: <OffsetIcon />,
  },
];

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────

export default function ToolbarModifiers() {
  const {
    features,
    selectedFeatureId,
    isProcessing,
    createFillet,
    createChamfer,
    createBevel,
    createCove,
    createShell,
    createDraft,
    createOffset,
    getEdgesForFeature,
  } = useFeatureStore();

  const {
    modifierPicker,
    startModifierPicker,
    setModifierPickerEdges,
    selectAllModifierEdges,
    clearModifierPicker,
  } = useUIStore();

  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';

  const [activeDialog, setActiveDialog] = useState<ModifierType | null>(null);
  // tracks which edge modifier triggered the picker, so we open the right dialog after confirming
  const [pendingEdgeModifier, setPendingEdgeModifier] = useState<ModifierType | null>(null);

  const selectedFeature = features.find((f) => f.id === selectedFeatureId);
  const isSolid =
    selectedFeature !== undefined &&
    (SOLID_FEATURE_TYPES as readonly string[]).includes(selectedFeature.type);
  const canApply = isSolid && !isProcessing;

  // ── edge picker trigger for edge-based modifiers ──

  const startEdgePicker = async (type: ModifierType) => {
    if (!selectedFeatureId) return;
    setPendingEdgeModifier(type);
    startModifierPicker(selectedFeatureId);
    try {
      const edges = await getEdgesForFeature(selectedFeatureId);
      setModifierPickerEdges(edges);
    } catch (err) {
      console.error('[ToolbarModifiers] getEdges failed:', err);
      clearModifierPicker();
      setPendingEdgeModifier(null);
    }
  };

  // ── handlers ──

  const handleFillet = async (radius: number) => {
    if (!selectedFeatureId) return;
    const indices = modifierPicker?.selectedIndices ?? [];
    clearModifierPicker();
    setPendingEdgeModifier(null);
    try {
      await createFillet(selectedFeatureId, radius, indices.length > 0 ? indices : undefined);
    } catch (error) {
      console.error('[ToolbarModifiers] Fillet failed:', error);
      alert('Error al aplicar redondeo. Ver consola para detalles.');
    }
  };

  const handleChamfer = async (distance: number) => {
    if (!selectedFeatureId) return;
    const indices = modifierPicker?.selectedIndices ?? [];
    clearModifierPicker();
    setPendingEdgeModifier(null);
    try {
      await createChamfer(selectedFeatureId, distance, indices.length > 0 ? indices : undefined);
    } catch (error) {
      console.error('[ToolbarModifiers] Chamfer failed:', error);
      alert('Error al aplicar chaflán. Ver consola para detalles.');
    }
  };

  const handleBevel = async (d1: number, d2: number) => {
    if (!selectedFeatureId) return;
    const indices = modifierPicker?.selectedIndices ?? [];
    clearModifierPicker();
    setPendingEdgeModifier(null);
    try {
      await createBevel(selectedFeatureId, d1, d2, indices.length > 0 ? indices : undefined);
    } catch (error) {
      console.error('[ToolbarModifiers] Bevel failed:', error);
      alert('Error al aplicar bisel. Ver consola para detalles.');
    }
  };

  const handleCove = async (radius: number) => {
    if (!selectedFeatureId) return;
    const indices = modifierPicker?.selectedIndices ?? [];
    clearModifierPicker();
    setPendingEdgeModifier(null);
    try {
      await createCove(selectedFeatureId, radius, indices.length > 0 ? indices : undefined);
    } catch (error) {
      console.error('[ToolbarModifiers] Cove failed:', error);
      alert('Error al aplicar media caña. Ver consola para detalles.');
    }
  };

  const handleShell = async (thickness: number) => {
    if (!selectedFeatureId) return;
    try {
      await createShell(selectedFeatureId, thickness);
    } catch (error) {
      console.error('[ToolbarModifiers] Shell failed:', error);
      alert('Error al aplicar shell. Ver consola para detalles.');
    }
  };

  const handleDraft = async (angle: number, neutralPlane: 'XY' | 'XZ' | 'YZ') => {
    if (!selectedFeatureId) return;
    try {
      await createDraft(selectedFeatureId, angle, neutralPlane);
    } catch (error) {
      console.error('[ToolbarModifiers] Draft failed:', error);
      alert('Error al aplicar desmoldeo. Ver consola para detalles.');
    }
  };

  const handleOffset = async (distance: number) => {
    if (!selectedFeatureId) return;
    try {
      await createOffset(selectedFeatureId, distance);
    } catch (error) {
      console.error('[ToolbarModifiers] Offset failed:', error);
      alert('Error al aplicar offset. Ver consola para detalles.');
    }
  };

  // Edge modifiers open the picker; solid modifiers open dialog directly
  const EDGE_MODIFIER_TYPES: ModifierType[] = ['fillet', 'chamfer', 'bevel', 'cove'];
  const handleClick = (type: ModifierType) => {
    if (type === 'sharp') return;
    if (EDGE_MODIFIER_TYPES.includes(type)) {
      startEdgePicker(type);
    } else {
      setActiveDialog(type);
    }
  };

  // Confirm edge selection → open parameter dialog
  const handleConfirmEdgePicker = () => {
    if (pendingEdgeModifier) {
      setActiveDialog(pendingEdgeModifier);
    }
  };

  const handleCancelEdgePicker = () => {
    clearModifierPicker();
    setPendingEdgeModifier(null);
  };

  // ── render helpers ──

  const renderModifierButton = (mod: { type: ModifierType; label: string; title: string; icon: React.ReactNode }) => {
    const isSharp = mod.type === 'sharp';
    const disabled = isSharp ? false : !canApply;
    const tooltip = isSharp
      ? mod.title
      : canApply
        ? mod.title
        : 'Selecciona un sólido primero';

    return (
      <button
        key={mod.type}
        data-testid={`modifier-${mod.type}-btn`}
        title={tooltip}
        disabled={!isSharp && isProcessing}
        onClick={() => !disabled && handleClick(mod.type)}
        className={cn(
          'flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-md transition-colors',
          isVertical && 'w-full flex-row justify-start px-3 gap-2 h-9',
          isSharp
            ? 'text-muted-foreground cursor-default opacity-60'
            : disabled
              ? 'opacity-40 cursor-not-allowed text-muted-foreground'
              : 'hover:bg-muted text-foreground cursor-pointer',
          isProcessing && !isSharp && 'cursor-wait opacity-50'
        )}
      >
        {mod.icon}
        <span
          className={cn(
            'text-muted-foreground leading-none',
            isVertical ? 'text-sm' : 'text-[9px]'
          )}
        >
          {mod.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <div
        data-testid="toolbar-modifiers"
        className={cn(
          'gap-1 px-2 sm:px-3',
          isVertical ? 'flex flex-col items-stretch py-2' : 'flex items-center overflow-x-auto'
        )}
      >
        {/* Section: Edge treatments */}
        <div
          className={cn(
            isVertical ? 'flex flex-col items-stretch' : 'flex items-end'
          )}
        >
          <span
            className={cn(
              'text-xs font-medium text-muted-foreground',
              isVertical ? 'mb-1' : 'mr-1 self-center'
            )}
          >
            Aristas:
          </span>
          <div
            className={cn(
              isVertical ? 'flex flex-col items-stretch space-y-0.5' : 'flex items-center space-x-0.5'
            )}
          >
            {EDGE_MODIFIERS.map(renderModifierButton)}
          </div>
        </div>

        {/* Divider */}
        <div
          className={cn(
            'bg-border',
            isVertical ? 'h-px w-full my-1' : 'w-px h-8 mx-1'
          )}
        />

        {/* Section: Solid modifiers */}
        <div
          className={cn(
            isVertical ? 'flex flex-col items-stretch' : 'flex items-end'
          )}
        >
          <span
            className={cn(
              'text-xs font-medium text-muted-foreground',
              isVertical ? 'mb-1' : 'mr-1 self-center'
            )}
          >
            Sólido:
          </span>
          <div
            className={cn(
              isVertical ? 'flex flex-col items-stretch space-y-0.5' : 'flex items-center space-x-0.5'
            )}
          >
            {SOLID_MODIFIERS.map(renderModifierButton)}
          </div>
        </div>
      </div>

      {/* Edge picker HUD — shown while user selects edges in the viewport */}
      {modifierPicker && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          {modifierPicker.loading ? (
            <span className="text-sm text-muted-foreground">Cargando aristas…</span>
          ) : (
            <span className="text-sm text-foreground">
              {modifierPicker.selectedIndices.length === 0
                ? 'Haz click en aristas para seleccionarlas (todas si no hay selección)'
                : `${modifierPicker.selectedIndices.length} arista${modifierPicker.selectedIndices.length !== 1 ? 's' : ''} seleccionada${modifierPicker.selectedIndices.length !== 1 ? 's' : ''}`}
            </span>
          )}
          {!modifierPicker.loading && (
            <>
              <button
                className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                onClick={() => selectAllModifierEdges()}
                title="Deseleccionar todo (aplicar a todas las aristas)"
              >
                Todas
              </button>
              <button
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={handleConfirmEdgePicker}
              >
                Confirmar
              </button>
            </>
          )}
          <button
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            onClick={handleCancelEdgePicker}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Dialogs */}
      <FilletDialog
        open={activeDialog === 'fillet'}
        onClose={() => setActiveDialog(null)}
        onApply={(radius) => { handleFillet(radius); setActiveDialog(null); }}
      />
      <ChamferDialog
        open={activeDialog === 'chamfer'}
        onClose={() => setActiveDialog(null)}
        onApply={(distance) => { handleChamfer(distance); setActiveDialog(null); }}
      />
      <BevelDialog
        open={activeDialog === 'bevel'}
        onClose={() => setActiveDialog(null)}
        onApply={(d1, d2) => { handleBevel(d1, d2); setActiveDialog(null); }}
      />
      <CoveDialog
        open={activeDialog === 'cove'}
        onClose={() => setActiveDialog(null)}
        onApply={(radius) => { handleCove(radius); setActiveDialog(null); }}
      />
      <ShellDialog
        open={activeDialog === 'shell'}
        onClose={() => setActiveDialog(null)}
        onApply={(thickness) => { handleShell(thickness); setActiveDialog(null); }}
      />
      <DraftDialog
        open={activeDialog === 'draft'}
        onClose={() => setActiveDialog(null)}
        onApply={(angle, neutralPlane) => { handleDraft(angle, neutralPlane); setActiveDialog(null); }}
      />
      <OffsetDialog
        open={activeDialog === 'offset'}
        onClose={() => setActiveDialog(null)}
        onApply={(distance) => { handleOffset(distance); setActiveDialog(null); }}
      />
    </>
  );
}
