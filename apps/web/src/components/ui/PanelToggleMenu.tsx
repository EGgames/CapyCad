import { useState } from 'react';
import {
  LayoutPanelTop,
  Eye,
  EyeOff,
  PanelTop,
  PanelLeft,
  PanelRight,
  Cuboid,
  FolderOpen,
  Combine,
  RotateCcw,
} from 'lucide-react';
import { useUIStore, type PanelId } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const PANEL_LABELS: Record<PanelId, { label: string; icon: typeof PanelTop }> = {
  toolbarFile: { label: 'Archivo', icon: FolderOpen },
  toolbar2d: { label: 'Herramientas 2D', icon: PanelTop },
  toolbar3d: { label: 'Herramientas 3D', icon: Cuboid },
  toolbarBoolean: { label: 'Booleanas', icon: Combine },
  sidebar: { label: 'Feature Tree', icon: PanelLeft },
  properties: { label: 'Propiedades', icon: PanelRight },
};

export default function PanelToggleMenu() {
  const panels = useUIStore((s) => s.panels);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const resetLayout = useUIStore((s) => s.resetLayout);
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-2 right-2 z-50">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-md hover:bg-muted transition-colors',
          open && 'bg-muted'
        )}
        title="Mostrar/Ocultar paneles"
      >
        <LayoutPanelTop className="h-4 w-4" />
        <span className="hidden sm:inline">Paneles</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-card p-1.5 shadow-xl">
          {(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => {
            const { label, icon: Icon } = PANEL_LABELS[id];
            const visible = panels[id].visible;
            return (
              <button
                key={id}
                onClick={() => togglePanel(id)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">{label}</span>
                {visible ? (
                  <Eye className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            );
          })}
          <div className="my-1 h-px bg-border" />
          <button
            onClick={() => {
              if (confirm('¿Restaurar la disposición de paneles por defecto?')) {
                resetLayout();
                setOpen(false);
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">Restaurar disposición</span>
          </button>
        </div>
      )}
    </div>
  );
}
