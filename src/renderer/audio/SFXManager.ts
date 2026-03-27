/**
 * Sound effects manager for Gloop.
 *
 * Plays short audio clips for pet interactions and events.
 * Uses Web Audio API via HTMLAudioElement for compatibility.
 * Gracefully degrades if audio files aren't available.
 */

export type SoundEffect =
  | 'feed'
  | 'play'
  | 'clean'
  | 'medicine'
  | 'happy'
  | 'sad'
  | 'sick'
  | 'sleep'
  | 'hatch'
  | 'evolve'
  | 'death'
  | 'rebirth'
  | 'knock'
  | 'poop_clean'
  | 'tug_pull'
  | 'tug_win'
  | 'hide_found'
  | 'click';

/** Mapping from sound effect to relative audio file path */
const SFX_FILES: Record<SoundEffect, string> = {
  feed: 'audio/sfx/feed.mp3',
  play: 'audio/sfx/play.mp3',
  clean: 'audio/sfx/clean.mp3',
  medicine: 'audio/sfx/medicine.mp3',
  happy: 'audio/sfx/happy.mp3',
  sad: 'audio/sfx/sad.mp3',
  sick: 'audio/sfx/sick.mp3',
  sleep: 'audio/sfx/sleep.mp3',
  hatch: 'audio/sfx/hatch.mp3',
  evolve: 'audio/sfx/evolve.mp3',
  death: 'audio/sfx/death.mp3',
  rebirth: 'audio/sfx/rebirth.mp3',
  knock: 'audio/sfx/knock.mp3',
  poop_clean: 'audio/sfx/poop_clean.mp3',
  tug_pull: 'audio/sfx/tug_pull.mp3',
  tug_win: 'audio/sfx/tug_win.mp3',
  hide_found: 'audio/sfx/hide_found.mp3',
  click: 'audio/sfx/click.mp3',
};

class SFXManager {
  private volume = 0.5;
  private muted = false;
  private audioCache = new Map<string, HTMLAudioElement>();
  private basePath: string;

  constructor(basePath = '') {
    this.basePath = basePath;
  }

  /** Set the base path for audio files (e.g., assets directory) */
  setBasePath(path: string): void {
    this.basePath = path;
  }

  /** Set master volume (0-1) */
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /** Get current volume */
  getVolume(): number {
    return this.volume;
  }

  /** Toggle mute */
  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Check if muted */
  isMuted(): boolean {
    return this.muted;
  }

  /** Set mute state */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Play a sound effect.
   * Fails silently if the audio file doesn't exist or can't be played.
   */
  play(sfx: SoundEffect): void {
    if (this.muted) return;

    const filePath = SFX_FILES[sfx];
    if (!filePath) return;

    const fullPath = this.basePath ? `${this.basePath}/${filePath}` : filePath;

    try {
      // Reuse cached audio elements when possible
      let audio = this.audioCache.get(sfx);

      if (audio) {
        // Reset and replay
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.play().catch(() => {
          // Silent fail — audio file may not exist
        });
      } else {
        audio = new Audio(fullPath);
        audio.volume = this.volume;
        this.audioCache.set(sfx, audio);
        audio.play().catch(() => {
          // Silent fail
        });
      }
    } catch {
      // Silent fail — audio not supported or file missing
    }
  }

  /** Preload a set of sounds for faster playback */
  preload(effects: SoundEffect[]): void {
    for (const sfx of effects) {
      const filePath = SFX_FILES[sfx];
      if (!filePath || this.audioCache.has(sfx)) continue;

      const fullPath = this.basePath ? `${this.basePath}/${filePath}` : filePath;
      try {
        const audio = new Audio(fullPath);
        audio.preload = 'auto';
        this.audioCache.set(sfx, audio);
      } catch {
        // Silent fail
      }
    }
  }

  /** Clear all cached audio */
  dispose(): void {
    this.audioCache.clear();
  }
}

/** Global SFX manager singleton */
export const sfx = new SFXManager();
