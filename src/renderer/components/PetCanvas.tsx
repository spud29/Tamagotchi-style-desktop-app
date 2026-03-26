import React, { useCallback, useEffect, useState } from 'react';
import { usePetEngine } from '../hooks/usePetEngine';
import { StatsPanel } from './StatsPanel';
import { ContextMenu, getDefaultMenuActions } from './ContextMenu';
import { FeedingUI } from './FeedingUI';
import { PoopManager } from './PoopManager';
import { SpeechBubble } from './SpeechBubble';
import { SpriteSheetConfig, AnimationDef, LifeStage, LifeStageConfig } from '../../engine/types';

interface PetCanvasProps {
  spriteSheetConfig: SpriteSheetConfig;
  animations: Record<string, AnimationDef>;
  getAnimationName: (state: string, direction?: string) => string;
  petSize: number;
  lifeStageConfigs: Record<LifeStage, LifeStageConfig>;
  onClick?: () => void;
  showStats: boolean;
}

/**
 * Canvas component that renders the pet on screen.
 * Orchestrates all UI overlays: stats, context menu, feeding, poop, speech bubbles.
 */
export function PetCanvas({
  spriteSheetConfig,
  animations,
  getAnimationName,
  petSize,
  lifeStageConfigs,
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
  } = usePetEngine(spriteSheetConfig, animations, getAnimationName, petSize, lifeStageConfigs);

  // UI state
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [feedingMode, setFeedingMode] = useState(false);
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);

  const showBubble = useCallback((msg: string) => {
    setSpeechMessage(null);
    requestAnimationFrame(() => setSpeechMessage(msg));
  }, []);

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
    const handleSave = () => {
      const data = getSaveData();
      if (data && window.electronAPI) {
        window.electronAPI.saveGame(data);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleSave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleSave);
    };
  }, [getSaveData]);

  // Listen for tray actions
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onTrayAction((action: string) => {
      handleMenuAction(action);
    });

    return cleanup;
  }, [feed, play, sleep, clean, medicine]);

  // Pet reactions based on state changes
  useEffect(() => {
    switch (petState.state) {
      case 'SAD':
        showBubble('😢 I\'m sad...');
        break;
      case 'SICK':
        showBubble('🤒 I don\'t feel good...');
        break;
      case 'SLEEPING':
        showBubble('💤 Zzz...');
        break;
      case 'GHOST':
        showBubble('👻 ...');
        break;
    }
  }, [petState.state, showBubble]);

  // Evolution celebration
  const prevStageRef = React.useRef(petState.lifeStage);
  useEffect(() => {
    if (petState.lifeStage !== prevStageRef.current) {
      const prev = prevStageRef.current;
      prevStageRef.current = petState.lifeStage;

      if (prev === 'egg' && petState.lifeStage === 'baby') {
        showBubble('🥚 I hatched!');
      } else if (petState.lifeStage === 'teen') {
        showBubble('🎉 I\'m a teenager now!');
      } else if (petState.lifeStage === 'adult') {
        showBubble('🎉 I\'m all grown up!');
      }
    }
  }, [petState.lifeStage, showBubble]);

  // Hunger warning
  useEffect(() => {
    if (petState.stats.hunger <= 20 && petState.state === 'IDLE' && petState.lifeStage !== 'egg') {
      showBubble('🍖 I\'m hungry!');
    }
  }, [Math.floor(petState.stats.hunger / 10), petState.state, petState.lifeStage, showBubble]);

  const handleMenuAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'feed':
          setFeedingMode(true);
          break;
        case 'play':
          play();
          showBubble('🎮 Yay, playtime!');
          break;
        case 'clean':
          clean();
          showBubble('✨ So fresh!');
          break;
        case 'medicine':
          medicine();
          showBubble('💊 Feeling better!');
          break;
        case 'sleep':
          sleep();
          break;
        case 'stats':
          onClick?.();
          break;
      }
    },
    [play, clean, medicine, sleep, onClick, showBubble]
  );

  const handleFeed = useCallback(() => {
    feed();
    showBubble('😋 Yummy!');
  }, [feed, showBubble]);

  const handleCleanPoop = useCallback(() => {
    clean();
    showBubble('✨ Clean!');
  }, [clean, showBubble]);

  // Use dynamic pet size from evolution
  const currentPetSize = petState.petSize;
  const isEgg = petState.lifeStage === 'egg';

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (feedingMode) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isOverPet =
        mouseX >= petState.position.x &&
        mouseX <= petState.position.x + currentPetSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + currentPetSize;

      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouse(!isOverPet);
      }
    },
    [petState.position, currentPetSize, canvasRef, feedingMode]
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
        mouseX <= petState.position.x + currentPetSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + currentPetSize;

      if (isOverPet) {
        setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        onClick?.();
      }
    },
    [petState.position, currentPetSize, canvasRef, onClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isOverPet =
        mouseX >= petState.position.x &&
        mouseX <= petState.position.x + currentPetSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + currentPetSize;

      if (isOverPet) {
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
      }
    },
    [petState.position, currentPetSize, canvasRef]
  );

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

  const isAlive = petState.isAlive;
  const isSleeping = petState.state === 'SLEEPING';

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
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

      {/* Poop spawning (not during egg stage) */}
      {!isEgg && (
        <PoopManager
          petPosition={petState.position}
          cleanlinessLevel={petState.stats.cleanliness}
          onClean={handleCleanPoop}
        />
      )}

      {/* Speech bubble */}
      <SpeechBubble
        message={speechMessage}
        petPosition={petState.position}
        petSize={currentPetSize}
        onDismiss={() => setSpeechMessage(null)}
      />

      {/* Stats panel (shows evolution progress) */}
      <StatsPanel
        stats={petState.stats}
        petName="Gloop"
        lifeStage={petState.lifeStage}
        ageMinutes={petState.ageMinutes}
        visible={showStats}
        position={petState.position}
        evolutionProgress={petState.evolutionProgress}
      />

      {/* Right-click context menu (disabled during egg) */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        actions={getDefaultMenuActions(isAlive && !isEgg, isSleeping)}
        onAction={handleMenuAction}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
      />

      {/* Feeding minigame overlay */}
      <FeedingUI
        visible={feedingMode}
        petPosition={petState.position}
        petSize={currentPetSize}
        onFeed={handleFeed}
        onClose={() => setFeedingMode(false)}
      />
    </>
  );
}
