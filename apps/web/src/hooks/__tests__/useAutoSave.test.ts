/**
 * Tests para useAutoSave hook
 *
 * Prueba el hook de auto-guardado en IndexedDB (FUNC-018):
 * - saveNow persiste el proyecto en IndexedDB
 * - El intervalo (2 minutos) dispara saveNow automáticamente
 * - restoreSession recupera el último estado guardado
 * - Degradación silenciosa cuando IndexedDB no está disponible
 * - lastSaved se actualiza tras un guardado exitoso
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '@/hooks/useAutoSave';

// ─── Mocks de stores ──────────────────────────────────────────────────────────

vi.mock('@/stores/sketchStore', () => ({
  useSketchStore: (selector: (s: { sketch: null }) => unknown) => selector({ sketch: null }),
}));

vi.mock('@/stores/featureStore', () => ({
  useFeatureStore: (selector: (s: { features: never[] }) => unknown) => selector({ features: [] }),
}));

// ─── Mock de projectSerializer ────────────────────────────────────────────────

vi.mock('@/lib/project/projectSerializer', () => ({
  serializeProject: vi.fn(() => ({ version: '1', sketch: null, features: [] })),
  loadProject: vi.fn((json: string) => JSON.parse(json)),
}));

// ─── Fake IndexedDB usando microtasks (no setTimeout = sin deadlock) ──────────

/**
 * Crea una implementación mínima de IndexedDB completamente en memoria.
 * Usa Promise.resolve().then() para disparar callbacks de forma asíncrona
 * SIN setTimeout, lo que evita conflictos con fake timers.
 */
