'use strict';

// Preload se ejecuta en el proceso renderer antes de cargar el contenido web.
// contextIsolation: true  → el renderer NO tiene acceso a Node.js directamente.
// Para exponer APIs nativas al renderer, usar contextBridge.exposeInMainWorld().
//
// Ejemplo futuro:
//
// const { contextBridge, ipcRenderer } = require('electron');
// contextBridge.exposeInMainWorld('cadStudio', {
//   saveFile: (buffer) => ipcRenderer.invoke('save-file', buffer),
//   openFile: () => ipcRenderer.invoke('open-file'),
// });
