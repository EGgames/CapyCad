'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Monitor, Box, Sliders, PenTool, Layout, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useRenderStore, HDRI_PRESET_LABELS, TONE_MAPPING_LABELS, RENDER_PRESET_LABELS } from '@/stores/renderStore';
import type { ViewMode, HDRIPreset, ToneMapping, RenderPresetName } from '@/stores/renderStore';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import type { DisplayUnit } from '@/lib/cad/unitConversion';
import type { PanelId } from '@/stores/uiStore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TabId = 'apariencia' | 'render3d' | 'postproceso' | 'sketch' | 'paneles';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'apariencia', label: 'Apariencia', icon: Monitor },
  { id: 'render3d', label: 'Render 3D', icon: Box },
  { id: 'postproceso', label: 'Post-proceso', icon: Sliders },
  { id: 'sketch', label: 'Sketch 2D', icon: PenTool },
  { id: 'paneles', label: 'Paneles', icon: Layout },
];

const PANEL_LABELS: Record<PanelId, string> = {
  toolbarFile: 'Archivo',
  toolbarSelect: 'Selección',
  toolbar2d: 'Herramientas 2D',
  toolbar3d: 'Herramientas 3D',
  toolbarExtrude: 'Extrusión',
  toolbarBoolean: 'Booleanas',
  toolbarModifiers: 'Modificadores',
  sidebar: 'Feature Tree',
  properties: 'Propiedades',
};

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  shaded: 'Sombreado',
  wireframe: 'Malla',
  edges: 'Aristas',
  rendered: 'Renderizado',
};

const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
  mm: 'Milímetros (mm)',
  cm: 'Centímetros (cm)',
  m: 'Metros (m)',
  in: 'Pulgadas (in)',
  ft: 'Pies (ft)',
};

// ─── Sub-componentes de control ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        value ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0',
          'transition-transform duration-200 ease-in-out',
          value ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-28 accent-primary"
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {value.toFixed(step < 1 ? 2 : 0)}
      </span>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
    />
  );
}

// ─── Tabs de contenido ─────────────────────────────────────────────────────────

function TabApariencia() {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Tema</SectionTitle>
        <Row label="Modo oscuro">
          <Toggle value={isDark} onChange={toggle} />
        </Row>
      </div>
    </div>
  );
}

