import { useCallback, useEffect, useRef, useState } from 'react';
import { PetStateMachine } from '../../engine/PetStateMachine';
import { StatsManager } from '../../engine/StatsManager';
import { GameClock } from '../../engine/GameClock';
import { EvolutionManager } from '../../engine/EvolutionManager';
import { CareTracker } from '../../engine/CareTracker';
import { AttentionSeeker, AttentionBehavior } from '../../engine/AttentionSeeker';
import { DeathRebirthManager, DeathRebirthState } from '../../engine/DeathRebirth';
import { AnimationPlayer } from '../../sprites/AnimationPlayer';
import { SpriteSheet } from '../../sprites/SpriteSheet';
import {
  Position,
  PetState,
  PetStats,
  PetSaveData,
  SpriteSheetConfig,
  AnimationDef,
  LifeStage,
  LifeStageConfig,
} from '../../engine/types';

export interface PetEngineState {
  position: Position;
  state: PetState;
  direction: string;
  stats: PetStats;
  ageMinutes: number;
  isAlive: boolean;
  lifeStage: LifeStage;
  petSize: number;
  evolutionProgress: number;
  attentionBehavior: AttentionBehavior | null;
  deathRebirth: DeathRebirthState;
}

interface UsePetEngineReturn {
  petState: PetEngineState;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoaded: boolean;
  feed: () => void;
  sleep: () => void;
  clean: () => void;
  play: () => void;
  medicine: () => void;
  getSaveData: () => PetSaveData | null;
  loadSaveData: (data: PetSaveData) => void;
  /** Set cursor position for attention behaviors */
  setCursorPosition: (pos: Position) => void;
  /** Start a new egg after death */
  rebirth: () => void;
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
 * Manages state machine, stats, animation, clock, evolution, care tracking, and rendering.
 */
export function usePetEngine(
  spriteSheetConfig: SpriteSheetConfig,
  animations: Record<string, AnimationDef>,
  getAnimationName: (state: string, direction?: string) => string,
  defaultPetSize: number,
  lifeStageConfigs: Record<LifeStage, LifeStageConfig>
): UsePetEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteSheetRef = useRef<SpriteSheet | null>(null);
  const animPlayerRef = useRef<AnimationPlayer | null>(null);
  const stateMachineRef = useRef<PetStateMachine | null>(null);
  const statsManagerRef = useRef<StatsManager | null>(null);
  const gameClockRef = useRef<GameClock | null>(null);
  const evolutionRef = useRef<EvolutionManager | null>(null);
  const careTrackerRef = useRef<CareTracker | null>(null);
  const attentionRef = useRef<AttentionSeeker | null>(null);
  const deathRebirthRef = useRef<DeathRebirthManager | null>(null);
  const cursorPosRef = useRef<Position>({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const saveTimerRef = useRef<number>(0);
  const evolCheckTimerRef = useRef<number>(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [petState, setPetState] = useState<PetEngineState>({
    position: { x: 400, y: 400 },
    state: 'EGG',
    direction: 'front',
    stats: { ...DEFAULT_STATS },
    ageMinutes: 0,
    isAlive: true,
    lifeStage: 'egg',
    petSize: lifeStageConfigs.egg.size.width,
    evolutionProgress: 0,
    attentionBehavior: null,
    deathRebirth: {
      isDead: false,
      isGhost: false,
      mourningTimeRemaining: 0,
      rebirthReady: false,
      memorial: null,
    },
  });

  const petStateRef = useRef(petState);
  petStateRef.current = petState;

  const petIdRef = useRef<string>(crypto.randomUUID());
  const petNameRef = useRef<string>('Gloop');
  const createdAtRef = useRef<string>(new Date().toISOString());

  // Initialize all systems
  useEffect(() => {
    const sheet = new SpriteSheet(spriteSheetConfig);
    const player = new AnimationPlayer(sheet, animations);
    const eggDecay = lifeStageConfigs.egg.statDecayRates;
    const statsManager = new StatsManager(undefined, eggDecay);
    const gameClock = new GameClock();
    const evolution = new EvolutionManager(lifeStageConfigs, 'egg');
    const careTracker = new CareTracker();

    const attention = new AttentionSeeker(
      ['wave', 'ride_cursor', 'knock', 'mess_icons', 'yeet_icons'],
      []
    );
    const deathRebirth = new DeathRebirthManager();

    spriteSheetRef.current = sheet;
    animPlayerRef.current = player;
    statsManagerRef.current = statsManager;
    gameClockRef.current = gameClock;
    evolutionRef.current = evolution;
    careTrackerRef.current = careTracker;
    attentionRef.current = attention;
    deathRebirthRef.current = deathRebirth;

    // When evolution occurs, update decay rates for new stage
    evolution.setOnEvolve((newStage) => {
      const config = lifeStageConfigs[newStage];
      statsManager.setDecayRates(config.statDecayRates);
    });

    const initEngine = async () => {
      try {
        let screenWidth = window.innerWidth;
        let screenHeight = window.innerHeight;

        if (window.electronAPI) {
          const size = await window.electronAPI.getScreenSize();
          screenWidth = size.width;
          screenHeight = size.height;
        }

        const eggSize = lifeStageConfigs.egg.size.width;
        const sm = new PetStateMachine(screenWidth, screenHeight);
        sm.setPetSize(eggSize);
        sm.forceState('EGG');
        stateMachineRef.current = sm;

        setPetState((prev) => ({
          ...prev,
          position: {
            x: screenWidth / 2 - eggSize / 2,
            y: screenHeight / 2 - eggSize / 2,
          },
        }));

        await sheet.load();
        player.play(getAnimationName('egg_idle'));
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
  }, [spriteSheetConfig, animations, getAnimationName, defaultPetSize, lifeStageConfigs]);

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
      const evolution = evolutionRef.current;
      const careTracker = careTrackerRef.current;

      if (!sm || !player || !canvas || !statsManager || !gameClock || !evolution || !careTracker) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const currentStage = evolution.getStage();

      // Update game clock
      gameClock.update(deltaTime);

      // Egg state: no stat decay, just wait for hatching
      if (currentStage !== 'egg' && currentStage !== 'ghost') {
        // Update stats (decay)
        const currentState = sm.getState();
        if (currentState === 'SLEEPING') {
          statsManager.pause();
          statsManager.modifyStat('energy', 8 * deltaTime);
        } else {
          statsManager.resume();
          statsManager.update(deltaTime);
        }

        // Update care tracker
        careTracker.update(deltaTime, statsManager.getStats());

        // Check for neglect (any stat at 0)
        const stats = statsManager.getStats();
        if (Object.values(stats).some((v) => v <= 0)) {
          careTracker.recordNeglect();
        }

        // Feed stats to state machine
        sm.setStats(statsManager.getStats());

        // Detect death: health at 0 triggers ghost/death sequence
        const deathMgr = deathRebirthRef.current;
        if (deathMgr && statsManager.isDead() && !deathMgr.getState().isDead) {
          deathMgr.triggerDeath(
            petNameRef.current,
            'gloop',
            evolution.getStage(),
            gameClock.getAgeMinutes()
          );
          sm.forceState('GHOST');
          evolution.setStage('ghost');
        }
      }

      // Update death/rebirth timer
      const deathMgr = deathRebirthRef.current;
      if (deathMgr) {
        deathMgr.update(deltaTime);
      }

      // Check evolution every 5 seconds
      evolCheckTimerRef.current += deltaTime;
      if (evolCheckTimerRef.current >= 5) {
        evolCheckTimerRef.current = 0;

        const ageMinutes = gameClock.getAgeMinutes();
        const careHistory = careTracker.getHistory();
        const evolved = evolution.checkEvolution(ageMinutes, careHistory);

        if (evolved) {
          const newStage = evolution.getStage();
          const newSize = evolution.getPetSize();
          sm.setPetSize(newSize.width);

          // After hatching from egg, transition to IDLE
          if (newStage === 'baby') {
            sm.forceState('HAPPY'); // Celebrate hatching
          } else {
            sm.forceState('HAPPY'); // Celebrate evolution
          }
        }
      }

      // Update attention seeker
      const attention = attentionRef.current;
      let activeBehavior: AttentionBehavior | null = null;
      if (attention && currentStage !== 'egg' && currentStage !== 'ghost') {
        attention.setUnlockedAbilities(evolution.getUnlockedAbilities());
        activeBehavior = attention.update(deltaTime, statsManager.getStats(), sm.getState());

        // If attention triggered and pet was IDLE, force ATTENTION state
        if (activeBehavior && sm.getState() === 'IDLE') {
          sm.forceState('ATTENTION');
        }
        // If attention ended but state machine still in ATTENTION, go back to IDLE
        if (!activeBehavior && sm.getState() === 'ATTENTION') {
          sm.forceState('IDLE');
        }

        // Handle icon mischief via IPC
        if (activeBehavior === 'mess_icons' || activeBehavior === 'yeet_icons') {
          handleIconMischief(activeBehavior);
        }
      }

      // Update state machine
      const currentPos = petStateRef.current.position;
      const newPos = sm.update(deltaTime, currentPos);
      const newState = sm.getState();
      const currentDir = sm.getDirection();

      // Override position for ride_cursor behavior
      let finalPos = newPos ?? currentPos;
      if (activeBehavior === 'ride_cursor') {
        const cursorPos = cursorPosRef.current;
        const petSz = evolution.getPetSize().width;
        finalPos = {
          x: cursorPos.x - petSz / 2,
          y: cursorPos.y - petSz - 5,
        };
      }

      // Map state to animation
      const animState = currentStage === 'egg'
        ? 'egg_idle'
        : activeBehavior
          ? mapAttentionToAnimation(activeBehavior)
          : mapStateToAnimation(newState);
      const animName = getAnimationName(animState, currentDir);
      player.play(animName);
      player.update(deltaTime);

      // Current pet size from evolution stage
      const currentPetSize = evolution.getPetSize().width;
      const updatedStats = statsManager.getStats();
      const updatedAge = gameClock.getAgeMinutes();
      const isAlive = !statsManager.isDead();
      const evoProgress = evolution.getEvolutionProgress(
        updatedAge,
        careTracker.getCareScore()
      );

      // Update React state
      const drState = deathRebirthRef.current?.getState() ?? {
        isDead: false,
        isGhost: false,
        mourningTimeRemaining: 0,
        rebirthReady: false,
        memorial: null,
      };

      setPetState({
        position: finalPos,
        state: newState,
        direction: currentDir,
        stats: updatedStats,
        ageMinutes: updatedAge,
        isAlive,
        lifeStage: currentStage,
        petSize: currentPetSize,
        evolutionProgress: evoProgress,
        attentionBehavior: activeBehavior,
        deathRebirth: drState,
      });

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (sheet?.isLoaded()) {
        player.draw(ctx, finalPos.x, finalPos.y, currentPetSize, currentPetSize);
      } else {
        drawPlaceholderPet(ctx, finalPos.x, finalPos.y, currentPetSize, newState, currentStage);
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
  }, [isLoaded, getAnimationName, defaultPetSize]);

  const autoSave = useCallback(() => {
    const saveData = buildSaveData();
    if (saveData && window.electronAPI) {
      window.electronAPI.saveGame(saveData);
    }
  }, []);

  const buildSaveData = useCallback((): PetSaveData | null => {
    const stats = statsManagerRef.current;
    const clock = gameClockRef.current;
    const evolution = evolutionRef.current;
    const careTracker = careTrackerRef.current;
    if (!stats || !clock || !evolution || !careTracker) return null;

    clock.markSaved();

    return {
      id: petIdRef.current,
      speciesId: 'gloop',
      name: petNameRef.current,
      lifeStage: evolution.getStage(),
      stats: stats.getStats(),
      careHistory: careTracker.getHistory(),
      ageMinutes: clock.getAgeMinutes(),
      lastSavedAt: clock.getLastSavedAt(),
      position: petStateRef.current.position,
      isAlive: !stats.isDead(),
      createdAt: createdAtRef.current,
    };
  }, []);

  const loadSaveData = useCallback((data: PetSaveData) => {
    const stats = statsManagerRef.current;
    const clock = gameClockRef.current;
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    const careTracker = careTrackerRef.current;
    if (!stats || !clock || !sm || !evolution || !careTracker) return;

    petIdRef.current = data.id;
    petNameRef.current = data.name;
    createdAtRef.current = data.createdAt;

    // Restore evolution stage
    evolution.setStage(data.lifeStage);
    const stageConfig = evolution.getCurrentConfig();
    stats.setDecayRates(stageConfig.statDecayRates);
    sm.setPetSize(stageConfig.size.width);

    // Restore stats and care history
    stats.setAllStats(data.stats);
    careTracker.loadHistory(data.careHistory);
    clock.setLastSavedAt(data.lastSavedAt);
    clock.setAgeMinutes(data.ageMinutes);

    // Calculate and apply offline decay (skip for eggs)
    const offlineSeconds = clock.getOfflineElapsedSeconds();
    if (offlineSeconds > 60 && data.lifeStage !== 'egg') {
      stats.applyOfflineDecay(offlineSeconds);
      clock.addOfflineAge(offlineSeconds);
    }

    // Set appropriate initial state
    if (!data.isAlive) {
      sm.forceState('GHOST');
      evolution.setStage('ghost');
    } else if (data.lifeStage === 'egg') {
      sm.forceState('EGG');
    } else {
      sm.forceState('IDLE');
    }

    setPetState((prev) => ({
      ...prev,
      position: data.position,
      stats: stats.getStats(),
      ageMinutes: clock.getAgeMinutes(),
      isAlive: data.isAlive,
      lifeStage: data.lifeStage,
      petSize: stageConfig.size.width,
    }));
  }, []);

  // --- Pet interactions (blocked during egg state) ---

  const feed = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    const care = careTrackerRef.current;
    if (!stats || !sm || !evolution || !care) return;
    if (sm.getState() === 'GHOST' || evolution.getStage() === 'egg') return;

    stats.modifyStat('hunger', 25);
    care.recordFeeding();
    sm.forceState('EATING');
  }, []);

  const sleep = useCallback(() => {
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    if (!sm || !evolution) return;
    if (sm.getState() === 'GHOST' || evolution.getStage() === 'egg') return;

    sm.forceState('SLEEPING');
  }, []);

  const clean = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    const care = careTrackerRef.current;
    if (!stats || !sm || !evolution || !care) return;
    if (sm.getState() === 'GHOST' || evolution.getStage() === 'egg') return;

    stats.modifyStat('cleanliness', 30);
    care.recordCleaning();
    sm.forceState('HAPPY');
  }, []);

