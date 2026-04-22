/**
 * Tests unitarios — renderStore
 * US-019: Modos de Visualización | US-021: HDRI | US-022: Post-procesado
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useRenderStore,
  TONE_MAPPING_THREE,
  HDRI_PRESET_LABELS,
  TONE_MAPPING_LABELS,
  RENDER_PRESETS,
  RENDER_PRESET_LABELS,
} from '@/stores/renderStore';
import * as THREE from 'three';

// ─── Reset store antes de cada test ──────────────────────────────────────────
beforeEach(() => {
  useRenderStore.getState().resetToDefaults();
});

describe('renderStore', () => {
  // ─── Estado inicial ────────────────────────────────────────────────────────

  describe('estado inicial', () => {
    it('renderStore_whenInitialized_thenViewModeIsShaded', () => {
      expect(useRenderStore.getState().viewMode).toBe('shaded');
    });

    it('renderStore_whenInitialized_thenHdriPresetIsStudio', () => {
      expect(useRenderStore.getState().hdriPreset).toBe('studio');
    });

    it('renderStore_whenInitialized_thenToneMappingIsAces', () => {
      expect(useRenderStore.getState().toneMapping).toBe('aces');
    });

    it('renderStore_whenInitialized_thenExposureIsOne', () => {
      expect(useRenderStore.getState().exposure).toBe(1.0);
    });

    it('renderStore_whenInitialized_thenShadowsEnabled', () => {
      expect(useRenderStore.getState().shadowsEnabled).toBe(true);
    });

    it('renderStore_whenInitialized_thenPostProcessAllDisabled', () => {
      const { postProcess } = useRenderStore.getState();
      expect(postProcess.bloomEnabled).toBe(false);
      expect(postProcess.ssaoEnabled).toBe(false);
      expect(postProcess.vignetteEnabled).toBe(false);
    });

    it('renderStore_whenInitialized_thenHdriBackgroundIsFalse', () => {
      expect(useRenderStore.getState().hdriBackground).toBe(false);
    });
  });

  // ─── setViewMode ──────────────────────────────────────────────────────────

  describe('setViewMode', () => {
    it('setViewMode_whenCalledWithRendered_thenViewModeIsRendered', () => {
      useRenderStore.getState().setViewMode('rendered');
      expect(useRenderStore.getState().viewMode).toBe('rendered');
    });

    it('setViewMode_whenCalledWithWireframe_thenViewModeIsWireframe', () => {
      useRenderStore.getState().setViewMode('wireframe');
      expect(useRenderStore.getState().viewMode).toBe('wireframe');
    });

    it('setViewMode_whenCalledWithEdges_thenViewModeIsEdges', () => {
      useRenderStore.getState().setViewMode('edges');
      expect(useRenderStore.getState().viewMode).toBe('edges');
    });

    it('setViewMode_whenCalledWithShaded_thenViewModeIsShaded', () => {
      useRenderStore.getState().setViewMode('rendered');
      useRenderStore.getState().setViewMode('shaded');
      expect(useRenderStore.getState().viewMode).toBe('shaded');
    });
  });

  // ─── setHdriPreset ────────────────────────────────────────────────────────

  describe('setHdriPreset', () => {
    it('setHdriPreset_whenCalledWithCity_thenPresetIsCity', () => {
      useRenderStore.getState().setHdriPreset('city');
      expect(useRenderStore.getState().hdriPreset).toBe('city');
    });

    it('setHdriPreset_whenCalledWithNone_thenPresetIsNone', () => {
      useRenderStore.getState().setHdriPreset('none');
      expect(useRenderStore.getState().hdriPreset).toBe('none');
    });

    it('setHdriPreset_whenCalledWithForest_thenPresetIsForest', () => {
      useRenderStore.getState().setHdriPreset('forest');
      expect(useRenderStore.getState().hdriPreset).toBe('forest');
    });
  });

  // ─── setHdriIntensity ─────────────────────────────────────────────────────

  describe('setHdriIntensity', () => {
    it('setHdriIntensity_whenCalledWithValue_thenIntensityUpdated', () => {
      useRenderStore.getState().setHdriIntensity(1.5);
      expect(useRenderStore.getState().hdriIntensity).toBe(1.5);
    });

    it('setHdriIntensity_whenCalledWithZero_thenIntensityIsZero', () => {
      useRenderStore.getState().setHdriIntensity(0);
      expect(useRenderStore.getState().hdriIntensity).toBe(0);
    });
  });

  // ─── setHdriBackground ───────────────────────────────────────────────────

  describe('setHdriBackground', () => {
    it('setHdriBackground_whenCalledWithTrue_thenBackgroundIsTrue', () => {
      useRenderStore.getState().setHdriBackground(true);
      expect(useRenderStore.getState().hdriBackground).toBe(true);
    });

    it('setHdriBackground_whenCalledWithFalse_thenBackgroundIsFalse', () => {
      useRenderStore.getState().setHdriBackground(true);
      useRenderStore.getState().setHdriBackground(false);
      expect(useRenderStore.getState().hdriBackground).toBe(false);
    });
  });

  // ─── setToneMapping ───────────────────────────────────────────────────────

  describe('setToneMapping', () => {
    it('setToneMapping_whenCalledWithReinhard_thenToneMappingIsReinhard', () => {
      useRenderStore.getState().setToneMapping('reinhard');
      expect(useRenderStore.getState().toneMapping).toBe('reinhard');
    });

    it('setToneMapping_whenCalledWithCineon_thenToneMappingIsCineon', () => {
      useRenderStore.getState().setToneMapping('cineon');
      expect(useRenderStore.getState().toneMapping).toBe('cineon');
    });

    it('setToneMapping_whenCalledWithLinear_thenToneMappingIsLinear', () => {
      useRenderStore.getState().setToneMapping('linear');
      expect(useRenderStore.getState().toneMapping).toBe('linear');
    });
  });

  // ─── setExposure ──────────────────────────────────────────────────────────

  describe('setExposure', () => {
    it('setExposure_whenCalledWithValue_thenExposureUpdated', () => {
      useRenderStore.getState().setExposure(2.0);
      expect(useRenderStore.getState().exposure).toBe(2.0);
    });

    it('setExposure_whenCalledWithDecimal_thenExposurePrecise', () => {
      useRenderStore.getState().setExposure(1.25);
      expect(useRenderStore.getState().exposure).toBe(1.25);
    });
  });

  // ─── setShadowsEnabled ────────────────────────────────────────────────────

  describe('setShadowsEnabled', () => {
    it('setShadowsEnabled_whenCalledWithFalse_thenShadowsDisabled', () => {
      useRenderStore.getState().setShadowsEnabled(false);
      expect(useRenderStore.getState().shadowsEnabled).toBe(false);
    });

    it('setShadowsEnabled_whenCalledWithTrue_thenShadowsEnabled', () => {
      useRenderStore.getState().setShadowsEnabled(false);
      useRenderStore.getState().setShadowsEnabled(true);
      expect(useRenderStore.getState().shadowsEnabled).toBe(true);
    });
  });

  // ─── setPostProcess ───────────────────────────────────────────────────────

  describe('setPostProcess', () => {
    it('setPostProcess_whenEnablingVignette_thenVignetteEnabled', () => {
      useRenderStore.getState().setPostProcess({ vignetteEnabled: true });
      expect(useRenderStore.getState().postProcess.vignetteEnabled).toBe(true);
    });

    it('setPostProcess_whenUpdatingBloomIntensity_thenOtherFieldsUnchanged', () => {
      useRenderStore.getState().setPostProcess({ bloomIntensity: 2.0 });
      const { postProcess } = useRenderStore.getState();
      expect(postProcess.bloomIntensity).toBe(2.0);
      expect(postProcess.bloomEnabled).toBe(false); // sin cambiar
      expect(postProcess.vignetteEnabled).toBe(false); // sin cambiar
    });

    it('setPostProcess_whenEnablingBloom_thenBloomEnabled', () => {
      useRenderStore.getState().setPostProcess({ bloomEnabled: true, bloomIntensity: 1.5 });
      const { postProcess } = useRenderStore.getState();
      expect(postProcess.bloomEnabled).toBe(true);
      expect(postProcess.bloomIntensity).toBe(1.5);
    });

    it('setPostProcess_whenSettingVignetteIntensity_thenIntensityUpdated', () => {
      useRenderStore.getState().setPostProcess({ vignetteIntensity: 0.7 });
      expect(useRenderStore.getState().postProcess.vignetteIntensity).toBe(0.7);
    });
  });

  // ─── resetToDefaults ─────────────────────────────────────────────────────

  describe('resetToDefaults', () => {
    it('resetToDefaults_whenCalledAfterChanges_thenRestoresViewMode', () => {
      useRenderStore.getState().setViewMode('rendered');
      useRenderStore.getState().resetToDefaults();
      expect(useRenderStore.getState().viewMode).toBe('shaded');
    });

    it('resetToDefaults_whenCalledAfterChanges_thenRestoresHdriPreset', () => {
      useRenderStore.getState().setHdriPreset('city');
      useRenderStore.getState().resetToDefaults();
      expect(useRenderStore.getState().hdriPreset).toBe('studio');
    });

    it('resetToDefaults_whenCalledAfterChanges_thenRestoresExposure', () => {
      useRenderStore.getState().setExposure(2.5);
      useRenderStore.getState().resetToDefaults();
      expect(useRenderStore.getState().exposure).toBe(1.0);
    });

    it('resetToDefaults_whenCalledAfterChanges_thenRestoresPostProcess', () => {
      useRenderStore.getState().setPostProcess({ bloomEnabled: true, vignetteEnabled: true });
      useRenderStore.getState().resetToDefaults();
      const { postProcess } = useRenderStore.getState();
      expect(postProcess.bloomEnabled).toBe(false);
      expect(postProcess.vignetteEnabled).toBe(false);
    });

    it('resetToDefaults_whenCalledAfterChanges_thenRestoresToneMapping', () => {
      useRenderStore.getState().setToneMapping('linear');
      useRenderStore.getState().resetToDefaults();
      expect(useRenderStore.getState().toneMapping).toBe('aces');
    });
  });

  // ─── TONE_MAPPING_THREE mappings ─────────────────────────────────────────

  describe('TONE_MAPPING_THREE', () => {
    it('TONE_MAPPING_THREE_whenLinear_thenMapsToThreeLinear', () => {
      expect(TONE_MAPPING_THREE.linear).toBe(THREE.LinearToneMapping);
    });

    it('TONE_MAPPING_THREE_whenAces_thenMapsToThreeACESFilmic', () => {
      expect(TONE_MAPPING_THREE.aces).toBe(THREE.ACESFilmicToneMapping);
    });

    it('TONE_MAPPING_THREE_whenReinhard_thenMapsToThreeReinhard', () => {
      expect(TONE_MAPPING_THREE.reinhard).toBe(THREE.ReinhardToneMapping);
    });

    it('TONE_MAPPING_THREE_whenCineon_thenMapsToThreeCineon', () => {
      expect(TONE_MAPPING_THREE.cineon).toBe(THREE.CineonToneMapping);
    });

    it('TONE_MAPPING_THREE_whenAllModes_thenAllAreDefined', () => {
      for (const value of Object.values(TONE_MAPPING_THREE)) {
        expect(value).toBeDefined();
        expect(typeof value).toBe('number');
      }
    });
  });

  // ─── Etiquetas de UI ──────────────────────────────────────────────────────

  describe('HDRI_PRESET_LABELS', () => {
    it('HDRI_PRESET_LABELS_whenNone_thenHasSpanishLabel', () => {
      expect(HDRI_PRESET_LABELS.none).toBe('Sin entorno');
    });

    it('HDRI_PRESET_LABELS_whenAllPresets_thenAllHaveLabels', () => {
      for (const [key, label] of Object.entries(HDRI_PRESET_LABELS)) {
        expect(label, key).toBeTruthy();
      }
    });

    it('HDRI_PRESET_LABELS_whenCountingPresets_thenHas11Including_none', () => {
      // none + 10 presets drei
      expect(Object.keys(HDRI_PRESET_LABELS).length).toBe(11);
    });
  });

  describe('TONE_MAPPING_LABELS', () => {
    it('TONE_MAPPING_LABELS_whenAllModes_thenAllHaveLabels', () => {
      for (const [key, label] of Object.entries(TONE_MAPPING_LABELS)) {
        expect(label, key).toBeTruthy();
      }
    });

    it('TONE_MAPPING_LABELS_whenAces_thenLabelContainsACES', () => {
      expect(TONE_MAPPING_LABELS.aces).toContain('ACES');
    });

    it('TONE_MAPPING_LABELS_whenCounting_thenHas4Modes', () => {
      expect(Object.keys(TONE_MAPPING_LABELS).length).toBe(4);
    });
  });

  // ─── LightConfig ───────────────────────────────────────────────────────────

  describe('lightConfig defaults', () => {
    it('lightConfig_whenInitialized_thenHasAllFields', () => {
      const { lightConfig } = useRenderStore.getState();
      expect(lightConfig.ambientIntensity).toBe(0.5);
      expect(lightConfig.directionalIntensity).toBe(1.0);
      expect(lightConfig.directionalColor).toBe('#ffffff');
      expect(lightConfig.pointIntensity).toBe(0.5);
      expect(lightConfig.pointColor).toBe('#ffffff');
    });

    it('lightConfig_whenResetToDefaults_thenRestored', () => {
      useRenderStore.getState().setLightConfig({ ambientIntensity: 2.0 });
      useRenderStore.getState().resetToDefaults();
      expect(useRenderStore.getState().lightConfig.ambientIntensity).toBe(0.5);
    });
  });

  describe('setLightConfig', () => {
    it('setLightConfig_whenCalledWithAmbient_thenIntensityUpdated', () => {
      useRenderStore.getState().setLightConfig({ ambientIntensity: 1.5 });
      expect(useRenderStore.getState().lightConfig.ambientIntensity).toBe(1.5);
    });

    it('setLightConfig_whenCalledWithDirectionalColor_thenColorUpdated', () => {
      useRenderStore.getState().setLightConfig({ directionalColor: '#ff0000' });
      expect(useRenderStore.getState().lightConfig.directionalColor).toBe('#ff0000');
    });

    it('setLightConfig_whenPartialPatch_thenOtherFieldsUnchanged', () => {
      useRenderStore.getState().setLightConfig({ pointIntensity: 2.0 });
      const { lightConfig } = useRenderStore.getState();
      expect(lightConfig.pointIntensity).toBe(2.0);
      expect(lightConfig.ambientIntensity).toBe(0.5);
    });
  });

  // ─── applyPreset ───────────────────────────────────────────────────────────

  describe('applyPreset', () => {
    it('applyPreset_whenDraft_thenViewModeIsShaded', () => {
      useRenderStore.getState().applyPreset('draft');
      expect(useRenderStore.getState().viewMode).toBe('shaded');
    });

    it('applyPreset_whenPresentation_thenViewModeIsRendered', () => {
      useRenderStore.getState().applyPreset('presentation');
      expect(useRenderStore.getState().viewMode).toBe('rendered');
    });

    it('applyPreset_whenPhotoRealistic_thenHdriBackgroundIsTrue', () => {
      useRenderStore.getState().applyPreset('photoRealistic');
      expect(useRenderStore.getState().hdriBackground).toBe(true);
    });

    it('applyPreset_whenPhotoRealistic_thenBloomEnabled', () => {
      useRenderStore.getState().applyPreset('photoRealistic');
      expect(useRenderStore.getState().postProcess.bloomEnabled).toBe(true);
    });

    it('applyPreset_whenPresentation_thenVignetteEnabled', () => {
      useRenderStore.getState().applyPreset('presentation');
      expect(useRenderStore.getState().postProcess.vignetteEnabled).toBe(true);
    });

    it('applyPreset_whenDraft_thenShadowsDisabled', () => {
      useRenderStore.getState().applyPreset('draft');
      expect(useRenderStore.getState().shadowsEnabled).toBe(false);
    });

    it('applyPreset_whenDraft_thenLightConfigUpdated', () => {
      useRenderStore.getState().applyPreset('draft');
      expect(useRenderStore.getState().lightConfig.ambientIntensity).toBe(0.8);
    });
  });

  // ─── setScreenshotHandler ─────────────────────────────────────────────────

  describe('setScreenshotHandler', () => {
    it('setScreenshotHandler_whenCalledWithFn_thenHandlerStored', () => {
      const fn = vi.fn();
      useRenderStore.getState().setScreenshotHandler(fn);
      expect(useRenderStore.getState().screenshotHandler).toBe(fn);
    });

    it('setScreenshotHandler_whenCalledWithNull_thenHandlerIsNull', () => {
      useRenderStore.getState().setScreenshotHandler(vi.fn());
      useRenderStore.getState().setScreenshotHandler(null);
      expect(useRenderStore.getState().screenshotHandler).toBeNull();
    });
  });

  // ─── RENDER_PRESETS / RENDER_PRESET_LABELS ────────────────────────────────

  describe('RENDER_PRESETS', () => {
    it('RENDER_PRESETS_whenAllNames_thenAllHaveViewMode', () => {
      for (const preset of Object.values(RENDER_PRESETS)) {
        expect(preset.viewMode).toBeDefined();
      }
    });

    it('RENDER_PRESET_LABELS_whenAllNames_thenAllHaveLabels', () => {
      for (const [key, label] of Object.entries(RENDER_PRESET_LABELS)) {
        expect(label, key).toBeTruthy();
      }
    });

    it('RENDER_PRESET_LABELS_whenCounting_thenHas3Presets', () => {
      expect(Object.keys(RENDER_PRESET_LABELS).length).toBe(3);
    });
  });
});
