import { useCallback, useEffect, useRef, useState } from 'react';
import { PetStateMachine } from '../../engine/PetStateMachine';
import { StatsManager } from '../../engine/StatsManager';
import { GameClock } from '../../engine/GameClock';
import { AnimationPlayer } from '../../sprites/AnimationPlayer';
import { SpriteSheet } from '../../sprites/SpriteSheet';
import {
  Position,
  PetState,
  PetStats,
  PetSaveData,
  SpriteSheetConfig,
  AnimationDef,
  StatDecayRates,
} from '../../engine/types';

export interface PetEngineState {
  position: Position;
  state: PetState;
  direction: string;
  stats: PetStats;
  ageMinutes: number;
  isAlive: boolean;
}

interface UsePetEngineReturn {
  petState: PetEngineState;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoaded: boolean;
  /** Feed the pet */
  feed: () => void;
  /** Put the pet to sleep */
  sleep: () => void;
  /** Clean the pet */
  clean: () => void;
  /** Play with the pet */
  play: () => void;
  /** Give medicine */
  medicine: () => void;
  /** Get save data snapshot */
  getSaveData: () => PetSaveData | null;
  /** Load from save data */
  loadSaveData: (data: PetSaveData) => void;
}

const DEFAULT_STATS: PetStats = {
  hunger: 80,
  happiness: 80,
  cleanliness: 80,
  health: 100,
  energy: 80,
};

/**
 * Main game loop hook.
 * Manages the pet state machine, stats, animation, clock, and rendering loop.
 */
