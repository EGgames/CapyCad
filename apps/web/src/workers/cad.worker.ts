/**
 * Web Worker para operaciones CAD con OpenCascade.js
 *
 * Este worker ejecuta operaciones CAD pesadas sin bloquear la UI principal.
 * Inicializa OpenCascade.js y procesa mensajes con operaciones como extrusión,
 * revolución, fillet, chamfer, etc.
 */

import initOpenCascade from 'opencascade.js';
import opencascadeWasm from 'opencascade.js/dist/opencascade.full.wasm?url';
import type { SketchEntity, Line, Circle, Rectangle, Arc, Polygon } from '@stl-model/shared-types';

// Los tipos de OpenCascade.js no cubren todos los constructores de la API runtime.
let oc: any = null;
let isInitialized = false;

/** Píxeles por unidad world (debe coincidir con PPU de ExtrudePreviewGizmo) */
const PPU_WORKER = 50;

interface WorkerMessage {
  id: string;
  type:
    | 'init'
    | 'extrude'
    | 'revolve'
    | 'fillet'
    | 'chamfer'
    | 'shell'
    | 'sweep'
    | 'loft'
    | 'boolean'
    | 'draft'
    | 'offset'
    | 'primitive_box'
    | 'primitive_sphere'
    | 'primitive_cylinder'
    | 'primitive_cone'
    | 'primitive_torus';
  payload: unknown;
}

interface ExtrudePayload {
  entities: SketchEntity[];
  distance: number;
  direction: 'positive' | 'negative' | 'both';
  canvasWidth?: number;
  canvasHeight?: number;
}

interface FilletPayload {
  entities: SketchEntity[];
  extrudeDistance: number;
  direction: 'positive' | 'negative' | 'both';
  radius: number;
}

interface ChamferPayload {
  entities: SketchEntity[];
  extrudeDistance: number;
  direction: 'positive' | 'negative' | 'both';
  chamferDistance: number;
}

interface ShellPayload {
  entities: SketchEntity[];
  extrudeDistance: number;
  direction: 'positive' | 'negative' | 'both';
  thickness: number;
}

interface SweepPayload {
  profileEntities: SketchEntity[];
  pathPoints: Array<{ x: number; y: number; z: number }>;
}

interface LoftPayload {
  sections: Array<{ entities: SketchEntity[]; zOffset: number }>;
  closed?: boolean;
}

interface RevolvePayload {
  entities: SketchEntity[];
  axis: 'X' | 'Y' | 'Z';
  angle: number; // degrees
}

interface BooleanPayload {
  targetEntities: SketchEntity[];
  targetDistance: number;
  targetDirection: 'positive' | 'negative' | 'both';
  targetCanvasWidth?: number;
  targetCanvasHeight?: number;
  /** Traslación a aplicar al sólido objetivo (Three.js coords) */
  targetTranslation?: { x: number; y: number; z: number };
  toolEntities: SketchEntity[];
  toolDistance: number;
  toolDirection: 'positive' | 'negative' | 'both';
  toolCanvasWidth?: number;
  toolCanvasHeight?: number;
  /** Traslación a aplicar al sólido herramienta (Three.js coords) */
  toolTranslation?: { x: number; y: number; z: number };
  operation: 'union' | 'subtract' | 'intersect';
  canvasWidth?: number;
  canvasHeight?: number;
}

interface DraftPayload {
  entities: SketchEntity[];
  extrudeDistance: number;
  direction: 'positive' | 'negative' | 'both';
  /** Ángulo de desmoldeo en grados */
  angle: number;
  neutralPlane: 'XY' | 'XZ' | 'YZ';
}

interface OffsetPayload {
  entities: SketchEntity[];
  extrudeDistance: number;
  direction: 'positive' | 'negative' | 'both';
  /** Distancia de offset (positivo = hacia afuera, negativo = hacia adentro) */
  offsetDistance: number;
}

interface BoxPayload {
  width: number;
  height: number;
  depth: number;
}

interface SpherePayload {
  radius: number;
}

interface CylinderPayload {
  radius: number;
  height: number;
}

interface ConePayload {
  baseRadius: number;
  topRadius: number;
  height: number;
}

interface TorusPayload {
  majorRadius: number;
  minorRadius: number;
}

interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * Inicializa OpenCascade.js
 */
async function initializeOpenCascade(): Promise<void> {
  if (isInitialized) return;

  try {
    oc = await initOpenCascade({ mainWasm: opencascadeWasm });
    isInitialized = true;
    console.log('[CAD Worker] OpenCascade.js initialized successfully');
  } catch (error) {
    console.error('[CAD Worker] Failed to initialize OpenCascade.js:', error);
    throw error;
  }
}

