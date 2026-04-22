/**
 * Hook para inicializar el CAD Worker
 *
 * Inicializa OpenCascade.js en el Web Worker cuando se monta la aplicación.
 * Muestra estado de carga y maneja errores.
 */

import { useEffect, useState } from 'react';
import { getCADWorker } from '../lib/cad/cadWorkerClient';

interface UseCADWorkerReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
}

export function useCADWorker(): UseCADWorkerReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initWorker() {
      if (isInitialized || isInitializing) return;

      setIsInitializing(true);
      setError(null);

      try {
        console.log('[useCADWorker] Initializing CAD Worker...');
        const worker = getCADWorker();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('CAD engine initialization timed out after 20s')),
            20_000
          )
        );

        await Promise.race([worker.initialize(), timeoutPromise]);

        if (mounted) {
          setIsInitialized(true);
          console.log('[useCADWorker] CAD Worker initialized successfully');
        }
      } catch (err) {
        console.error('[useCADWorker] Failed to initialize CAD Worker:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    initWorker();

    // Cleanup: No terminamos el worker aquí porque puede ser usado en toda la sesión
    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, isInitializing, error };
}
