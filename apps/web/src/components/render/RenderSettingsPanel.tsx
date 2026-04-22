'use client';

import { Sun, Layers, Sliders, RotateCcw, Camera, Lightbulb, Zap } from 'lucide-react';
import {
  useRenderStore,
  HDRI_PRESET_LABELS,
  TONE_MAPPING_LABELS,
  RENDER_PRESET_LABELS,
  type HDRIPreset,
  type ToneMapping,
  type RenderPresetName,
} from '@/stores/renderStore';

export default function RenderSettingsPanel() {
  const viewMode = useRenderStore((s) => s.viewMode);
  const hdriPreset = useRenderStore((s) => s.hdriPreset);
  const hdriIntensity = useRenderStore((s) => s.hdriIntensity);
  const hdriBackground = useRenderStore((s) => s.hdriBackground);
  const toneMapping = useRenderStore((s) => s.toneMapping);
  const exposure = useRenderStore((s) => s.exposure);
  const shadowsEnabled = useRenderStore((s) => s.shadowsEnabled);
  const postProcess = useRenderStore((s) => s.postProcess);
  const lightConfig = useRenderStore((s) => s.lightConfig);
  const screenshotHandler = useRenderStore((s) => s.screenshotHandler);

  const setHdriPreset = useRenderStore((s) => s.setHdriPreset);
  const setHdriIntensity = useRenderStore((s) => s.setHdriIntensity);
  const setHdriBackground = useRenderStore((s) => s.setHdriBackground);
  const setToneMapping = useRenderStore((s) => s.setToneMapping);
  const setExposure = useRenderStore((s) => s.setExposure);
  const setShadowsEnabled = useRenderStore((s) => s.setShadowsEnabled);
  const setPostProcess = useRenderStore((s) => s.setPostProcess);
  const setLightConfig = useRenderStore((s) => s.setLightConfig);
  const applyPreset = useRenderStore((s) => s.applyPreset);
  const resetToDefaults = useRenderStore((s) => s.resetToDefaults);

  const isRendered = viewMode === 'rendered';

  return (
    <div className="space-y-4">
      {/* ── Encabezado ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sun className="h-3.5 w-3.5" />
          Ajustes de Render
        </div>
        <div className="flex items-center gap-1">
          {/* Screenshot */}
          <button
            onClick={() => screenshotHandler?.()}
            disabled={!screenshotHandler}
            title="Exportar render a PNG"
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          {/* Reset */}
          <button
            onClick={resetToDefaults}
            title="Restablecer valores por defecto"
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Presets rápidos ───────────────────────────────────── */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Zap className="h-3 w-3" />
          Presets
        </div>
        <div className="flex gap-1">
          {(Object.keys(RENDER_PRESET_LABELS) as RenderPresetName[]).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className="flex-1 rounded border border-border bg-card px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              title={`Aplicar preset ${RENDER_PRESET_LABELS[name]}`}
            >
              {RENDER_PRESET_LABELS[name]}
            </button>
          ))}
        </div>
      </section>

      {!isRendered && (
        <p className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
          Activa el modo{' '}
          <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-xs">
            R
          </kbd>{' '}
          para HDRI y efectos PBR.
        </p>
      )}

      {/* ── Luces ────────────────────────────────────────────── */}
      <section className="space-y-2.5 border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Lightbulb className="h-3 w-3" />
          Iluminación
        </div>

        {/* Ambient */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <label>Ambiental</label>
            <span className="tabular-nums">{lightConfig.ambientIntensity.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={lightConfig.ambientIntensity}
            onChange={(e) => setLightConfig({ ambientIntensity: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        {/* Directional */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <label>Direccional</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={lightConfig.directionalColor}
                onChange={(e) => setLightConfig({ directionalColor: e.target.value })}
                className="h-4 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
                title="Color luz direccional"
              />
              <span className="tabular-nums">{lightConfig.directionalIntensity.toFixed(1)}</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={lightConfig.directionalIntensity}
            onChange={(e) => setLightConfig({ directionalIntensity: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        {/* Point */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <label>Puntual</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={lightConfig.pointColor}
                onChange={(e) => setLightConfig({ pointColor: e.target.value })}
                className="h-4 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
                title="Color luz puntual"
              />
              <span className="tabular-nums">{lightConfig.pointIntensity.toFixed(1)}</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={lightConfig.pointIntensity}
            onChange={(e) => setLightConfig({ pointIntensity: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </section>

      {/* ── Entorno HDRI ─────────────────────────────────────── */}
      <section className="space-y-2.5 border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Layers className="h-3 w-3" />
          Entorno HDRI
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Preset</label>
          <select
            value={hdriPreset}
            onChange={(e) => setHdriPreset(e.target.value as HDRIPreset)}
            disabled={!isRendered}
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs disabled:opacity-40"
          >
            {(Object.keys(HDRI_PRESET_LABELS) as HDRIPreset[]).map((k) => (
              <option key={k} value={k}>
                {HDRI_PRESET_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <label>Intensidad</label>
            <span className="tabular-nums">{hdriIntensity.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={hdriIntensity}
            onChange={(e) => setHdriIntensity(parseFloat(e.target.value))}
            disabled={!isRendered || hdriPreset === 'none'}
            className="w-full accent-primary disabled:opacity-40"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={hdriBackground}
            onChange={(e) => setHdriBackground(e.target.checked)}
            disabled={!isRendered || hdriPreset === 'none'}
            className="accent-primary disabled:opacity-40"
          />
          <span className={!isRendered || hdriPreset === 'none' ? 'opacity-40' : ''}>
            Mostrar como fondo
          </span>
        </label>
      </section>

      {/* ── Tone Mapping ─────────────────────────────────────── */}
      <section className="space-y-2.5 border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sliders className="h-3 w-3" />
          Tone Mapping &amp; Exposición
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Modo</label>
          <select
            value={toneMapping}
            onChange={(e) => setToneMapping(e.target.value as ToneMapping)}
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          >
            {(Object.keys(TONE_MAPPING_LABELS) as ToneMapping[]).map((k) => (
              <option key={k} value={k}>
                {TONE_MAPPING_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <label>Exposición</label>
            <span className="tabular-nums">{exposure.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={exposure}
            onChange={(e) => setExposure(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </section>

      {/* ── Sombras ──────────────────────────────────────────── */}
      <section className="border-t border-border pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={shadowsEnabled}
            onChange={(e) => setShadowsEnabled(e.target.checked)}
            className="accent-primary"
          />
          <span>Sombras en tiempo real</span>
        </label>
      </section>

      {/* ── Post-proceso ─────────────────────────────────────── */}
      <section className="space-y-2.5 border-t border-border pt-3">
        <div className="text-xs font-medium text-muted-foreground">Post-procesado</div>

        {/* Viñeta */}
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={postProcess.vignetteEnabled}
              onChange={(e) => setPostProcess({ vignetteEnabled: e.target.checked })}
              disabled={!isRendered}
              className="accent-primary disabled:opacity-40"
            />
            <span className={!isRendered ? 'opacity-40' : ''}>Viñeta</span>
          </label>
          {postProcess.vignetteEnabled && isRendered && (
            <div className="space-y-1 pl-5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <label>Intensidad</label>
                <span className="tabular-nums">{postProcess.vignetteIntensity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={postProcess.vignetteIntensity}
                onChange={(e) => setPostProcess({ vignetteIntensity: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>

        {/* Bloom */}
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={postProcess.bloomEnabled}
              onChange={(e) => setPostProcess({ bloomEnabled: e.target.checked })}
              disabled={!isRendered}
              className="accent-primary disabled:opacity-40"
            />
            <span className={!isRendered ? 'opacity-40' : ''}>Bloom</span>
          </label>
          {postProcess.bloomEnabled && isRendered && (
            <div className="space-y-1 pl-5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <label>Intensidad</label>
                <span className="tabular-nums">{postProcess.bloomIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={postProcess.bloomIntensity}
                onChange={(e) => setPostProcess({ bloomIntensity: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