/**
 * Convierte SketchEntity a TopoDS_Wire (contorno cerrado).
 *
 * Las entidades llegan en coordenadas Fabric.js (píxeles, origen en esquina
 * superior-izquierda del canvas). Las normalizamos a unidades world antes de
 * pasarlas a OCC:
 *   world_x = (px - cw/2) / PPU_WORKER
 *   world_y = (ch/2 - py) / PPU_WORKER   ← flip Y (canvas Y↓, world Y↑)
 *
 * La cara queda en el plano XY de OCC (z=0).  Tras `rotateGeometry90` en el
 * caller, ese plano XY pasa a ser el plano XZ de Three.js (Y-up), que es lo
 * que muestra el preview de extrusión.
 */
function entitiesToWire(entities: SketchEntity[], cw = 800, ch = 600): any {
  if (!oc) throw new Error('OpenCascade not initialized');

  // Conversión píxeles → world (misma lógica que ExtrudePreviewGizmo)
  const wx = (px: number) => (px - cw / 2) / PPU_WORKER;
  const wy = (py: number) => (ch / 2 - py) / PPU_WORKER;

  // Caso especial: único círculo → construir el wire desde el edge usando la API
  // de OCC que acepta un edge cerrado directamente, más fiable que el Add() genérico.
  if (entities.length === 1 && entities[0].type === 'circle') {
    const circle = entities[0] as Circle;
    const center = new oc.gp_Pnt_3(wx(circle.center.x), wy(circle.center.y), 0);
    const axis = new oc.gp_Ax2_3(center, new oc.gp_Dir_4(0, 0, 1));
    const gpCirc = new oc.gp_Circ_2(axis, circle.radius / PPU_WORKER);
    const edge = new oc.BRepBuilderAPI_MakeEdge_8(gpCirc).Edge();
    // BRepBuilderAPI_MakeWire con el edge en el constructor es más fiable
    // para aristas cerradas que el método Add() en un wire vacío.
    const wm = new oc.BRepBuilderAPI_MakeWire_2(edge);
    if (!wm.IsDone()) {
      throw new Error(`[CAD] No se pudo crear el wire del círculo (${wm.Error()})`);
    }
    return wm.Wire();
  }

  // Use non-numbered (destructured) BRepBuilderAPI_MakeWire — its Add() method
  // accepts TopoDS_Shape/Edge directly. The numbered Add_1/Add_2 variants have
  // stricter type expectations that cause BindingErrors with the Edge objects
  // returned by BRepBuilderAPI_MakeEdge_N(...).Edge().
  const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();

  for (const entity of entities) {
    let edge: any;

    switch (entity.type) {
      case 'line': {
        const line = entity as Line;
        const p1 = new oc.gp_Pnt_3(wx(line.start.x), wy(line.start.y), 0);
        const p2 = new oc.gp_Pnt_3(wx(line.end.x), wy(line.end.y), 0);
        edge = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge();
        break;
      }

      case 'circle': {
        const circle = entity as Circle;
        const center = new oc.gp_Pnt_3(wx(circle.center.x), wy(circle.center.y), 0);
        const axis = new oc.gp_Ax2_3(center, new oc.gp_Dir_4(0, 0, 1));
        const gpCirc = new oc.gp_Circ_2(axis, circle.radius / PPU_WORKER);
        edge = new oc.BRepBuilderAPI_MakeEdge_8(gpCirc).Edge();
        break;
      }

      case 'rectangle': {
        const rect = entity as Rectangle;
        const { x: x1, y: y1 } = rect.topLeft;
        const { x: x2, y: y2 } = rect.bottomRight;

        const p1 = new oc.gp_Pnt_3(wx(x1), wy(y1), 0);
        const p2 = new oc.gp_Pnt_3(wx(x2), wy(y1), 0);
        const p3 = new oc.gp_Pnt_3(wx(x2), wy(y2), 0);
        const p4 = new oc.gp_Pnt_3(wx(x1), wy(y2), 0);

        wireBuilder.Add_1(new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge());
        wireBuilder.Add_1(new oc.BRepBuilderAPI_MakeEdge_3(p2, p3).Edge());
        wireBuilder.Add_1(new oc.BRepBuilderAPI_MakeEdge_3(p3, p4).Edge());
        wireBuilder.Add_1(new oc.BRepBuilderAPI_MakeEdge_3(p4, p1).Edge());
        continue;
      }

      case 'arc': {
        const arc = entity as Arc;
        const center = new oc.gp_Pnt_3(wx(arc.center.x), wy(arc.center.y), 0);
        const axis = new oc.gp_Ax2_3(center, new oc.gp_Dir_4(0, 0, 1));
        const gpCirc = new oc.gp_Circ_2(axis, arc.radius / PPU_WORKER);

        // arc.startAngle / endAngle son radianes desde Math.atan2 en Fabric (Y↓).
        // Tras el flip de Y (wy), el ángulo OCC (Y↑) = negado del ángulo Fabric.
        // GC_MakeArcOfCircle_3: counterclockwise de Alpha1 a Alpha2 (Sense=true).
        const alpha1 = -arc.startAngle;
        const alpha2 = -arc.endAngle;
        try {
          const arcGeom = new oc.GC_MakeArcOfCircle_3(gpCirc, alpha1, alpha2, true);
          edge = new oc.BRepBuilderAPI_MakeEdge_24(arcGeom.Value()).Edge();
        } catch {
          // Fallback: círculo completo si los ángulos son inválidos
          edge = new oc.BRepBuilderAPI_MakeEdge_8(gpCirc).Edge();
        }
        break;
      }

      case 'polygon': {
        const poly = entity as Polygon;
        const cx_occ = wx(poly.center.x);
        const cy_occ = wy(poly.center.y);
        const r_occ = poly.radius / PPU_WORKER;
        const rot = poly.rotation ?? 0;
        const n = poly.sides;

        for (let i = 0; i < n; i++) {
          const a1 = rot + (i / n) * Math.PI * 2 - Math.PI / 2;
          const a2 = rot + ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
          const vx1 = cx_occ + Math.cos(a1) * r_occ;
          const vy1 = cy_occ - Math.sin(a1) * r_occ;
          const vx2 = cx_occ + Math.cos(a2) * r_occ;
          const vy2 = cy_occ - Math.sin(a2) * r_occ;
          wireBuilder.Add_1(new oc.BRepBuilderAPI_MakeEdge_3(new oc.gp_Pnt_3(vx1, vy1, 0), new oc.gp_Pnt_3(vx2, vy2, 0)).Edge());
        }
        continue;
      }

      default:
        console.warn(`[CAD Worker] Unsupported entity type: ${entity.type}`);
        continue;
    }

    if (edge) {
      wireBuilder.Add_1(edge);
    }
  }

  if (!wireBuilder.IsDone()) {
    throw new Error(
      `[CAD] Wire incompleto — verifica que las entidades formen un contorno cerrado (error OCC: ${wireBuilder.Error()})`
    );
  }

  return wireBuilder.Wire();
}

