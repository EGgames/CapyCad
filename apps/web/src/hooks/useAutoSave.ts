/**
 * useAutoSave — Auto-guardado en IndexedDB (FUNC-018)
 *
 * Guarda automáticamente sketch + features cada 2 minutos.
 * Expone también la función `restoreSession` para recuperar el último estado.
 *
 * DB: 'stl-model-autosave', objectStore: 'autosave', key: 'current'
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSketchStore } from '@/stores/sketchStore';
import { useFeatureStore } from '@/stores/featureStore';
import { serializeProject, loadProject } from '@/lib/project/projectSerializer';
import type { LoadedProject } from '@/lib/project/projectSerializer';

const DB_NAME = 'stl-model-autosave';
const DB_VERSION = 1;
const STORE_NAME = 'autosave';
const AUTOSAVE_KEY = 'current';
const INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function writeDB(db: IDBDatabase, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, AUTOSAVE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readDB(db: IDBDatabase): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(AUTOSAVE_KEY);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface AutoSaveState {
  lastSaved: Date | null;
  restoreSession: () => Promise<LoadedProject | null>;
  saveNow: () => Promise<void>;
}

export function useAutoSave(): AutoSaveState {
  const sketch = useSketchStore((s) => s.activeSketch);
  const features = useFeatureStore((s) => s.features);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  // Abrir DB una vez al montar
  useEffect(() => {
    openDB()
      .then((db) => {
        dbRef.current = db;
      })
      .catch(() => {
        // IndexedDB no disponible (ej. contexto privado sin permisos) — degradación silenciosa
      });
    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, []);

  const saveNow = useCallback(async () => {
    if (!dbRef.current) return;
    try {
      const project = serializeProject(sketch, features);
      await writeDB(dbRef.current, JSON.stringify(project));
      setLastSaved(new Date());
    } catch {
      // Ignorar errores de escritura — el auto-guardado es best-effort
    }
  }, [sketch, features]);

  // Guardar cada INTERVAL_MS cuando hay contenido
  useEffect(() => {
    const hasContent = sketch !== null || features.length > 0;
    if (!hasContent) return;

    const id = setInterval(saveNow, INTERVAL_MS);
    return () => clearInterval(id);
  }, [saveNow, sketch, features]);

  const restoreSession = useCallback(async (): Promise<LoadedProject | null> => {
    if (!dbRef.current) return null;
    try {
      const raw = await readDB(dbRef.current);
      if (!raw) return null;
      return loadProject(raw);
    } catch {
      return null;
    }
  }, []);

  return { lastSaved, restoreSession, saveNow };
}
