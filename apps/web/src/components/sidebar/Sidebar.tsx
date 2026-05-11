import {
  Box,
  Eye,
  EyeOff,
  FileText,
  RotateCcw,
  Layers,
  Triangle,
  Minus,
  AlignJustify,
  Copy,
  GitMerge,
  Download,
  Sliders,
} from 'lucide-react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { FeatureType } from '@stl-model/shared-types';

export default function Sidebar() {
  const { activeSketch, createSketch, setEditMode } = useSketchStore();
  const { features, selectFeature, selectedFeatureId, updateFeature } = useFeatureStore();

  // Función para crear un nuevo sketch
  const handleNewSketch = () => {
    const sketchName = `Sketch${String(Date.now()).slice(-3)}`;
    createSketch(sketchName, 'XY');
    setEditMode('2d');
  };

  // Combinar sketch activo con features 3D
  const allFeatures = [
    ...(activeSketch
      ? [
          {
            id: activeSketch.id,
            name: activeSketch.name,
            type: 'sketch',
            visible: true,
            entityCount: activeSketch.entities.length,
          },
        ]
      : []),
    ...features.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      visible: f.visible,
      suppressed: f.suppressed,
    })),
  ];

  const getFeatureIcon = (type: string) => {
    if (type === 'sketch') return FileText;
    switch (type) {
      case FeatureType.EXTRUDE:
        return Box;
      case FeatureType.REVOLVE:
        return RotateCcw;
      case FeatureType.SWEEP:
        return Layers;
      case FeatureType.LOFT:
        return Layers;
      case FeatureType.FILLET:
        return Triangle;
      case FeatureType.CHAMFER:
        return Minus;
      case FeatureType.BEVEL:
        return Minus;
      case FeatureType.COVE:
        return Triangle;
      case FeatureType.SHELL:
        return Box;
      case FeatureType.PATTERN_LINEAR:
        return AlignJustify;
      case FeatureType.PATTERN_CIRCULAR:
        return Copy;
      case FeatureType.BOOLEAN:
        return GitMerge;
      case FeatureType.IMPORT:
        return Download;
      case FeatureType.DRAFT:
        return Sliders;
      default:
        return Box;
    }
  };

  return (
    <div data-testid="sidebar" className="flex w-full min-w-0 flex-col">
      {/* Feature list */}
      <div className="flex-1 overflow-y-auto p-2">
        {allFeatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Box className="mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Sin features aún</p>
            <p className="text-xs">Comienza dibujando un sketch</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {allFeatures.map((feature) => {
              const Icon = getFeatureIcon(feature.type);
              const isSelected = feature.id === selectedFeatureId;

              return (
                <li
                  key={feature.id}
                  className={`group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted ${
                    isSelected ? 'bg-primary/10' : 'bg-muted/50'
                  }`}
                  onClick={() => {
                    if (feature.type !== 'sketch') {
                      selectFeature(feature.id);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Icon
                      className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{feature.name}</span>
                      {feature.type === 'sketch' && 'entityCount' in feature && (
                        <span className="text-xs text-muted-foreground">
                          {feature.entityCount} entidad
                          {feature.entityCount !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {'suppressed' in feature && feature.suppressed && (
                        <span className="text-xs text-destructive">Suprimido</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title={feature.visible ? 'Ocultar' : 'Mostrar'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (feature.type !== 'sketch') {
                        updateFeature(feature.id, { visible: !feature.visible });
                      }
                    }}
                  >
                    {feature.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-2">
        <button
          onClick={handleNewSketch}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nuevo Sketch
        </button>
        {activeSketch && (
          <button
            onClick={() => setEditMode('3d')}
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Ver en 3D
          </button>
        )}
      </div>
    </div>
  );
}
