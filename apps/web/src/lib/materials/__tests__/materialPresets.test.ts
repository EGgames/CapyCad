/**
 * Tests unitarios — materialPresets
 * US-015: Materiales y Renderizado PBR
 */

import { describe, it, expect } from 'vitest';
import {
  MATERIAL_PRESETS,
  MATERIAL_PRESET_LIST,
  getMaterialPreset,
  isKnownPreset,
} from '../materialPresets';

describe('materialPresets', () => {
  // ─── estructura de presets ─────────────────────────────────────────────

  describe('MATERIAL_PRESETS', () => {
    it('MATERIAL_PRESETS_whenAccessed_thenContainsDefaultPreset', () => {
      expect(MATERIAL_PRESETS.default).toBeDefined();
    });

    it('MATERIAL_PRESETS_whenAllPresets_thenEachHasRequiredFields', () => {
      for (const [key, preset] of Object.entries(MATERIAL_PRESETS)) {
        expect(preset.id, `${key}.id`).toBe(key);
        expect(preset.label, `${key}.label`).toBeTruthy();
        expect(typeof preset.color, `${key}.color`).toBe('string');
        expect(preset.metalness, `${key}.metalness`).toBeGreaterThanOrEqual(0);
        expect(preset.metalness, `${key}.metalness`).toBeLessThanOrEqual(1);
        expect(preset.roughness, `${key}.roughness`).toBeGreaterThanOrEqual(0);
        expect(preset.roughness, `${key}.roughness`).toBeLessThanOrEqual(1);
        expect(preset.opacity, `${key}.opacity`).toBeGreaterThan(0);
        expect(typeof preset.transparent, `${key}.transparent`).toBe('boolean');
      }
    });

    it('MATERIAL_PRESETS_whenMetalPreset_thenHighMetalness', () => {
      expect(MATERIAL_PRESETS.metal.metalness).toBeGreaterThan(0.7);
    });

    it('MATERIAL_PRESETS_whenPlasticPreset_thenZeroMetalness', () => {
      expect(MATERIAL_PRESETS.plastic.metalness).toBe(0);
    });

    it('MATERIAL_PRESETS_whenGlassPreset_thenTransparentIsTrue', () => {
      expect(MATERIAL_PRESETS.glass.transparent).toBe(true);
      expect(MATERIAL_PRESETS.glass.opacity).toBeLessThan(1);
    });

    it('MATERIAL_PRESETS_whenWireframePreset_thenWireframeIsTrue', () => {
      expect(MATERIAL_PRESETS.wireframe.wireframe).toBe(true);
    });

    it('MATERIAL_PRESETS_whenGoldPreset_thenHighMetalnessLowRoughness', () => {
      const gold = MATERIAL_PRESETS.gold;
      expect(gold.metalness).toBe(1.0);
      expect(gold.roughness).toBeLessThan(0.1);
    });
  });

  // ─── MATERIAL_PRESET_LIST ─────────────────────────────────────────────

  describe('MATERIAL_PRESET_LIST', () => {
    it('MATERIAL_PRESET_LIST_whenAccessed_thenIsArray', () => {
      expect(Array.isArray(MATERIAL_PRESET_LIST)).toBe(true);
    });

    it('MATERIAL_PRESET_LIST_whenAccessed_thenFirstIsDefault', () => {
      expect(MATERIAL_PRESET_LIST[0].id).toBe('default');
    });

    it('MATERIAL_PRESET_LIST_whenAccessed_thenContainsAllPresetsFromMap', () => {
      const presetIds = Object.keys(MATERIAL_PRESETS);
      const listIds = MATERIAL_PRESET_LIST.map((p) => p.id);
      for (const id of presetIds) {
        expect(listIds).toContain(id);
      }
    });

    it('MATERIAL_PRESET_LIST_whenAccessed_thenCountMatchesMap', () => {
      expect(MATERIAL_PRESET_LIST.length).toBe(Object.keys(MATERIAL_PRESETS).length);
    });

    it('MATERIAL_PRESET_LIST_whenCountingForPRD_thenHasMinimum50Presets', () => {
      // PRD FUNC-020: biblioteca mínima de 50 materiales PBR
      expect(MATERIAL_PRESET_LIST.length).toBeGreaterThanOrEqual(50);
    });
  });

  // ─── getMaterialPreset ────────────────────────────────────────────────

  describe('getMaterialPreset', () => {
    it('getMaterialPreset_whenValidId_thenReturnsPreset', () => {
      const result = getMaterialPreset('metal');
      expect(result.id).toBe('metal');
    });

    it('getMaterialPreset_whenUnknownId_thenReturnsDefault', () => {
      const result = getMaterialPreset('unknown-id-xyz');
      expect(result.id).toBe('default');
    });

    it('getMaterialPreset_whenDefaultId_thenReturnsDefault', () => {
      const result = getMaterialPreset('default');
      expect(result.id).toBe('default');
    });

    it('getMaterialPreset_whenGoldId_thenReturnsGoldPreset', () => {
      const result = getMaterialPreset('gold');
      expect(result.label).toBe('Oro');
    });

    it('getMaterialPreset_whenEmptyString_thenReturnsDefault', () => {
      const result = getMaterialPreset('');
      expect(result.id).toBe('default');
    });
  });

  // ─── isKnownPreset ────────────────────────────────────────────────────

  describe('isKnownPreset', () => {
    it('isKnownPreset_whenKnownId_thenReturnsTrue', () => {
      expect(isKnownPreset('metal')).toBe(true);
      expect(isKnownPreset('glass')).toBe(true);
      expect(isKnownPreset('default')).toBe(true);
    });

    it('isKnownPreset_whenUnknownId_thenReturnsFalse', () => {
      expect(isKnownPreset('unknown')).toBe(false);
    });

    it('isKnownPreset_whenEmptyString_thenReturnsFalse', () => {
      expect(isKnownPreset('')).toBe(false);
    });

    it('isKnownPreset_whenAllPresetsIds_thenAllReturnTrue', () => {
      for (const id of Object.keys(MATERIAL_PRESETS)) {
        expect(isKnownPreset(id), id).toBe(true);
      }
    });
  });
});