  const play = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    const care = careTrackerRef.current;
    if (!stats || !sm || !evolution || !care) return;
    if (sm.getState() === 'GHOST' || evolution.getStage() === 'egg') return;

    stats.modifyStat('happiness', 20);
    stats.modifyStat('energy', -10);
    care.recordPlay();
    sm.forceState('HAPPY');
  }, []);

  const medicine = useCallback(() => {
    const stats = statsManagerRef.current;
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    if (!stats || !sm || !evolution) return;
    if (sm.getState() === 'GHOST' || evolution.getStage() === 'egg') return;

    stats.modifyStat('health', 30);
    sm.forceState('HAPPY');
  }, []);

  const getSaveData = useCallback((): PetSaveData | null => {
    return buildSaveData();
  }, [buildSaveData]);

  const setCursorPosition = useCallback((pos: Position) => {
    cursorPosRef.current = pos;
  }, []);

  const rebirth = useCallback(() => {
    const dr = deathRebirthRef.current;
    const stats = statsManagerRef.current;
    const clock = gameClockRef.current;
    const sm = stateMachineRef.current;
    const evolution = evolutionRef.current;
    const care = careTrackerRef.current;
    if (!dr || !stats || !clock || !sm || !evolution || !care) return;

    // Confirm rebirth in the death manager
    dr.confirmRebirth();

    // Reset all systems for a new pet
    petIdRef.current = crypto.randomUUID();
    petNameRef.current = 'Gloop';
    createdAtRef.current = new Date().toISOString();

    // Reset stats to defaults
    stats.setAllStats({ ...DEFAULT_STATS });
    stats.resume();

    // Reset clock
    clock.setAgeMinutes(0);
    clock.markSaved();

    // Reset evolution to egg
    const eggConfig = lifeStageConfigs.egg;
    evolution.setStage('egg');
    stats.setDecayRates(eggConfig.statDecayRates);
    sm.setPetSize(eggConfig.size.width);

    // Reset care tracker
    care.loadHistory({
      totalFeedings: 0,
      totalPlaySessions: 0,
      totalCleanings: 0,
      neglectEvents: 0,
      averageCareScore: 50,
    });

    // Center the new egg on screen
    sm.forceState('EGG');
    const centerX = (window.innerWidth || 800) / 2 - eggConfig.size.width / 2;
    const centerY = (window.innerHeight || 600) / 2 - eggConfig.size.width / 2;

    setPetState((prev) => ({
      ...prev,
      position: { x: centerX, y: centerY },
      state: 'EGG',
      stats: { ...DEFAULT_STATS },
      ageMinutes: 0,
      isAlive: true,
      lifeStage: 'egg',
      petSize: eggConfig.size.width,
      evolutionProgress: 0,
      attentionBehavior: null,
      deathRebirth: dr.getState(),
    }));

    // Auto-save the new egg
    autoSave();
  }, [lifeStageConfigs, autoSave]);

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
    setCursorPosition,
    rebirth,
  };
}

