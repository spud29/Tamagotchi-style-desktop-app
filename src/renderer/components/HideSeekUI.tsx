import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HideSeekGame, HideSeekState, HideSeekResult, HideSeekHint } from '../../engine/HideSeek';

interface HideSeekUIProps {
  visible: boolean;
  petSize: number;
  onComplete: (result: HideSeekResult) => void;
  onClose: () => void;
}

const HINT_COLORS: Record<HideSeekHint, string> = {
  freezing: '#42A5F5',
  cold: '#64B5F6',
  warm: '#FFB74D',
  hot: '#EF5350',
  found: '#66BB6A',
};

const HINT_TEXT: Record<HideSeekHint, string> = {
  freezing: '🥶 Freezing...',
  cold: '❄️ Cold...',
  warm: '🔥 Getting warmer!',
  hot: '🔥🔥 HOT!',
  found: '🎉 Found me!',
};

/**
 * Hide & Seek minigame UI.
 * Player clicks around the screen to find where the pet is hiding.
 * Proximity hints guide the player.
 */
export function HideSeekUI({
  visible,
  petSize,
  onComplete,
  onClose,
}: HideSeekUIProps): React.ReactElement | null {
  const gameRef = useRef<HideSeekGame | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [gameState, setGameState] = useState<HideSeekState | null>(null);
  const [finished, setFinished] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; hint: HideSeekHint }>>([]);
  const rippleIdRef = useRef(0);

  // Initialize game when visible
  useEffect(() => {
    if (!visible) {
      gameRef.current = null;
      setGameState(null);
      setFinished(false);
      setRipples([]);
      return;
    }

    const game = new HideSeekGame(window.innerWidth, window.innerHeight, petSize);
    game.start();
    gameRef.current = game;
    lastTimeRef.current = 0;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      game.update(dt);
      const state = game.getState();
      setGameState({ ...state });

      if (state.result !== 'playing' && state.countdown <= 0 && !finished) {
        setFinished(true);
        setTimeout(() => {
          onComplete(game.getResult());
        }, 2000);
      }

      if (state.result === 'playing' || state.countdown > 0) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [visible, petSize]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game) return;

      const hint = game.click(e.clientX, e.clientY);

      // Add ripple effect
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev.slice(-10), { id, x: e.clientX, y: e.clientY, hint }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 800);
    },
    []
  );

  if (!visible || !gameState) return null;

  const { countdown, timeRemaining, hint, result, clickCount, found, hiddenPosition } = gameState;
  const countdownDisplay = countdown > 0 ? Math.ceil(countdown) : null;

  return (
    <div
      onClick={result === 'playing' && countdownDisplay === null ? handleClick : undefined}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
        zIndex: 9999,
        cursor: result === 'playing' && countdownDisplay === null ? 'crosshair' : 'default',
        background: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Close button */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(244, 67, 54, 0.9)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 10002,
        }}
      >
        ✕
      </div>

      {/* Title bar */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(20, 20, 35, 0.95)',
            color: '#CE93D8',
            padding: '8px 24px',
            borderRadius: 20,
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            border: '1px solid rgba(206, 147, 216, 0.4)',
          }}
        >
          Hide & Seek!
        </div>

        {countdownDisplay === null && result === 'playing' && (
          <>
            <div
              style={{
                background: 'rgba(20, 20, 35, 0.95)',
                color: timeRemaining <= 5 ? '#EF5350' : '#FFF',
                padding: '8px 16px',
                borderRadius: 20,
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {Math.ceil(timeRemaining)}s
            </div>

            <div
              style={{
                background: 'rgba(20, 20, 35, 0.95)',
                color: HINT_COLORS[hint],
                padding: '8px 16px',
                borderRadius: 20,
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {HINT_TEXT[hint]}
            </div>

            <div
              style={{
                background: 'rgba(20, 20, 35, 0.95)',
                color: 'rgba(255,255,255,0.7)',
                padding: '8px 16px',
                borderRadius: 20,
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                fontSize: 12,
              }}
            >
              Clicks: {clickCount}
            </div>
          </>
        )}
      </div>

      {/* Countdown */}
      {countdownDisplay !== null && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 72,
            fontWeight: 900,
            color: '#FFF',
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
          }}
        >
          {countdownDisplay}
        </div>
      )}

      {/* Click ripple effects */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          style={{
            position: 'fixed',
            left: ripple.x,
            top: ripple.y,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `3px solid ${HINT_COLORS[ripple.hint]}`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            animation: 'rippleExpand 0.8s ease-out forwards',
          }}
        />
      ))}

      {/* Found pet reveal */}
      {found && hiddenPosition && (
        <div
          style={{
            position: 'fixed',
            left: hiddenPosition.x,
            top: hiddenPosition.y,
            transform: 'translate(-50%, -50%)',
            fontSize: petSize * 1.2,
            pointerEvents: 'none',
            animation: 'bounceIn 0.5s ease-out',
          }}
        >
          🎉
        </div>
      )}

      {/* Result display */}
      {result !== 'playing' && countdownDisplay === null && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            borderRadius: 20,
            background: result === 'found' ? 'rgba(76, 175, 80, 0.95)' : 'rgba(239, 83, 80, 0.95)',
            color: '#FFF',
            fontSize: 24,
            fontWeight: 800,
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {result === 'found' ? `Found in ${clickCount} clicks! 🎉` : 'Time\'s up! 😅'}
        </div>
      )}

      {/* Timeout: reveal hidden position */}
      {result === 'timeout' && hiddenPosition && (
        <div
          style={{
            position: 'fixed',
            left: hiddenPosition.x,
            top: hiddenPosition.y,
            transform: 'translate(-50%, -50%)',
            fontSize: petSize * 0.8,
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        >
          👀
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes rippleExpand {
          from { width: 20px; height: 20px; opacity: 1; }
          to { width: 80px; height: 80px; opacity: 0; }
        }
        @keyframes bounceIn {
          0% { transform: translate(-50%, -50%) scale(0); }
          60% { transform: translate(-50%, -50%) scale(1.3); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
