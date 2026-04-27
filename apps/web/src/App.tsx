import Canvas3D from './components/canvas/Canvas3D';
import SketchEditor from './components/editor/SketchEditor';
import ToolbarFile from './components/toolbar/ToolbarFile';
import Toolbar2D from './components/toolbar/Toolbar2D';
import Toolbar3D from './components/toolbar/Toolbar3D';
import ToolbarBoolean from './components/toolbar/ToolbarBoolean';
import Sidebar from './components/sidebar/Sidebar';
import PropertiesPanel from './components/properties/PropertiesPanel';
import DraggablePanel from './components/ui/DraggablePanel';
import PanelToggleMenu from './components/ui/PanelToggleMenu';
import DockZone from './components/ui/DockZone';
import DockDropOverlay from './components/ui/DockDropOverlay';
import { useSketchStore } from './stores/sketchStore';
import { useUIStore, type PanelId } from './stores/uiStore';
import { useCADWorker } from './hooks/useCADWorker';
import { useAutoSave } from './hooks/useAutoSave';
import { Loader2, AlertTriangle, X, Save } from 'lucide-react';
import { useState, useEffect, useRef, type ReactNode } from 'react';

function App() {
  const editMode = useSketchStore((state) => state.editMode);
  const panels = useUIStore((s) => s.panels);
  const { isInitializing, error } = useCADWorker();
  const { lastSaved } = useAutoSave();
  const [errorDismissed, setErrorDismissed] = useState(false);
  // Lazy-mount del canvas 3D
  const has3DRef = useRef(editMode === '3d');
  const [has3D, setHas3D] = useState(editMode === '3d');
  useEffect(() => {
    if (editMode === '3d' && !has3DRef.current) {
      has3DRef.current = true;
      setHas3D(true);
    }
  }, [editMode]);

  // Build a map of all panel nodes (rendered once, placed via dock or floating)
  const panelNodes: Record<PanelId, ReactNode> = {
    toolbarFile: (
      <DraggablePanel id="toolbarFile" title="Archivo" closable>
        <ToolbarFile />
      </DraggablePanel>
    ),
    toolbar2d: (
      <DraggablePanel id="toolbar2d" title="Herramientas 2D" closable>
        <Toolbar2D />
      </DraggablePanel>
    ),
    toolbar3d: (
      <DraggablePanel id="toolbar3d" title="Herramientas 3D" closable>
        <Toolbar3D />
      </DraggablePanel>
    ),
    toolbarBoolean: (
      <DraggablePanel id="toolbarBoolean" title="Booleanas" closable>
        <ToolbarBoolean />
      </DraggablePanel>
    ),
    sidebar: (
      <DraggablePanel id="sidebar" title="Feature Tree" closable>
        <Sidebar />
      </DraggablePanel>
    ),
    properties: (
      <DraggablePanel id="properties" title="Propiedades" closable>
        <PropertiesPanel />
      </DraggablePanel>
    ),
  };

  const floatingIds = (Object.keys(panels) as PanelId[]).filter(
    (id) => panels[id].dock === 'floating' && panels[id].visible
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background flex flex-col">
      {/* CAD init overlay */}
      {isInitializing && (
        <div
          data-testid="cad-init-overlay"
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">Iniciando Motor CAD...</p>
              <p className="text-sm text-muted-foreground">Cargando OpenCascade.js</p>
            </div>
          </div>
        </div>
      )}

      {/* CAD error banner */}
      {error && !errorDismissed && (
        <div className="absolute top-14 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-950/90 px-4 py-2 text-sm shadow-lg backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
          <span className="text-yellow-200">
            Motor CAD no disponible — funciones 3D deshabilitadas
          </span>
          <button
            onClick={() => setErrorDismissed(true)}
            className="ml-2 rounded p-0.5 hover:bg-yellow-500/20"
            title="Cerrar"
          >
            <X className="h-3.5 w-3.5 text-yellow-400" />
          </button>
        </div>
      )}

      {/* Top dock */}
      <DockZone side="top">{panelNodes}</DockZone>

      <div className="relative flex flex-1 min-h-0">
        {/* Left dock */}
        <DockZone side="left">{panelNodes}</DockZone>

        {/* Center work area */}
        <div className="relative flex-1 min-w-0">
          {/* Canvases */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{ display: editMode === '2d' ? 'block' : 'none' }}
            >
              <SketchEditor />
            </div>
            {has3D && (
              <div
                className="absolute inset-0"
                style={{ display: editMode === '3d' ? 'block' : 'none' }}
              >
                <Canvas3D />
              </div>
            )}
          </div>

          {/* Floating panels overlay (absolute within work area) */}
          {floatingIds.map((id) => (
            <div key={id}>{panelNodes[id]}</div>
          ))}

          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
              <Save className="h-3 w-3" />
              <span>Guardado {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}

          {/* Panel toggle menu */}
          <PanelToggleMenu />
        </div>

        {/* Right dock */}
        <DockZone side="right">{panelNodes}</DockZone>
      </div>

      {/* Bottom dock */}
      <DockZone side="bottom">{panelNodes}</DockZone>

      {/* Dock drop overlay (visible while dragging) */}
      <DockDropOverlay />
    </div>
  );
}

export default App;