/**
 * Construye un TopoDS_Shape extruido a partir de entidades y parámetros.
 * Helper compartido entre executeExtrude, executeFillet y executeChamfer.
 *
 * @param cw  Ancho del canvas en píxeles (para normalizar coordenadas)
 * @param ch  Alto del canvas en píxeles (para normalizar coordenadas)
 */
function buildExtrudedShape(
  entities: SketchEntity[],
  distance: number,
  direction: 'positive' | 'negative' | 'both',
  cw = 800,
  ch = 600
): any {
  if (!oc) throw new Error('OpenCascade not initialized');

  const wire = entitiesToWire(entities, cw, ch);

  const faceMaker = new oc.BRepBuilderAPI_MakeFace_15(wire, true);
  if (!faceMaker.IsDone()) {
    throw new Error(
      `[CAD] No se pudo crear la cara desde el wire (error OCC: ${faceMaker.Error?.()})`
    );
  }
  const face = faceMaker.Face();

  if (direction === 'both') {
    // Extruir en ambas direcciones: trasladar la cara −distance en Z,
    // luego extruir 2*distance en +Z → sólido simétrico respecto al plano del sketch.
    const translator = new oc.BRepBuilderAPI_Transform_2(
      face,
      (() => {
        const t = new oc.gp_Trsf_1();
        t.SetTranslation_1(new oc.gp_Vec_4(0, 0, -distance));
        return t;
      })(),
      false
    );
    const movedFace = translator.Shape();
    const prism = new oc.BRepPrimAPI_MakePrism_1(
      movedFace,
      new oc.gp_Vec_4(0, 0, distance * 2),
      false,
      true
    );
    return prism.Shape();
  }

  const signedDistance = direction === 'negative' ? -distance : distance;
  const extrusionVec = new oc.gp_Vec_4(0, 0, signedDistance);

  const prism = new oc.BRepPrimAPI_MakePrism_1(face, extrusionVec, false, true);
  return prism.Shape();
}

