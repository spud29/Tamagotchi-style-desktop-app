import React, { useCallback, useEffect, useState } from 'react';
import { usePetEngine } from '../hooks/usePetEngine';
import { StatsPanel } from './StatsPanel';
import { ContextMenu, getDefaultMenuActions } from './ContextMenu';
import { FeedingUI } from './FeedingUI';
import { PoopManager } from './PoopManager';
import { SpeechBubble } from './SpeechBubble';
import { AttentionOverlay } from './AttentionOverlay';
import { TugOfWarUI } from './TugOfWarUI';
import { HideSeekUI } from './HideSeekUI';
import { DeathRebirthUI } from './DeathRebirthUI';
import { useCursorTracking } from '../hooks/useCursorTracking';
import { sfx } from '../audio/SFXManager';
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
    setCursorPosition,
    rebirth,
  } = usePetEngine(spriteSheetConfig, animations, getAnimationName, petSize, lifeStageConfigs);

  // Track cursor position for attention behaviors
  const cursorPos = useCursorTracking();

  // Feed cursor position to engine
  useEffect(() => {
    setCursorPosition(cursorPos);
  }, [cursorPos, setCursorPosition]);

  // UI state
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [feedingMode, setFeedingMode] = useState(false);
  const [tugOfWarMode, setTugOfWarMode] = useState(false);
  const [hideSeekMode, setHideSeekMode] = useState(false);
  const [playMenu, setPlayMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });
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
        sfx.play('sad');
        showBubble('😢 I\'m sad...');
        break;
      case 'SICK':
        sfx.play('sick');
        showBubble('🤒 I don\'t feel good...');
        break;
      case 'SLEEPING':
        showBubble('💤 Zzz...');
        break;
      case 'GHOST':
        sfx.play('death');
        showBubble('👻 ...');
        break;
    }
  }, [petState.state, showBubble]);

  // Attention behavior speech bubbles
  const prevBehaviorRef = React.useRef(petState.attentionBehavior);
  useEffect(() => {
    if (petState.attentionBehavior && petState.attentionBehavior !== prevBehaviorRef.current) {
      switch (petState.attentionBehavior) {
        case 'wave':
          showBubble('👋 Hey! Look at me!');
          break;
        case 'ride_cursor':
          showBubble('🎢 Wheee!');
          break;
        case 'knock':
          showBubble('🪟 *knock knock*');
          break;
        case 'mess_icons':
          showBubble('📂 Reorganizing...');
          break;
        case 'yeet_icons':
          showBubble('💨 Yeet!');
          break;
      }
    }
    prevBehaviorRef.current = petState.attentionBehavior;
  }, [petState.attentionBehavior, showBubble]);

  // Evolution celebration
  const prevStageRef = React.useRef(petState.lifeStage);
  useEffect(() => {
    if (petState.lifeStage !== prevStageRef.current) {
      const prev = prevStageRef.current;
      prevStageRef.current = petState.lifeStage;

      if (prev === 'egg' && petState.lifeStage === 'baby') {
        sfx.play('hatch');
        showBubble('🥚 I hatched!');
      } else if (petState.lifeStage === 'teen') {
        sfx.play('evolve');
        showBubble('🎉 I\'m a teenager now!');
      } else if (petState.lifeStage === 'adult') {
        sfx.play('evolve');
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
          // Show play menu with game choices
          setPlayMenu({
            visible: true,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
          break;
        case 'clean':
          clean();
          sfx.play('clean');
          showBubble('✨ So fresh!');
          break;
        case 'medicine':
          medicine();
          sfx.play('medicine');
          showBubble('💊 Feeling better!');
          break;
        case 'sleep':
          sleep();
          sfx.play('sleep');
          break;
        case 'stats':
          onClick?.();
          break;
      }
    },
    [clean, medicine, sleep, onClick, showBubble]
  );

  const handlePlayChoice = useCallback(
    (game: string) => {
      setPlayMenu((prev) => ({ ...prev, visible: false }));
      switch (game) {
        case 'quick':
          play();
          sfx.play('play');
          showBubble('🎮 Yay, playtime!');
          break;
        case 'tug':
          setTugOfWarMode(true);
          showBubble('💪 Let\'s tug!');
          break;
        case 'hide':
          setHideSeekMode(true);
          showBubble('👀 Find me!');
          break;
      }
    },
    [play, showBubble]
  );

  const handleTugComplete = useCallback(
    (result: { won: boolean; happinessBonus: number; energyCost: number }) => {
      setTugOfWarMode(false);
      const stats = result;
      play(); // records care
      sfx.play(stats.won ? 'tug_win' : 'happy');
      if (stats.won) {
        showBubble('🎉 Great game! You win!');
      } else {
        showBubble('💪 Gloop is strong!');
      }
    },
    [play, showBubble]
  );

  const handleHideComplete = useCallback(
    (result: { won: boolean; happinessBonus: number; energyCost: number }) => {
      setHideSeekMode(false);
      play(); // records care
      sfx.play(result.won ? 'hide_found' : 'happy');
      if (result.won) {
        showBubble('🎉 You found me!');
      } else {
        showBubble('😏 Better luck next time!');
      }
    },
    [play, showBubble]
  );

  const handleFeed = useCallback(() => {
    feed();
    sfx.play('feed');
    showBubble('😋 Yummy!');
  }, [feed, showBubble]);

  const handleCleanPoop = useCallback(() => {
    clean();
    sfx.play('poop_clean');
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

      {/* Attention-seeking visual effects */}
      <AttentionOverlay
        behavior={petState.attentionBehavior}
        petPosition={petState.position}
        petSize={currentPetSize}
        cursorPosition={cursorPos}
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

      {/* Play menu (game selection) */}
      {playMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => setPlayMenu((prev) => ({ ...prev, visible: false }))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20, 20, 35, 0.96)',
              borderRadius: 16,
              padding: '16px 20px',
              border: '1px solid rgba(79, 195, 247, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 200,
            }}
          >
            <div
              style={{
                color: '#4FC3F7',
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              Choose a Game!
            </div>
            {[
              { id: 'quick', label: '🎮 Quick Play', desc: 'Instant happiness boost' },
              { id: 'tug', label: '💪 Tug of War', desc: 'Mash to pull the rope!' },
              { id: 'hide', label: '👀 Hide & Seek', desc: 'Find Gloop on screen!' },
            ].map((game) => (
              <div
                key={game.id}
                onClick={() => handlePlayChoice(game.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(79, 195, 247, 0.1)',
                  cursor: 'pointer',
                  fontFamily: '"Segoe UI", system-ui, sans-serif',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(79, 195, 247, 0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(79, 195, 247, 0.1)';
                }}
              >
                <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>{game.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{game.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tug of War minigame */}
      <TugOfWarUI
        visible={tugOfWarMode}
        petEnergy={petState.stats.energy}
        onComplete={handleTugComplete}
        onClose={() => setTugOfWarMode(false)}
      />

      {/* Hide & Seek minigame */}
      <HideSeekUI
        visible={hideSeekMode}
        petSize={currentPetSize}
        onComplete={handleHideComplete}
        onClose={() => setHideSeekMode(false)}
      />

      {/* Death/Rebirth overlay */}
      <DeathRebirthUI
        isGhost={petState.deathRebirth.isGhost}
        mourningTimeRemaining={petState.deathRebirth.mourningTimeRemaining}
        rebirthReady={petState.deathRebirth.rebirthReady}
        memorial={petState.deathRebirth.memorial}
        onRebirth={rebirth}
      />
    </>
  );
}
