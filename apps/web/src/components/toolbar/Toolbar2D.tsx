import {
  Square,
  Circle,
  Minus,
  Move,
  Box,
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
} from 'lucide-react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { exportModel } from '@/lib/export/modelExporter';
import { saveProject, loadProject } from '@/lib/project/projectSerializer';
import { importModelFile } from '@/lib/import/modelImporter';

export default function Toolbar2D() {
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
  } = useSketchStore();
  const { features, geometries, importModel } = useFeatureStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

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

  const fileActions = [
    { icon: FolderOpen, label: 'Abrir', action: 'open' },
    { icon: Save, label: 'Guardar', action: 'save' },
    { icon: Upload, label: 'Importar', action: 'import' },
  ];

  return (
    <div data-testid="toolbar" className="flex items-center px-2 sm:px-4 overflow-x-auto gap-1">
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
          onClick={undo}
          disabled={!canUndo()}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md',
            canUndo() ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
          )}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md',
            canRedo() ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
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
            <span className="text-[10px] text-amber-400/70">1px =</span>
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
