'use strict';

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

// rendererPath apunta a la carpeta con el build de Vite copiada por electron-builder
const rendererPath = path.join(process.resourcesPath, 'renderer');

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
    // En producción carga directamente el index.html del build estático
    win.loadFile(path.join(rendererPath, 'index.html'));
  }

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => app.quit());
}

app.whenReady().then(() => {
  // Inyectar COOP/COEP en TODAS las respuestas — necesario para SharedArrayBuffer (OpenCascade WASM)
  // Funciona tanto en dev (HTTP) como en producción (file://)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
