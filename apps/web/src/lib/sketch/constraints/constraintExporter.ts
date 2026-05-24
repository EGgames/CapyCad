import {
  Constraint,
  ConstraintType,
  SketchEntity,
  SketchEntityType,
} from '@capycad/shared-types';

const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  [ConstraintType.DISTANCE]: 'Distancia',
  [ConstraintType.HORIZONTAL]: 'Horizontal',
  [ConstraintType.VERTICAL]: 'Vertical',
  [ConstraintType.PARALLEL]: 'Paralelo',
  [ConstraintType.PERPENDICULAR]: 'Perpendicular',
  [ConstraintType.TANGENT]: 'Tangente',
  [ConstraintType.CONCENTRIC]: 'Concéntrico',
  [ConstraintType.EQUAL]: 'Igual',
};

const ENTITY_LABELS: Record<string, string> = {
  [SketchEntityType.LINE]: 'Línea',
  [SketchEntityType.CIRCLE]: 'Círculo',
  [SketchEntityType.ARC]: 'Arco',
  [SketchEntityType.RECTANGLE]: 'Rectángulo',
  [SketchEntityType.POLYGON]: 'Polígono',
  [SketchEntityType.SPLINE]: 'Spline',
};

/**
 * Exporta la tabla de parámetros de constraints a formato CSV.
 * Columnas: ID, Tipo, Entidades, Valor, Tipo_Entidad_1, Tipo_Entidad_2
 */
export function exportConstraintsToCSV(
  constraints: Constraint[],
  entities: SketchEntity[]
): string {
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  const header = 'ID,Tipo,Entidades,Valor,Tipo_Entidad_1,Tipo_Entidad_2';
  const rows = constraints.map((c) => {
    const label = CONSTRAINT_LABELS[c.type] || c.type;
    const entityIds = c.entities.join(';');
    const value = c.value != null ? String(c.value) : '';
    const ent1 = entityMap.get(c.entities[0]);
    const ent2 = c.entities[1] ? entityMap.get(c.entities[1]) : undefined;
    const type1 = ent1 ? ENTITY_LABELS[ent1.type] || ent1.type : '';
    const type2 = ent2 ? ENTITY_LABELS[ent2.type] || ent2.type : '';

    return `${c.id},${label},${entityIds},${value},${type1},${type2}`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Descarga un string CSV como archivo.
 */
export function downloadCSV(csvContent: string, filename = 'parametros.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
