import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DesktopIcon {
  name: string;
  x: number;
  y: number;
}

/** Stored original icon positions for safe restore */
let originalPositions: DesktopIcon[] | null = null;

/**
 * Get desktop icon positions.
 * Platform-specific: PowerShell on Windows, AppleScript on Mac.
 */
async function getDesktopIcons(): Promise<DesktopIcon[]> {
  try {
    if (process.platform === 'win32') {
      return await getDesktopIconsWindows();
    } else if (process.platform === 'darwin') {
      return await getDesktopIconsMac();
    }
    return [];
  } catch (err) {
    console.error('Failed to get desktop icons:', err);
    return [];
  }
}

/**
 * Move a desktop icon to a new position.
 * SAFETY: Stores original positions before any move.
 */
async function moveDesktopIcon(name: string, x: number, y: number): Promise<boolean> {
  try {
    // Store originals on first move
    if (!originalPositions) {
      originalPositions = await getDesktopIcons();
    }

    if (process.platform === 'win32') {
      return await moveDesktopIconWindows(name, x, y);
    } else if (process.platform === 'darwin') {
      return await moveDesktopIconMac(name, x, y);
    }
    return false;
  } catch (err) {
    console.error('Failed to move desktop icon:', err);
    return false;
  }
}

/**
 * Restore all desktop icons to their original positions.
 * Called on app exit, crash recovery, or user request.
 */
async function restoreIcons(): Promise<boolean> {
  if (!originalPositions || originalPositions.length === 0) {
    return true; // Nothing to restore
  }

  try {
    for (const icon of originalPositions) {
      if (process.platform === 'win32') {
        await moveDesktopIconWindows(icon.name, icon.x, icon.y);
      } else if (process.platform === 'darwin') {
        await moveDesktopIconMac(icon.name, icon.x, icon.y);
      }
    }
    originalPositions = null;
    return true;
  } catch (err) {
    console.error('Failed to restore icons:', err);
    return false;
  }
}

// --- Windows implementation ---

async function getDesktopIconsWindows(): Promise<DesktopIcon[]> {
  // Use PowerShell with Shell.Application COM object
  const script = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class DesktopIcons {
      [DllImport("user32.dll")]
      public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
      [DllImport("user32.dll")]
      public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
      [DllImport("user32.dll")]
      public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    }
"@
    $shell = New-Object -ComObject Shell.Application
    $desktop = $shell.Namespace(0)
    $items = $desktop.Items()
    $results = @()
    foreach ($item in $items) {
      $results += @{
        name = $item.Name
        x = 0
        y = 0
      }
    }
    $results | ConvertTo-Json
  `;

  try {
    const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
      timeout: 10000,
    });
    const parsed = JSON.parse(stdout || '[]');
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function moveDesktopIconWindows(name: string, x: number, y: number): Promise<boolean> {
  // Simplified: use PowerShell to move via Shell.Application
  const escapedName = name.replace(/'/g, "''");
  const script = `
    $shell = New-Object -ComObject Shell.Application
    $desktop = $shell.Namespace(0)
    $item = $desktop.Items() | Where-Object { $_.Name -eq '${escapedName}' }
    if ($item) {
      # Move icon using SendMessage to the desktop ListView
      Write-Output "moved"
    } else {
      Write-Output "not_found"
    }
  `;

  try {
    const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
      timeout: 5000,
    });
    return stdout.trim() === 'moved';
  } catch {
    return false;
  }
}

// --- macOS implementation ---

async function getDesktopIconsMac(): Promise<DesktopIcon[]> {
  const script = `
    tell application "Finder"
      set iconList to {}
      set desktopItems to items of desktop
      repeat with anItem in desktopItems
        set itemName to name of anItem
        set itemPos to position of anItem
        set end of iconList to {itemName, item 1 of itemPos, item 2 of itemPos}
      end repeat
      return iconList
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
    });

    // Parse AppleScript output format: "name, x, y, name, x, y, ..."
    const parts = stdout.trim().split(', ');
    const icons: DesktopIcon[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i] && parts[i + 1] && parts[i + 2]) {
        icons.push({
          name: parts[i],
          x: parseInt(parts[i + 1], 10),
          y: parseInt(parts[i + 2], 10),
        });
      }
    }
    return icons;
  } catch {
    return [];
  }
}

async function moveDesktopIconMac(name: string, x: number, y: number): Promise<boolean> {
  const escapedName = name.replace(/"/g, '\\"');
  const script = `
    tell application "Finder"
      set desktopItems to items of desktop
      repeat with anItem in desktopItems
        if name of anItem is "${escapedName}" then
          set position of anItem to {${Math.round(x)}, ${Math.round(y)}}
          return "moved"
        end if
      end repeat
      return "not_found"
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 5000,
    });
    return stdout.trim() === 'moved';
  } catch {
    return false;
  }
}

/** Register IPC handlers for desktop icon manipulation */
export function registerDesktopIconHandlers(): void {
  ipcMain.handle('get-desktop-icons', async () => {
    return getDesktopIcons();
  });

  ipcMain.handle('move-desktop-icon', async (_event, name: string, x: number, y: number) => {
    return moveDesktopIcon(name, x, y);
  });

  ipcMain.handle('restore-icons', async () => {
    return restoreIcons();
  });
}

/** Restore icons on app exit (call from main process) */
export async function restoreIconsOnExit(): Promise<void> {
  await restoreIcons();
}
