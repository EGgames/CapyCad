/**
 * renderStore — Ajustes de escena 3D (FUNC-019, FUNC-021, FUNC-022)
 *
 * Controla:
 * - Modo de visualización (shaded / wireframe / edges / rendered)
 * - Entorno HDRI (preset de @react-three/drei Environment)
 * - Tone mapping y exposición del renderer
 * - Efectos de post-procesado CSS/shader simples
 */

import { create } from 'zustand';
import * as THREE from 'three';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Modos de visualización compatibles con Canvas3D */
export type ViewMode = 'shaded' | 'wireframe' | 'edges' | 'rendered';

/** Presets HDRI disponibles de @react-three/drei */
export type HDRIPreset =
  | 'none'
  | 'apartment'
  | 'city'
  | 'dawn'
  | 'forest'
  | 'lobby'
  | 'night'
  | 'park'
  | 'studio'
  | 'sunset'
  | 'warehouse';

export const HDRI_PRESET_LABELS: Record<HDRIPreset, string> = {
  none: 'Sin entorno',
  apartment: 'Apartamento',
  city: 'Ciudad',
  dawn: 'Amanecer',
  forest: 'Bosque',
  lobby: 'Lobby',
  night: 'Noche',
  park: 'Parque',
  studio: 'Estudio',
  sunset: 'Atardecer',
  warehouse: 'Almacén',
};

/** Modos de tone mapping */
export type ToneMapping = 'linear' | 'aces' | 'reinhard' | 'cineon';

export const TONE_MAPPING_LABELS: Record<ToneMapping, string> = {
  linear: 'Lineal',
  aces: 'ACES Filmic',
  reinhard: 'Reinhard',
  cineon: 'Cineon',
};

export const TONE_MAPPING_THREE: Record<ToneMapping, THREE.ToneMapping> = {
  linear: THREE.LinearToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping,
};

/** Configuración de post-procesado */
export interface PostProcessSettings {
  bloomEnabled: boolean;
  bloomIntensity: number; // 0–3
  ssaoEnabled: boolean;
  ssaoIntensity: number; // 0–1
  vignetteEnabled: boolean;
  vignetteIntensity: number; // 0–1
}

/** Configuración de luces de escena */
export interface LightConfig {
  ambientIntensity: number; // 0–2
  directionalIntensity: number; // 0–3
  directionalColor: string; // hex
  pointIntensity: number; // 0–3
  pointColor: string; // hex
}

export interface RenderSettings {
  viewMode: ViewMode;
  hdriPreset: HDRIPreset;
  hdriIntensity: number;
  hdriBackground: boolean;
  toneMapping: ToneMapping;
  exposure: number;
  shadowsEnabled: boolean;
  postProcess: PostProcessSettings;
  lightConfig: LightConfig;
  /** Función registrada por ScreenshotCapture para capturar el canvas */
  screenshotHandler: (() => void) | null;
}

/** Nombres de presets de render */
export type RenderPresetName = 'draft' | 'presentation' | 'photoRealistic';

export const RENDER_PRESET_LABELS: Record<RenderPresetName, string> = {
  draft: 'Borrador',
  presentation: 'Presentación',
  photoRealistic: 'Foto-realista',
};

