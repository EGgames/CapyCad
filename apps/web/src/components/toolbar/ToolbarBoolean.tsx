import { useFeatureStore } from '@/stores/featureStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { FeatureType } from '@stl-model/shared-types';
import { usePanelOrientation } from '../ui/panelOrientation';

const OPERATIONS = [
  {
    type: 'union' as const,
    label: 'Unión',
    title: 'Unir dos sólidos',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" />
        <path d="M12 7.27A5 5 0 0 1 15 12a5 5 0 0 1-3 4.73" strokeOpacity="0" />
        <path d="M9 7a5 5 0 0 1 0 10" className="fill-current opacity-20" stroke="none" />
        <path d="M15 7a5 5 0 0 1 0 10" className="fill-current opacity-20" stroke="none" />
      </svg>
    ),
  },
  {
    type: 'subtract' as const,
    label: 'Resta',
    title: 'Restar un sólido de otro (A − B)',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" className="fill-current opacity-25" />
      </svg>
    ),
  },
  {
    type: 'intersect' as const,
    label: 'Intersección',
    title: 'Mantener solo la zona común (A ∩ B)',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" />
        {/* Zona de intersección rellenada */}
        <clipPath id="bool-clip-a">
          <circle cx="9" cy="12" r="5" />
        </clipPath>
        <circle cx="15" cy="12" r="5" className="fill-current opacity-30" clipPath="url(#bool-clip-a)" stroke="none" />
      </svg>
    ),
  },
] as const;

export default function ToolbarBoolean() {
  const { isProcessing, features } = useFeatureStore();
  const { startBooleanWizard, booleanWizard } = useUIStore();
  const orientation = usePanelOrientation();
  const isVertical = orientation === 'vertical';

  const SOLID_TYPES = [
    FeatureType.EXTRUDE,
    FeatureType.PRIMITIVE_BOX,
    FeatureType.PRIMITIVE_SPHERE,
    FeatureType.PRIMITIVE_CYLINDER,
    FeatureType.PRIMITIVE_CONE,
    FeatureType.PRIMITIVE_TORUS,
    FeatureType.BOOLEAN,
  ] as const;
  const solidFeatures = features.filter((f) => (SOLID_TYPES as readonly string[]).includes(f.type));
  const canRun = solidFeatures.length >= 2 && !isProcessing;

  return (
    <div
      data-testid="toolbar-boolean"
      className={cn(
        'gap-1 px-2 sm:px-4',
        isVertical ? 'flex flex-col items-stretch py-2' : 'flex items-center overflow-x-auto'
      )}
    >
      <div
        className={cn(
          isVertical ? 'flex flex-col items-stretch space-y-1' : 'flex items-center space-x-1'
        )}
      >
        <span
          className={cn(
            'text-xs font-medium text-muted-foreground',
            isVertical ? 'mb-1' : 'mr-2'
          )}
        >
          Booleana:
        </span>

        {OPERATIONS.map((op) => {
          const isActive = booleanWizard?.operation === op.type;
          return (
            <button
              key={op.type}
              data-testid={`boolean-${op.type}-btn`}
              title={canRun ? op.title : 'Necesitas al menos 2 sólidos'}
              disabled={isProcessing}
              onClick={() => startBooleanWizard(op.type)}
              className={cn(
                'flex h-9 items-center gap-2 rounded-md px-3 transition-colors',
                isVertical && 'justify-start',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : canRun
                    ? 'hover:bg-muted text-foreground'
                    : 'opacity-40 cursor-not-allowed text-muted-foreground',
                isProcessing && 'cursor-wait opacity-50'
              )}
            >
              {op.icon}
              <span className="text-sm">{op.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

