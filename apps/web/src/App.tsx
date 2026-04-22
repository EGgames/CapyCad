import Canvas3D from './components/canvas/Canvas3D';
import SketchEditor from './components/editor/SketchEditor';
import Toolbar2D from './components/toolbar/Toolbar2D';
import Toolbar3D from './components/toolbar/Toolbar3D';
import Sidebar from './components/sidebar/Sidebar';
import PropertiesPanel from './components/properties/PropertiesPanel';
import DraggablePanel from './components/ui/DraggablePanel';
import PanelToggleMenu from './components/ui/PanelToggleMenu';
import { useSketchStore } from './stores/sketchStore';
import { useCADWorker } from './hooks/useCADWorker';
import { useAutoSave } from './hooks/useAutoSave';
import { Loader2, AlertTriangle, X, Save } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function App() {
  const editMode = useSketchStore((state) => state.editMode);
  const { isInitializing, error } = useCADWorker();
  const { lastSaved } = useAutoSave();
  const [errorDismissed, setErrorDismissed] = useState(false);
  // Lazy-mount del canvas 3D: solo se monta la primera vez que se entra a modo 3D
  const has3DRef = useRef(editMode === '3d');
  const [has3D, setHas3D] = useState(editMode === '3d');
  useEffect(() => {
    if (editMode === '3d' && !has3DRef.current) {
      has3DRef.current = true;
      setHas3D(true);
    }
  }, [editMode]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Indicador de inicialización del CAD Engine */}
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

      {/* Error de inicialización — barra no bloqueante */}
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

      {/* Indicador de auto-guardado (esquina inferior izquierda) */}
      {lastSaved && (
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
          <Save className="h-3 w-3" />
          <span>Guardado {lastSaved.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Canvas — full screen background, both always mounted */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ display: editMode === '2d' ? 'block' : 'none' }}>
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

      {/* Panel toggle menu — top right corner */}
      <PanelToggleMenu />

      {/* Floating Toolbar 2D */}
      <DraggablePanel id="toolbar2d" title="Herramientas 2D" closable>
        <Toolbar2D />
      </DraggablePanel>

      {/* Floating Toolbar 3D */}
      <DraggablePanel id="toolbar3d" title="Herramientas 3D" closable>
        <Toolbar3D />
      </DraggablePanel>

      {/* Floating Sidebar — Feature Tree */}
      <DraggablePanel id="sidebar" title="Feature Tree" closable>
        <Sidebar />
      </DraggablePanel>

      {/* Floating Properties Panel */}
      <DraggablePanel id="properties" title="Propiedades" closable>
        <PropertiesPanel />
      </DraggablePanel>
    </div>
  );
}

export default App;
