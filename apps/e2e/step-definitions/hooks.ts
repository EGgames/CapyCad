import { Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Cast, engage, actorInTheSpotlight } from '@serenity-js/core';
import { BrowseTheWebWithWebdriverIO } from '@serenity-js/webdriverio';
import { driver } from '@wdio/globals';

/** Aumentar el timeout de Cucumber a 60 segundos para pasos lentos (WASM, 3D init) */
setDefaultTimeout(60_000);

/**
 * Antes de cada escenario: inicializa el cast de Serenity con la
 * habilidad de navegar la web usando el driver de WebdriverIO.
 */
Before(() =>
  engage(Cast.where((actor) => actor.whoCan(BrowseTheWebWithWebdriverIO.using(driver))))
);

/**
 * Después de cada escenario: descarta al actor activo para limpiar recursos.
 */
After(async () => {
  await actorInTheSpotlight()?.dismiss();
});
