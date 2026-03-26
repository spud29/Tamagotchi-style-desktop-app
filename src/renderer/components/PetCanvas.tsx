import React, { useCallback, useEffect } from 'react';
import { usePetEngine } from '../hooks/usePetEngine';
import { StatsPanel } from './StatsPanel';
import { SpriteSheetConfig, AnimationDef, StatDecayRates } from '../../engine/types';

interface PetCanvasProps {
  spriteSheetConfig: SpriteSheetConfig;
  animations: Record<string, AnimationDef>;
  getAnimationName: (state: string, direction?: string) => string;
  petSize: number;
  decayRates: StatDecayRates;
  onClick?: () => void;
  showStats: boolean;
}

/**
 * Canvas component that renders the pet on screen.
 * Handles sprite rendering, animation, click detection, stats panel, and tray actions.
 */
export function PetCanvas({
  spriteSheetConfig,
  animations,
  getAnimationName,
  petSize,
  decayRates,
  onClick,
  showStats,
}: PetCanvasProps): React.ReactElement {
  const {
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
  } = usePetEngine(spriteSheetConfig, animations, getAnimationName, petSize, decayRates);

  // Load saved game on mount
  useEffect(() => {
    if (!isLoaded) return;
    if (!window.electronAPI) return;

    window.electronAPI.loadGame().then((data) => {
      if (data) {
        loadSaveData(data);
      }
    });
  }, [isLoaded, loadSaveData]);

  // Save on window close / visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const data = getSaveData();
        if (data && window.electronAPI) {
          window.electronAPI.saveGame(data);
        }
      }
    };

    const handleBeforeUnload = () => {
      const data = getSaveData();
      if (data && window.electronAPI) {
        window.electronAPI.saveGame(data);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [getSaveData]);

  // Listen for tray actions
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onTrayAction((action: string) => {
      switch (action) {
        case 'feed':
          feed();
          break;
        case 'play':
          play();
          break;
        case 'sleep':
          sleep();
          break;
      }
    });

    return cleanup;
  }, [feed, play, sleep]);

  // Handle mouse events for click detection on the pet
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isOverPet =
        mouseX >= petState.position.x &&
        mouseX <= petState.position.x + petSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + petSize;

      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouse(!isOverPet);
      }
    },
    [petState.position, petSize, canvasRef]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isOverPet =
        mouseX >= petState.position.x &&
        mouseX <= petState.position.x + petSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + petSize;

      if (isOverPet && onClick) {
        onClick();
      }
    },
    [petState.position, petSize, canvasRef, onClick]
  );

  // Set canvas to full window size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'auto',
          cursor: 'default',
        }}
      />
      <StatsPanel
        stats={petState.stats}
        petName="Gloop"
        lifeStage="baby"
        ageMinutes={petState.ageMinutes}
        visible={showStats}
        position={petState.position}
      />
    </>
  );
}
