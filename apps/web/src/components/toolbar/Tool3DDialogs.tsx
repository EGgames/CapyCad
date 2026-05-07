'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureStore } from '@/stores/featureStore';
import { toDisplay, fromDisplay, unitStep, unitMin } from '@/lib/cad/unitConversion';

// ────────────────────────────
// Shared modal wrapper
// ────────────────────────────

interface DialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Dialog({ title, open, onClose, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-80 rounded-lg border border-border bg-card p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          : 'border border-border hover:bg-muted disabled:opacity-50'
      )}
    >
      {label}
    </button>
  );
}

function PositionBadge({ position }: { position: { x: number; y: number; z: number } | null }) {
  if (!position) return null;
  return (
    <div className="rounded border border-border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Posición:</span> X={position.x.toFixed(1)} Y=
      {position.y.toFixed(1)} Z={position.z.toFixed(1)}
    </div>
  );
}

type OrientationPreset = 'up_y' | 'up_x' | 'up_z' | 'down_y' | 'down_x' | 'down_z';

const ORIENTATION_PRESETS: {
  value: OrientationPreset;
  label: string;
  rotation: { x: number; y: number; z: number };
}[] = [
  { value: 'up_y', label: '↑ Y (arriba)', rotation: { x: 0, y: 0, z: 0 } },
  { value: 'up_x', label: '→ X (derecha)', rotation: { x: 0, y: 0, z: -Math.PI / 2 } },
  { value: 'up_z', label: '⊙ Z (frente)', rotation: { x: Math.PI / 2, y: 0, z: 0 } },
  { value: 'down_y', label: '↓ -Y (abajo)', rotation: { x: Math.PI, y: 0, z: 0 } },
  { value: 'down_x', label: '← -X (izquierda)', rotation: { x: 0, y: 0, z: Math.PI / 2 } },
  { value: 'down_z', label: '⊗ -Z (atrás)', rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
];

function OrientationSelector({
  value,
  onChange,
}: {
  value: OrientationPreset;
  onChange: (preset: OrientationPreset, rotation: { x: number; y: number; z: number }) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">Orientación</span>
      <select
        value={value}
        onChange={(e) => {
          const preset = ORIENTATION_PRESETS.find((p) => p.value === e.target.value)!;
          onChange(preset.value as OrientationPreset, preset.rotation);
        }}
        className="rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
      >
        {ORIENTATION_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ────────────────────────────
// Extrude Dialog
// ────────────────────────────

export function ExtrudeDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (distance: number, direction: 'positive' | 'negative' | 'both') => void;
}) {
  const [distanceMm, setDistanceMm] = useState(10);
  const [direction, setDirection] = useState<'positive' | 'negative' | 'both'>('positive');
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Extrusión" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Distancia"
          value={toDisplay(distanceMm, displayUnit)}
          onChange={(v) => setDistanceMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <SelectField
          label="Dirección"
          value={direction}
          onChange={(v) => setDirection(v as 'positive' | 'negative' | 'both')}
          options={[
            { value: 'positive', label: 'Positiva (+Z)' },
            { value: 'negative', label: 'Negativa (-Z)' },
            { value: 'both', label: 'Ambas' },
          ]}
        />
        <ActionButton
          label="Extruir"
          onClick={() => {
            onApply(distanceMm, direction);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Revolve Dialog
// ────────────────────────────

export function RevolveDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (axis: 'X' | 'Y' | 'Z', angle: number) => void;
}) {
  const [axis, setAxis] = useState<'X' | 'Y' | 'Z'>('Y');
  const [angle, setAngle] = useState(360);

  return (
    <Dialog title="Revolución" open={open} onClose={onClose}>
      <div className="space-y-3">
        <SelectField
          label="Eje"
          value={axis}
          onChange={(v) => setAxis(v as 'X' | 'Y' | 'Z')}
          options={[
            { value: 'X', label: 'Eje X' },
            { value: 'Y', label: 'Eje Y' },
            { value: 'Z', label: 'Eje Z' },
          ]}
        />
        <NumberField label="Ángulo" value={angle} onChange={setAngle} min={1} max={360} unit="°" />
        <ActionButton
          label="Revolucionar"
          onClick={() => {
            onApply(axis, angle);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Fillet Dialog
// ────────────────────────────

export function FilletDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (radius: number) => void;
}) {
  const [radiusMm, setRadiusMm] = useState(2);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Fillet (Redondeo)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Radio"
          value={toDisplay(radiusMm, displayUnit)}
          onChange={(v) => setRadiusMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <p className="text-xs text-muted-foreground">
          Se aplica a todas las aristas de la feature seleccionada.
        </p>
        <ActionButton
          label="Aplicar Fillet"
          onClick={() => {
            onApply(radiusMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Chamfer Dialog
// ────────────────────────────

export function ChamferDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (distance: number) => void;
}) {
  const [distanceMm, setDistanceMm] = useState(2);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Chamfer (Chaflán)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Distancia"
          value={toDisplay(distanceMm, displayUnit)}
          onChange={(v) => setDistanceMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <p className="text-xs text-muted-foreground">
          Se aplica a todas las aristas de la feature seleccionada.
        </p>
        <ActionButton
          label="Aplicar Chamfer"
          onClick={() => {
            onApply(distanceMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Shell Dialog
// ────────────────────────────

export function ShellDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (thickness: number) => void;
}) {
  const [thicknessMm, setThicknessMm] = useState(1);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Shell (Vaciado)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Espesor de pared"
          value={toDisplay(thicknessMm, displayUnit)}
          onChange={(v) => setThicknessMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <p className="text-xs text-muted-foreground">
          Vacía el sólido dejando paredes del espesor indicado.
        </p>
        <ActionButton
          label="Aplicar Shell"
          onClick={() => {
            onApply(thicknessMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Sweep Dialog
// ────────────────────────────

export function SweepDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (pathPoints: Array<{ x: number; y: number; z: number }>) => void;
}) {
  const [lengthMm, setLengthMm] = useState(20);
  const [curveHeightMm, setCurveHeightMm] = useState(10);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Sweep (Barrido)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Longitud"
          value={toDisplay(lengthMm, displayUnit)}
          onChange={(v) => setLengthMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <NumberField
          label="Altura de curva"
          value={toDisplay(curveHeightMm, displayUnit)}
          onChange={(v) => setCurveHeightMm(fromDisplay(v, displayUnit))}
          min={0}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <p className="text-xs text-muted-foreground">
          Barre el perfil del sketch activo a lo largo de una trayectoria.
        </p>
        <ActionButton
          label="Aplicar Sweep"
          onClick={() => {
            const path = [
              { x: 0, y: 0, z: 0 },
              { x: lengthMm / 2, y: curveHeightMm, z: 0 },
              { x: lengthMm, y: 0, z: 0 },
            ];
            onApply(path);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Loft Dialog
// ────────────────────────────

export function LoftDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (heightBetween: number, topRadius: number, closed: boolean) => void;
}) {
  const [heightBetweenMm, setHeightBetweenMm] = useState(20);
  const [topRadiusMm, setTopRadiusMm] = useState(5);
  const [closed, setClosed] = useState(false);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Loft (Transición)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Distancia entre secciones"
          value={toDisplay(heightBetweenMm, displayUnit)}
          onChange={(v) => setHeightBetweenMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <NumberField
          label="Radio sección superior"
          value={toDisplay(topRadiusMm, displayUnit)}
          onChange={(v) => setTopRadiusMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-muted-foreground">Cerrado (loop)</span>
        </label>
        <ActionButton
          label="Aplicar Loft"
          onClick={() => {
            onApply(heightBetweenMm, topRadiusMm, closed);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Boolean Operation Icon Selector
// ────────────────────────────

export function BooleanOperationSelector({
  value,
  onChange,
}: {
  value: 'union' | 'subtract' | 'intersect';
  onChange: (operation: 'union' | 'subtract' | 'intersect') => void;
}) {
  const operations = [
    {
      type: 'union' as const,
      label: 'Unión',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="12" r="5" strokeWidth="2" />
          <circle cx="15" cy="12" r="5" strokeWidth="2" />
        </svg>
      ),
      description: 'Combina dos sólidos',
    },
    {
      type: 'subtract' as const,
      label: 'Sustracción',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="12" r="5" strokeWidth="2" />
          <circle cx="15" cy="12" r="5" strokeWidth="2" fill="currentColor" opacity="0.3" />
        </svg>
      ),
      description: 'Resta un sólido de otro',
    },
    {
      type: 'intersect' as const,
      label: 'Intersección',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M 9 12 A 5 5 0 0 1 14 7" strokeWidth="2" />
          <path d="M 15 12 A 5 5 0 0 1 10 17" strokeWidth="2" />
          <path d="M 14 7 A 5 5 0 0 1 15 12" strokeWidth="2" fill="currentColor" opacity="0.3" />
          <path d="M 10 17 A 5 5 0 0 1 9 12" strokeWidth="2" fill="currentColor" opacity="0.3" />
        </svg>
      ),
      description: 'Mantiene solo la intersección',
    },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Operación</label>
      <div className="grid grid-cols-3 gap-2">
        {operations.map((op) => (
          <button
            key={op.type}
            onClick={() => onChange(op.type)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:border-primary/50',
              value === op.type
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground'
            )}
          >
            {op.icon}
            <span className="text-xs font-medium">{op.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {operations.find((op) => op.type === value)?.description}
      </p>
    </div>
  );
}

// ────────────────────────────
// Boolean Dialog
// ────────────────────────────

export function BooleanDialog({
  open,
  onClose,
  onApply,
  featureNames,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (
    targetId: string,
    toolId: string,
    operation: 'union' | 'subtract' | 'intersect'
  ) => void;
  featureNames: Array<{ id: string; name: string }>;
}) {
  const [operation, setOperation] = useState<'union' | 'subtract' | 'intersect'>('union');
  const [targetId, setTargetId] = useState('');
  const [toolId, setToolId] = useState('');

  // Sync defaults whenever the dialog opens or the features list changes,
  // so the selects never stay on a stale / empty id.
  useEffect(() => {
    if (!open) return;
    const ids = featureNames.map((f) => f.id);
    setTargetId((prev) => (prev && ids.includes(prev) ? prev : (ids[0] ?? '')));
    setToolId((prev) => {
      if (prev && ids.includes(prev) && prev !== (ids[0] ?? '')) return prev;
      return ids[1] ?? ids[0] ?? '';
    });
  }, [open, featureNames]);

  const noFeatures = featureNames.length === 0;
  const onlyOne = featureNames.length === 1;

  return (
    <Dialog title="Operación Booleana" open={open} onClose={onClose}>
      <div className="space-y-4">
        {noFeatures && (
          <p
            data-testid="boolean-empty-msg"
            className="rounded border border-yellow-500/40 bg-yellow-950/30 p-2 text-xs text-yellow-300"
          >
            No hay extrusiones disponibles. Crea al menos dos extrusiones (Extrude) para
            aplicar una operación booleana.
          </p>
        )}
        {onlyOne && (
          <p
            data-testid="boolean-onlyone-msg"
            className="rounded border border-yellow-500/40 bg-yellow-950/30 p-2 text-xs text-yellow-300"
          >
            Solo hay una extrusión. Necesitas al menos dos extrusiones para una operación
            booleana.
          </p>
        )}

        <BooleanOperationSelector value={operation} onChange={setOperation} />

        <SelectField
          label="Cuerpo objetivo"
          value={targetId}
          onChange={setTargetId}
          options={featureNames.map((f) => ({ value: f.id, label: f.name }))}
        />
        <SelectField
          label="Herramienta"
          value={toolId}
          onChange={setToolId}
          options={featureNames.map((f) => ({ value: f.id, label: f.name }))}
        />
        <ActionButton
          label="Aplicar Booleana"
          disabled={!targetId || !toolId || targetId === toolId}
          onClick={() => {
            onApply(targetId, toolId, operation);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Linear Pattern Dialog
// ────────────────────────────

export function LinearPatternDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (
    direction: { x: number; y: number; z: number },
    spacing: number,
    instances: number
  ) => void;
}) {
  const [dirAxis, setDirAxis] = useState<'X' | 'Y' | 'Z'>('X');
  const [spacingMm, setSpacingMm] = useState(15);
  const [instances, setInstances] = useState(3);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Patrón Lineal" open={open} onClose={onClose}>
      <div className="space-y-3">
        <SelectField
          label="Dirección"
          value={dirAxis}
          onChange={(v) => setDirAxis(v as 'X' | 'Y' | 'Z')}
          options={[
            { value: 'X', label: 'Eje X' },
            { value: 'Y', label: 'Eje Y' },
            { value: 'Z', label: 'Eje Z' },
          ]}
        />
        <NumberField
          label="Espaciado"
          value={toDisplay(spacingMm, displayUnit)}
          onChange={(v) => setSpacingMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <NumberField
          label="Instancias"
          value={instances}
          onChange={setInstances}
          min={2}
          max={50}
          step={1}
        />
        <ActionButton
          label="Crear Patrón"
          onClick={() => {
            const dir = {
              x: dirAxis === 'X' ? 1 : 0,
              y: dirAxis === 'Y' ? 1 : 0,
              z: dirAxis === 'Z' ? 1 : 0,
            };
            onApply(dir, spacingMm, instances);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Circular Pattern Dialog
// ────────────────────────────

export function CircularPatternDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (
    axis: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } },
    instances: number,
    totalAngle: number
  ) => void;
}) {
  const [axisDir, setAxisDir] = useState<'X' | 'Y' | 'Z'>('Z');
  const [instances, setInstances] = useState(6);
  const [totalAngle, setTotalAngle] = useState(360);

  return (
    <Dialog title="Patrón Circular" open={open} onClose={onClose}>
      <div className="space-y-3">
        <SelectField
          label="Eje de rotación"
          value={axisDir}
          onChange={(v) => setAxisDir(v as 'X' | 'Y' | 'Z')}
          options={[
            { value: 'X', label: 'Eje X' },
            { value: 'Y', label: 'Eje Y' },
            { value: 'Z', label: 'Eje Z' },
          ]}
        />
        <NumberField
          label="Instancias"
          value={instances}
          onChange={setInstances}
          min={2}
          max={50}
          step={1}
        />
        <NumberField
          label="Ángulo total"
          value={totalAngle}
          onChange={setTotalAngle}
          min={1}
          max={360}
          unit="°"
        />
        <ActionButton
          label="Crear Patrón"
          onClick={() => {
            const start = { x: 0, y: 0, z: 0 };
            const end = {
              x: axisDir === 'X' ? 1 : 0,
              y: axisDir === 'Y' ? 1 : 0,
              z: axisDir === 'Z' ? 1 : 0,
            };
            onApply({ start, end }, instances, totalAngle);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Draft Dialog
// ────────────────────────────

export function DraftDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (angle: number, neutralPlane: 'XY' | 'XZ' | 'YZ') => void;
}) {
  const [angle, setAngle] = useState(5);
  const [neutralPlane, setNeutralPlane] = useState<'XY' | 'XZ' | 'YZ'>('XY');

  return (
    <Dialog title="Draft (Desmoldeo)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Ángulo"
          value={angle}
          onChange={setAngle}
          min={-30}
          max={30}
          step={0.5}
          unit="°"
        />
        <SelectField
          label="Plano neutro"
          value={neutralPlane}
          onChange={(v) => setNeutralPlane(v as 'XY' | 'XZ' | 'YZ')}
          options={[
            { value: 'XY', label: 'Plano XY' },
            { value: 'XZ', label: 'Plano XZ' },
            { value: 'YZ', label: 'Plano YZ' },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Aplica ángulo de desmoldeo a la feature seleccionada.
        </p>
        <ActionButton
          label="Aplicar Draft"
          onClick={() => {
            onApply(angle, neutralPlane);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Offset Dialog
// ────────────────────────────

export function OffsetDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (distance: number) => void;
}) {
  const [distanceMm, setDistanceMm] = useState(2);
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Offset (Desplazamiento)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Distancia"
          value={toDisplay(distanceMm, displayUnit)}
          onChange={(v) => setDistanceMm(fromDisplay(v, displayUnit))}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <p className="text-xs text-muted-foreground">
          Positivo: hacia afuera. Negativo: hacia adentro. Se aplica a todas las caras de la feature
          seleccionada.
        </p>
        <ActionButton
          label="Aplicar Offset"
          onClick={() => {
            onApply(distanceMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Box (Cubo) Dialog
// ────────────────────────────

export function BoxDialog({
  open,
  onClose,
  onApply,
  position,
  onOrientationChange,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (width: number, height: number, depth: number) => void;
  position?: { x: number; y: number; z: number } | null;
  onOrientationChange?: (rotation: { x: number; y: number; z: number }) => void;
}) {
  const [widthMm, setWidthMm] = useState(10);
  const [heightMm, setHeightMm] = useState(10);
  const [depthMm, setDepthMm] = useState(10);
  const [orientation, setOrientation] = useState<OrientationPreset>('up_y');
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Cubo" open={open} onClose={onClose}>
      <div className="space-y-3">
        <PositionBadge position={position ?? null} />
        <OrientationSelector
          value={orientation}
          onChange={(preset, rot) => {
            setOrientation(preset);
            onOrientationChange?.(rot);
          }}
        />
        <NumberField label="Ancho" value={toDisplay(widthMm, displayUnit)} onChange={(v) => setWidthMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <NumberField label="Alto" value={toDisplay(heightMm, displayUnit)} onChange={(v) => setHeightMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <NumberField label="Profundidad" value={toDisplay(depthMm, displayUnit)} onChange={(v) => setDepthMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <ActionButton
          label="Crear Cubo"
          onClick={() => {
            onApply(widthMm, heightMm, depthMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Sphere (Esfera) Dialog
// ────────────────────────────

export function SphereDialog({
  open,
  onClose,
  onApply,
  position,
  onOrientationChange,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (radius: number) => void;
  position?: { x: number; y: number; z: number } | null;
  onOrientationChange?: (rotation: { x: number; y: number; z: number }) => void;
}) {
  const [radiusMm, setRadiusMm] = useState(5);
  const [orientation, setOrientation] = useState<OrientationPreset>('up_y');
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Esfera" open={open} onClose={onClose}>
      <div className="space-y-3">
        <PositionBadge position={position ?? null} />
        <OrientationSelector
          value={orientation}
          onChange={(preset, rot) => {
            setOrientation(preset);
            onOrientationChange?.(rot);
          }}
        />
        <NumberField
          label="Radio"
          value={toDisplay(radiusMm, displayUnit)}
          onChange={(v) => setRadiusMm(fromDisplay(v, displayUnit))}
          min={unitMin(displayUnit)}
          step={unitStep(displayUnit)}
          unit={displayUnit}
        />
        <ActionButton
          label="Crear Esfera"
          onClick={() => {
            onApply(radiusMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Cylinder (Cilindro) Dialog
// ────────────────────────────

export function CylinderDialog({
  open,
  onClose,
  onApply,
  position,
  onOrientationChange,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (radius: number, height: number) => void;
  position?: { x: number; y: number; z: number } | null;
  onOrientationChange?: (rotation: { x: number; y: number; z: number }) => void;
}) {
  const [radiusMm, setRadiusMm] = useState(5);
  const [heightMm, setHeightMm] = useState(10);
  const [orientation, setOrientation] = useState<OrientationPreset>('up_y');
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Cilindro" open={open} onClose={onClose}>
      <div className="space-y-3">
        <PositionBadge position={position ?? null} />
        <OrientationSelector
          value={orientation}
          onChange={(preset, rot) => {
            setOrientation(preset);
            onOrientationChange?.(rot);
          }}
        />
        <NumberField label="Radio" value={toDisplay(radiusMm, displayUnit)} onChange={(v) => setRadiusMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <NumberField label="Altura" value={toDisplay(heightMm, displayUnit)} onChange={(v) => setHeightMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <ActionButton
          label="Crear Cilindro"
          onClick={() => {
            onApply(radiusMm, heightMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Cone (Cono) Dialog
// ────────────────────────────

export function ConeDialog({
  open,
  onClose,
  onApply,
  position,
  onOrientationChange,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (baseRadius: number, topRadius: number, height: number) => void;
  position?: { x: number; y: number; z: number } | null;
  onOrientationChange?: (rotation: { x: number; y: number; z: number }) => void;
}) {
  const [baseRadiusMm, setBaseRadiusMm] = useState(5);
  const [topRadiusMm, setTopRadiusMm] = useState(0);
  const [heightMm, setHeightMm] = useState(10);
  const [orientation, setOrientation] = useState<OrientationPreset>('up_y');
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Cono" open={open} onClose={onClose}>
      <div className="space-y-3">
        <PositionBadge position={position ?? null} />
        <OrientationSelector
          value={orientation}
          onChange={(preset, rot) => {
            setOrientation(preset);
            onOrientationChange?.(rot);
          }}
        />
        <NumberField label="Radio base" value={toDisplay(baseRadiusMm, displayUnit)} onChange={(v) => setBaseRadiusMm(fromDisplay(v, displayUnit))} min={0} step={unitStep(displayUnit)} unit={displayUnit} />
        <NumberField label="Radio superior" value={toDisplay(topRadiusMm, displayUnit)} onChange={(v) => setTopRadiusMm(fromDisplay(v, displayUnit))} min={0} step={unitStep(displayUnit)} unit={displayUnit} />
        <NumberField label="Altura" value={toDisplay(heightMm, displayUnit)} onChange={(v) => setHeightMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <p className="text-xs text-muted-foreground">Radio superior = 0 para un cono puntiagudo.</p>
        <ActionButton
          label="Crear Cono"
          onClick={() => {
            onApply(baseRadiusMm, topRadiusMm, heightMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Torus (Toroide) Dialog
// ────────────────────────────

export function TorusDialog({
  open,
  onClose,
  onApply,
  position,
  onOrientationChange,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (majorRadius: number, minorRadius: number) => void;
  position?: { x: number; y: number; z: number } | null;
  onOrientationChange?: (rotation: { x: number; y: number; z: number }) => void;
}) {
  const [majorRadiusMm, setMajorRadiusMm] = useState(10);
  const [minorRadiusMm, setMinorRadiusMm] = useState(3);
  const [orientation, setOrientation] = useState<OrientationPreset>('up_y');
  const displayUnit = useFeatureStore((s) => s.displayUnit);

  return (
    <Dialog title="Toroide" open={open} onClose={onClose}>
      <div className="space-y-3">
        <PositionBadge position={position ?? null} />
        <OrientationSelector
          value={orientation}
          onChange={(preset, rot) => {
            setOrientation(preset);
            onOrientationChange?.(rot);
          }}
        />
        <NumberField label="Radio mayor" value={toDisplay(majorRadiusMm, displayUnit)} onChange={(v) => setMajorRadiusMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <NumberField label="Radio menor" value={toDisplay(minorRadiusMm, displayUnit)} onChange={(v) => setMinorRadiusMm(fromDisplay(v, displayUnit))} min={unitMin(displayUnit)} step={unitStep(displayUnit)} unit={displayUnit} />
        <p className="text-xs text-muted-foreground">
          El radio menor debe ser menor que el radio mayor.
        </p>
        <ActionButton
          label="Crear Toroide"
          onClick={() => {
            onApply(majorRadiusMm, minorRadiusMm);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Bevel Dialog
// ────────────────────────────

export function BevelDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (d1: number, d2: number) => void;
}) {
  const [d1, setD1] = useState(3);
  const [d2, setD2] = useState(1.5);

  return (
    <Dialog title="Bisel (Bevel asimétrico)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Distancia 1"
          value={d1}
          onChange={setD1}
          min={0.1}
          step={0.5}
          unit="mm"
        />
        <NumberField
          label="Distancia 2"
          value={d2}
          onChange={setD2}
          min={0.1}
          step={0.5}
          unit="mm"
        />
        <p className="text-xs text-muted-foreground">
          Dos distancias distintas generan un chaflán asimétrico (ángulo variable).
          Se aplica a todas las aristas de la feature seleccionada.
        </p>
        <ActionButton
          label="Aplicar Bisel"
          onClick={() => {
            onApply(d1, d2);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}

// ────────────────────────────
// Cove Dialog (Media Caña)
// ────────────────────────────

export function CoveDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (radius: number) => void;
}) {
  const [radius, setRadius] = useState(2);

  return (
    <Dialog title="Media Caña (Cove)" open={open} onClose={onClose}>
      <div className="space-y-3">
        <NumberField
          label="Radio"
          value={radius}
          onChange={setRadius}
          min={0.1}
          step={0.5}
          unit="mm"
        />
        <p className="text-xs text-muted-foreground">
          Genera una curva cóncava en las aristas — perfil de media caña (QuasiAngular).
          Se aplica a todas las aristas de la feature seleccionada.
        </p>
        <ActionButton
          label="Aplicar Media Caña"
          onClick={() => {
            onApply(radius);
            onClose();
          }}
        />
      </div>
    </Dialog>
  );
}
