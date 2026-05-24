import {
  Square,
  Circle,
  Minus,
  Move,
  Box,
  RotateCcw,
  Layers,
  Download,
  Save,
  FolderOpen,
  Upload,
  Undo2,
  Redo2,
  Hexagon,
  Spline,
  Ruler,
  ChevronDown,
  GitBranch,
  CircleDot,
  PenTool,
  BoxSelect,
  Route,
  Combine,
  Grid3x3,
  RefreshCw,
  Slice,
  ArrowUpDown,
  Cuboid,
  Globe,
  Cylinder,
  Triangle,
  Donut,
} from 'lucide-react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { exportModel } from '@/lib/export/modelExporter';
import { saveProject, loadProject } from '@/lib/project/projectSerializer';
import { importModelFile } from '@/lib/import/modelImporter';
import { ALL_DISPLAY_UNITS } from '@/lib/cad/unitConversion';
import {
  ExtrudeDialog,
  RevolveDialog,
  FilletDialog,
  ChamferDialog,
  ShellDialog,
  SweepDialog,
  LoftDialog,
  BooleanDialog,
  LinearPatternDialog,
  CircularPatternDialog,
  DraftDialog,
  OffsetDialog,
  BoxDialog,
  SphereDialog,
  CylinderDialog,
  ConeDialog,
  TorusDialog,
} from './Tool3DDialogs';

type Tool3DAction =
  | 'extrude'
  | 'revolve'
  | 'loft'
  | 'fillet'
  | 'chamfer'
  | 'shell'
  | 'sweep'
  | 'boolean'
  | 'pattern_linear'
  | 'pattern_circular'
  | 'draft'
  | 'offset'
  | 'primitive_box'
  | 'primitive_sphere'
  | 'primitive_cylinder'
  | 'primitive_cone'
  | 'primitive_torus';