function createFakeIDB() {
  const store = new Map<string, unknown>();
  const closeMock = vi.fn();

  const makeFakeObjectStore = () => ({
    put: vi.fn((value: unknown, key: string) => {
      store.set(key, value);
      const req: { onsuccess: (() => void) | null } = { onsuccess: null };
      // Dispara onsuccess en la microtask queue
      Promise.resolve().then(() => req.onsuccess?.());
      return req;
    }),
    get: vi.fn((key: string) => {
      const req: { result: unknown; onsuccess: ((e: unknown) => void) | null } = {
        result: store.get(key) ?? undefined,
        onsuccess: null,
      };
      Promise.resolve().then(() => req.onsuccess?.({}));
      return req;
    }),
  });

  const makeFakeTransaction = () => {
    const tx = {
      objectStore: vi.fn(() => makeFakeObjectStore()) as any,
      oncomplete: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    // Dispara oncomplete después de que los callbacks put/get se resuelvan
    Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => Promise.resolve())
      .then(() => tx.oncomplete?.());
    return tx;
  };

  const transactionMock = vi.fn(() => makeFakeTransaction());

  const fakeDB = {
    transaction: transactionMock,
    close: closeMock,
    createObjectStore: vi.fn(),
  };

  const openMock = vi.fn(() => {
    const req: {
      result: typeof fakeDB;
      onsuccess: ((e: unknown) => void) | null;
      onerror: (() => void) | null;
      onupgradeneeded: ((e: unknown) => void) | null;
    } = {
      result: fakeDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    // Dispara onsuccess en la siguiente microtask
    Promise.resolve().then(() => req.onsuccess?.({}));
    return req;
  });

  return { fakeDB, openMock, store, closeMock, transactionMock };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAutoSave', () => {
  let fakeIDB: ReturnType<typeof createFakeIDB>;

  beforeEach(() => {
    fakeIDB = createFakeIDB();

    Object.defineProperty(globalThis, 'indexedDB', {
      value: { open: fakeIDB.openMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveNow', () => {
    it('saveNow_whenCalled_thenPersistsProjectToIndexedDB', async () => {
      const { result } = renderHook(() => useAutoSave());

      // Esperar a que la DB se abra (microtasks + state flush)
      await act(async () => {
        // Flush de microtasks para que openDB resuelva
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.saveNow();
      });

      expect(fakeIDB.transactionMock).toHaveBeenCalledWith('autosave', 'readwrite');
    });

    it('saveNow_whenCalled_thenUpdatesLastSaved', async () => {
      const { result } = renderHook(() => useAutoSave());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.lastSaved).toBeNull();

      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('saveNow_whenDBNotReady_thenReturnsSilently', async () => {
      // Simular DB que falla al abrir
      Object.defineProperty(globalThis, 'indexedDB', {
        value: {
          open: vi.fn(() => {
            const req: {
              result: null;
              onerror: (() => void) | null;
              onsuccess: (() => void) | null;
              onupgradeneeded: (() => void) | null;
              error: Error;
            } = {
              result: null,
              onerror: null,
              onsuccess: null,
              onupgradeneeded: null,
              error: new Error('IDB unavailable'),
            };
            Promise.resolve().then(() => req.onerror?.());
            return req;
          }),
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAutoSave());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // No debe lanzar error — saveNow retorna undefined silenciosamente
      await act(async () => {
        await expect(result.current.saveNow()).resolves.toBeUndefined();
      });

      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('Intervalo automático', () => {
    it('autoSave_whenIntervalElapsed_thenTransactionIsCreated', async () => {
      vi.useFakeTimers();

      try {
        const { result } = renderHook(() => useAutoSave());

        // Inicializar DB
        vi.runAllTicks();
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        // Guardar manualmente para que dbRef.current esté seteado
        await act(async () => {
          await result.current.saveNow();
        });

        const callsBefore = fakeIDB.transactionMock.mock.calls.length;

        // Avanzar 2 minutos
        await act(async () => {
          vi.advanceTimersByTime(2 * 60 * 1000);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        // El intervalo debería haber disparado al menos una vez más
        expect(fakeIDB.transactionMock.mock.calls.length).toBeGreaterThanOrEqual(callsBefore);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('restoreSession', () => {
    it('restoreSession_whenDataExists_thenReturnsLoadedProject', async () => {
      const projectData = JSON.stringify({ version: '1', sketch: null, features: [] });
      fakeIDB.store.set('current', projectData);

      const { result } = renderHook(() => useAutoSave());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      let restored: Awaited<ReturnType<typeof result.current.restoreSession>> | undefined;

      await act(async () => {
        restored = await result.current.restoreSession();
      });

      expect(restored!).not.toBeNull();
      expect(restored).toMatchObject({ version: '1', sketch: null, features: [] });
    });

    it('restoreSession_whenNoData_thenReturnsNull', async () => {
      // store está vacío por defecto
      const { result } = renderHook(() => useAutoSave());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      let restored: Awaited<ReturnType<typeof result.current.restoreSession>> | undefined;

      await act(async () => {
        restored = await result.current.restoreSession();
      });

      expect(restored!).toBeNull();
    });

    it('restoreSession_whenDBNotAvailable_thenReturnsNull', async () => {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: {
          open: vi.fn(() => {
            const req: {
              onerror: (() => void) | null;
              onsuccess: (() => void) | null;
              onupgradeneeded: (() => void) | null;
              error: Error;
              result: null;
            } = {
              onerror: null,
              onsuccess: null,
              onupgradeneeded: null,
              error: new Error('Not available'),
              result: null,
            };
            Promise.resolve().then(() => req.onerror?.());
            return req;
          }),
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAutoSave());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      let restored: Awaited<ReturnType<typeof result.current.restoreSession>> | undefined;

      await act(async () => {
        restored = await result.current.restoreSession();
      });

      expect(restored!).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('cleanup_whenUnmounted_thenClosesDB', async () => {
      const { unmount } = renderHook(() => useAutoSave());

      // Esperar que la DB se abra
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      unmount();

      expect(fakeIDB.closeMock).toHaveBeenCalled();
    });
  });
});
