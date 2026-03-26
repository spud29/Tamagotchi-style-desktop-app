import { useCallback, useEffect, useRef, useState } from 'react';
import { PetStateMachine } from '../../engine/PetStateMachine';
import { AnimationPlayer } from '../../sprites/AnimationPlayer';
import { SpriteSheet } from '../../sprites/SpriteSheet';
import { Position, PetState } from '../../engine/types';

interface PetEngineState {
  position: Position;
  state: PetState;
  direction: string;
}

interface UsePetEngineReturn {
  petState: PetEngineState;
  spriteSheet: SpriteSheet | null;
  animationPlayer: AnimationPlayer | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoaded: boolean;
}

/**
 * Main game loop hook.
 * Manages the pet state machine, animation player, and rendering loop.
 */
export function usePetEngine(
  spriteSheetConfig: import('../../engine/types').SpriteSheetConfig,
  animations: Record<string, import('../../engine/types').AnimationDef>,
  getAnimationName: (state: string, direction?: string) => string,
  petSize: number
): UsePetEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteSheetRef = useRef<SpriteSheet | null>(null);
  const animPlayerRef = useRef<AnimationPlayer | null>(null);
  const stateMachineRef = useRef<PetStateMachine | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [petState, setPetState] = useState<PetEngineState>({
    position: { x: 400, y: 400 },
    state: 'IDLE',
    direction: 'front',
  });

  // Store petState in a ref so the game loop always has current values
  const petStateRef = useRef(petState);
  petStateRef.current = petState;

  // Initialize sprite sheet and state machine
  useEffect(() => {
    const sheet = new SpriteSheet(spriteSheetConfig);
    const player = new AnimationPlayer(sheet, animations);

    spriteSheetRef.current = sheet;
    animPlayerRef.current = player;

    // Initialize state machine with screen size
    const initEngine = async () => {
      try {
        // Get screen size from Electron (or fallback)
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

        // Set initial position to center of screen
        setPetState((prev) => ({
          ...prev,
          position: {
            x: screenWidth / 2 - petSize / 2,
            y: screenHeight / 2 - petSize / 2,
          },
        }));

        // Load sprite sheet
        await sheet.load();
        player.play(getAnimationName('idle', 'front'));
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize pet engine:', err);
        // Still mark as loaded so we can show a fallback
        setIsLoaded(true);
      }
    };

    initEngine();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [spriteSheetConfig, animations, getAnimationName, petSize]);

  // Main game loop
  useEffect(() => {
    if (!isLoaded) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); // Cap at 100ms
      lastTimeRef.current = timestamp;

      const sm = stateMachineRef.current;
      const player = animPlayerRef.current;
      const sheet = spriteSheetRef.current;
      const canvas = canvasRef.current;

      if (!sm || !player || !canvas) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Update state machine
      const currentPos = petStateRef.current.position;
      const newPos = sm.update(deltaTime, currentPos);
      const currentState = sm.getState();
      const currentDir = sm.getDirection();

      // Update animation based on state
      const animName = getAnimationName(
        currentState === 'IDLE' ? 'idle' : currentState === 'WALKING' ? 'walk' : currentState.toLowerCase(),
        currentDir
      );
      player.play(animName);
      player.update(deltaTime);

      // Update position if state machine says to move
      if (newPos) {
        setPetState({
          position: newPos,
          state: currentState,
          direction: currentDir,
        });
      } else if (currentState !== petStateRef.current.state || currentDir !== petStateRef.current.direction) {
        setPetState((prev) => ({
          ...prev,
          state: currentState,
          direction: currentDir,
        }));
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (sheet?.isLoaded()) {
        const pos = newPos ?? petStateRef.current.position;
        player.draw(ctx, pos.x, pos.y, petSize, petSize);
      } else {
        // Fallback: draw a simple circle as placeholder
        const pos = newPos ?? petStateRef.current.position;
        drawPlaceholderPet(ctx, pos.x, pos.y, petSize);
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

  return {
    petState,
    spriteSheet: spriteSheetRef.current,
    animationPlayer: animPlayerRef.current,
    canvasRef,
    isLoaded,
  };
}

/** Draw a simple placeholder pet (colored circle) when sprites aren't loaded */
function drawPlaceholderPet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  // Body (blue blob)
  ctx.fillStyle = '#4FC3F7';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1A237E';
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.25, centerY - radius * 0.15, radius * 0.12, 0, Math.PI * 2);
  ctx.arc(centerX + radius * 0.25, centerY - radius * 0.15, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#1A237E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY + radius * 0.1, radius * 0.2, 0, Math.PI);
  ctx.stroke();

  // Antennae
  ctx.strokeStyle = '#4FC3F7';
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