/** Presets predefinidos de configuración de render */
export const RENDER_PRESETS: Record<RenderPresetName, Partial<RenderSettings>> = {
  draft: {
    viewMode: 'shaded',
    toneMapping: 'linear',
    exposure: 1.0,
    shadowsEnabled: false,
    hdriPreset: 'none',
    postProcess: {
      bloomEnabled: false,
      bloomIntensity: 0.5,
      ssaoEnabled: false,
      ssaoIntensity: 0.4,
      vignetteEnabled: false,
      vignetteIntensity: 0.4,
    },
    lightConfig: {
      ambientIntensity: 0.8,
      directionalIntensity: 1.0,
      directionalColor: '#ffffff',
      pointIntensity: 0.3,
      pointColor: '#ffffff',
    },
  },
  presentation: {
    viewMode: 'rendered',
    toneMapping: 'aces',
    exposure: 1.1,
    shadowsEnabled: true,
    hdriPreset: 'studio',
    hdriIntensity: 1.0,
    hdriBackground: false,
    postProcess: {
      bloomEnabled: false,
      bloomIntensity: 0.3,
      ssaoEnabled: false,
      ssaoIntensity: 0.4,
      vignetteEnabled: true,
      vignetteIntensity: 0.25,
    },
    lightConfig: {
      ambientIntensity: 0.2,
      directionalIntensity: 1.2,
      directionalColor: '#fff8f0',
      pointIntensity: 0.4,
      pointColor: '#c0d8ff',
    },
  },
  photoRealistic: {
    viewMode: 'rendered',
    toneMapping: 'aces',
    exposure: 1.3,
    shadowsEnabled: true,
    hdriPreset: 'sunset',
    hdriIntensity: 1.5,
    hdriBackground: true,
    postProcess: {
      bloomEnabled: true,
      bloomIntensity: 0.6,
      ssaoEnabled: false,
      ssaoIntensity: 0.4,
      vignetteEnabled: true,
      vignetteIntensity: 0.45,
    },
    lightConfig: {
      ambientIntensity: 0.05,
      directionalIntensity: 0.5,
      directionalColor: '#ffd4a0',
      pointIntensity: 0.1,
      pointColor: '#ffffff',
    },
  },
};

export interface RenderStore extends RenderSettings {
  setViewMode: (mode: ViewMode) => void;
  setHdriPreset: (preset: HDRIPreset) => void;
  setHdriIntensity: (v: number) => void;
  setHdriBackground: (v: boolean) => void;
  setToneMapping: (v: ToneMapping) => void;
  setExposure: (v: number) => void;
  setShadowsEnabled: (v: boolean) => void;
  setPostProcess: (patch: Partial<PostProcessSettings>) => void;
  setLightConfig: (patch: Partial<LightConfig>) => void;
  setScreenshotHandler: (fn: (() => void) | null) => void;
  applyPreset: (name: RenderPresetName) => void;
  resetToDefaults: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATE: RenderSettings = {
  viewMode: 'shaded',
  hdriPreset: 'studio',
  hdriIntensity: 1.0,
  hdriBackground: false,
  toneMapping: 'aces',
  exposure: 1.0,
  shadowsEnabled: true,
  postProcess: {
    bloomEnabled: false,
    bloomIntensity: 0.5,
    ssaoEnabled: false,
    ssaoIntensity: 0.4,
    vignetteEnabled: false,
    vignetteIntensity: 0.4,
  },
  lightConfig: {
    ambientIntensity: 0.5,
    directionalIntensity: 1.0,
    directionalColor: '#ffffff',
    pointIntensity: 0.5,
    pointColor: '#ffffff',
  },
  screenshotHandler: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRenderStore = create<RenderStore>((set) => ({
  ...DEFAULT_STATE,

  setViewMode: (viewMode) => set({ viewMode }),
  setHdriPreset: (hdriPreset) => set({ hdriPreset }),
  setHdriIntensity: (hdriIntensity) => set({ hdriIntensity }),
  setHdriBackground: (hdriBackground) => set({ hdriBackground }),
  setToneMapping: (toneMapping) => set({ toneMapping }),
  setExposure: (exposure) => set({ exposure }),
  setShadowsEnabled: (shadowsEnabled) => set({ shadowsEnabled }),
  setPostProcess: (patch) => set((s) => ({ postProcess: { ...s.postProcess, ...patch } })),
  setLightConfig: (patch) => set((s) => ({ lightConfig: { ...s.lightConfig, ...patch } })),
  setScreenshotHandler: (screenshotHandler) => set({ screenshotHandler }),
  applyPreset: (name) => {
    const preset = RENDER_PRESETS[name];
    set((s) => ({
      ...s,
      ...preset,
      // Los campos anidados requieren merge explícito
      postProcess: preset.postProcess ? { ...s.postProcess, ...preset.postProcess } : s.postProcess,
      lightConfig: preset.lightConfig ? { ...s.lightConfig, ...preset.lightConfig } : s.lightConfig,
    }));
  },
  resetToDefaults: () => set(DEFAULT_STATE),
}));