export function usePetEngine(
  spriteSheetConfig: SpriteSheetConfig,
  animations: Record<string, AnimationDef>,
  getAnimationName: (state: string, direction?: string) => string,
  petSize: number,
  decayRates: StatDecayRates
): UsePetEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteSheetRef = useRef<SpriteSheet | null>(null);
  const animPlayerRef = useRef<AnimationPlayer | null>(null);
  const stateMachineRef = useRef<PetStateMachine | null>(null);
  const statsManagerRef = useRef<StatsManager | null>(null);
  const gameClockRef = useRef<GameClock | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const saveTimerRef = useRef<number>(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [petState, setPetState] = useState<PetEngineState>({
    position: { x: 400, y: 400 },
    state: 'IDLE',
    direction: 'front',
    stats: { ...DEFAULT_STATS },
    ageMinutes: 0,
    isAlive: true,
  });

  const petStateRef = useRef(petState);
  petStateRef.current = petState;

  const petIdRef = useRef<string>(crypto.randomUUID());
  const petNameRef = useRef<string>('Gloop');

  // Initialize all systems
  useEffect(() => {
    const sheet = new SpriteSheet(spriteSheetConfig);
    const player = new AnimationPlayer(sheet, animations);
    const statsManager = new StatsManager(undefined, decayRates);
    const gameClock = new GameClock();

    spriteSheetRef.current = sheet;
    animPlayerRef.current = player;
    statsManagerRef.current = statsManager;
    gameClockRef.current = gameClock;

    const initEngine = async () => {
      try {
        let screenWidth = window.innerWidth;
        let screenHeight = window.innerHeight;

        if (window.electronAPI) {
          const size = await window.electronAPI.getScreenSize();
          screenWidth = size.width;
          screenHeight = size.height;
        }

        const sm = new PetStateMachine(screenWidth, screenHeight);
        sm.setPetSize(petSize);
        stateMachineRef.current = sm;

        setPetState((prev) => ({
          ...prev,
          position: {
            x: screenWidth / 2 - petSize / 2,
            y: screenHeight / 2 - petSize / 2,
          },
        }));

        await sheet.load();
        player.play(getAnimationName('idle', 'front'));
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize pet engine:', err);
        setIsLoaded(true);
      }
    };

    initEngine();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [spriteSheetConfig, animations, getAnimationName, petSize, decayRates]);

  // Main game loop
  useEffect(() => {
    if (!isLoaded) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const sm = stateMachineRef.current;
      const player = animPlayerRef.current;
      const sheet = spriteSheetRef.current;
      const canvas = canvasRef.current;
      const statsManager = statsManagerRef.current;
      const gameClock = gameClockRef.current;

      if (!sm || !player || !canvas || !statsManager || !gameClock) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Update game clock
      gameClock.update(deltaTime);

      // Update stats (decay)
      const currentState = sm.getState();
      if (currentState === 'SLEEPING') {
        // During sleep, pause decay and recover energy
        statsManager.pause();
        statsManager.modifyStat('energy', 8 * deltaTime); // Recover ~8/sec while sleeping
      } else {
        statsManager.resume();
        statsManager.update(deltaTime);
      }

      // Feed stats to state machine for stat-driven transitions
      sm.setStats(statsManager.getStats());

      // Update state machine
      const currentPos = petStateRef.current.position;
      const newPos = sm.update(deltaTime, currentPos);
      const newState = sm.getState();
      const currentDir = sm.getDirection();

      // Map state machine state to animation name
      const animState = mapStateToAnimation(newState);
      const animName = getAnimationName(animState, currentDir);
      player.play(animName);
      player.update(deltaTime);

      // Build updated pet state
      const updatedStats = statsManager.getStats();
      const updatedAge = gameClock.getAgeMinutes();
      const isAlive = !statsManager.isDead();

      // Update React state
      const pos = newPos ?? currentPos;
      setPetState({
        position: pos,
        state: newState,
        direction: currentDir,
        stats: updatedStats,
        ageMinutes: updatedAge,
        isAlive,
      });

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (sheet?.isLoaded()) {
        player.draw(ctx, pos.x, pos.y, petSize, petSize);
      } else {
        drawPlaceholderPet(ctx, pos.x, pos.y, petSize, newState);
      }

      // Auto-save every 30 seconds
      saveTimerRef.current += deltaTime;
      if (saveTimerRef.current >= 30) {
        saveTimerRef.current = 0;
        autoSave();
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isLoaded, getAnimationName, petSize]);

  // Auto-save function
  const autoSave = useCallback(() => {
    const saveData = buildSaveData();
    if (saveData && window.electronAPI) {
      window.electronAPI.saveGame(saveData);
    }
  }, []);

  // Build save data from current state
  const buildSaveData = useCallback((): PetSaveData | null => {
    const stats = statsManagerRef.current;
    const clock = gameClockRef.current;
    if (!stats || !clock) return null;

    clock.markSaved();

    return {
      id: petIdRef.current,
      speciesId: 'gloop',
      name: petNameRef.current,
      lifeStage: 'baby', // Will be driven by EvolutionManager in Phase 4
      stats: stats.getStats(),
      careHistory: {
        totalFeedings: 0,
        totalPlaySessions: 0,
        totalCleanings: 0,
        neglectEvents: 0,
        averageCareScore: stats.getAverageScore(),
      },
      ageMinutes: clock.getAgeMinutes(),
      lastSavedAt: clock.getLastSavedAt(),
      position: petStateRef.current.position,
      isAlive: !stats.isDead(),
      createdAt: new Date().toISOString(),
    };
  }, []);

  // Load from save data
  const loadSaveData = useCallback((data: PetSaveData) => {
    const stats = statsManagerRef.current;
    const clock = gameClockRef.current;
    const sm = stateMachineRef.current;
    if (!stats || !clock || !sm) return;

    petIdRef.current = data.id;
    petNameRef.current = data.name;

    stats.setAllStats(data.stats);
    clock.setLastSavedAt(data.lastSavedAt);
    clock.setAgeMinutes(data.ageMinutes);

    // Calculate and apply offline decay
    const offlineSeconds = clock.getOfflineElapsedSeconds();
    if (offlineSeconds > 60) {
      stats.applyOfflineDecay(offlineSeconds);
      clock.addOfflineAge(offlineSeconds);
    }

    setPetState((prev) => ({
      ...prev,
      position: data.position,
      stats: stats.getStats(),
      ageMinutes: clock.getAgeMinutes(),
      isAlive: data.isAlive,
    }));

    if (!data.isAlive) {
      sm.forceState('GHOST');
    }
  }, []);

  // --- Pet interaction actions ---

  const feed = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    if (!stats || !sm) return;
    if (sm.getState() === 'GHOST') return;

    stats.modifyStat('hunger', 25);
    sm.forceState('EATING');
  }, []);

  const sleep = useCallback(() => {
    const sm = stateMachineRef.current;
    if (!sm) return;
    if (sm.getState() === 'GHOST') return;

    sm.forceState('SLEEPING');
  }, []);

  const clean = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    if (!stats || !sm) return;
    if (sm.getState() === 'GHOST') return;

    stats.modifyStat('cleanliness', 30);
    sm.forceState('HAPPY');
  }, []);

  const play = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    if (!stats || !sm) return;
    if (sm.getState() === 'GHOST') return;

    stats.modifyStat('happiness', 20);
    stats.modifyStat('energy', -10);
    sm.forceState('HAPPY');
  }, []);

  const medicine = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    if (!stats || !sm) return;
    if (sm.getState() === 'GHOST') return;

    stats.modifyStat('health', 30);
    sm.forceState('HAPPY');
  }, []);

  const getSaveData = useCallback((): PetSaveData | null => {
    return buildSaveData();
  }, [buildSaveData]);

  return {
    petState,
    canvasRef,
    isLoaded,
    feed,
    sleep,
    clean,
    play,
    medicine,
    getSaveData,
    loadSaveData,
  };
}

