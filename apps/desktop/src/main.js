'use strict';

const { app, BrowserWindow, protocol, net, session } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// rendererPath apunta a la carpeta con el build de Vite copiada por electron-builder
const rendererPath = path.join(process.resourcesPath, 'renderer');

// Registrar el esquema 'app://' como privilegiado ANTES de app.whenReady()
// Esto es necesario para que funcionen fetch, ServiceWorker y CORS desde ese esquema.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox desactivado para que el preload pueda usar require de Node si se necesita en el futuro
      sandbox: false,
    },
    title: 'CAD Studio',
    show: false,
    backgroundColor: '#09090b',
  });

  if (isDev) {
    // En desarrollo carga desde el servidor de Vite (que ya incluye COOP/COEP)
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // En producción usa el esquema custom app:// para servir el build estático
    win.loadURL('app:///');
  }

  win.once('ready-to-show', () => win.show());

  win.on('closed', () => app.quit());
}

app.whenReady().then(() => {
  if (isDev) {
    // En dev, intercepta las respuestas HTTP del servidor Vite para garantizar COOP/COEP
    // (Vite ya los envía, pero esto asegura compatibilidad con cualquier configuración)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Cross-Origin-Opener-Policy': ['same-origin'],
          'Cross-Origin-Embedder-Policy': ['require-corp'],
        },
      });
    });
  } else {
    // En producción, registra el protocolo app:// que sirve archivos estáticos
    // e inyecta los headers COOP/COEP necesarios para SharedArrayBuffer (OpenCascade WASM)
    protocol.handle('app', async (request) => {
      const { pathname } = new URL(request.url);
      const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
      let filePath = path.join(rendererPath, relPath);

      // Fallback a index.html si el archivo no existe (SPA)
      if (!fs.existsSync(filePath)) {
        filePath = path.join(rendererPath, 'index.html');
      }

      const response = await net.fetch(`file://${filePath}`);
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    });
  }

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
