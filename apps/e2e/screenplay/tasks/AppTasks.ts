import { Task, Wait, Duration } from '@serenity-js/core';
import { Navigate, PageElement, By, ExecuteScript } from '@serenity-js/web';
import { isTrue } from '@serenity-js/assertions';
import { AppState } from '../questions/AppState';

/**
 * Tarea de Screenplay: navegar a la aplicación CAD.
 */
export const AbrirAplicacionCAD = (url = process.env.APP_URL ?? 'http://localhost:5173') =>
  Task.where(`#actor abre la aplicación CAD en ${url}`, Navigate.to(url));

/**
 * Tarea robusta: hacer click esperando que no haya overlays bloqueando.
 * Usa JavaScript click para evitar problemas con elementos que obstruyen.
 */
const ClickRobust = (element: PageElement, description: string) =>
  Task.where(
    `#actor hace click en ${description}`,
    // Esperar que el overlay de inicialización desaparezca
    Wait.upTo(Duration.ofSeconds(30)).until(AppState.initOverlayIsGone(), isTrue()),
    // Pequeña pausa para asegurar que la UI se estabilice
    Wait.for(Duration.ofMilliseconds(500)),
    // Click vía JavaScript (evita problemas con elementos superpuestos)
    ExecuteScript.sync('arguments[0].click()').withArguments(element)
  );

/**
 * Tarea: activar el modo 3D haciendo click en el botón "Vista 3D" de la toolbar.
 */
export const ActivarModo3D = () =>
  ClickRobust(
    PageElement.located(By.css('[title="Vista 3D — Canvas tridimensional"]')),
    'el botón de Vista 3D'
  );

/**
 * Tarea: activar el modo 2D haciendo click en el botón "Vista 2D" de la toolbar.
 */
export const ActivarModo2D = () =>
  ClickRobust(
    PageElement.located(By.css('[title="Vista 2D — Editor de sketch"]')),
    'el botón de Vista 2D'
  );

/**
 * Tarea: seleccionar una herramienta de la toolbar por su label/title.
 */
export const SeleccionarHerramienta = (toolLabel: string) =>
  ClickRobust(PageElement.located(By.css(`[title="${toolLabel}"]`)), `la herramienta ${toolLabel}`);
