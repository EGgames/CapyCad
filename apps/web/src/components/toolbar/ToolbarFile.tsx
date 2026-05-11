import { Box, Download, Save, FolderOpen, Upload, Undo2, Redo2, ChevronDown } from 'lucide-react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { exportModel } from '@/lib/export/modelExporter';
import { saveProject, loadProject } from '@/lib/project/projectSerializer';
import { importModelFile } from '@/lib/import/modelImporter';
import { usePanelOrientation, usePanelCompact } from '../ui/panelOrientation';
import { toast } from '@/lib/toast';

export default function ToolbarFile() {
  const { editMode, undo, redo, canUndo, canRedo, activeSketch, setEditMode } = useSketchStore();
  const {
    features,
    geometries,
    importModel,
    undo: featureUndo,
    redo: featureRedo,
    canUndo: featureCanUndo,
    canRedo: featureCanRedo,
  } = useFeatureStore();

  const activeUndo = editMode === '3d' ? featureUndo : undo;
  const activeRedo = editMode === '3d' ? featureRedo : redo;
  const activeCanUndo = () => (editMode === '3d' ? featureCanUndo : canUndo());
  const activeCanRedo = () => (editMode === '3d' ? featureCanRedo : canRedo());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportResolution, setExportResolution] = useState<'low' | 'medium' | 'high'>('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const name = activeSketch?.name ?? 'proyecto-sin-nombre';
    saveProject(activeSketch, features, name);
  };

  const handleExportFormat = async (format: 'stl-binary' | 'stl-ascii' | 'obj' | 'm3f') => {
    setShowExportMenu(false);
    if (geometries.size === 0) {
      toast.warning('No hay geometrías 3D para exportar. Crea una extrusión primero.');
      return;
    }
    try {
      const featureGeometries = Array.from(geometries.values());
      await exportModel(featureGeometries, {
        format,
        filename: activeSketch?.name ?? 'modelo',
        resolution: exportResolution,
      });
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error(`Error al exportar: ${(error as Error).message}`);
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
      toast.error(`Error al importar: ${(error as Error).message}`);
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
        toast.success(`Proyecto "${loaded.metadata.name}" cargado correctamente.`);
      } catch (error) {
        console.error('Error al cargar proyecto:', error);
        toast.error(`Error al cargar el archivo: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const fileActions = [
    { icon: FolderOpen, label: 'Abrir', action: 'open' as const },
    { icon: Save, label: 'Guardar', action: 'save' as const },
    { icon: Upload, label: 'Importar', action: 'import' as const },
  ];

  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';
  const isCompact = usePanelCompact();
  const sep = isVertical ? 'my-1 h-px w-full bg-border' : 'mx-2 h-8 w-px bg-border';

  return (
    <div
      data-testid="toolbar-file"
      className={cn(
        'gap-1 px-2',
        isVertical ? 'flex flex-col items-stretch py-2' : 'flex items-center overflow-x-auto'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center',
          isVertical ? 'mb-2' : 'mr-4',
          !isCompact && 'space-x-2',
          isVertical && isCompact && 'justify-center'
        )}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary">
          <Box className="h-5 w-5 text-primary-foreground" />
        </div>
        {!isCompact && <span className="text-lg font-semibold">STL-Model</span>}
      </div>

      {/* Separador */}
      <div className={sep} />

      {/* Toggle Vista 2D / 3D */}
      <div
        className={cn(
          'flex items-center rounded-md border border-border p-1',
          isVertical ? 'self-stretch justify-center' : 'ml-2'
        )}
      >
        <button
          onClick={() => setEditMode('2d')}
          className={cn(
            'flex h-7 items-center rounded transition-colors font-semibold',
            isCompact ? 'px-1.5 text-[10px]' : 'px-3 text-xs',
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
            'flex h-7 items-center rounded transition-colors font-semibold',
            isCompact ? 'px-1.5 text-[10px]' : 'px-3 text-xs',
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
      <div className={sep} />

      {/* Acciones de archivo */}
      <div
        className={cn(
          isVertical
            ? isCompact
              ? 'flex flex-col items-center space-y-1'
              : 'flex flex-col items-stretch space-y-1'
            : 'flex items-center space-x-1'
        )}
      >
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
            className={cn(
              isVertical && !isCompact
                ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
                : 'flex h-9 w-9 items-center justify-center rounded-md',
              'hover:bg-muted'
            )}
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
            {isVertical && !isCompact && <span className="text-sm">{tool.label}</span>}
          </button>
        ))}

        {/* Exportar — dropdown de formatos */}
        <div className="relative">
          <button
            className={cn(
              isVertical && !isCompact
                ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
                : 'flex h-9 w-9 items-center justify-center rounded-md',
              'hover:bg-muted'
            )}
            title="Exportar modelo"
            onClick={() => setShowExportMenu((v) => !v)}
          >
            <Download className="h-4 w-4" />
            {isVertical && !isCompact && <span className="text-sm">Exportar</span>}
            {isVertical && !isCompact && <ChevronDown className="h-3 w-3" />}
          </button>
          {showExportMenu && (
            <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg">
              <div className="border-b border-border px-3 py-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Resolución malla</p>
                <div className="flex gap-1">
                  {(['low', 'medium', 'high'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setExportResolution(r)}
                      className={cn(
                        'flex-1 rounded px-1 py-0.5 text-xs capitalize',
                        exportResolution === r
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {r === 'low' ? 'Baja' : r === 'medium' ? 'Media' : 'Alta'}
                    </button>
                  ))}
                </div>
              </div>
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
      <div className={sep} />

      {/* Undo/Redo */}
      <div
        className={cn(
          isVertical
            ? isCompact
              ? 'flex flex-col items-center space-y-1'
              : 'flex flex-col items-stretch space-y-1'
            : 'flex items-center space-x-1'
        )}
      >
        <button
          onClick={activeUndo}
          disabled={!activeCanUndo()}
          className={cn(
            isVertical && !isCompact
              ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
              : 'flex h-9 w-9 items-center justify-center rounded-md',
            activeCanUndo() ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
          )}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
          {isVertical && !isCompact && <span className="text-sm">Deshacer</span>}
        </button>
        <button
          onClick={activeRedo}
          disabled={!activeCanRedo()}
          className={cn(
            isVertical && !isCompact
              ? 'flex h-9 w-full items-center gap-2 rounded-md px-3'
              : 'flex h-9 w-9 items-center justify-center rounded-md',
            activeCanRedo() ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
          )}
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
          {isVertical && !isCompact && <span className="text-sm">Rehacer</span>}
        </button>
      </div>
    </div>
  );
}
