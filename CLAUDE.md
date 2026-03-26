# CLAUDE.md - Development Guide

## Project Overview

**Gloop** is a Tamagotchi-style virtual desktop pet built with Electron + React + TypeScript. The pet lives as a transparent overlay on the user's desktop, walking freely over other windows. Players must feed, clean, play with, and care for their pet to keep it alive and happy.

## Quick Start

```bash
npm install
npm run dev        # Launch in development mode
npm run build:win  # Package for Windows
npm run build:mac  # Package for Mac
npm test           # Run tests
```

## Architecture

### Tech Stack
- **Electron** - Desktop app framework (transparent overlay window)
- **React 18** - UI rendering
- **TypeScript** - Strict mode enabled
- **Vite** - Bundler (via electron-vite)
- **Vitest** - Testing
- **electron-builder** - Packaging for Win/Mac

### Process Split

**Main Process** (`src/main/`):
- Window management (transparent, always-on-top overlay)
- System tray icon with quick-action menu
- Desktop icon manipulation (PowerShell on Win, AppleScript on Mac)
- File I/O for JSON save data
- IPC handlers bridging main ↔ renderer

**Renderer Process** (`src/renderer/`):
- Canvas-based sprite rendering and animation
- Pet AI state machine execution
- Minigame UIs (Drag Food Feed, Tug of War, Hide & Seek)
- Stats panel, context menu, speech bubbles
- Mouse/cursor tracking for pet interactions

**Engine** (`src/engine/`):
- Pure game logic with no UI or Electron dependencies
- StatsManager, PetStateMachine, EvolutionManager, GameClock
- Designed to be testable in isolation

### Key Patterns

**Species Plugin System** (`src/species/`):
- Each species is a folder with its own config, animations, stat rates, and behaviors
- `SpeciesRegistry` discovers and registers all species
- To add a new species: create a new folder under `src/species/` with the required exports
- Gloop is the first and only species at launch

**Pet AI State Machine** (`src/engine/PetStateMachine.ts`):
- States: EGG, IDLE, WALKING, SLEEPING, EATING, PLAYING, HAPPY, SAD, SICK, ATTENTION, ICON_INTERACT, GHOST
- Transitions driven by stat thresholds, timers, and user interactions
- Attention-seeking behaviors trigger when stats are low

**Sprite System** (`src/sprites/`):
- Data-driven: sprite sheets defined in JSON config files
- SpriteSheet loads and parses the sheet image
- AnimationPlayer handles frame-by-frame playback with configurable frame rates
- Each species defines its own animation map

**Desktop Icon Safety**:
- ALWAYS store original icon positions before moving any icons
- ALWAYS provide a restore mechanism
- Restore icons on app exit, crash recovery, or user request
- Never delete or permanently alter desktop icons

## Directory Structure

```
src/
├── main/              # Electron main process
├── renderer/          # React renderer (components, hooks, styles)
├── engine/            # Core game logic (no UI deps, testable)
├── species/           # Species plugin system (gloop/, future: cat/, dog/)
└── sprites/           # Sprite sheet loading and animation engine
assets/
├── sprites/           # Sprite sheet images and JSON frame data
├── audio/sfx/         # Sound effects
├── icons/             # App and tray icons
└── ui/                # UI assets (food items, etc.)
test/                  # Unit tests mirroring src/ structure
```

## Coding Conventions

- TypeScript strict mode - no `any` types unless absolutely necessary
- Functional React components only - no class components
- Hooks for state and side effects
- Named exports preferred over default exports
- Game engine code must have zero UI/Electron imports
- Use `interface` for data shapes, `type` for unions/intersections
- File naming: PascalCase for classes/components, camelCase for utilities

## Data Storage

- Save files stored as JSON in Electron's `app.getPath('userData')`
- Save on every stat change and on app close
- On launch, calculate offline time elapsed and apply stat decay retroactively

## Stat System

Stats range 0-100. They decay in real time:
- **Hunger**: Decays ~5/hour. Feed to restore.
- **Happiness**: Decays ~3/hour. Play minigames or interact to restore.
- **Cleanliness**: Decays ~2/hour. Clean poop to restore.
- **Health**: Decays faster when other stats are low. Medicine when sick.
- **Energy**: Decays ~4/hour. Sleep to restore.

If health reaches 0, pet dies → ghost state → new egg after mourning.

## Evolution

Life stages: Egg → Baby → Teen → Adult
- Progression is care-based (not purely time-based)
- `careHistory.averageCareScore` determines evolution path
- Teen stage unlocks desktop icon interaction abilities
- Each stage has different sprite sizes and animation sets

## IPC Channels

```
Renderer → Main:
  save-game, load-game, get-desktop-icons, move-desktop-icon,
  restore-icons, show-notification, tray-update

Main → Renderer:
  tray-action, app-focus, time-elapsed
```

## Platform-Specific Notes

### Windows
- Desktop icons: PowerShell + Shell.Application COM object
- Overlay: Standard transparent BrowserWindow works well
- Packaging: NSIS installer (.exe)

### Mac
- Desktop icons: AppleScript via `osascript` + Finder
- Overlay: May need `app.dock.hide()` for clean overlay experience
- Packaging: DMG
- Code signing required for distribution (can defer for dev)
