/**
 * Hook para inicializar el CAD Worker
 *
 * Inicializa OpenCascade.js en el Web Worker.
 *
 * Por defecto inicializa en el mount (compatibilidad).
 * Con `deferred: true`, retrasa la inicialización a `requestIdleCallback` (o
 * setTimeout 1s) para no competir con el render inicial — útil cuando el
 * usuario abre la app en 2D y aún no necesita el motor 3D.
 *
 * Devuelve `triggerInit()` para forzar la inicialización inmediata (p. ej.,
 * cuando el usuario entra a 3D antes de que termine el idle).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCADWorker } from '../lib/cad/cadWorkerClient';

interface UseCADWorkerOptions {
  /** Si es true, retrasa el init a idle time. Default: false (init inmediato). */
  deferred?: boolean;
  /** Si es false, no inicializa automáticamente; usar `triggerInit()`. Default: true. */
  autoInit?: boolean;
}

interface UseCADWorkerReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  /** Dispara el init si aún no comenzó. Idempotente. */
  triggerInit: () => void;
}

type IdleCallbackHandle = number;
type IdleRequestCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;
const ricWindow = typeof window !== 'undefined' ? (window as unknown as {
  requestIdleCallback?: (cb: IdleRequestCallback, opts?: { timeout: number }) => IdleCallbackHandle;
  cancelIdleCallback?: (id: IdleCallbackHandle) => void;
}) : undefined;

export function useCADWorker(options: UseCADWorkerOptions = {}): UseCADWorkerReturn {
  const { deferred = false, autoInit = true } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);

  const startInit = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    setIsInitializing(true);
    setError(null);

    (async () => {
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

        if (mountedRef.current) {
          setIsInitialized(true);
          console.log('[useCADWorker] CAD Worker initialized successfully');
        }
      } catch (err) {
        console.error('[useCADWorker] Failed to initialize CAD Worker:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
        // Permitir reintento si falló
        startedRef.current = false;
      } finally {
        if (mountedRef.current) {
          setIsInitializing(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!autoInit) return () => { mountedRef.current = false; };

    let idleHandle: IdleCallbackHandle | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    if (deferred) {
      // Esperar a idle para no competir con el render inicial.
      // Fallback a setTimeout cuando requestIdleCallback no está disponible.
      if (ricWindow?.requestIdleCallback) {
        idleHandle = ricWindow.requestIdleCallback(() => startInit(), { timeout: 2500 });
      } else {
        timeoutHandle = setTimeout(startInit, 1000);
      }
    } else {
      startInit();
    }

    return () => {
      mountedRef.current = false;
      if (idleHandle !== null && ricWindow?.cancelIdleCallback) {
        ricWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    };
  }, [autoInit, deferred, startInit]);

  return { isInitialized, isInitializing, error, triggerInit: startInit };
}
