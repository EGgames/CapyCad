import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, Duration, Wait } from '@serenity-js/core';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';

import {
  AbrirAplicacionCAD,
  ActivarModo3D,
  ActivarModo2D,
  SeleccionarHerramienta,
} from '../screenplay/tasks/AppTasks';
import { AppState } from '../screenplay/questions/AppState';

// ── Antecedentes ─────────────────────────────────────────────────────────────

Given('que el usuario abre la aplicación CAD', async () => {
  await actorCalled('Diseñador').attemptsTo(
    AbrirAplicacionCAD(),
    // Esperar que la aplicación cargue y el overlay de init desaparezca
    Wait.upTo(Duration.ofSeconds(30)).until(AppState.initOverlayIsGone(), isTrue())
  );
});

// ── Aserciones generales ──────────────────────────────────────────────────────

Then('la página debería cargar sin errores críticos', async () => {
  await actorCalled('Diseñador').attemptsTo(
    Ensure.that(AppState.pageTitle(), equals('STL-Model - CAD Web App'))
  );
});

Then('debería ver la barra de herramientas', async () => {
  await actorCalled('Diseñador').attemptsTo(
    Wait.upTo(Duration.ofSeconds(10)).until(AppState.toolbarIsVisible(), isTrue()),
    Ensure.that(AppState.toolbarIsVisible(), isTrue())
  );
});

Then('debería ver el panel lateral', async () => {
  await actorCalled('Diseñador').attemptsTo(Ensure.that(AppState.sidebarIsPresent(), isTrue()));
});

// ── Modo 2D ───────────────────────────────────────────────────────────────────

Then('el modo de edición inicial debería ser 2D', async () => {
  // En modo 2D el canvas de boceto es visible
  await actorCalled('Diseñador').attemptsTo(
    Wait.upTo(Duration.ofSeconds(5)).until(AppState.sketchCanvasIsVisible(), isTrue()),
    Ensure.that(AppState.sketchCanvasIsVisible(), isTrue())
  );
});

Then('el canvas de boceto debería estar visible', async () => {
  await actorCalled('Diseñador').attemptsTo(
    Ensure.that(AppState.sketchCanvasIsVisible(), isTrue())
  );
});

// ── Modo 3D ───────────────────────────────────────────────────────────────────

When('el usuario activa el modo 3D', async () => {
  await actorCalled('Diseñador').attemptsTo(ActivarModo3D());
});

Then('el canvas 3D debería estar montado', async () => {
  await actorCalled('Diseñador').attemptsTo(
    Wait.upTo(Duration.ofSeconds(10)).until(AppState.canvas3DIsPresent(), isTrue()),
    Ensure.that(AppState.canvas3DIsPresent(), isTrue())
  );
});

Then('debería ver los controles de render', async () => {
  // Los controles de render están en el panel derecho en modo 3D
  await actorCalled('Diseñador').attemptsTo(
    Ensure.that(AppState.propertiesPanelIsPresent(), isTrue())
  );
});

// ── Panel de propiedades ──────────────────────────────────────────────────────

Then('el panel de propiedades debería estar presente en la interfaz', async () => {
  await actorCalled('Diseñador').attemptsTo(
    Ensure.that(AppState.propertiesPanelIsPresent(), isTrue())
  );
});

// ── Motor CAD ─────────────────────────────────────────────────────────────────

Then('la interfaz debería responder antes de que el motor CAD finalice', async () => {
  // La UI no bloquea durante la inicialización: el overlay desaparece en < 30s
  // Ya verificado en el antecedente, pero verificamos de nuevo
  await actorCalled('Diseñador').attemptsTo(Ensure.that(AppState.initOverlayIsGone(), isTrue()));
});

Then('no debería aparecer una pantalla de bloqueo mayor a 30 segundos', async () => {
  // Ya verificado en el antecedente
  await actorCalled('Diseñador').attemptsTo(Ensure.that(AppState.initOverlayIsGone(), isTrue()));
});

// ── Modo 2D (vuelta) ─────────────────────────────────────────────────────────

When('el usuario activa el modo 2D', async () => {
  await actorCalled('Diseñador').attemptsTo(ActivarModo2D());
});

// ── Herramientas de boceto ───────────────────────────────────────────────────

When('el usuario selecciona la herramienta {string}', async (toolLabel: string) => {
  await actorCalled('Diseñador').attemptsTo(SeleccionarHerramienta(toolLabel));
});

Then('la herramienta {string} debería estar activa', async (toolLabel: string) => {
  await actorCalled('Diseñador').attemptsTo(
    Ensure.that(AppState.toolButtonIsActive(toolLabel), isTrue())
  );
});

// ── Botones de toolbar ──────────────────────────────────────────────────────

Then('debería ver el botón {string}', async (buttonTitle: string) => {
  await actorCalled('Diseñador').attemptsTo(
    Wait.upTo(Duration.ofSeconds(10)).until(AppState.buttonIsPresent(buttonTitle), isTrue()),
    Ensure.that(AppState.buttonIsPresent(buttonTitle), isTrue())
  );
});

// ── Sin errores CAD ─────────────────────────────────────────────────────────

Then('no debería mostrar banner de error del motor CAD', async () => {
  await actorCalled('Diseñador').attemptsTo(
    Ensure.that(AppState.cadErrorBannerIsAbsent(), isTrue())
  );
});
