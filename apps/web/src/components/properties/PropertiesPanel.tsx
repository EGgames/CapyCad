import { Settings, Box, Eye, EyeOff, Palette, Link, X, Copy, Download, Ruler } from 'lucide-react';
import { analyzeDOF } from '@/lib/sketch/constraints/dofAnalyzer';
import { exportConstraintsToCSV, downloadCSV } from '@/lib/sketch/constraints/constraintExporter';
import RenderSettingsPanel from '../render/RenderSettingsPanel';
import MaterialSpherePreview from '../render/MaterialSpherePreview';
import { useFeatureStore } from '@/stores/featureStore';
import { useSketchStore } from '@/stores/sketchStore';
import {
  ExtrudeFeature,
  RevolveFeature,
  FeatureType,
  SketchEntityType,
  ConstraintType,
} from '@capycad/shared-types';
import type { SketchEntity, Constraint } from '@capycad/shared-types';
import { MATERIAL_PRESET_LIST, getMaterialPreset } from '@/lib/materials/materialPresets';
import type { FeatureMaterial } from '@/lib/materials/materialPresets';
import { BooleanOperationSelector } from '../toolbar/Tool3DDialogs';
import { useState, useEffect } from 'react';

export default function PropertiesPanel() {
  const selectedFeatureId = useFeatureStore((state) => state.selectedFeatureId);
  const features = useFeatureStore((state) => state.features);
  const updateFeature = useFeatureStore((state) => state.updateFeature);
  const setFeatureMaterial = useFeatureStore((state) => state.setFeatureMaterial);
  const featureMaterials = useFeatureStore((state) => state.featureMaterials);

  const editMode = useSketchStore((state) => state.editMode);
  const selectedEntities = useSketchStore((state) => state.selectedEntities);
  const activeSketch = useSketchStore((state) => state.activeSketch);
  const addConstraint = useSketchStore((state) => state.addConstraint);
  const removeConstraint = useSketchStore((state) => state.removeConstraint);
  const removeMeasurement = useSketchStore((state) => state.removeMeasurement);

  const selectedFeature = features.find((f) => f.id === selectedFeatureId);
  const currentMaterial = selectedFeatureId
    ? (featureMaterials.get(selectedFeatureId) ?? getMaterialPreset('default'))
    : null;

  const show2DPanel = editMode === '2d' && selectedEntities.length > 0 && activeSketch;

  return (
    <div data-testid="properties-panel" className="flex w-full min-w-0 flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {show2DPanel ? (
          <div className="space-y-6">
            <ConstraintPanel
              selectedEntityIds={selectedEntities}
              entities={activeSketch.entities}
              constraints={activeSketch.constraints}
              onAddConstraint={addConstraint}
              onRemoveConstraint={removeConstraint}
            />
            {activeSketch.measurements.length > 0 && (
              <MeasurementList
                measurements={activeSketch.measurements}
                onRemove={removeMeasurement}
              />
            )}
          </div>
        ) : selectedFeature ? (
          <FeatureProperties
            feature={selectedFeature}
            updateFeature={updateFeature}
            currentMaterial={currentMaterial}
            onMaterialChange={(mat) => setFeatureMaterial(selectedFeatureId!, mat)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
              <Settings className="mb-2 h-10 w-10 opacity-50" />
              <p className="text-sm">Sin selección</p>
              <p className="text-xs">Selecciona un objeto para ver sus propiedades</p>
            </div>
            <div className="border-t pt-4">
              <SweepLoftCreator />
            </div>
            <div className="border-t pt-4">
              <RevolvePanel />
            </div>
            <div className="border-t pt-4">
              <RenderSettingsPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FeaturePropertiesProps {
  feature: any;
  updateFeature: (id: string, updates: any) => void;
  currentMaterial: FeatureMaterial | null;
  onMaterialChange: (material: FeatureMaterial) => void;
}

function FeatureProperties({
  feature,
  updateFeature,
  currentMaterial,
  onMaterialChange,
}: FeaturePropertiesProps) {
  const [localDistance, setLocalDistance] = useState(
    feature.type === FeatureType.EXTRUDE ? (feature as ExtrudeFeature).distance : 0
  );
  const [localAngle, setLocalAngle] = useState(
    feature.type === FeatureType.REVOLVE ? (feature as RevolveFeature).angle : 360
  );

  useEffect(() => {
    if (feature.type === FeatureType.EXTRUDE) {
      setLocalDistance((feature as ExtrudeFeature).distance);
    }
    if (feature.type === FeatureType.REVOLVE) {
      setLocalAngle((feature as RevolveFeature).angle);
    }
  }, [feature]);

  const handleDistanceChange = (newDistance: number) => {
    setLocalDistance(newDistance);
  };

  const handleDistanceBlur = () => {
    if (
      feature.type === FeatureType.EXTRUDE &&
      localDistance !== (feature as ExtrudeFeature).distance
    ) {
      updateFeature(feature.id, { distance: localDistance });
      // TODO: Re-ejecutar extrusión con nueva distancia
    }
  };

  return (
    <div className="space-y-4">
      {/* Tipo de feature */}
      <div>
        <div className="mb-2 flex items-center text-xs font-medium text-muted-foreground">
          <Box className="mr-1 h-3 w-3" />
          <span>TIPO</span>
        </div>
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          {feature.type === FeatureType.EXTRUDE && 'Extrusión'}
          {feature.type === FeatureType.REVOLVE && 'Revolución'}
          {feature.type === FeatureType.FILLET && 'Fillet'}
          {feature.type === FeatureType.CHAMFER && 'Chamfer'}
          {feature.type === FeatureType.SHELL && 'Shell'}
          {feature.type === FeatureType.SWEEP && 'Sweep'}
          {feature.type === FeatureType.LOFT && 'Loft'}
          {feature.type === FeatureType.IMPORT && 'Modelo Importado'}
          {feature.type === FeatureType.PATTERN_LINEAR && 'Patrón Lineal'}
          {feature.type === FeatureType.PATTERN_CIRCULAR && 'Patrón Circular'}
          {feature.type === FeatureType.BOOLEAN && 'Booleana'}
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">NOMBRE</label>
        <input
          type="text"
          value={feature.name}
          onChange={(e) => updateFeature(feature.id, { name: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Propiedades específicas de Extrusión */}
      {feature.type === FeatureType.EXTRUDE && (
        <>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              DISTANCIA (mm)
            </label>
            <input
              type="number"
              value={localDistance}
              onChange={(e) => handleDistanceChange(parseFloat(e.target.value))}
              onBlur={handleDistanceBlur}
              step="0.1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              DIRECCIÓN
            </label>
            <select
              value={(feature as ExtrudeFeature).direction}
              onChange={(e) =>
                updateFeature(feature.id, {
                  direction: e.target.value as 'positive' | 'negative' | 'both',
                })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="positive">Positiva (+Z)</option>
              <option value="negative">Negativa (-Z)</option>
              <option value="both">Ambas</option>
            </select>
          </div>
        </>
      )}

      {/* Propiedades específicas de Revolución */}
      {feature.type === FeatureType.REVOLVE && (
        <>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">EJE</label>
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              {(() => {
                const ax = (feature as RevolveFeature).axis;
                const d = {
                  x: ax.end.x - ax.start.x,
                  y: ax.end.y - ax.start.y,
                  z: ax.end.z - ax.start.z,
                };
                if (d.x === 1 && d.y === 0 && d.z === 0) return 'Eje X';
                if (d.x === 0 && d.y === 1 && d.z === 0) return 'Eje Y';
                if (d.x === 0 && d.y === 0 && d.z === 1) return 'Eje Z';
                return `(${ax.start.x},${ax.start.y},${ax.start.z}) → (${ax.end.x},${ax.end.y},${ax.end.z})`;
              })()}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              ÁNGULO (°)
            </label>
            <input
              type="number"
              min="1"
              max="360"
              step="1"
              value={localAngle}
              onChange={(e) => setLocalAngle(parseFloat(e.target.value))}
              onBlur={() => {
                const clamped = Math.max(1, Math.min(360, localAngle || 360));
                setLocalAngle(clamped);
                updateFeature(feature.id, { angle: clamped });
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </>
      )}

      {/* Visibilidad */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">VISIBILIDAD</label>
        <button
          onClick={() => updateFeature(feature.id, { visible: !feature.visible })}
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <span>{feature.visible ? 'Visible' : 'Oculto'}</span>
          {feature.visible ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Supresión */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">ESTADO</label>
        <button
          onClick={() => updateFeature(feature.id, { suppressed: !feature.suppressed })}
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <span>{feature.suppressed ? 'Suprimido' : 'Activo'}</span>
          <div
            className={`h-2 w-2 rounded-full ${
              feature.suppressed ? 'bg-destructive' : 'bg-green-500'
            }`}
          />
        </button>
      </div>

      {/* ID (solo lectura) */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">ID</label>
        <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {feature.id}
        </div>
      </div>

      {/* Material selector (US-015) */}
      <MaterialSelector currentMaterial={currentMaterial} onChange={onMaterialChange} />

      {/* Patrón de repetición (US-011) — solo para features extrudión e importadas */}
      {(feature.type === FeatureType.EXTRUDE || feature.type === FeatureType.IMPORT) && (
        <PatternPanel featureId={feature.id} />
      )}

      {/* Fillet / Chamfer (US-003/004) — solo para extrusiones */}
      {feature.type === FeatureType.EXTRUDE && <FilletChamferPanel featureId={feature.id} />}

      {/* Shell (US-010) — solo para extrusiones */}
      {feature.type === FeatureType.EXTRUDE && <ShellPanel featureId={feature.id} />}

      {/* Draft (FUNC-010) — solo para extrusiones */}
      {feature.type === FeatureType.EXTRUDE && <DraftPanel featureId={feature.id} />}

      {/* Operación booleana — solo para extrusiones como target */}
      {feature.type === FeatureType.EXTRUDE && <BooleanPanel featureId={feature.id} />}
    </div>
  );
}

// ─── MaterialSelector ─────────────────────────────────────────────────────────

interface MaterialSelectorProps {
  currentMaterial: FeatureMaterial | null;
  onChange: (material: FeatureMaterial) => void;
}

function MaterialSelector({ currentMaterial, onChange }: MaterialSelectorProps) {
  const activeMaterialId = currentMaterial?.id ?? 'default';
  const activeMaterial = currentMaterial ?? {
    color: '#aaaaaa',
    metalness: 0,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
    id: 'default',
    label: 'Predeterminado',
  };

  return (
    <div>
      <div className="mb-2 flex items-center text-xs font-medium text-muted-foreground">
        <Palette className="mr-1 h-3 w-3" />
        <span>MATERIAL</span>
      </div>

      {/* Preview en esfera + nombre */}
      <div className="mb-3 flex items-center gap-3">
        <MaterialSpherePreview material={activeMaterial} size={56} />
        <div className="flex-1">
          <div className="text-sm font-medium">{activeMaterial.label}</div>
          <div className="text-xs text-muted-foreground">
            M: {activeMaterial.metalness.toFixed(2)} · R: {activeMaterial.roughness.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {MATERIAL_PRESET_LIST.map((preset) => (
          <button
            key={preset.id}
            title={preset.label}
            onClick={() => onChange(preset)}
            className={`h-8 w-full rounded-md border-2 transition-transform hover:scale-105 ${
              activeMaterialId === preset.id
                ? 'border-primary ring-1 ring-primary'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: preset.color }}
            aria-label={preset.label}
          />
        ))}
      </div>
    </div>
  );
}

// ─── ConstraintPanel (US-009) ─────────────────────────────────────────────────

interface ConstraintPanelProps {
  selectedEntityIds: string[];
  entities: SketchEntity[];
  constraints: Constraint[];
  onAddConstraint: (type: ConstraintType, entityIds: string[], value?: number) => void;
  onRemoveConstraint: (id: string) => void;
}

const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  [ConstraintType.HORIZONTAL]: 'Horizontal',
  [ConstraintType.VERTICAL]: 'Vertical',
  [ConstraintType.DISTANCE]: 'Distancia',
  [ConstraintType.EQUAL]: 'Igual',
  [ConstraintType.CONCENTRIC]: 'Concéntrico',
  [ConstraintType.PARALLEL]: 'Paralelo',
  [ConstraintType.PERPENDICULAR]: 'Perpendicular',
  [ConstraintType.TANGENT]: 'Tangente',
};

function getApplicableConstraints(
  selectedIds: string[],
  entities: SketchEntity[]
): ConstraintType[] {
  const selected = selectedIds
    .map((id) => entities.find((e) => e.id === id))
    .filter(Boolean) as SketchEntity[];

  if (selected.length === 1) {
    const e = selected[0];
    if (e.type === SketchEntityType.LINE) {
      return [ConstraintType.HORIZONTAL, ConstraintType.VERTICAL, ConstraintType.DISTANCE];
    }
    if (e.type === SketchEntityType.CIRCLE || e.type === SketchEntityType.ARC) {
      return [ConstraintType.DISTANCE];
    }
  }

  if (selected.length === 2) {
    const [a, b] = selected;
    const bothLines = a.type === SketchEntityType.LINE && b.type === SketchEntityType.LINE;
    const bothRound =
      (a.type === SketchEntityType.CIRCLE || a.type === SketchEntityType.ARC) &&
      (b.type === SketchEntityType.CIRCLE || b.type === SketchEntityType.ARC);
    const lineAndCircle =
      (a.type === SketchEntityType.LINE && b.type === SketchEntityType.CIRCLE) ||
      (a.type === SketchEntityType.CIRCLE && b.type === SketchEntityType.LINE);

    if (bothLines) {
      return [ConstraintType.PARALLEL, ConstraintType.PERPENDICULAR, ConstraintType.EQUAL];
    }
    if (bothRound) {
      return [ConstraintType.CONCENTRIC, ConstraintType.EQUAL];
    }
    if (lineAndCircle) {
      return [ConstraintType.TANGENT];
    }
  }

  return [];
}

function ConstraintPanel({
  selectedEntityIds,
  entities,
  constraints,
  onAddConstraint,
  onRemoveConstraint,
}: ConstraintPanelProps) {
  const [distanceValue, setDistanceValue] = useState('');
  const applicable = getApplicableConstraints(selectedEntityIds, entities);

  // Constraints that involve at least one selected entity
  const relevant = constraints.filter((c) =>
    c.entities.some((id) => selectedEntityIds.includes(id))
  );

  const dof = analyzeDOF(entities, constraints);

  const handleAdd = (type: ConstraintType) => {
    if (type === ConstraintType.DISTANCE) {
      const val = parseFloat(distanceValue);
      if (!isNaN(val) && val > 0) {
        onAddConstraint(type, selectedEntityIds, val);
        setDistanceValue('');
      }
    } else {
      onAddConstraint(type, selectedEntityIds);
    }
  };

  const handleExportCSV = () => {
    const csv = exportConstraintsToCSV(constraints, entities);
    downloadCSV(csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs font-medium text-muted-foreground">
          <Link className="mr-1 h-3 w-3" />
          <span>RESTRICCIONES</span>
        </div>
        {constraints.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Exportar parámetros a CSV"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        )}
      </div>

      {/* DOF indicator */}
      {entities.length > 0 && (
        <div
          data-testid="dof-indicator"
          className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
            dof.status === 'well-constrained'
              ? 'bg-green-500/10 text-green-600'
              : dof.status === 'over-constrained'
                ? 'bg-red-500/10 text-red-600'
                : 'bg-yellow-500/10 text-yellow-600'
          }`}
        >
          <span>
            {dof.status === 'well-constrained'
              ? 'Completamente restringido'
              : dof.status === 'over-constrained'
                ? 'Sobre-restringido'
                : 'Sub-restringido'}
          </span>
          <span className="font-mono font-semibold">DOF {dof.remainingDOF}</span>
        </div>
      )}

      {/* Applicable constraints */}
      {applicable.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Agregar:</p>
          {applicable.includes(ConstraintType.DISTANCE) && (
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="valor (mm)"
                value={distanceValue}
                onChange={(e) => setDistanceValue(e.target.value)}
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {applicable.map((type) => (
              <button
                key={type}
                onClick={() => handleAdd(type)}
                className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                {CONSTRAINT_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing constraints */}
      {relevant.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Activas:</p>
          {relevant.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"
            >
              <span>
                {CONSTRAINT_LABELS[c.type]}
                {c.value !== undefined ? ` (${c.value})` : ''}
              </span>
              <button
                onClick={() => onRemoveConstraint(c.id)}
                className="ml-2 text-muted-foreground hover:text-destructive"
                aria-label="Eliminar restricción"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {applicable.length === 0 && relevant.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No hay restricciones disponibles para esta selección.
        </p>
      )}
    </div>
  );
}

// ─── MeasurementList ──────────────────────────────────────────────────────────

interface MeasurementListProps {
  measurements: import('@capycad/shared-types').Measurement[];
  onRemove: (id: string) => void;
}

function MeasurementList({ measurements, onRemove }: MeasurementListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Ruler className="mr-1 h-3 w-3" />
        <span>MEDICIONES</span>
      </div>
      {measurements.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"
        >
          <span className="font-mono">
            {m.distance.toFixed(m.unit === 'ft' ? 3 : 1)} {m.unit}
          </span>
          <button
            onClick={() => onRemove(m.id)}
            className="ml-2 text-muted-foreground hover:text-destructive"
            aria-label="Eliminar medición"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── PatternPanel (US-011) ────────────────────────────────────────────────────

interface PatternPanelProps {
  featureId: string;
}

function PatternPanel({ featureId }: PatternPanelProps) {
  const createLinearPattern = useFeatureStore((s) => s.createLinearPattern);
  const createCircularPattern = useFeatureStore((s) => s.createCircularPattern);
  const [patternType, setPatternType] = useState<'linear' | 'circular'>('linear');
  const [instances, setInstances] = useState('3');
  const [spacing, setSpacing] = useState('10');
  const [totalAngle, setTotalAngle] = useState('360');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const n = parseInt(instances);
    if (isNaN(n) || n < 2) return;

    setIsCreating(true);
    try {
      if (patternType === 'linear') {
        const s = parseFloat(spacing);
        if (isNaN(s) || s <= 0) return;
        await createLinearPattern(featureId, { x: 1, y: 0, z: 0 }, s, n);
      } else {
        const a = parseFloat(totalAngle);
        await createCircularPattern(
          featureId,
          { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 1, z: 0 } },
          n,
          isNaN(a) ? 360 : a
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Copy className="mr-1 h-3 w-3" />
        <span>PATRÓN</span>
      </div>

      {/* Tipo */}
      <div className="flex gap-1">
        {(['linear', 'circular'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPatternType(t)}
            className={`flex-1 rounded py-1 text-xs font-medium ${
              patternType === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'linear' ? 'Lineal' : 'Circular'}
          </button>
        ))}
      </div>

      {/* Parámetros */}
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Instancias</label>
          <input
            type="number"
            min="2"
            value={instances}
            onChange={(e) => setInstances(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
          />
        </div>
        {patternType === 'linear' && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Espaciado (mm)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={spacing}
              onChange={(e) => setSpacing(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
        )}
        {patternType === 'circular' && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Ángulo total (°)</label>
            <input
              type="number"
              min="1"
              max="360"
              value={totalAngle}
              onChange={(e) => setTotalAngle(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Creando...' : 'Crear Patrón'}
      </button>
    </div>
  );
}

// ─── FilletChamferPanel (US-003/004) ──────────────────────────────────────────

interface FilletChamferPanelProps {
  featureId: string;
}

function FilletChamferPanel({ featureId }: FilletChamferPanelProps) {
  const createFillet = useFeatureStore((s) => s.createFillet);
  const createChamfer = useFeatureStore((s) => s.createChamfer);
  const [opType, setOpType] = useState<'fillet' | 'chamfer'>('fillet');
  const [value, setValue] = useState('1');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setError('El valor debe ser mayor que 0');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      if (opType === 'fillet') {
        await createFillet(featureId, num);
      } else {
        await createChamfer(featureId, num);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aplicar operación');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Box className="mr-1 h-3 w-3" />
        <span>ARISTAS</span>
      </div>

      {/* Tipo de operación */}
      <div className="flex gap-1">
        {(['fillet', 'chamfer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOpType(t)}
            className={`flex-1 rounded py-1 text-xs font-medium ${
              opType === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'fillet' ? 'Fillet' : 'Chamfer'}
          </button>
        ))}
      </div>

      {/* Valor */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          {opType === 'fillet' ? 'Radio (mm)' : 'Distancia (mm)'}
        </label>
        <input
          type="number"
          min="0.01"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleApply}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Aplicando...' : `Aplicar ${opType === 'fillet' ? 'Fillet' : 'Chamfer'}`}
      </button>
    </div>
  );
}

// ─── ShellPanel (US-010) ──────────────────────────────────────────────────────

interface ShellPanelProps {
  featureId: string;
}

function ShellPanel({ featureId }: ShellPanelProps) {
  const createShell = useFeatureStore((s) => s.createShell);
  const [thickness, setThickness] = useState('2');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const num = parseFloat(thickness);
    if (isNaN(num) || num <= 0) {
      setError('El espesor debe ser mayor que 0');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await createShell(featureId, num);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aplicar shell');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Box className="mr-1 h-3 w-3" />
        <span>SHELL</span>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Espesor de pared (mm)</label>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={thickness}
          onChange={(e) => setThickness(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleApply}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Aplicando...' : 'Crear Shell'}
      </button>
    </div>
  );
}

// ─── RevolvePanel ───────────────────────────────────────────────────────────
// Componente standalone para crear una Revolución desde el sketch activo.
// Se muestra en el empty state (sin feature seleccionada).

export function RevolvePanel() {
  const createRevolve = useFeatureStore((s) => s.createRevolve);
  const activeSketch = useSketchStore((s) => s.activeSketch);
  const [axis, setAxis] = useState<'X' | 'Y' | 'Z'>('Y');
  const [angle, setAngle] = useState('360');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!activeSketch || activeSketch.entities.length === 0) {
      setError('Se requiere un sketch activo con entidades');
      return;
    }
    const deg = parseFloat(angle);
    if (isNaN(deg) || deg <= 0 || deg > 360) {
      setError('El ángulo debe estar entre 1° y 360°');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await createRevolve(activeSketch.id, activeSketch.entities, axis, deg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear revolución');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Box className="mr-1 h-3 w-3" />
        <span>REVOLUCIÓN</span>
      </div>

      {/* Eje */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Eje de revolución</label>
        <div className="flex gap-1">
          {(['X', 'Y', 'Z'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAxis(a)}
              className={`flex-1 rounded py-1 text-xs font-medium ${
                axis === a
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Ángulo */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Ángulo (°)</label>
        <input
          type="number"
          min="1"
          max="360"
          step="1"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Creando...' : 'Crear Revolución'}
      </button>
    </div>
  );
}

// ─── BooleanPanel ─────────────────────────────────────────────────────────────
// Permite aplicar una operación booleana usando la feature seleccionada
// como target y cualquier otra extrusión del árbol como herramienta.

interface BooleanPanelProps {
  featureId: string;
}

function BooleanPanel({ featureId }: BooleanPanelProps) {
  const createBoolean = useFeatureStore((s) => s.createBoolean);
  const features = useFeatureStore((s) => s.features);
  const [operation, setOperation] = useState<'union' | 'subtract' | 'intersect'>('subtract');
  const [toolFeatureId, setToolFeatureId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SOLID_TYPES = [
    FeatureType.EXTRUDE,
    FeatureType.PRIMITIVE_BOX,
    FeatureType.PRIMITIVE_SPHERE,
    FeatureType.PRIMITIVE_CYLINDER,
    FeatureType.PRIMITIVE_CONE,
    FeatureType.PRIMITIVE_TORUS,
    FeatureType.BOOLEAN,
  ] as const;
  const otherExtrudes = features.filter(
    (f) => (SOLID_TYPES as readonly string[]).includes(f.type) && f.id !== featureId
  );

  const handleApply = async () => {
    if (!toolFeatureId) {
      setError('Selecciona una feature herramienta');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await createBoolean(featureId, toolFeatureId, operation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en operación booleana');
    } finally {
      setIsCreating(false);
    }
  };

  if (otherExtrudes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Box className="mr-1 h-3 w-3" />
        <span>BOOLEANA</span>
      </div>

      {/* Operación con iconos */}
      <BooleanOperationSelector value={operation} onChange={setOperation} />

      {/* Feature herramienta */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Feature herramienta</label>
        <select
          value={toolFeatureId}
          onChange={(e) => setToolFeatureId(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        >
          <option value="">Seleccionar...</option>
          {otherExtrudes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleApply}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Aplicando...' : 'Aplicar Booleana'}
      </button>
    </div>
  );
}

// ─── SweepLoftCreator (US-012) ────────────────────────────────────────────────
// Componente standalone para crear Sweep y Loft desde el panel de propiedades
// cuando no hay feature seleccionada (panel de creación).
// Se expone también como exportación para uso en toolbar.

export function SweepLoftCreator() {
  const createSweep = useFeatureStore((s) => s.createSweep);
  const createLoft = useFeatureStore((s) => s.createLoft);
  const [opType, setOpType] = useState<'sweep' | 'loft'>('sweep');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sweep: perfil circular por defecto + trayectoria recta
  const [sweepRadius, setSweepRadius] = useState('5');
  const [sweepHeight, setSweepHeight] = useState('30');

  // Loft: dos secciones por defecto
  const [section1Radius, setSection1Radius] = useState('10');
  const [section2Radius, setSection2Radius] = useState('5');
  const [loftHeight, setLoftHeight] = useState('20');
  const [loftClosed, setLoftClosed] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setIsCreating(true);
    try {
      if (opType === 'sweep') {
        const r = parseFloat(sweepRadius);
        const h = parseFloat(sweepHeight);
        if (isNaN(r) || r <= 0 || isNaN(h) || h <= 0) {
          throw new Error('Radio y altura deben ser mayores que 0');
        }
        const profileEntities = [
          { id: 'sp1', type: 'circle' as const, center: { x: 0, y: 0 }, radius: r },
        ];
        const pathPoints = [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: h },
        ];
        await createSweep(profileEntities, pathPoints);
      } else {
        const r1 = parseFloat(section1Radius);
        const r2 = parseFloat(section2Radius);
        const h = parseFloat(loftHeight);
        if (isNaN(r1) || r1 <= 0 || isNaN(r2) || r2 <= 0 || isNaN(h) || h <= 0) {
          throw new Error('Los valores deben ser mayores que 0');
        }
        const sections = [
          {
            entities: [{ id: 'ls1', type: 'circle' as const, center: { x: 0, y: 0 }, radius: r1 }],
            zOffset: 0,
          },
          {
            entities: [{ id: 'ls2', type: 'circle' as const, center: { x: 0, y: 0 }, radius: r2 }],
            zOffset: h,
          },
        ];
        await createLoft(sections, loftClosed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear operación');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Box className="mr-1 h-3 w-3" />
        <span>SWEEP / LOFT</span>
      </div>

      <div className="flex gap-1">
        {(['sweep', 'loft'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOpType(t)}
            className={`flex-1 rounded py-1 text-xs font-medium ${
              opType === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'sweep' ? 'Sweep' : 'Loft'}
          </button>
        ))}
      </div>

      {opType === 'sweep' && (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Radio perfil (mm)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={sweepRadius}
              onChange={(e) => setSweepRadius(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Altura trayectoria (mm)
            </label>
            <input
              type="number"
              min="0.1"
              step="1"
              value={sweepHeight}
              onChange={(e) => setSweepHeight(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {opType === 'loft' && (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Radio sección 1 (mm)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={section1Radius}
              onChange={(e) => setSection1Radius(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Radio sección 2 (mm)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={section2Radius}
              onChange={(e) => setSection2Radius(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Altura (mm)</label>
            <input
              type="number"
              min="0.1"
              step="1"
              value={loftHeight}
              onChange={(e) => setLoftHeight(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={loftClosed}
              onChange={(e) => setLoftClosed(e.target.checked)}
              className="rounded"
            />
            Loft cerrado
          </label>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Creando...' : `Crear ${opType === 'sweep' ? 'Sweep' : 'Loft'}`}
      </button>
    </div>
  );
}

// ─── DraftPanel (FUNC-010) ────────────────────────────────────────────────────

interface DraftPanelProps {
  featureId: string;
}

function DraftPanel({ featureId }: DraftPanelProps) {
  const createDraft = useFeatureStore((s) => s.createDraft);
  const [angle, setAngle] = useState('5');
  const [neutralPlane, setNeutralPlane] = useState<'XY' | 'XZ' | 'YZ'>('XY');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const deg = parseFloat(angle);
    if (isNaN(deg) || deg < -30 || deg > 30) {
      setError('El ángulo debe estar entre -30° y +30°');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await createDraft(featureId, deg, neutralPlane);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aplicar draft');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center text-xs font-medium text-muted-foreground">
        <Box className="mr-1 h-3 w-3" />
        <span>ÁNGULO DE DESMOLDEO</span>
      </div>

      {/* Ángulo */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Ángulo (-30° a +30°)</label>
        <input
          type="number"
          min="-30"
          max="30"
          step="0.5"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>

      {/* Plano neutro */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Plano neutro</label>
        <div className="flex gap-1">
          {(['XY', 'XZ', 'YZ'] as const).map((plane) => (
            <button
              key={plane}
              onClick={() => setNeutralPlane(plane)}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                neutralPlane === plane
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {plane}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleApply}
        disabled={isCreating}
        className="w-full rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isCreating ? 'Aplicando...' : 'Aplicar Draft'}
      </button>
    </div>
  );
}