/** Trigger desktop icon mischief via IPC */
let iconMischiefCooldown = 0;
function handleIconMischief(behavior: AttentionBehavior): void {
  if (!window.electronAPI) return;

  // Only trigger actual icon moves occasionally (not every frame)
  const now = Date.now();
  if (now - iconMischiefCooldown < 2000) return;
  iconMischiefCooldown = now;

  window.electronAPI.getDesktopIcons().then((icons) => {
    if (icons.length === 0) return;

    // Pick a random icon to mess with
    const target = icons[Math.floor(Math.random() * icons.length)];
    const offsetX = (Math.random() - 0.5) * 200;
    const offsetY = (Math.random() - 0.5) * 200;

    const newX = Math.max(0, target.x + offsetX);
    const newY = Math.max(0, target.y + offsetY);

    window.electronAPI.moveDesktopIcon(target.name, newX, newY);
  });
}

function mapStateToAnimation(state: PetState): string {
  switch (state) {
    case 'EGG': return 'egg_idle';
    case 'IDLE': return 'idle';
    case 'WALKING': return 'walk';
    case 'SLEEPING': return 'sleep';
    case 'EATING': return 'eating';
    case 'HAPPY': return 'happy';
    case 'SAD': return 'sad';
    case 'SICK': return 'sick';
    case 'GHOST': return 'ghost';
    default: return 'idle';
  }
}

