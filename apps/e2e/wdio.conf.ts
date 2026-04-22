import type { WebdriverIOConfig } from '@serenity-js/webdriverio';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

export const config: WebdriverIOConfig = {
  // ── Runner ────────────────────────────────────────────────────────────────
  runner: 'local',

  // ── Specs: feature files de Cucumber ─────────────────────────────────────
  specs: ['./features/**/*.feature'],
  exclude: [],

  // ── Capacidades: Firefox headless ─────────────────────────────────────────
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'firefox',
      'moz:firefoxOptions': {
        args: ['--headless', '--width=1280', '--height=800'],
      },
    },
  ],

  // ── Nivel de log ──────────────────────────────────────────────────────────
  logLevel: 'warn',

  // ── Reporters ─────────────────────────────────────────────────────────────
  reporters: ['spec', ['spec', { addConsoleLogs: true }]],

  // ── Timeouts ──────────────────────────────────────────────────────────────
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,

  // ── Framework: Serenity/JS con runner Cucumber ────────────────────────────
  framework: '@serenity-js/webdriverio',

  serenity: {
    runner: 'cucumber',
    crew: [
      '@serenity-js/serenity-bdd',
      ['@serenity-js/core:ArtifactArchiver', { outputDirectory: './target/site/serenity' }],
    ],
  },

  // ── Opciones de Cucumber ─────────────────────────────────────────────────
  cucumberOpts: {
    require: ['./step-definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    backtrace: false,
    retry: 0,
    timeout: 60_000,
    tags: process.env.CUCUMBER_TAGS ?? '',
    language: 'es',
  },

  // ── Variables de entorno disponibles en steps ─────────────────────────────
  baseUrl: APP_URL,
};
