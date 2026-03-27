import { PetSaveData } from '../engine/types';

/** Type declarations for the preload API exposed via contextBridge */
interface ElectronAPI {
  setIgnoreMouse: (ignore: boolean) => void;
  getScreenSize: () => Promise<{ width: number; height: number }>;
  saveGame: (data: PetSaveData) => Promise<boolean>;
  loadGame: () => Promise<PetSaveData | null>;
  getDesktopIcons: () => Promise<Array<{ name: string; x: number; y: number }>>;
  moveDesktopIcon: (name: string, x: number, y: number) => Promise<boolean>;
  restoreIcons: () => Promise<boolean>;
  onTrayAction: (callback: (action: string) => void) => () => void;
  onTimeElapsed: (callback: (seconds: number) => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