function TabRender3D() {
  const {
    viewMode, setViewMode,
    hdriPreset, setHdriPreset,
    hdriIntensity, setHdriIntensity,
    hdriBackground, setHdriBackground,
    toneMapping, setToneMapping,
    exposure, setExposure,
    shadowsEnabled, setShadowsEnabled,
    lightConfig, setLightConfig,
    applyPreset,
    resetToDefaults,
  } = useRenderStore();

  const viewModeOptions = Object.entries(VIEW_MODE_LABELS).map(([v, l]) => ({
    value: v as ViewMode,
    label: l,
  }));

  const hdriOptions = Object.entries(HDRI_PRESET_LABELS).map(([v, l]) => ({
    value: v as HDRIPreset,
    label: l,
  }));

  const toneMappingOptions = Object.entries(TONE_MAPPING_LABELS).map(([v, l]) => ({
    value: v as ToneMapping,
    label: l,
  }));

  const presetOptions = Object.entries(RENDER_PRESET_LABELS).map(([v, l]) => ({
    value: v as RenderPresetName,
    label: l,
  }));

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Presets de Render</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {presetOptions.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted active:scale-95 transition-transform"
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={resetToDefaults}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 active:scale-95 transition-transform"
          >
            Restaurar
          </button>
        </div>
      </div>

      <div>
        <SectionTitle>Visualización</SectionTitle>
        <Row label="Modo de vista">
          <Select value={viewMode} options={viewModeOptions} onChange={setViewMode} />
        </Row>
        <Row label="Tone mapping">
          <Select value={toneMapping} options={toneMappingOptions} onChange={setToneMapping} />
        </Row>
        <Row label="Exposición">
          <Slider value={exposure} min={0.1} max={3} step={0.05} onChange={setExposure} />
        </Row>
        <Row label="Sombras">
          <Toggle value={shadowsEnabled} onChange={setShadowsEnabled} />
        </Row>
      </div>

      <div>
        <SectionTitle>Entorno HDRI</SectionTitle>
        <Row label="Preset">
          <Select value={hdriPreset} options={hdriOptions} onChange={setHdriPreset} />
        </Row>
        <Row label="Intensidad">
          <Slider value={hdriIntensity} min={0} max={3} step={0.1} onChange={setHdriIntensity} />
        </Row>
        <Row label="Fondo visible">
          <Toggle value={hdriBackground} onChange={setHdriBackground} />
        </Row>
      </div>

      <div>
        <SectionTitle>Iluminación</SectionTitle>
        <Row label="Luz ambiental">
          <Slider value={lightConfig.ambientIntensity} min={0} max={2} step={0.05} onChange={(v) => setLightConfig({ ambientIntensity: v })} />
        </Row>
        <Row label="Luz direccional">
          <div className="flex items-center gap-2">
            <Slider value={lightConfig.directionalIntensity} min={0} max={3} step={0.05} onChange={(v) => setLightConfig({ directionalIntensity: v })} />
            <ColorInput value={lightConfig.directionalColor} onChange={(v) => setLightConfig({ directionalColor: v })} />
          </div>
        </Row>
        <Row label="Luz puntual">
          <div className="flex items-center gap-2">
            <Slider value={lightConfig.pointIntensity} min={0} max={3} step={0.05} onChange={(v) => setLightConfig({ pointIntensity: v })} />
            <ColorInput value={lightConfig.pointColor} onChange={(v) => setLightConfig({ pointColor: v })} />
          </div>
        </Row>
      </div>
    </div>
  );
}

function TabPostProceso() {
  const { postProcess, setPostProcess } = useRenderStore();

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Bloom</SectionTitle>
        <Row label="Activar bloom">
          <Toggle value={postProcess.bloomEnabled} onChange={(v) => setPostProcess({ bloomEnabled: v })} />
        </Row>
        <Row label="Intensidad">
          <Slider value={postProcess.bloomIntensity} min={0} max={3} step={0.1} onChange={(v) => setPostProcess({ bloomIntensity: v })} />
        </Row>
      </div>

      <div>
        <SectionTitle>SSAO (Oclusión ambiental)</SectionTitle>
        <Row label="Activar SSAO">
          <Toggle value={postProcess.ssaoEnabled} onChange={(v) => setPostProcess({ ssaoEnabled: v })} />
        </Row>
        <Row label="Intensidad">
          <Slider value={postProcess.ssaoIntensity} min={0} max={1} step={0.05} onChange={(v) => setPostProcess({ ssaoIntensity: v })} />
        </Row>
      </div>

      <div>
        <SectionTitle>Viñeta</SectionTitle>
        <Row label="Activar viñeta">
          <Toggle value={postProcess.vignetteEnabled} onChange={(v) => setPostProcess({ vignetteEnabled: v })} />
        </Row>
        <Row label="Intensidad">
          <Slider value={postProcess.vignetteIntensity} min={0} max={1} step={0.05} onChange={(v) => setPostProcess({ vignetteIntensity: v })} />
        </Row>
      </div>
    </div>
  );
}

