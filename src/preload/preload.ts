import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Mouse event pass-through control
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore),

  // Screen info
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),

  // Save/load game data
  saveGame: (data: unknown) => ipcRenderer.invoke('save-game', data),
  loadGame: () => ipcRenderer.invoke('load-game'),

  // Desktop icon manipulation
  getDesktopIcons: () => ipcRenderer.invoke('get-desktop-icons'),
  moveDesktopIcon: (name: string, x: number, y: number) => ipcRenderer.invoke('move-desktop-icon', name, x, y),
  restoreIcons: () => ipcRenderer.invoke('restore-icons'),

  // Listen for tray actions
  onTrayAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('tray-action', handler);
    return () => ipcRenderer.removeListener('tray-action', handler);
  },

  // Listen for time-elapsed events (sent on app focus)
  onTimeElapsed: (callback: (seconds: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, seconds: number) => callback(seconds);
    ipcRenderer.on('time-elapsed', handler);
    return () => ipcRenderer.removeListener('time-elapsed', handler);
  },
});
