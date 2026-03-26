import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Mouse event pass-through control
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore),

  // Screen info
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),

  // Save/load game data
  saveGame: (data: unknown) => ipcRenderer.invoke('save-game', data),
  loadGame: () => ipcRenderer.invoke('load-game'),

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