/** Map attention behavior to animation name */
function mapAttentionToAnimation(behavior: AttentionBehavior): string {
  switch (behavior) {
    case 'wave': return 'wave';
    case 'ride_cursor': return 'ride_cursor';
    case 'knock': return 'knock';
    case 'mess_icons': return 'carry_left';
    case 'yeet_icons': return 'reach';
    default: return 'idle';
  }
}

/** Draw a placeholder pet when sprites aren't loaded */
function drawPlaceholderPet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  state: PetState,
  lifeStage: LifeStage
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  // Egg: simple oval
  if (lifeStage === 'egg' || state === 'EGG') {
    ctx.fillStyle = '#FFFDE7';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius * 0.7, radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FDD835';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius * 0.7, radius * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Crack lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.15, centerY);
    ctx.lineTo(centerX + radius * 0.1, centerY - radius * 0.2);
    ctx.lineTo(centerX - radius * 0.05, centerY - radius * 0.4);
    ctx.stroke();
    return;
  }

  // Ghost
  if (state === 'GHOST') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.25, centerY - radius * 0.15, radius * 0.1, 0, Math.PI * 2);
    ctx.arc(centerX + radius * 0.25, centerY - radius * 0.15, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Body color by state
  let bodyColor = '#4FC3F7';
  if (state === 'SICK') bodyColor = '#A5D6A7';
  if (state === 'SAD') bodyColor = '#90CAF9';
  if (state === 'SLEEPING') bodyColor = '#7986CB';

  // Size varies by life stage (drawn at the passed-in size already)
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Baby: bigger eyes, no antennae
  const isBaby = lifeStage === 'baby';
  const eyeSize = isBaby ? radius * 0.16 : radius * 0.12;
  const eyeSpread = isBaby ? radius * 0.2 : radius * 0.25;

  // Eyes
  ctx.fillStyle = '#1A237E';
  if (state === 'SLEEPING') {
    ctx.strokeStyle = '#1A237E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.35, centerY - radius * 0.15);
    ctx.lineTo(centerX - radius * 0.15, centerY - radius * 0.15);
    ctx.moveTo(centerX + radius * 0.15, centerY - radius * 0.15);
    ctx.lineTo(centerX + radius * 0.35, centerY - radius * 0.15);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = `${radius * 0.4}px monospace`;
    ctx.fillText('z', centerX + radius * 0.6, centerY - radius * 0.5);
    ctx.font = `${radius * 0.6}px monospace`;
    ctx.fillText('Z', centerX + radius * 0.8, centerY - radius * 0.9);
  } else {
    ctx.beginPath();
    ctx.arc(centerX - eyeSpread, centerY - radius * 0.15, eyeSize, 0, Math.PI * 2);
    ctx.arc(centerX + eyeSpread, centerY - radius * 0.15, eyeSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  if (state !== 'SLEEPING') {
    ctx.strokeStyle = '#1A237E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (state === 'HAPPY' || state === 'EATING') {
      ctx.arc(centerX, centerY + radius * 0.1, radius * 0.25, 0, Math.PI);
    } else if (state === 'SAD' || state === 'SICK') {
      ctx.arc(centerX, centerY + radius * 0.3, radius * 0.2, Math.PI, 0);
    } else {
      ctx.arc(centerX, centerY + radius * 0.1, radius * 0.2, 0, Math.PI);
    }
    ctx.stroke();
  }

  // Antennae (teen and adult only)
  if (lifeStage === 'teen' || lifeStage === 'adult') {
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.3, centerY - radius * 0.8);
    ctx.lineTo(centerX - radius * 0.5, centerY - radius * 1.3);
    ctx.moveTo(centerX + radius * 0.3, centerY - radius * 0.8);
    ctx.lineTo(centerX + radius * 0.5, centerY - radius * 1.3);
    ctx.stroke();

    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.5, centerY - radius * 1.3, 3, 0, Math.PI * 2);
    ctx.arc(centerX + radius * 0.5, centerY - radius * 1.3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Life stage indicator (small text below)
  if (lifeStage !== 'adult') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lifeStage, centerX, centerY + radius + 12);
    ctx.textAlign = 'start';
  }
}
