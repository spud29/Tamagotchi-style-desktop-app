/** Type declarations for the preload API exposed via contextBridge */
interface ElectronAPI {
  setIgnoreMouse: (ignore: boolean) => void;
  getScreenSize: () => Promise<{ width: number; height: number }>;
  onTrayAction: (callback: (action: string) => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
