import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'path';
import { createTray } from './tray';
import { registerSaveHandlers } from './save-manager';

let overlayWindow: BrowserWindow | null = null;

function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Allow clicks to pass through transparent areas
  win.setIgnoreMouseEvents(true, { forward: true });

  // Remove menu bar
  win.setMenu(null);

  // Prevent the window from being closed by Alt+F4 during normal use
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

// IPC: Toggle mouse events pass-through
ipcMain.on('set-ignore-mouse', (_event, ignore: boolean) => {
  if (overlayWindow) {
    overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// IPC: Get screen dimensions
ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workAreaSize;
});

app.whenReady().then(() => {
  registerSaveHandlers();
  overlayWindow = createOverlayWindow();
  createTray(overlayWindow);

  // macOS: hide dock icon for clean overlay
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }
});

app.on('before-quit', () => {
  (app as { isQuitting: boolean }).isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Extend app type for isQuitting flag
declare module 'electron' {
  interface App {
    isQuitting: boolean;
  }
}
