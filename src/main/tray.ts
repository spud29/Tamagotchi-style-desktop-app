import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'path';
import { restoreIcons } from './desktop-icons';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../assets/icons/tray-icon.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
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
      label: 'Clean',
      click: () => mainWindow.webContents.send('tray-action', 'clean'),
    },
    {
      label: 'Medicine',
      click: () => mainWindow.webContents.send('tray-action', 'medicine'),
    },
    {
      label: 'Sleep',
      click: () => mainWindow.webContents.send('tray-action', 'sleep'),
    },
    { type: 'separator' },
    {
      label: 'Stats',
      click: () => mainWindow.webContents.send('tray-action', 'stats'),
    },
    {
      label: 'Restore Desktop Icons',
      click: () => restoreIcons(),
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
