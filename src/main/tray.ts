import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  // Create a simple 16x16 tray icon (placeholder until real icon exists)
  const iconPath = join(__dirname, '../../assets/icons/tray-icon.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    // Fallback: create a tiny colored icon if file doesn't exist
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Gloop - Desktop Pet');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Gloop',
      click: () => {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true);
      },
    },
    { type: 'separator' },
    {
      label: 'Feed',
      click: () => mainWindow.webContents.send('tray-action', 'feed'),
    },
    {
      label: 'Play',
      click: () => mainWindow.webContents.send('tray-action', 'play'),
    },
    {
      label: 'Sleep',
      click: () => mainWindow.webContents.send('tray-action', 'sleep'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        (app as { isQuitting: boolean }).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
  });
}
