/**
 * Tests para lib/utils.ts
 *
 * Cubre la función cn() — combina clases de Tailwind usando clsx + twMerge.
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn — utilidad de combinación de clases', () => {
  // ── Casos básicos ─────────────────────────────────────────────────────────

  it('retorna cadena vacía sin argumentos', () => {
    expect(cn()).toBe('');
  });

  it('retorna la clase cuando se pasa un solo string', () => {
    expect(cn('flex')).toBe('flex');
  });

  it('combina múltiples strings', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  // ── Valores falsy ─────────────────────────────────────────────────────────

  it('ignora valores undefined', () => {
    expect(cn('flex', undefined)).toBe('flex');
  });

  it('ignora valores null', () => {
    expect(cn('flex', null)).toBe('flex');
  });

  it('ignora valores false', () => {
    expect(cn('flex', false)).toBe('flex');
  });

  it('ignora strings vacíos', () => {
    expect(cn('flex', '')).toBe('flex');
  });

  // ── Condicionales ─────────────────────────────────────────────────────────

  it('incluye clase cuando la condición es true', () => {
    const isActive = true;
    expect(cn('btn', isActive && 'btn-active')).toBe('btn btn-active');
  });

  it('excluye clase cuando la condición es false', () => {
    const isActive = false;
    expect(cn('btn', isActive && 'btn-active')).toBe('btn');
  });

  // ── Objetos ───────────────────────────────────────────────────────────────

  it('incluye clase cuando el valor del objeto es true', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('excluye clase cuando el valor del objeto es false', () => {
    expect(cn({ hidden: false })).toBe('');
  });

  it('combina múltiples objetos', () => {
    expect(cn({ flex: true }, { 'items-center': true }, { hidden: false })).toBe(
      'flex items-center'
    );
  });

  // ── Arrays ────────────────────────────────────────────────────────────────

  it('aplana arrays de clases', () => {
    expect(cn(['flex', 'items-center'])).toBe('flex items-center');
  });

  it('aplana arrays anidados', () => {
    expect(cn(['flex', ['items-center', 'gap-4']])).toBe('flex items-center gap-4');
  });

  // ── Tailwind merge ────────────────────────────────────────────────────────

  it('resuelve conflictos de Tailwind: última clase gana (padding)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('resuelve conflictos de Tailwind: color de texto', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('resuelve conflictos de Tailwind: fondo', () => {
    expect(cn('bg-gray-100', 'bg-white')).toBe('bg-white');
  });

  it('no elimina clases no conflictivas', () => {
    const result = cn('flex', 'p-4', 'p-8');
    expect(result).toContain('flex');
    expect(result).toContain('p-8');
    expect(result).not.toContain('p-4');
  });

  // ── Casos mixtos ──────────────────────────────────────────────────────────

  it('combina strings, objetos y condicionales', () => {
    const isHidden = false;
    const isActive = true;
    const result = cn('flex', { hidden: isHidden, 'bg-violet-600': isActive }, 'gap-2');
    expect(result).toContain('flex');
    expect(result).toContain('bg-violet-600');
    expect(result).toContain('gap-2');
    expect(result).not.toContain('hidden');
  });

  it('maneja clases de variantes de Tailwind correctamente', () => {
    const result = cn('px-2 py-1', 'p-4');
    // twMerge debería consolidar px/py y p-4
    expect(result).toBe('p-4');
  });
});