export default function Toolbar() {
  const {
    activeTool,
    editMode,
    setActiveTool,
    undo,
    redo,
    canUndo,
    canRedo,
    activeSketch,
    setEditMode,
    polygonSides,
    setPolygonSides,
    measureUnit,
    setMeasureUnit,
    pixelsPerMm,
    setPixelsPerMm,
    selectedEntities,
  } = useSketchStore();
  const {
    createExtrude,
    createRevolve,
    createLoft,
    createFillet,
    createChamfer,
    createShell,
    createSweep,
    createBoolean,
    createLinearPattern,
    createCircularPattern,
    createDraft,
    createOffset,
    createPrimitiveBox,
    createPrimitiveSphere,
    createPrimitiveCylinder,
    createPrimitiveCone,
    createPrimitiveTorus,
    isProcessing,
    features,
    geometries,
    importModel,
    selectedFeatureId,
    undo: featureUndo,
    redo: featureRedo,
    canUndo: featureCanUndo,
    canRedo: featureCanRedo,
    displayUnit,
    setDisplayUnit,
  } = useFeatureStore();

  const activeUndo = editMode === '3d' ? featureUndo : undo;
  const activeRedo = editMode === '3d' ? featureRedo : redo;
  const activeCanUndo = () => (editMode === '3d' ? featureCanUndo : canUndo());
  const activeCanRedo = () => (editMode === '3d' ? featureCanRedo : canRedo());

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeDialog, setActiveDialog] = useState<Tool3DAction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers 3D ──

  const requireSketch = (): boolean => {
    if (!activeSketch || activeSketch.entities.length === 0) {
      alert('No hay un sketch activo con entidades');
      return false;
    }
    return true;
  };

  const requireSelectedFeature = (): string | null => {
    if (!selectedFeatureId) {
      alert('Selecciona una feature 3D primero');
      return null;
    }
    return selectedFeatureId;
  };

  const handleExtrude = async (distance: number, direction: 'positive' | 'negative' | 'both') => {
    if (!requireSketch()) return;
    if (selectedEntities.length === 0) {
      alert('Selecciona al menos una entidad del sketch 2D antes de extruir');
      return;
    }
    const entitiesToExtrude = activeSketch!.entities.filter((e) => selectedEntities.includes(e.id));
    if (entitiesToExtrude.length === 0) {
      alert('Las entidades seleccionadas no se encontraron en el sketch activo');
      return;
    }
    try {
      await createExtrude(activeSketch!.id, entitiesToExtrude, distance, direction);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al extruir:', error);
      alert('Error al extruir. Ver consola para detalles.');
    }
  };

  const handleRevolve = async (axis: 'X' | 'Y' | 'Z', angle: number) => {
    if (!requireSketch()) return;
    try {
      await createRevolve(activeSketch!.id, activeSketch!.entities, axis, angle);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear revolución:', error);
      alert('Error al crear revolución. Ver consola para detalles.');
    }
  };

  const handleFillet = async (radius: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createFillet(featureId, radius);
    } catch (error) {
      console.error('Error al aplicar fillet:', error);
      alert('Error al aplicar fillet. Ver consola para detalles.');
    }
  };

  const handleChamfer = async (distance: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createChamfer(featureId, distance);
    } catch (error) {
      console.error('Error al aplicar chamfer:', error);
      alert('Error al aplicar chamfer. Ver consola para detalles.');
    }
  };

  const handleShell = async (thickness: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createShell(featureId, thickness);
    } catch (error) {
      console.error('Error al aplicar shell:', error);
      alert('Error al aplicar shell. Ver consola para detalles.');
    }
  };

  const handleSweep = async (pathPoints: Array<{ x: number; y: number; z: number }>) => {
    if (!requireSketch()) return;
    try {
      await createSweep(activeSketch!.entities, pathPoints);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear sweep:', error);
      alert('Error al crear sweep. Ver consola para detalles.');
    }
  };

  const handleLoft = async (heightBetween: number, topRadius: number, closed: boolean) => {
    try {
      const sections = [
        {
          entities: [
            { id: 'loft-s1', type: 'circle' as const, center: { x: 0, y: 0 }, radius: 10 },
          ],
          zOffset: 0,
        },
        {
          entities: [
            { id: 'loft-s2', type: 'circle' as const, center: { x: 0, y: 0 }, radius: topRadius },
          ],
          zOffset: heightBetween,
        },
      ];
      await createLoft(sections, closed);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear loft:', error);
      alert('Error al crear loft. Ver consola para detalles.');
    }
  };

  const handleBoolean = async (
    targetId: string,
    toolId: string,
    operation: 'union' | 'subtract' | 'intersect'
  ) => {
    try {
      await createBoolean(targetId, toolId, operation);
    } catch (error) {
      console.error('Error al aplicar booleana:', error);
      alert('Error al aplicar operación booleana. Ver consola para detalles.');
    }
  };

  const handleLinearPattern = async (
    direction: { x: number; y: number; z: number },
    spacing: number,
    instances: number
  ) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createLinearPattern(featureId, direction, spacing, instances);
    } catch (error) {
      console.error('Error al crear patrón lineal:', error);
      alert('Error al crear patrón lineal. Ver consola para detalles.');
    }
  };

  const handleCircularPattern = async (
    axis: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } },
    instances: number,
    totalAngle: number
  ) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createCircularPattern(featureId, axis, instances, totalAngle);
    } catch (error) {
      console.error('Error al crear patrón circular:', error);
      alert('Error al crear patrón circular. Ver consola para detalles.');
    }
  };

  const handleDraft = async (angle: number, neutralPlane: 'XY' | 'XZ' | 'YZ') => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createDraft(featureId, angle, neutralPlane);
    } catch (error) {
      console.error('Error al aplicar draft:', error);
      alert('Error al aplicar draft. Ver consola para detalles.');
    }
  };

  const handleOffset = async (distance: number) => {
    const featureId = requireSelectedFeature();
    if (!featureId) return;
    try {
      await createOffset(featureId, distance);
    } catch (error) {
      console.error('Error al aplicar offset:', error);
      alert('Error al aplicar offset. Ver consola para detalles.');
    }
  };

  const handlePrimitiveBox = async (width: number, height: number, depth: number) => {
    try {
      await createPrimitiveBox(width, height, depth);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear cubo:', error);
      alert('Error al crear cubo. Ver consola para detalles.');
    }
  };

  const handlePrimitiveSphere = async (radius: number) => {
    try {
      await createPrimitiveSphere(radius);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear esfera:', error);
      alert('Error al crear esfera. Ver consola para detalles.');
    }
  };

  const handlePrimitiveCylinder = async (radius: number, height: number) => {
    try {
      await createPrimitiveCylinder(radius, height);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear cilindro:', error);
      alert('Error al crear cilindro. Ver consola para detalles.');
    }
  };

  const handlePrimitiveCone = async (baseRadius: number, topRadius: number, height: number) => {
    try {
      await createPrimitiveCone(baseRadius, topRadius, height);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear cono:', error);
      alert('Error al crear cono. Ver consola para detalles.');
    }
  };

  const handlePrimitiveTorus = async (majorRadius: number, minorRadius: number) => {
    try {
      await createPrimitiveTorus(majorRadius, minorRadius);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al crear toroide:', error);
      alert('Error al crear toroide. Ver consola para detalles.');
    }
  };

  const handle3DToolClick = (action: Tool3DAction) => {
    // Primitive tools don't need sketch or feature
    if (action.startsWith('primitive_')) {
      setActiveDialog(action);
      return;
    }
    // Sketch-based tools need a sketch check before opening dialog
    if ((action === 'extrude' || action === 'revolve' || action === 'sweep') && !requireSketch()) {
      return;
    }
    // Feature-based tools need a selected feature
    if (
      (action === 'fillet' ||
        action === 'chamfer' ||
        action === 'shell' ||
        action === 'pattern_linear' ||
        action === 'pattern_circular' ||
        action === 'draft' ||
        action === 'offset') &&
      !requireSelectedFeature()
    ) {
      return;
    }
    // Boolean needs at least 2 features
    if (action === 'boolean' && features.length < 2) {
      alert('Necesitas al menos 2 features para una operación booleana');
      return;
    }
    setActiveDialog(action);
  };

  const handleSave = () => {
    const name = activeSketch?.name ?? 'proyecto-sin-nombre';
    saveProject(activeSketch, features, name);
  };

  const handleExportFormat = async (format: 'stl-binary' | 'stl-ascii' | 'obj' | 'm3f') => {
    setShowExportMenu(false);
    if (geometries.size === 0) {
      alert('No hay geometrías 3D para exportar. Crea una extrusión primero.');
      return;
    }
    try {
      const featureGeometries = Array.from(geometries.values());
      await exportModel(featureGeometries, {
        format,
        filename: activeSketch?.name ?? 'modelo',
      });
    } catch (error) {
      console.error('Error al exportar:', error);
      alert(`Error al exportar: ${(error as Error).message}`);
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { geometry, format, filename } = await importModelFile(file);
      importModel(filename, format, geometry);
      setEditMode('3d');
    } catch (error) {
      console.error('Error al importar modelo:', error);
      alert(`Error al importar: ${(error as Error).message}`);
    }
    event.target.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      try {
        const loaded = loadProject(content);
        if (loaded.sketch) {
          useSketchStore.setState({ activeSketch: loaded.sketch });
        }
        useFeatureStore.setState({ features: loaded.features });
        alert(`Proyecto "${loaded.metadata.name}" cargado correctamente.`);
      } catch (error) {
        console.error('Error al cargar proyecto:', error);
        alert(`Error al cargar el archivo: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const tools2D = [
    { icon: Move, label: 'Selección', action: 'select' as const },
    { icon: Minus, label: 'Línea (L)', action: 'line' as const },
    { icon: Circle, label: 'Círculo (C)', action: 'circle' as const },
    { icon: Square, label: 'Rectángulo (R)', action: 'rectangle' as const },
    { icon: Hexagon, label: 'Polígono (P)', action: 'polygon' as const },
    { icon: Spline, label: 'Arco (A)', action: 'arc' as const },
    { icon: GitBranch, label: 'Spline (B)', action: 'spline' as const },
    { icon: Ruler, label: 'Medir (M)', action: 'measure' as const },
  ];

  const tools3D: Array<{
    icon: typeof Box;
    label: string;
    action: Tool3DAction;
    needsFeature?: boolean;
  }> = [
    { icon: Box, label: 'Extruir', action: 'extrude' },
    { icon: RotateCcw, label: 'Revolución', action: 'revolve' },
    { icon: Route, label: 'Sweep', action: 'sweep' },
    { icon: Layers, label: 'Loft', action: 'loft' },
    { icon: CircleDot, label: 'Fillet', action: 'fillet', needsFeature: true },
    { icon: PenTool, label: 'Chamfer', action: 'chamfer', needsFeature: true },
    { icon: BoxSelect, label: 'Shell', action: 'shell', needsFeature: true },
    { icon: Combine, label: 'Booleana', action: 'boolean' },
    { icon: Grid3x3, label: 'Patrón Lineal', action: 'pattern_linear', needsFeature: true },
    { icon: RefreshCw, label: 'Patrón Circular', action: 'pattern_circular', needsFeature: true },
    { icon: Slice, label: 'Draft', action: 'draft', needsFeature: true },
    { icon: ArrowUpDown, label: 'Offset', action: 'offset', needsFeature: true },
  ];

  const toolsPrimitives: Array<{
    icon: typeof Box;
    label: string;
    action: Tool3DAction;
  }> = [
    { icon: Cuboid, label: 'Cubo', action: 'primitive_box' },
    { icon: Globe, label: 'Esfera', action: 'primitive_sphere' },
    { icon: Cylinder, label: 'Cilindro', action: 'primitive_cylinder' },
    { icon: Triangle, label: 'Cono', action: 'primitive_cone' },
    { icon: Donut, label: 'Toroide', action: 'primitive_torus' },
  ];

  const fileActions = [
    { icon: FolderOpen, label: 'Abrir', action: 'open' },
    { icon: Save, label: 'Guardar', action: 'save' },
    { icon: Upload, label: 'Importar', action: 'import' },
  ];

  return (
    <div data-testid="toolbar" className="flex items-center px-2 overflow-x-auto gap-1">
      {/* Logo */}
      <div className="mr-6 flex items-center space-x-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
          <Box className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">STL-Model</span>
      </div>

      {/* Separador */}
      <div className="h-8 w-px bg-border" />

      {/* Toggle Vista 2D / 3D */}
      <div className="ml-4 flex items-center rounded-md border border-border p-1">
        <button
          onClick={() => setEditMode('2d')}
          className={cn(
            'flex h-7 items-center rounded px-3 text-xs font-semibold transition-colors',
            editMode === '2d'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          title="Vista 2D — Editor de sketch"
        >
          2D
        </button>
        <button
          onClick={() => setEditMode('3d')}
          className={cn(
            'flex h-7 items-center rounded px-3 text-xs font-semibold transition-colors',
            editMode === '3d'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          title="Vista 3D — Canvas tridimensional"
        >
          3D
        </button>
      </div>

      {/* Separador */}
      <div className="h-8 w-px bg-border" />

      {/* Acciones de archivo */}
      <div className="ml-4 flex items-center space-x-1">
        {/* Input oculto para abrir .stlm */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".stlm"
          className="hidden"
          onChange={handleFileChange}
        />
        {/* Input oculto para importar STL/OBJ */}
        <input
          ref={importFileInputRef}
          type="file"
          accept=".stl,.obj"
          className="hidden"
          onChange={handleImportFileChange}
        />
        {fileActions.map((tool) => (
          <button
            key={tool.action}
            className="flex h-9 items-center space-x-2 rounded-md px-3 hover:bg-muted"
            title={tool.label}
            onClick={
              tool.action === 'save'
                ? handleSave
                : tool.action === 'import'
                  ? handleImportFile
                  : handleOpenFile
            }
          >
            <tool.icon className="h-4 w-4" />
            <span className="text-sm">{tool.label}</span>
          </button>
        ))}

        {/* Exportar — dropdown de formatos */}
        <div className="relative">
          <button
            className="flex h-9 items-center space-x-2 rounded-md px-3 hover:bg-muted"
            title="Exportar modelo"
            onClick={() => setShowExportMenu((v) => !v)}
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">Exportar</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showExportMenu && (
            <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg">
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleExportFormat('stl-binary')}
              >
                STL Binario
              </button>
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleExportFormat('stl-ascii')}
              >
                STL ASCII
              </button>
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleExportFormat('obj')}
              >
                OBJ
              </button>
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleExportFormat('m3f')}
              >
                M3F (Manufactura)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Separador */}
      <div className="mx-4 h-8 w-px bg-border" />

      {/* Undo/Redo */}
      <div className="flex items-center space-x-1">
        <button
          onClick={activeUndo}
          disabled={!activeCanUndo()}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md',
            activeCanUndo() ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
          )}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={activeRedo}
          disabled={!activeCanRedo()}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md',
            activeCanRedo() ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
          )}
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Separador */}
      <div className="mx-4 h-8 w-px bg-border" />

      {/* Herramientas 2D */}
      <div className="flex items-center space-x-1">
        <span className="mr-2 text-xs font-medium text-muted-foreground">2D:</span>
        {tools2D.map((tool) => (
          <button
            key={tool.action}
            onClick={() => setActiveTool(tool.action)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md',
              activeTool === tool.action ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
        {/* Config medición: unidad y escala */}
        {activeTool === 'measure' && (
          <div className="ml-2 flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/30 px-2 py-0.5">
            {/* Toggle mm / ft */}
            <button
              onClick={() => setMeasureUnit('mm')}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold transition-colors',
                measureUnit === 'mm'
                  ? 'bg-amber-500 text-black'
                  : 'text-amber-400 hover:bg-amber-500/20'
              )}
              title="Milimetros"
            >
              mm
            </button>
            <button
              onClick={() => setMeasureUnit('ft')}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold transition-colors',
                measureUnit === 'ft'
                  ? 'bg-amber-500 text-black'
                  : 'text-amber-400 hover:bg-amber-500/20'
              )}
              title="Pies"
            >
              ft
            </button>
            <div className="mx-1 h-5 w-px bg-amber-500/30" />
            {/* Escala px/mm */}
            <span className="text-[10px] text-amber-400/70">1px =</span>
            <input
              type="number"
              value={pixelsPerMm}
              min={0.01}
              step={0.1}
              onChange={(e) => setPixelsPerMm(parseFloat(e.target.value) || 1)}
              className="w-14 rounded border border-amber-500/30 bg-transparent px-1 text-xs text-amber-300 focus:border-amber-400 focus:outline-none"
              title="Píxeles por milímetro"
            />
            <span className="text-[10px] text-amber-400/70">mm</span>
          </div>
        )}
        {activeTool === 'polygon' && (
          <div className="ml-1 flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">Lados:</span>
            <button
              onClick={() => setPolygonSides(Math.max(3, polygonSides - 1))}
              className="flex h-6 w-6 items-center justify-center rounded bg-muted text-sm font-bold hover:bg-muted/70"
              title="Menos lados"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold">{polygonSides}</span>
            <button
              onClick={() => setPolygonSides(Math.min(20, polygonSides + 1))}
              className="flex h-6 w-6 items-center justify-center rounded bg-muted text-sm font-bold hover:bg-muted/70"
              title="Más lados"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="mx-4 h-8 w-px bg-border" />

      {/* Herramientas 3D */}
      <div className="flex items-center space-x-1">
        <span className="mr-2 text-xs font-medium text-muted-foreground">3D:</span>
        {tools3D.map((tool) => (
          <button
            key={tool.action}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md',
              isProcessing
                ? 'cursor-wait opacity-50'
                : tool.needsFeature && !selectedFeatureId
                  ? 'opacity-40 hover:bg-muted'
                  : 'hover:bg-muted'
            )}
            title={tool.label}
            onClick={() => handle3DToolClick(tool.action)}
            disabled={isProcessing}
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Separador */}
      <div className="mx-4 h-8 w-px bg-border" />

      {/* Selector de unidad 3D */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-0.5">
        <span className="text-[10px] text-muted-foreground">Unidad:</span>
        <select
          value={displayUnit}
          onChange={(e) => setDisplayUnit(e.target.value as (typeof ALL_DISPLAY_UNITS)[number])}
          className="rounded border-none bg-transparent text-xs focus:outline-none"
          title="Unidad de medida 3D"
        >
          {ALL_DISPLAY_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Primitivas 3D */}
      <div className="flex items-center space-x-1">
        <span className="mr-2 text-xs font-medium text-muted-foreground">Figuras:</span>
        {toolsPrimitives.map((tool) => (
          <button
            key={tool.action}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md',
              isProcessing ? 'cursor-wait opacity-50' : 'hover:bg-muted'
            )}
            title={tool.label}
            onClick={() => handle3DToolClick(tool.action)}
            disabled={isProcessing}
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* 3D Tool Dialogs */}
      <ExtrudeDialog
        open={activeDialog === 'extrude'}
        onClose={() => setActiveDialog(null)}
        onApply={handleExtrude}
      />
      <RevolveDialog
        open={activeDialog === 'revolve'}
        onClose={() => setActiveDialog(null)}
        onApply={handleRevolve}
      />
      <FilletDialog
        open={activeDialog === 'fillet'}
        onClose={() => setActiveDialog(null)}
        onApply={handleFillet}
      />
      <ChamferDialog
        open={activeDialog === 'chamfer'}
        onClose={() => setActiveDialog(null)}
        onApply={handleChamfer}
      />
      <ShellDialog
        open={activeDialog === 'shell'}
        onClose={() => setActiveDialog(null)}
        onApply={handleShell}
      />
      <SweepDialog
        open={activeDialog === 'sweep'}
        onClose={() => setActiveDialog(null)}
        onApply={handleSweep}
      />
      <LoftDialog
        open={activeDialog === 'loft'}
        onClose={() => setActiveDialog(null)}
        onApply={handleLoft}
      />
      <BooleanDialog
        open={activeDialog === 'boolean'}
        onClose={() => setActiveDialog(null)}
        onApply={handleBoolean}
        featureNames={features.map((f) => ({ id: f.id, name: f.name }))}
      />
      <LinearPatternDialog
        open={activeDialog === 'pattern_linear'}
        onClose={() => setActiveDialog(null)}
        onApply={handleLinearPattern}
      />
      <CircularPatternDialog
        open={activeDialog === 'pattern_circular'}
        onClose={() => setActiveDialog(null)}
        onApply={handleCircularPattern}
      />
      <DraftDialog
        open={activeDialog === 'draft'}
        onClose={() => setActiveDialog(null)}
        onApply={handleDraft}
      />
      <OffsetDialog
        open={activeDialog === 'offset'}
        onClose={() => setActiveDialog(null)}
        onApply={handleOffset}
      />
      <BoxDialog
        open={activeDialog === 'primitive_box'}
        onClose={() => setActiveDialog(null)}
        onApply={handlePrimitiveBox}
      />
      <SphereDialog
        open={activeDialog === 'primitive_sphere'}
        onClose={() => setActiveDialog(null)}
        onApply={handlePrimitiveSphere}
      />
      <CylinderDialog
        open={activeDialog === 'primitive_cylinder'}
        onClose={() => setActiveDialog(null)}
        onApply={handlePrimitiveCylinder}
      />
      <ConeDialog
        open={activeDialog === 'primitive_cone'}
        onClose={() => setActiveDialog(null)}
        onApply={handlePrimitiveCone}
      />
      <TorusDialog
        open={activeDialog === 'primitive_torus'}
        onClose={() => setActiveDialog(null)}
        onApply={handlePrimitiveTorus}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Indicador de modo */}
      <div className="flex items-center space-x-2 rounded-md bg-muted px-3 py-1.5 text-sm">
        {activeTool === 'select' ? (
          <>
            <Move className="h-4 w-4" />
            <span>Modo: Selección</span>
          </>
        ) : (
          <>
            {tools2D.find((t) => t.action === activeTool)?.icon && (
              <>
                {(() => {
                  const Icon = tools2D.find((t) => t.action === activeTool)!.icon;
                  return <Icon className="h-4 w-4" />;
                })()}
                <span>{tools2D.find((t) => t.action === activeTool)?.label.split(' (')[0]}</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
