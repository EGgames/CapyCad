'use client';

import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import type { FeatureMaterial } from '@/lib/materials/materialPresets';

interface MaterialSpherePreviewProps {
  material: FeatureMaterial;
  size?: number; // px
}

/**
 * Vista previa de material en esfera 3D (FUNC-020 — PRD).
 * Embebe un Canvas r3f mínimo para renderizar una esfera con el material activo.
 */
export default function MaterialSpherePreview({ material, size = 56 }: MaterialSpherePreviewProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-full border border-border"
    >
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 35 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} />
        <pointLight position={[-2, -2, -1]} intensity={0.4} />
        <Environment preset="studio" environmentIntensity={0.8} />
        <mesh>
          <sphereGeometry args={[0.85, 48, 48]} />
          <meshStandardMaterial
            color={material.color}
            metalness={material.metalness}
            roughness={material.roughness}
            opacity={material.opacity}
            transparent={material.transparent}
            emissive={material.emissive ?? '#000000'}
            emissiveIntensity={material.emissiveIntensity ?? 0}
            wireframe={material.wireframe ?? false}
            envMapIntensity={1.0}
          />
        </mesh>
      </Canvas>
    </div>
  );
}
