/**
 * Presets de Materiales PBR para el visor 3D
 *
 * US-015: Materiales y Renderizado PBR
 *
 * Define materiales predefinidos basados en parámetros de Three.js
 * MeshStandardMaterial (workflow metalness/roughness).
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FeatureMaterial {
  id: string;
  label: string;
  color: string; // hex color
  metalness: number; // 0–1
  roughness: number; // 0–1
  opacity: number; // 0–1
  transparent: boolean;
  emissive?: string; // hex, para materiales brillantes / emisivos
  emissiveIntensity?: number;
  wireframe?: boolean;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export const MATERIAL_PRESETS: Record<string, FeatureMaterial> = {
  default: {
    id: 'default',
    label: 'Predeterminado',
    color: '#7c3aed',
    metalness: 0.3,
    roughness: 0.4,
    opacity: 1,
    transparent: false,
  },
  metal: {
    id: 'metal',
    label: 'Metal',
    color: '#94a3b8',
    metalness: 0.9,
    roughness: 0.1,
    opacity: 1,
    transparent: false,
  },
  steel: {
    id: 'steel',
    label: 'Acero',
    color: '#71717a',
    metalness: 1.0,
    roughness: 0.25,
    opacity: 1,
    transparent: false,
  },
  gold: {
    id: 'gold',
    label: 'Oro',
    color: '#f59e0b',
    metalness: 1.0,
    roughness: 0.05,
    opacity: 1,
    transparent: false,
  },
  copper: {
    id: 'copper',
    label: 'Cobre',
    color: '#cd7f32',
    metalness: 0.95,
    roughness: 0.15,
    opacity: 1,
    transparent: false,
  },
  plastic: {
    id: 'plastic',
    label: 'Plástico',
    color: '#dc2626',
    metalness: 0.0,
    roughness: 0.6,
    opacity: 1,
    transparent: false,
  },
  rubber: {
    id: 'rubber',
    label: 'Goma',
    color: '#1c1917',
    metalness: 0.0,
    roughness: 0.95,
    opacity: 1,
    transparent: false,
  },
  wood: {
    id: 'wood',
    label: 'Madera',
    color: '#92400e',
    metalness: 0.0,
    roughness: 0.85,
    opacity: 1,
    transparent: false,
  },
  ceramic: {
    id: 'ceramic',
    label: 'Cerámica',
    color: '#f5f5f4',
    metalness: 0.0,
    roughness: 0.2,
    opacity: 1,
    transparent: false,
  },
  glass: {
    id: 'glass',
    label: 'Vidrio',
    color: '#bae6fd',
    metalness: 0.0,
    roughness: 0.0,
    opacity: 0.35,
    transparent: true,
    emissive: '#ffffff',
    emissiveIntensity: 0.05,
  },
  carbon: {
    id: 'carbon',
    label: 'Fibra de Carbono',
    color: '#171717',
    metalness: 0.4,
    roughness: 0.3,
    opacity: 1,
    transparent: false,
  },
  wireframe: {
    id: 'wireframe',
    label: 'Wireframe',
    color: '#22d3ee',
    metalness: 0.0,
    roughness: 1.0,
    opacity: 1,
    transparent: false,
    wireframe: true,
  },

  // ─── Metales adicionales ───────────────────────────────────────────────────
  aluminum: {
    id: 'aluminum',
    label: 'Aluminio',
    color: '#d4d4d8',
    metalness: 0.85,
    roughness: 0.2,
    opacity: 1,
    transparent: false,
  },
  chrome: {
    id: 'chrome',
    label: 'Cromo',
    color: '#e2e8f0',
    metalness: 1.0,
    roughness: 0.02,
    opacity: 1,
    transparent: false,
  },
  titanium: {
    id: 'titanium',
    label: 'Titanio',
    color: '#9ca3af',
    metalness: 0.9,
    roughness: 0.35,
    opacity: 1,
    transparent: false,
  },
  brass: {
    id: 'brass',
    label: 'Latón',
    color: '#d4a843',
    metalness: 0.9,
    roughness: 0.2,
    opacity: 1,
    transparent: false,
  },
  bronze: {
    id: 'bronze',
    label: 'Bronce',
    color: '#a0522d',
    metalness: 0.75,
    roughness: 0.4,
    opacity: 1,
    transparent: false,
  },
  iron: {
    id: 'iron',
    label: 'Hierro',
    color: '#374151',
    metalness: 0.8,
    roughness: 0.6,
    opacity: 1,
    transparent: false,
  },
  silver: {
    id: 'silver',
    label: 'Plata',
    color: '#c0c0c0',
    metalness: 1.0,
    roughness: 0.08,
    opacity: 1,
    transparent: false,
  },
  rustMetal: {
    id: 'rustMetal',
    label: 'Metal oxidado',
    color: '#7f3522',
    metalness: 0.4,
    roughness: 0.9,
    opacity: 1,
    transparent: false,
  },

  // ─── Plásticos ─────────────────────────────────────────────────────────────
  plasticBlue: {
    id: 'plasticBlue',
    label: 'Plástico azul',
    color: '#2563eb',
    metalness: 0.0,
    roughness: 0.55,
    opacity: 1,
    transparent: false,
  },
  plasticGreen: {
    id: 'plasticGreen',
    label: 'Plástico verde',
    color: '#16a34a',
    metalness: 0.0,
    roughness: 0.55,
    opacity: 1,
    transparent: false,
  },
  plasticYellow: {
    id: 'plasticYellow',
    label: 'Plástico amarillo',
    color: '#ca8a04',
    metalness: 0.0,
    roughness: 0.6,
    opacity: 1,
    transparent: false,
  },
  plasticBlack: {
    id: 'plasticBlack',
    label: 'Plástico negro',
    color: '#111827',
    metalness: 0.0,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
  },
  plasticWhite: {
    id: 'plasticWhite',
    label: 'Plástico blanco',
    color: '#f9fafb',
    metalness: 0.0,
    roughness: 0.65,
    opacity: 1,
    transparent: false,
  },
  abs: {
    id: 'abs',
    label: 'ABS',
    color: '#e5e7eb',
    metalness: 0.0,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
  },
  pla: {
    id: 'pla',
    label: 'PLA',
    color: '#6ee7b7',
    metalness: 0.0,
    roughness: 0.7,
    opacity: 1,
    transparent: false,
  },
  nylon: {
    id: 'nylon',
    label: 'Nylon',
    color: '#e2e8f0',
    metalness: 0.0,
    roughness: 0.45,
    opacity: 1,
    transparent: false,
  },
  petg: {
    id: 'petg',
    label: 'PETG',
    color: '#a78bfa',
    metalness: 0.05,
    roughness: 0.35,
    opacity: 0.85,
    transparent: true,
  },
  resin: {
    id: 'resin',
    label: 'Resina',
    color: '#fda4af',
    metalness: 0.05,
    roughness: 0.1,
    opacity: 0.9,
    transparent: true,
  },

  // ─── Piedra y concreto ─────────────────────────────────────────────────────
  concrete: {
    id: 'concrete',
    label: 'Concreto',
    color: '#9ca3af',
    metalness: 0.0,
    roughness: 0.95,
    opacity: 1,
    transparent: false,
  },
  marble: {
    id: 'marble',
    label: 'Mármol',
    color: '#fafafa',
    metalness: 0.0,
    roughness: 0.15,
    opacity: 1,
    transparent: false,
  },
  granite: {
    id: 'granite',
    label: 'Granito',
    color: '#4b5563',
    metalness: 0.05,
    roughness: 0.8,
    opacity: 1,
    transparent: false,
  },
  sandstone: {
    id: 'sandstone',
    label: 'Piedra arenisca',
    color: '#d4b483',
    metalness: 0.0,
    roughness: 0.9,
    opacity: 1,
    transparent: false,
  },

  // ─── Madera variantes ──────────────────────────────────────────────────────
  darkWood: {
    id: 'darkWood',
    label: 'Madera oscura',
    color: '#4b2e1a',
    metalness: 0.0,
    roughness: 0.85,
    opacity: 1,
    transparent: false,
  },
  lightWood: {
    id: 'lightWood',
    label: 'Madera clara',
    color: '#d9b88c',
    metalness: 0.0,
    roughness: 0.8,
    opacity: 1,
    transparent: false,
  },
  lacqueredWood: {
    id: 'lacqueredWood',
    label: 'Madera lacada',
    color: '#a0522d',
    metalness: 0.05,
    roughness: 0.15,
    opacity: 1,
    transparent: false,
  },

  // ─── Vidrio variantes ──────────────────────────────────────────────────────
  frostedGlass: {
    id: 'frostedGlass',
    label: 'Vidrio esmerilado',
    color: '#e0f2fe',
    metalness: 0.0,
    roughness: 0.6,
    opacity: 0.6,
    transparent: true,
  },
  tintedGlass: {
    id: 'tintedGlass',
    label: 'Vidrio tintado',
    color: '#0369a1',
    metalness: 0.0,
    roughness: 0.05,
    opacity: 0.45,
    transparent: true,
  },

  // ─── Materiales emisivos ───────────────────────────────────────────────────
  neonOrange: {
    id: 'neonOrange',
    label: 'Neón naranja',
    color: '#f97316',
    metalness: 0.0,
    roughness: 1.0,
    opacity: 1,
    transparent: false,
    emissive: '#f97316',
    emissiveIntensity: 0.8,
  },
  neonCyan: {
    id: 'neonCyan',
    label: 'Neón cian',
    color: '#06b6d4',
    metalness: 0.0,
    roughness: 1.0,
    opacity: 1,
    transparent: false,
    emissive: '#06b6d4',
    emissiveIntensity: 0.8,
  },
  led: {
    id: 'led',
    label: 'LED blanco',
    color: '#f0f9ff',
    metalness: 0.0,
    roughness: 1.0,
    opacity: 1,
    transparent: false,
    emissive: '#ffffff',
    emissiveIntensity: 1.0,
  },

  // ─── Especialidad ─────────────────────────────────────────────────────────
  silicone: {
    id: 'silicone',
    label: 'Silicona',
    color: '#a7f3d0',
    metalness: 0.0,
    roughness: 0.3,
    opacity: 0.75,
    transparent: true,
  },
  foam: {
    id: 'foam',
    label: 'Espuma',
    color: '#fef3c7',
    metalness: 0.0,
    roughness: 1.0,
    opacity: 1,
    transparent: false,
  },
  clay: {
    id: 'clay',
    label: 'Arcilla',
    color: '#c2693e',
    metalness: 0.0,
    roughness: 0.92,
    opacity: 1,
    transparent: false,
  },
  wax: {
    id: 'wax',
    label: 'Cera',
    color: '#fef9c3',
    metalness: 0.0,
    roughness: 0.25,
    opacity: 0.7,
    transparent: true,
  },
  // ─── Metales adicionales ──────────────────────────────────────────────────
  polishedSteel: {
    id: 'polishedSteel',
    label: 'Acero Pulido',
    color: '#e8e8f0',
    metalness: 1.0,
    roughness: 0.05,
    opacity: 1,
    transparent: false,
  },
  nickel: {
    id: 'nickel',
    label: 'Níquel',
    color: '#c0c0b0',
    metalness: 1.0,
    roughness: 0.2,
    opacity: 1,
    transparent: false,
  },
  // ─── Plásticos adicionales ────────────────────────────────────────────────
  rubberBlack: {
    id: 'rubberBlack',
    label: 'Goma Negra',
    color: '#1a1a1a',
    metalness: 0.0,
    roughness: 0.95,
    opacity: 1,
    transparent: false,
  },
  matte: {
    id: 'matte',
    label: 'Mate',
    color: '#3d3d3d',
    metalness: 0.0,
    roughness: 1.0,
    opacity: 1,
    transparent: false,
  },
};

/** Lista de presets en orden de presentación en la UI */
export const MATERIAL_PRESET_LIST: FeatureMaterial[] = [
  // Básicos
  MATERIAL_PRESETS.default,
  MATERIAL_PRESETS.plasticWhite,
  MATERIAL_PRESETS.plasticBlack,
  // Plásticos 3D printing
  MATERIAL_PRESETS.pla,
  MATERIAL_PRESETS.abs,
  MATERIAL_PRESETS.petg,
  MATERIAL_PRESETS.nylon,
  MATERIAL_PRESETS.resin,
  MATERIAL_PRESETS.plastic,
  MATERIAL_PRESETS.plasticBlue,
  MATERIAL_PRESETS.plasticGreen,
  MATERIAL_PRESETS.plasticYellow,
  // Metales
  MATERIAL_PRESETS.metal,
  MATERIAL_PRESETS.steel,
  MATERIAL_PRESETS.aluminum,
  MATERIAL_PRESETS.chrome,
  MATERIAL_PRESETS.titanium,
  MATERIAL_PRESETS.gold,
  MATERIAL_PRESETS.silver,
  MATERIAL_PRESETS.copper,
  MATERIAL_PRESETS.brass,
  MATERIAL_PRESETS.bronze,
  MATERIAL_PRESETS.iron,
  MATERIAL_PRESETS.rustMetal,
  // Vidrio
  MATERIAL_PRESETS.glass,
  MATERIAL_PRESETS.frostedGlass,
  MATERIAL_PRESETS.tintedGlass,
  // Madera
  MATERIAL_PRESETS.wood,
  MATERIAL_PRESETS.darkWood,
  MATERIAL_PRESETS.lightWood,
  MATERIAL_PRESETS.lacqueredWood,
  // Piedra y concreto
  MATERIAL_PRESETS.concrete,
  MATERIAL_PRESETS.marble,
  MATERIAL_PRESETS.granite,
  MATERIAL_PRESETS.sandstone,
  // Cerámica y goma
  MATERIAL_PRESETS.ceramic,
  MATERIAL_PRESETS.rubber,
  MATERIAL_PRESETS.rubberBlack,
  // Especialidad
  MATERIAL_PRESETS.carbon,
  MATERIAL_PRESETS.silicone,
  MATERIAL_PRESETS.foam,
  MATERIAL_PRESETS.clay,
  MATERIAL_PRESETS.wax,
  MATERIAL_PRESETS.matte,
  // Metales adicionales
  MATERIAL_PRESETS.polishedSteel,
  MATERIAL_PRESETS.nickel,
  // Emisivos
  MATERIAL_PRESETS.neonOrange,
  MATERIAL_PRESETS.neonCyan,
  MATERIAL_PRESETS.led,
  // Wireframe
  MATERIAL_PRESETS.wireframe,
];

/**
 * Obtiene un preset por ID. Devuelve el preset 'default' si no existe.
 */
export function getMaterialPreset(id: string): FeatureMaterial {
  return MATERIAL_PRESETS[id] ?? MATERIAL_PRESETS.default;
}

/**
 * Devuelve si un materialId es un preset conocido.
 */
export function isKnownPreset(id: string): boolean {
  return id in MATERIAL_PRESETS;
}
