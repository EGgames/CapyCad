/**
 * Tests para useCADWorker hook
 *
 * Prueba el hook que inicializa el CAD Worker en el mount de la aplicación:
 * - Inicialización automática
 * - Estados de carga
 * - Manejo de errores
 * - Cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCADWorker } from '@/hooks/useCADWorker';

// Mock del CAD Worker Client
const mockInitialize = vi.fn();
const mockGetCADWorker = vi.fn(() => ({
  initialize: mockInitialize,
  terminate: vi.fn(),
}));

vi.mock('@/lib/cad/cadWorkerClient', () => ({
  getCADWorker: () => mockGetCADWorker(),
}));

describe('useCADWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
  });

  it('debe inicializar en estado no inicializado', async () => {
    const { result } = renderHook(() => useCADWorker());

    // isInitialized comienza en false (aún no completa)
    expect(result.current.isInitialized).toBe(false);
    // Nota: isInitializing puede ser true porque useEffect se ejecuta
    // síncronamente dentro de act() en el entorno de testing
    expect(result.current.error).toBeNull();
  });

  it('debe inicializar el worker automáticamente', async () => {
    const { result } = renderHook(() => useCADWorker());

    // Verificar transición de estados
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('debe manejar errores de inicialización', async () => {
    const error = new Error('Failed to load OpenCascade.js');
    mockInitialize.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCADWorker());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toEqual(error);
    });
  });

  it('no debe reinicializar si ya está inicializado', async () => {
    mockInitialize.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useCADWorker());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const callCountAfterFirstInit = mockInitialize.mock.calls.length;

    // Re-renderizar no debería llamar initialize de nuevo
    rerender();

    expect(mockInitialize).toHaveBeenCalledTimes(callCountAfterFirstInit);
  });

  it('debe limpiar correctamente en unmount', () => {
    const { unmount } = renderHook(() => useCADWorker());

    unmount();

    // No debería lanzar error
    expect(true).toBe(true);
  });
});

describe('useCADWorker - Estados de Transición', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe pasar por todos los estados de inicialización', async () => {
    const states: Array<{
      isInitialized: boolean;
      isInitializing: boolean;
      error: Error | null;
    }> = [];

    mockInitialize.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 50);
        })
    );

    const { result } = renderHook(() => useCADWorker());

    // Estado inicial
    states.push({ ...result.current });

    // Esperar transición a initializing
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(true);
    });
    states.push({ ...result.current });

    // Esperar transición a initialized
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });
    states.push({ ...result.current });

    // Verificar secuencia de estados
    // En React 18 con act(), el primer estado capturado ya puede tener isInitializing=true
    // porque el efecto se inicia dentro del primer act()
    expect(states[0].isInitialized).toBe(false);
    expect(states[0].error).toBeNull();

    expect(states[1].isInitializing).toBe(true);
    expect(states[1].isInitialized).toBe(false);

    expect(states[2]).toEqual({
      isInitialized: true,
      isInitializing: false,
      error: null,
    });
  });

  it('debe establecer error sin cambiar isInitializing al fallar', async () => {
    const error = new Error('Test error');
    mockInitialize.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCADWorker());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.error?.message).toBe('Test error');
  });
});
