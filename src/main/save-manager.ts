import { app, ipcMain } from 'electron';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { PetSaveData } from '../engine/types';

const SAVE_FILE_NAME = 'pet-save.json';

function getSavePath(): string {
  return join(app.getPath('userData'), SAVE_FILE_NAME);
}

/** Load pet save data from disk. Returns null if no save exists. */
async function loadGame(): Promise<PetSaveData | null> {
  const savePath = getSavePath();

  if (!existsSync(savePath)) {
    return null;
  }

  try {
    const raw = await readFile(savePath, 'utf-8');
    return JSON.parse(raw) as PetSaveData;
  } catch (err) {
    console.error('Failed to load save file:', err);
    return null;
  }
}

/** Save pet data to disk. */
async function saveGame(data: PetSaveData): Promise<boolean> {
  const savePath = getSavePath();

  try {
    // Ensure the directory exists
    const dir = app.getPath('userData');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(savePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save game:', err);
    return false;
  }
}

/** Register IPC handlers for save/load */
export function registerSaveHandlers(): void {
  ipcMain.handle('load-game', async () => {
    return loadGame();
  });

  ipcMain.handle('save-game', async (_event, data: PetSaveData) => {
    return saveGame(data);
  });
}
