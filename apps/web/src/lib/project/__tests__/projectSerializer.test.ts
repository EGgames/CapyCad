/**
 * Tests unitarios — projectSerializer
 * US-007: Guardar y cargar proyecto (.stlm)
 *
 * Convenciones: methodName_whenCondition_thenExpectedBehavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureType } from '@stl-model/shared-types';
import type { Sketch, Feature } from '@stl-model/shared-types';
import {
  serializeProject,
  loadProject,
  saveProject,
  triggerProjectDownload,
  sanitizeFilename,
  isSemanticallyCompatible,
  createEmptySketch,
  PROJECT_FORMAT_VERSION,
} from '../projectSerializer';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXED_TS = '2024-01-15T12:00:00.000Z';

const mockSketch: Sketch = {
  id: 'sketch-1',
  name: 'Mi Sketch',
  entities: [],
  constraints: [],
  measurements: [],
  plane: 'XY',
};

const mockFeatures: Feature[] = [
  {
    id: 'feat-1',
    type: FeatureType.EXTRUDE,
    name: 'Extrusión 1',
    parentId: null,
    visible: true,
    suppressed: false,
  } as Feature,
];

// ─── serializeProject ─────────────────────────────────────────────────────────

describe('serializeProject', () => {
  it('serializeProject_whenCalled_thenIncludesFormatVersion', () => {
    const result = serializeProject(mockSketch, [], 'test', FIXED_TS);
    expect(result.version).toBe(PROJECT_FORMAT_VERSION);
  });

  it('serializeProject_whenNameProvided_thenMetadataContainsName', () => {
    const result = serializeProject(null, [], 'Mi Proyecto CAD', FIXED_TS);
    expect(result.metadata.name).toBe('Mi Proyecto CAD');
  });

  it('serializeProject_whenNoNameProvided_thenUsesDefaultName', () => {
    const result = serializeProject(null, [], undefined, FIXED_TS);
    expect(result.metadata.name).toBe('proyecto-sin-nombre');
  });

  it('serializeProject_whenCalled_thenMetadataHasCreatedTimestamp', () => {
    const result = serializeProject(null, [], 'test', FIXED_TS);
    expect(result.metadata.created).toBe(FIXED_TS);
  });

  it('serializeProject_whenSketchProvided_thenIncludesSketch', () => {
    const result = serializeProject(mockSketch, [], 'test', FIXED_TS);
    expect(result.sketch).toEqual(mockSketch);
  });

  it('serializeProject_whenNullSketch_thenSketchIsNull', () => {
    const result = serializeProject(null, [], 'test', FIXED_TS);
    expect(result.sketch).toBeNull();
  });

  it('serializeProject_whenFeaturesProvided_thenIncludesFeatures', () => {
    const result = serializeProject(mockSketch, mockFeatures, 'test', FIXED_TS);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('feat-1');
  });

  it('serializeProject_whenCalledWithEmptyFeatures_thenFeaturesIsEmptyArray', () => {
    const result = serializeProject(null, [], 'test', FIXED_TS);
    expect(result.features).toEqual([]);
  });

  it('serializeProject_whenSerialized_thenIsValidJSON', () => {
    const result = serializeProject(mockSketch, mockFeatures, 'test', FIXED_TS);
    expect(() => JSON.stringify(result)).not.toThrow();
    const json = JSON.stringify(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ─── loadProject ─────────────────────────────────────────────────────────────

describe('loadProject', () => {
  it('loadProject_whenValidJson_thenReturnsLoadedProject', () => {
    const project = serializeProject(mockSketch, mockFeatures, 'test', FIXED_TS);
    const json = JSON.stringify(project);
    const result = loadProject(json);
    expect(result.sketch).toEqual(mockSketch);
  });

  it('loadProject_whenValidJson_thenRestoresFeatures', () => {
    const project = serializeProject(mockSketch, mockFeatures, 'test', FIXED_TS);
    const result = loadProject(JSON.stringify(project));
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('feat-1');
  });

  it('loadProject_whenValidJson_thenRestoresMetadata', () => {
    const project = serializeProject(mockSketch, mockFeatures, 'Mi pieza', FIXED_TS);
    const result = loadProject(JSON.stringify(project));
    expect(result.metadata.name).toBe('Mi pieza');
  });

  it('loadProject_whenNullSketch_thenSketchIsNull', () => {
    const project = serializeProject(null, [], 'test', FIXED_TS);
    const result = loadProject(JSON.stringify(project));
    expect(result.sketch).toBeNull();
  });

  it('loadProject_whenInvalidJson_thenThrowsError', () => {
    expect(() => loadProject('esto no es json {')).toThrow('no es JSON válido');
  });

  it('loadProject_whenMissingVersion_thenThrowsError', () => {
    const broken = { metadata: { name: 'x' }, sketch: null, features: [] };
    expect(() => loadProject(JSON.stringify(broken))).toThrow('"version"');
  });

  it('loadProject_whenIncompatibleVersion_thenThrowsError', () => {
    const project = serializeProject(null, [], 'test', FIXED_TS);
    const incompatible = { ...project, version: '99.0' };
    expect(() => loadProject(JSON.stringify(incompatible))).toThrow('incompatible');
  });

  it('loadProject_whenMissingMetadata_thenThrowsError', () => {
    const project = serializeProject(null, [], 'test', FIXED_TS);
    const { metadata: _m, ...withoutMetadata } = project;
    expect(() => loadProject(JSON.stringify(withoutMetadata))).toThrow('"metadata"');
  });

  it('loadProject_whenFeaturesNotArray_thenThrowsError', () => {
    const project = serializeProject(null, [], 'test', FIXED_TS);
    const broken = { ...project, features: 'no-array' };
    expect(() => loadProject(JSON.stringify(broken))).toThrow('"features"');
  });

  it('loadProject_whenRootIsNull_thenThrowsError', () => {
    expect(() => loadProject('null')).toThrow();
  });

  it('loadProject_whenRootIsNotObject_thenThrowsError', () => {
    expect(() => loadProject('"just a string"')).toThrow();
  });
});

// ─── isSemanticallyCompatible ─────────────────────────────────────────────────

describe('isSemanticallyCompatible', () => {
  it('isSemanticallyCompatible_whenSameVersion_thenReturnsTrue', () => {
    expect(isSemanticallyCompatible(PROJECT_FORMAT_VERSION)).toBe(true);
  });

  it('isSemanticallyCompatible_whenSameMajorDifferentMinor_thenReturnsTrue', () => {
    expect(isSemanticallyCompatible('1.99')).toBe(true);
  });

  it('isSemanticallyCompatible_whenDifferentMajor_thenReturnsFalse', () => {
    expect(isSemanticallyCompatible('2.0')).toBe(false);
  });

  it('isSemanticallyCompatible_whenFutureMajor_thenReturnsFalse', () => {
    expect(isSemanticallyCompatible('99.5')).toBe(false);
  });
});

// ─── sanitizeFilename ─────────────────────────────────────────────────────────

describe('sanitizeFilename', () => {
  it('sanitizeFilename_whenNormalName_thenReturnsSameName', () => {
    expect(sanitizeFilename('mi-pieza')).toBe('mi-pieza');
  });

  it('sanitizeFilename_whenSpaces_thenReplacesWithUnderscores', () => {
    expect(sanitizeFilename('mi pieza cad')).toBe('mi_pieza_cad');
  });

  it('sanitizeFilename_whenSpecialChars_thenRemovesThem', () => {
    expect(sanitizeFilename('pieza<>:"/\\|?*!')).toBe('pieza');
  });

  it('sanitizeFilename_whenEmptyAfterSanitize_thenReturnsDefault', () => {
    expect(sanitizeFilename('<><<>>')).toBe('proyecto');
  });

  it('sanitizeFilename_whenLeadingTrailingSpaces_thenTrimmed', () => {
    expect(sanitizeFilename('  pieza  ')).toBe('pieza');
  });

  it('sanitizeFilename_whenLongName_thenTruncatesTo100Chars', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(100);
  });
});

// ─── createEmptySketch ────────────────────────────────────────────────────────

describe('createEmptySketch', () => {
  it('createEmptySketch_whenCalled_thenReturnsSketchWithUniqueId', () => {
    const s1 = createEmptySketch();
    const s2 = createEmptySketch();
    expect(s1.id).not.toBe(s2.id);
  });

  it('createEmptySketch_whenDefaultArgs_thenPlaneIsXY', () => {
    const s = createEmptySketch();
    expect(s.plane).toBe('XY');
  });

  it('createEmptySketch_whenCustomPlane_thenUsesProvidedPlane', () => {
    const s = createEmptySketch('test', 'XZ');
    expect(s.plane).toBe('XZ');
  });

  it('createEmptySketch_whenCalled_thenEntitiesIsEmptyArray', () => {
    const s = createEmptySketch();
    expect(s.entities).toEqual([]);
  });

  it('createEmptySketch_whenCalled_thenConstraintsIsEmptyArray', () => {
    const s = createEmptySketch();
    expect(s.constraints).toEqual([]);
  });
});

// ─── triggerProjectDownload ───────────────────────────────────────────────────

describe('triggerProjectDownload', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clickSpy = vi.fn();
    mockLink = { href: '', download: '', click: clickSpy };
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn().mockReturnValue(mockLink);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('triggerProjectDownload_whenCalled_thenSetsStlmExtension', () => {
    triggerProjectDownload('{}', 'mi-proyecto');
    expect(mockLink.download).toBe('mi-proyecto.stlm');
  });

  it('triggerProjectDownload_whenNameWithSpaces_thenSanitizesName', () => {
    triggerProjectDownload('{}', 'mi proyecto cad');
    expect(mockLink.download).toBe('mi_proyecto_cad.stlm');
  });

  it('triggerProjectDownload_whenCalled_thenClicksLink', () => {
    triggerProjectDownload('{}', 'test');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('triggerProjectDownload_whenCalled_thenRevokesObjectURL', () => {
    triggerProjectDownload('{}', 'test');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

// ─── saveProject (integración con mocks de DOM) ────────────────────────────

describe('saveProject', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let link: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clickSpy = vi.fn();
    link = { href: '', download: '', click: clickSpy };
    URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn().mockReturnValue(link);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('saveProject_whenCalled_thenTriggersDownload', () => {
    saveProject(mockSketch, mockFeatures, 'mi-pieza');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('saveProject_whenNoSketch_thenDoesNotThrow', () => {
    expect(() => saveProject(null, [], 'vacio')).not.toThrow();
  });

  it('saveProject_whenNoName_thenUsesDefaultName', () => {
    saveProject(null, []);
    expect(link.download).toBe('proyecto-sin-nombre.stlm');
  });
});