/**
 * Ejecuta operación de extrusión
 */
function executeExtrude(payload: ExtrudePayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  try {
    const cw = payload.canvasWidth ?? 800;
    const ch = payload.canvasHeight ?? 600;
    const shape = buildExtrudedShape(payload.entities, payload.distance, payload.direction, cw, ch);
    return rotateGeometry90(triangulateShape(shape));
  } catch (error) {
    console.error('[CAD Worker] Extrude failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación de fillet (redondeo de aristas)
 */
function executeFillet(payload: FilletPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  const { TopAbs_ShapeEnum, TopoDS } = oc as any;

  try {
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );

    const filleter = new oc.BRepFilletAPI_MakeFillet(
      baseShape,
      (oc as any).ChFi3d_FilletShape.ChFi3d_Rational
    );

    const edgeExplorer = new oc.TopExp_Explorer_2(
      baseShape,
      TopAbs_ShapeEnum.TopAbs_EDGE,
      TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    while (edgeExplorer.More()) {
      const edge = TopoDS.Edge_1(edgeExplorer.Current());
      filleter.Add_2(payload.radius, edge);
      edgeExplorer.Next();
    }

    const filletedShape = filleter.Shape();
    return triangulateShape(filletedShape);
  } catch (error) {
    console.error('[CAD Worker] Fillet failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación de chamfer (biselado de aristas)
 */
function executeChamfer(payload: ChamferPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  const { TopAbs_ShapeEnum, TopoDS } = oc as any;

  try {
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );

    const chamferer = new oc.BRepFilletAPI_MakeChamfer(baseShape);

    const edgeExplorer = new oc.TopExp_Explorer_2(
      baseShape,
      TopAbs_ShapeEnum.TopAbs_EDGE,
      TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    while (edgeExplorer.More()) {
      const edge = TopoDS.Edge_1(edgeExplorer.Current());
      chamferer.Add_2(payload.chamferDistance, edge);
      edgeExplorer.Next();
    }

    const chamferedShape = chamferer.Shape();
    return triangulateShape(chamferedShape);
  } catch (error) {
    console.error('[CAD Worker] Chamfer failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación de shell (vaciado de sólido)
 */
function executeShell(payload: ShellPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  const { TopAbs_ShapeEnum, TopoDS, BRep_Tool, TopLoc_Location_1: TopLoc_Location } = oc as any;

  try {
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );

    // Encontrar la cara con mayor coordenada Z media (cara superior del extruido)
    let topFace: any = null;
    let maxZ = -Infinity;
    const faceExplorer = new oc.TopExp_Explorer_2(
      baseShape,
      TopAbs_ShapeEnum.TopAbs_FACE,
      TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    while (faceExplorer.More()) {
      const face = TopoDS.Face_1(faceExplorer.Current());
      const loc = new TopLoc_Location();
      const triHandle = BRep_Tool.Triangulation(face, loc, 0);
      if (!triHandle.IsNull()) {
        const tri = triHandle.get();
        let sumZ = 0;
        const n = tri.NbNodes();
        for (let i = 1; i <= n; i++) {
          sumZ += tri.Node(i).Z();
        }
        const avgZ = sumZ / n;
        if (avgZ > maxZ) {
          maxZ = avgZ;
          topFace = face;
        }
      }
      faceExplorer.Next();
    }

    if (!topFace) throw new Error('Could not find top face for shell operation');

    // Triangular primero para tener la info de caras
    new oc.BRepMesh_IncrementalMesh_2(baseShape, 0.1, false, 0.5, true);

    // Construir ListOfShape con la cara a remover
    const facesToRemove = new (oc as any).TopTools_ListOfShape();
    facesToRemove.Append_1(topFace);

    const shellMaker = new oc.BRepOffsetAPI_MakeThickSolid();
    shellMaker.MakeThickSolidByJoin(
      baseShape,
      facesToRemove,
      -payload.thickness,
      1e-3,
      (oc as any).BRepOffset_Mode.BRepOffset_Skin,
      false,
      false,
      (oc as any).GeomAbs_JoinType.GeomAbs_Arc,
      false,
      new oc.Message_ProgressRange_1()
    );

    const shellShape = shellMaker.Shape();
    return triangulateShape(shellShape);
  } catch (error) {
    console.error('[CAD Worker] Shell failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación de sweep (barrido por trayectoria)
 */
function executeSweep(payload: SweepPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  try {
    // Construir wire de trayectoria desde pathPoints
    const pathWireBuilder = new oc.BRepBuilderAPI_MakeWire_1();
    for (let i = 0; i < payload.pathPoints.length - 1; i++) {
      const p1 = payload.pathPoints[i];
      const p2 = payload.pathPoints[i + 1];
      const pt1 = new oc.gp_Pnt_3(p1.x, p1.y, p1.z);
      const pt2 = new oc.gp_Pnt_3(p2.x, p2.y, p2.z);
      const edge = new oc.BRepBuilderAPI_MakeEdge_3(pt1, pt2).Edge();
      pathWireBuilder.Add(edge);
    }

    if (!pathWireBuilder.IsDone()) {
      throw new Error('Failed to create path wire for sweep');
    }
    const pathWire = pathWireBuilder.Wire();

    // Construir perfil (cara) desde profileEntities
    const profileWire = entitiesToWire(payload.profileEntities);
    const profileFace = new oc.BRepBuilderAPI_MakeFace_15(profileWire, true).Face();

    // Ejecutar sweep
    const pipe = new oc.BRepOffsetAPI_MakePipe_1(pathWire, profileFace);
    const sweptShape = pipe.Shape();

    return triangulateShape(sweptShape);
  } catch (error) {
    console.error('[CAD Worker] Sweep failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación de loft (transición entre secciones)
 */
function executeLoft(payload: LoftPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  try {
    if (payload.sections.length < 2) {
      throw new Error('Loft requires at least 2 sections');
    }

    const loft = new oc.BRepOffsetAPI_ThruSections(false, true, 1.0e-6);

    for (const section of payload.sections) {
      // Construir el wire de esta sección
      const wire = entitiesToWire(section.entities);

      // Trasladar al zOffset correspondiente
      const trsf = new oc.gp_Trsf_1();
      trsf.SetTranslation_1(new oc.gp_Vec_4(0, 0, section.zOffset));
      const transform = new oc.BRepBuilderAPI_Transform_2(wire, trsf, false);
      const translatedWire = (oc as any).TopoDS.Wire_1(transform.Shape());

      loft.AddWire(translatedWire);
    }

    if (payload.closed) {
      loft.SetClosed(true);
    }

    loft.Build(new oc.Message_ProgressRange_1());
    const loftShape = loft.Shape();

    return triangulateShape(loftShape);
  } catch (error) {
    console.error('[CAD Worker] Loft failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación de revolución (sketch girado alrededor de un eje)
 */
function executeRevolve(payload: RevolvePayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  try {
    const wire = entitiesToWire(payload.entities);
    const face = new oc.BRepBuilderAPI_MakeFace_15(wire, true).Face();

    // Eje de revolución según selección
    let axisDir: any;
    if (payload.axis === 'X') {
      axisDir = new oc.gp_Dir_4(1, 0, 0);
    } else if (payload.axis === 'Y') {
      axisDir = new oc.gp_Dir_4(0, 1, 0);
    } else {
      axisDir = new oc.gp_Dir_4(0, 0, 1);
    }

    const origin = new oc.gp_Pnt_3(0, 0, 0);
    const axis = new oc.gp_Ax1_2(origin, axisDir);

    const angleRad = (payload.angle * Math.PI) / 180;
    const revol = new oc.BRepPrimAPI_MakeRevol_1(face, axis, angleRad, false);
    const revolvedShape = revol.Shape();

    return triangulateShape(revolvedShape);
  } catch (error) {
    console.error('[CAD Worker] Revolve failed:', error);
    throw error;
  }
}

/**
 * Ejecuta operación draft (ángulo de desmoldeo)
 * Aplica BRepOffsetAPI_DraftAngle a las caras del sólido extruido.
 */
function executeDraft(payload: DraftPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  const { TopAbs_ShapeEnum, TopoDS } = oc as any;

  try {
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );

    const angleRad = (payload.angle * Math.PI) / 180;

    // Dirección de extracción del molde (en Z por defecto para XY plane)
    const pullDir = new oc.gp_Dir_4(0, 0, 1);
    // Plano neutro en Z=0
    const neutralPlane = new oc.gp_Pln_2(new oc.gp_Ax3_4(new oc.gp_Pnt_3(0, 0, 0), pullDir));

    const drafter = new oc.BRepOffsetAPI_DraftAngle_2(baseShape);

    const faceExplorer = new oc.TopExp_Explorer_2(
      baseShape,
      TopAbs_ShapeEnum.TopAbs_FACE,
      TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    while (faceExplorer.More()) {
      const face = TopoDS.Face_1(faceExplorer.Current());
      drafter.Add(face, pullDir, angleRad, neutralPlane);
      faceExplorer.Next();
    }

    if (!drafter.IsDone()) {
      // Si OCC no puede aplicar draft, devolver la extrusión base
      return triangulateShape(baseShape);
    }

    return triangulateShape(drafter.Shape());
  } catch (error) {
    console.error('[CAD Worker] Draft failed:', error);
    // Fallback: devolver shape sin draft
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );
    return triangulateShape(baseShape);
  }
}

/**
 * Ejecuta offset de superficie: desplaza todas las caras del sólido hacia
 * adentro/afuera la distancia indicada, generando un sólido escalado.
 */
function executeOffset(payload: OffsetPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  try {
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );

    const offsetMaker = new oc.BRepOffsetAPI_MakeOffsetShape();
    offsetMaker.PerformByJoin(
      baseShape,
      payload.offsetDistance,
      1e-3, // tolerance
      (oc as any).BRepOffset_Mode.BRepOffset_Skin, // mode
      false, // intersection
      false, // self-inter
      (oc as any).GeomAbs_JoinType.GeomAbs_Arc, // join type
      false, // remove internal edges
      new oc.Message_ProgressRange_1() // progress range
    );

    if (!offsetMaker.IsDone()) {
      // Fallback: devolver shape original si el offset falla
      console.warn('[CAD Worker] Offset not done, returning base shape');
      return triangulateShape(baseShape);
    }

    return triangulateShape(offsetMaker.Shape());
  } catch (error) {
    console.error('[CAD Worker] Offset failed:', error);
    // Fallback: devolver shape sin offset
    const baseShape = buildExtrudedShape(
      payload.entities,
      payload.extrudeDistance,
      payload.direction
    );
    return triangulateShape(baseShape);
  }
}

/**
 * Ejecuta operación booleana (union, subtract, intersect)
 */
function executeBoolean(payload: BooleanPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  try {
    const targetCW = payload.targetCanvasWidth ?? payload.canvasWidth ?? 800;
    const targetCH = payload.targetCanvasHeight ?? payload.canvasHeight ?? 600;
    const toolCW = payload.toolCanvasWidth ?? payload.canvasWidth ?? 800;
    const toolCH = payload.toolCanvasHeight ?? payload.canvasHeight ?? 600;

    let targetShape = buildExtrudedShape(
      payload.targetEntities,
      payload.targetDistance,
      payload.targetDirection,
      targetCW,
      targetCH
    );
    let toolShape = buildExtrudedShape(
      payload.toolEntities,
      payload.toolDistance,
      payload.toolDirection,
      toolCW,
      toolCH
    );

    // Aplicar traslaciones en espacio OCC.
    // Conversión Three.js → OCC: (dx, dy, dz)_three → (dx, -dz, dy)_occ
    const applyTranslation = (shape: any, t: { x: number; y: number; z: number }) => {
      if (t.x === 0 && t.y === 0 && t.z === 0) return shape;
      const trsf = new oc.gp_Trsf_1();
      trsf.SetTranslation_1(new oc.gp_Vec_4(t.x, -t.z, t.y));
      return new oc.BRepBuilderAPI_Transform_2(shape, trsf, false).Shape();
    };

    if (payload.targetTranslation) {
      targetShape = applyTranslation(targetShape, payload.targetTranslation);
    }
    if (payload.toolTranslation) {
      toolShape = applyTranslation(toolShape, payload.toolTranslation);
    }

    let resultShape: any;
    const progressRange = new oc.Message_ProgressRange_1();
    if (payload.operation === 'union') {
      resultShape = new oc.BRepAlgoAPI_Fuse_3(targetShape, toolShape, progressRange).Shape();
    } else if (payload.operation === 'subtract') {
      resultShape = new oc.BRepAlgoAPI_Cut_3(targetShape, toolShape, progressRange).Shape();
    } else {
      resultShape = new oc.BRepAlgoAPI_Common_3(targetShape, toolShape, progressRange).Shape();
    }

    return rotateGeometry90(triangulateShape(resultShape));
  } catch (error) {
    console.error('[CAD Worker] Boolean failed:', error);
    throw error;
  }
}

// ─── Primitive Execution Functions ───────────────────────────────

function executePrimitiveBox(payload: BoxPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');
  try {
    // Centrar en XZ, height va de 0 a H en Y (consistente con cilindro/cono)
    const corner = new oc.gp_Pnt_3(-payload.width / 2, 0, -payload.depth / 2);
    const shape = new oc.BRepPrimAPI_MakeBox_3(
      corner,
      payload.width,
      payload.height,
      payload.depth
    ).Shape();
    return triangulateShape(shape);
  } catch (error) {
    console.error('[CAD Worker] PrimitiveBox failed:', error);
    throw error;
  }
}

function executePrimitiveSphere(payload: SpherePayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');
  try {
    const shape = new oc.BRepPrimAPI_MakeSphere_1(payload.radius).Shape();
    return triangulateShape(shape);
  } catch (error) {
    console.error('[CAD Worker] PrimitiveSphere failed:', error);
    throw error;
  }
}

function executePrimitiveCylinder(payload: CylinderPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');
  try {
    // Eje Y-up para que la orientación coincida con los presets del UI
    const origin = new oc.gp_Pnt_3(0, 0, 0);
    const dir = new oc.gp_Dir_4(0, 1, 0);
    const axis = new oc.gp_Ax2_3(origin, dir);
    const shape = new oc.BRepPrimAPI_MakeCylinder_3(axis, payload.radius, payload.height).Shape();
    return triangulateShape(shape);
  } catch (error) {
    console.error('[CAD Worker] PrimitiveCylinder failed:', error);
    throw error;
  }
}

function executePrimitiveCone(payload: ConePayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');
  try {
    // Eje Y-up para que la orientación coincida con los presets del UI
    const origin = new oc.gp_Pnt_3(0, 0, 0);
    const dir = new oc.gp_Dir_4(0, 1, 0);
    const axis = new oc.gp_Ax2_3(origin, dir);
    const shape = new oc.BRepPrimAPI_MakeCone_3(
      axis,
      payload.baseRadius,
      payload.topRadius,
      payload.height
    ).Shape();
    return triangulateShape(shape);
  } catch (error) {
    console.error('[CAD Worker] PrimitiveCone failed:', error);
    throw error;
  }
}

function executePrimitiveTorus(payload: TorusPayload): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');
  try {
    // Eje Y-up para que el anillo quede en XZ y el eje principal sea Y
    const origin = new oc.gp_Pnt_3(0, 0, 0);
    const dir = new oc.gp_Dir_4(0, 1, 0);
    const axis = new oc.gp_Ax2_3(origin, dir);
    const shape = new oc.BRepPrimAPI_MakeTorus_5(
      axis,
      payload.majorRadius,
      payload.minorRadius
    ).Shape();
    return triangulateShape(shape);
  } catch (error) {
    console.error('[CAD Worker] PrimitiveTorus failed:', error);
    throw error;
  }
}

/**
 * Triangula un TopoDS_Shape y retorna buffers para Three.js
 */
/**
 * Aplica rotación -90° alrededor del eje X a posiciones y normales:
 *   (x, y, z) → (x, z, -y)
 *
 * Convierte del espacio OCC (cara en plano XY, extrusión en +Z)
 * al espacio Three.js (cara en plano XZ a Y=0, extrusión en +Y).
 * Equivalente al `geo.rotateX(-Math.PI / 2)` que aplica el preview.
 */
function rotateGeometry90(data: GeometryData): GeometryData {
  const { positions, normals } = data;
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1];
    const z = positions[i + 2];
    positions[i + 1] = z;
    positions[i + 2] = -y;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const ny = normals[i + 1];
    const nz = normals[i + 2];
    normals[i + 1] = nz;
    normals[i + 2] = -ny;
  }
  return data;
}

function triangulateShape(shape: any): GeometryData {
  if (!oc) throw new Error('OpenCascade not initialized');

  const { TopAbs_ShapeEnum, TopAbs_Orientation, TopoDS, BRep_Tool } = oc;

  try {
    // Triangular el shape con deflexión lineal de 0.1
    new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.5, true);

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    let indexOffset = 0;

    // Iterar sobre todas las caras del shape
    const faceExplorer = new oc.TopExp_Explorer_2(
      shape,
      TopAbs_ShapeEnum.TopAbs_FACE,
      TopAbs_ShapeEnum.TopAbs_SHAPE
    );

    while (faceExplorer.More()) {
      const face = TopoDS.Face_1(faceExplorer.Current());
      const isReversed = face.Orientation_1() === TopAbs_Orientation.TopAbs_REVERSED;
      const location = new oc.TopLoc_Location_1();
      const triHandle = BRep_Tool.Triangulation(face, location, 0);

      if (!triHandle.IsNull()) {
        const triangulation = triHandle.get();
        const nodeCount = triangulation.NbNodes();
        const triangleCount = triangulation.NbTriangles();
        const trsf = location.Transformation();

        // Extraer vértices con transformación de location
        for (let i = 1; i <= nodeCount; i++) {
          const node = triangulation.Node(i).Transformed(trsf);
          positions.push(node.X(), node.Y(), node.Z());
          // Placeholder, se recalculan con computeVertexNormals en el cliente
          normals.push(0, 0, 1);
        }

        // Extraer índices — invertir winding si la cara está REVERSED
        for (let i = 1; i <= triangleCount; i++) {
          const triangle = triangulation.Triangle(i);
          const [n1, n2, n3] = [triangle.Value(1), triangle.Value(2), triangle.Value(3)];

          if (isReversed) {
            indices.push(indexOffset + n1 - 1, indexOffset + n3 - 1, indexOffset + n2 - 1);
          } else {
            indices.push(indexOffset + n1 - 1, indexOffset + n2 - 1, indexOffset + n3 - 1);
          }
        }

        indexOffset += nodeCount;
      }

      faceExplorer.Next();
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: new Uint32Array(indices),
    };
  } catch (error) {
    console.error('[CAD Worker] Triangulation failed:', error);
    throw error;
  }
}

/**
 * Maneja mensajes del thread principal
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'init': {
        await initializeOpenCascade();
        self.postMessage({ id, type: 'init', success: true });
        break;
      }

      case 'extrude': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeExtrude(payload as ExtrudePayload);
        self.postMessage({ id, type: 'extrude', success: true, geometry });
        break;
      }

      case 'fillet': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeFillet(payload as FilletPayload);
        self.postMessage({ id, type: 'fillet', success: true, geometry });
        break;
      }

      case 'chamfer': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeChamfer(payload as ChamferPayload);
        self.postMessage({ id, type: 'chamfer', success: true, geometry });
        break;
      }

      case 'shell': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeShell(payload as ShellPayload);
        self.postMessage({ id, type: 'shell', success: true, geometry });
        break;
      }

      case 'sweep': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeSweep(payload as SweepPayload);
        self.postMessage({ id, type: 'sweep', success: true, geometry });
        break;
      }

      case 'loft': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeLoft(payload as LoftPayload);
        self.postMessage({ id, type: 'loft', success: true, geometry });
        break;
      }

      case 'revolve': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeRevolve(payload as RevolvePayload);
        self.postMessage({ id, type: 'revolve', success: true, geometry });
        break;
      }

      case 'boolean': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeBoolean(payload as BooleanPayload);
        self.postMessage({ id, type: 'boolean', success: true, geometry });
        break;
      }

      case 'draft': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeDraft(payload as DraftPayload);
        self.postMessage({ id, type: 'draft', success: true, geometry });
        break;
      }

      case 'offset': {
        if (!isInitialized) {
          throw new Error('OpenCascade not initialized. Call init first.');
        }

        const geometry = executeOffset(payload as OffsetPayload);
        self.postMessage({ id, type: 'offset', success: true, geometry });
        break;
      }

      case 'primitive_box': {
        if (!isInitialized) throw new Error('OpenCascade not initialized. Call init first.');
        const geometry = executePrimitiveBox(payload as BoxPayload);
        self.postMessage({ id, type: 'primitive_box', success: true, geometry });
        break;
      }

      case 'primitive_sphere': {
        if (!isInitialized) throw new Error('OpenCascade not initialized. Call init first.');
        const geometry = executePrimitiveSphere(payload as SpherePayload);
        self.postMessage({ id, type: 'primitive_sphere', success: true, geometry });
        break;
      }

      case 'primitive_cylinder': {
        if (!isInitialized) throw new Error('OpenCascade not initialized. Call init first.');
        const geometry = executePrimitiveCylinder(payload as CylinderPayload);
        self.postMessage({ id, type: 'primitive_cylinder', success: true, geometry });
        break;
      }

      case 'primitive_cone': {
        if (!isInitialized) throw new Error('OpenCascade not initialized. Call init first.');
        const geometry = executePrimitiveCone(payload as ConePayload);
        self.postMessage({ id, type: 'primitive_cone', success: true, geometry });
        break;
      }

      case 'primitive_torus': {
        if (!isInitialized) throw new Error('OpenCascade not initialized. Call init first.');
        const geometry = executePrimitiveTorus(payload as TorusPayload);
        self.postMessage({ id, type: 'primitive_torus', success: true, geometry });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    self.postMessage({ id, type, success: false, error: message });
  }
};

// Exportar tipo para el módulo
export type {};
