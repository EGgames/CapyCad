import { Task, Wait, Duration, Interaction } from '@serenity-js/core';
import { Navigate, PageElement, By, ExecuteScript } from '@serenity-js/web';
import { driver } from '@wdio/globals';

/**
 * Tarea de Screenplay: navegar a la aplicación CAD.
 */
export const AbrirAplicacionCAD = (url = process.env.APP_URL ?? 'http://localhost:5173') =>
  Task.where(`#actor abre la aplicación CAD en ${url}`, Navigate.to(url));

/**
 * Interacción directa WebdriverIO: espera que toolbar-file esté en el DOM.
 * Más fiable que Serenity-JS Wait.upTo().until(isPresent()) durante la carga.
 */
const WaitForToolbar = Interaction.where('#actor espera que la toolbar esté lista', async () => {
  await driver.$('[data-testid="toolbar-file"]').waitForExist({ timeout: 15_000 });
});

/**
 * Tarea robusta: hacer click esperando que no haya overlays bloqueando.
 * Usa JavaScript click para evitar problemas con elementos que obstruyen.
 */
const ClickRobust = (element: PageElement, description: string) =>
  Task.where(
    `#actor hace click en ${description}`,
    // Esperar que la toolbar esté presente usando WebdriverIO directamente
    WaitForToolbar,
    // Breve pausa para estabilidad del estado React
    Wait.for(Duration.ofMilliseconds(200)),
    // Click vía JavaScript (funciona incluso si hay overlays en el DOM)
    ExecuteScript.sync('arguments[0].click()').withArguments(element)
  );

/**
 * Tarea: activar el modo 3D haciendo click en el botón "Vista 3D" de la toolbar.
 * No espera la inicialización de OCCT, solo que el modo cambie en la UI.
 */
export const ActivarModo3D = () =>
  Task.where(
    '#actor activa el modo 3D',
    ClickRobust(
      PageElement.located(By.css('[title="Vista 3D — Canvas tridimensional"]')),
      'el botón de Vista 3D'
    ),
    // Breve pausa para que React actualice el estado del botón
    Wait.for(Duration.ofMilliseconds(300))
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
