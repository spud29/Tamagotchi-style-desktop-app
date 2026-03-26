# Gloop - Virtual Desktop Pet

A Tamagotchi-style virtual desktop pet that lives on your actual desktop as a transparent overlay. Care for your pet by feeding it, keeping it clean, playing minigames, and keeping it happy — or face the consequences when it starts messing with your desktop icons.

<!-- TODO: Add screenshot/GIF here -->

## Features

### Core Pet Care
- **Feed** your pet with the drag-and-drop feeding minigame
- **Clean up** after your pet (yes, it poops)
- **Play minigames** — Tug of War, Hide & Seek
- **Keep it healthy** — neglect leads to sickness and eventually death
- **Watch it sleep** — pets need rest too, complete with Zzz animations

### Life Stages & Evolution
- Start with an **egg** that hatches into a Baby Gloop
- Evolve through **Baby → Teen → Adult** based on how well you care for it
- Better care quality = better evolution outcomes
- If your pet dies, it becomes a **ghost** before you can start fresh with a new egg

### Desktop Interaction
- Pet **walks freely** across your desktop as a transparent overlay
- At the **Teen stage**, your pet unlocks the ability to interact with desktop icons
- Unhappy pets will **pick up, carry, and yeet your desktop icons** around
- Don't worry — icons are always safely restored

### Attention-Seeking Behaviors
When your pet is neglected, it gets creative about getting your attention:
- **Waves at your cursor** trying to get noticed
- **Rides your mouse cursor** around the screen
- **Knocks on the screen edge** like tapping on glass
- **Rearranges your desktop icons** to get a reaction

### System Tray
- Quick-access tray icon with Feed, Play, Stats, and Sleep actions
- Minimizes cleanly to tray when you need to focus

## Tech Stack

- **Electron** — Cross-platform desktop app
- **React 18** — UI rendering
- **TypeScript** — Type-safe codebase
- **Vite** — Fast bundling via electron-vite
- **Canvas API** — Sprite rendering and animation

## Supported Platforms

- Windows (10/11)
- macOS (12+)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Installation

```bash
git clone https://github.com/spud29/Tamagotchi-style-desktop-app.git
cd Tamagotchi-style-desktop-app
npm install
```

### Development

```bash
npm run dev
```

### Building

```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

### Testing

```bash
npm test
```

## Species

### Gloop (Launch Species)
A blue blob creature with antennae. Friendly, mischievous, and surprisingly expressive.

### Future Species (Planned)
- Cat
- Dog
- Duck
- Dinosaur

The species system is plugin-based — adding a new species requires creating a folder with sprite sheets, animation configs, and behavior definitions.

## Architecture Overview

```
src/
├── main/        # Electron main process (window, tray, desktop icons, save/load)
├── renderer/    # React UI (pet canvas, minigames, stats, menus)
├── engine/      # Core game logic (stats, AI state machine, evolution)
├── species/     # Species plugin system (gloop/, future pets)
└── sprites/     # Sprite sheet loading & animation engine
```

The pet's behavior is driven by a **state machine** with states like Idle, Walking, Sleeping, Eating, Playing, Sad, Sick, Attention-Seeking, and Ghost. Transitions are based on stat thresholds, timers, and player interactions.

Stats (Hunger, Happiness, Cleanliness, Health, Energy) decay in **real time**, even when the app is closed — reopening the app calculates elapsed time and applies retroactive decay.

## Adding a New Species

1. Create a folder under `src/species/` (e.g., `src/species/cat/`)
2. Add your sprite sheet to `assets/sprites/cat/`
3. Define the species config: animations, stat decay rates, life stages, and behaviors
4. Register the species in `SpeciesRegistry`
5. That's it — the engine handles the rest

## Roadmap

- [x] Project planning & architecture
- [ ] Phase 1: Foundation (overlay window, sprite rendering, basic movement)
- [ ] Phase 2: Core mechanics (stats, save/load, state machine)
- [ ] Phase 3: Interactions (feeding, cleaning, tray icon)
- [ ] Phase 4: Life stages & evolution
- [ ] Phase 5: Attention-seeking & desktop icon manipulation
- [ ] Phase 6: Additional minigames (Tug of War, Hide & Seek)
- [ ] Phase 7: Death & rebirth cycle
- [ ] Phase 8: Polish, sound effects, packaging
- [ ] Phase 9: Multiplayer pet visits (future)

## Multiplayer (Future)

A friends list system where your friends' pets can randomly visit your desktop to play with your pet. Architecture is being designed now for future implementation.

## License

MIT

## Credits

- Gloop sprite sheet — original pixel art design
- Inspired by the classic Tamagotchi virtual pets
