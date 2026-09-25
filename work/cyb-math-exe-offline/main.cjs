'use strict';

const { app, BrowserWindow, Menu, protocol } = require('electron');
const { registerOfflineProtocol } = require('./lib/protocol.cjs');
const { createWindow } = require('./lib/window.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cyb-math',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.setName('CYB Math');
app.setAppUserModelId('cn.cyb-math.desktop');

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerOfflineProtocol(app);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