/** Map PetState enum to animation state string */
function mapStateToAnimation(state: PetState): string {
  switch (state) {
    case 'IDLE':
      return 'idle';
    case 'WALKING':
      return 'walk';
    case 'SLEEPING':
      return 'sleep';
    case 'EATING':
      return 'eating';
    case 'HAPPY':
      return 'happy';
    case 'SAD':
      return 'sad';
    case 'SICK':
      return 'sick';
    case 'GHOST':
      return 'ghost';
    default:
      return 'idle';
  }
}

/** Draw a placeholder pet when sprites aren't loaded */
function drawPlaceholderPet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  state: PetState
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  // Ghost state: semi-transparent white
  if (state === 'GHOST') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ghost eyes
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.25, centerY - radius * 0.15, radius * 0.1, 0, Math.PI * 2);
    ctx.arc(centerX + radius * 0.25, centerY - radius * 0.15, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Body color based on state
  let bodyColor = '#4FC3F7';
  if (state === 'SICK') bodyColor = '#A5D6A7'; // green tint
  if (state === 'SAD') bodyColor = '#90CAF9'; // more blue
  if (state === 'SLEEPING') bodyColor = '#7986CB'; // purple tint

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1A237E';
  if (state === 'SLEEPING') {
    // Closed eyes (lines)
    ctx.strokeStyle = '#1A237E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.35, centerY - radius * 0.15);
    ctx.lineTo(centerX - radius * 0.15, centerY - radius * 0.15);
    ctx.moveTo(centerX + radius * 0.15, centerY - radius * 0.15);
    ctx.lineTo(centerX + radius * 0.35, centerY - radius * 0.15);
    ctx.stroke();

    // Zzz
    ctx.fillStyle = '#FFF';
    ctx.font = `${radius * 0.4}px monospace`;
    ctx.fillText('z', centerX + radius * 0.6, centerY - radius * 0.5);
    ctx.font = `${radius * 0.6}px monospace`;
    ctx.fillText('Z', centerX + radius * 0.8, centerY - radius * 0.9);
  } else {
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.25, centerY - radius * 0.15, radius * 0.12, 0, Math.PI * 2);
    ctx.arc(centerX + radius * 0.25, centerY - radius * 0.15, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  ctx.strokeStyle = '#1A237E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (state === 'HAPPY' || state === 'EATING') {
    ctx.arc(centerX, centerY + radius * 0.1, radius * 0.25, 0, Math.PI);
  } else if (state === 'SAD' || state === 'SICK') {
    ctx.arc(centerX, centerY + radius * 0.3, radius * 0.2, Math.PI, 0);
  } else if (state !== 'SLEEPING') {
    ctx.arc(centerX, centerY + radius * 0.1, radius * 0.2, 0, Math.PI);
  }
  ctx.stroke();

  // Antennae
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - radius * 0.3, centerY - radius * 0.8);
  ctx.lineTo(centerX - radius * 0.5, centerY - radius * 1.3);
  ctx.moveTo(centerX + radius * 0.3, centerY - radius * 0.8);
  ctx.lineTo(centerX + radius * 0.5, centerY - radius * 1.3);
  ctx.stroke();

  // Antenna tips
  ctx.fillStyle = '#FDD835';
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.5, centerY - radius * 1.3, 3, 0, Math.PI * 2);
  ctx.arc(centerX + radius * 0.5, centerY - radius * 1.3, 3, 0, Math.PI * 2);
  ctx.fill();
}