function TabSketch() {
  const {
    snapOptions, updateSnapOptions,
    polygonSides, setPolygonSides,
    measureUnit, setMeasureUnit,
    pixelsPerMm, setPixelsPerMm,
  } = useSketchStore();

  const { displayUnit, setDisplayUnit } = useFeatureStore();

  const displayUnitOptions = Object.entries(DISPLAY_UNIT_LABELS).map(([v, l]) => ({
    value: v as DisplayUnit,
    label: l,
  }));

  const measureUnitOptions = [
    { value: 'mm' as const, label: 'Milímetros' },
    { value: 'ft' as const, label: 'Pies' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Unidades</SectionTitle>
        <Row label="Unidad de visualización">
          <Select value={displayUnit} options={displayUnitOptions} onChange={setDisplayUnit} />
        </Row>
        <Row label="Unidad de medición">
          <Select value={measureUnit} options={measureUnitOptions} onChange={setMeasureUnit} />
        </Row>
        <Row label="Píxeles por mm">
          <Slider value={pixelsPerMm} min={0.1} max={10} step={0.1} onChange={setPixelsPerMm} />
        </Row>
      </div>

      <div>
        <SectionTitle>Snapping</SectionTitle>
        <Row label="Activar snap">
          <Toggle value={snapOptions.enabled} onChange={(v) => updateSnapOptions({ enabled: v })} />
        </Row>
        <Row label="Snap a grilla">
          <Toggle value={snapOptions.snapToGrid} onChange={(v) => updateSnapOptions({ snapToGrid: v })} />
        </Row>
        <Row label="Snap a puntos">
          <Toggle value={snapOptions.snapToPoints} onChange={(v) => updateSnapOptions({ snapToPoints: v })} />
        </Row>
        <Row label="Snap a líneas">
          <Toggle value={snapOptions.snapToLines} onChange={(v) => updateSnapOptions({ snapToLines: v })} />
        </Row>
        <Row label="Tamaño de grilla (px)">
          <Slider value={snapOptions.gridSize} min={2} max={100} step={1} onChange={(v) => updateSnapOptions({ gridSize: v })} />
        </Row>
      </div>

      <div>
        <SectionTitle>Herramientas</SectionTitle>
        <Row label="Lados del polígono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPolygonSides(Math.max(3, polygonSides - 1))}
              className="flex h-6 w-6 items-center justify-center rounded border border-border text-sm hover:bg-muted"
            >
              −
            </button>
            <span className="w-6 text-center text-sm tabular-nums">{polygonSides}</span>
            <button
              onClick={() => setPolygonSides(Math.min(32, polygonSides + 1))}
              className="flex h-6 w-6 items-center justify-center rounded border border-border text-sm hover:bg-muted"
            >
              +
            </button>
          </div>
        </Row>
      </div>
    </div>
  );
}

function TabPaneles() {
  const { panels, togglePanel, showAllPanels, hideAllPanels, resetLayout } = useUIStore();

  const panelIds = Object.keys(PANEL_LABELS) as PanelId[];

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Visibilidad de paneles</SectionTitle>
        <div className="space-y-1">
          {panelIds.map((id) => (
            <Row key={id} label={PANEL_LABELS[id]}>
              <Toggle value={panels[id].visible} onChange={() => togglePanel(id)} />
            </Row>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={showAllPanels}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted active:scale-95 transition-transform"
          >
            Mostrar todos
          </button>
          <button
            onClick={hideAllPanels}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted active:scale-95 transition-transform"
          >
            Ocultar todos
          </button>
          <button
            onClick={resetLayout}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 active:scale-95 transition-transform"
          >
            Restablecer diseño
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel principal ───────────────────────────────────────────────────────────

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('apariencia');
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay para evitar que el click del botón que abre el panel lo cierre de inmediato
    const timer = setTimeout(() => window.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  const CONTENT: Record<TabId, React.ReactNode> = {
    apariencia: <TabApariencia />,
    render3d: <TabRender3D />,
    postproceso: <TabPostProceso />,
    sketch: <TabSketch />,
    paneles: <TabPaneles />,
  };

  return (
    <>
      {/* Backdrop translúcido */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Panel lateral */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border bg-background shadow-2xl transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Panel de configuración"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Configuración</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="Cerrar configuración"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Barra lateral de tabs */}
          <nav className="flex w-12 flex-col items-center gap-1 border-r border-border py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </nav>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3">
              <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Configuración</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">
                  {TABS.find((t) => t.id === activeTab)?.label}
                </span>
              </div>
              {CONTENT[activeTab]}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
