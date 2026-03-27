import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TugOfWarGame, TugOfWarState, TugOfWarResult } from '../../engine/TugOfWar';

interface TugOfWarUIProps {
  visible: boolean;
  petEnergy: number;
  onComplete: (result: TugOfWarResult) => void;
  onClose: () => void;
}

/**
 * Tug of War minigame UI.
 * Player mashes a button to pull the rope. Visual rope indicator shows position.
 */
export function TugOfWarUI({
  visible,
  petEnergy,
  onComplete,
  onClose,
}: TugOfWarUIProps): React.ReactElement | null {
  const gameRef = useRef<TugOfWarGame | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [gameState, setGameState] = useState<TugOfWarState | null>(null);
  const [finished, setFinished] = useState(false);

  // Initialize game when visible
  useEffect(() => {
    if (!visible) {
      gameRef.current = null;
      setGameState(null);
      setFinished(false);
      return;
    }

    const game = new TugOfWarGame(petEnergy);
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

      if (state.result !== 'playing' && !finished) {
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
  }, [visible, petEnergy]);

  const handlePull = useCallback(() => {
    gameRef.current?.playerPull();
  }, []);

  if (!visible || !gameState) return null;

  const { ropePosition, countdown, timeRemaining, result, petPulling } = gameState;

  // Rope visualization: position mapped from [-1, 1] to [10%, 90%]
  const ropePercent = 50 + ropePosition * 40;
  const countdownDisplay = countdown > 0 ? Math.ceil(countdown) : null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Close button */}
      <div
        onClick={onClose}
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

      {/* Title */}
      <div
        style={{
          background: 'rgba(20, 20, 35, 0.95)',
          color: '#FF8A65',
          padding: '10px 28px',
          borderRadius: 20,
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 30,
          border: '1px solid rgba(255, 138, 101, 0.4)',
        }}
      >
        Tug of War!
      </div>

      {/* Countdown */}
      {countdownDisplay !== null && (
        <div
          style={{
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

      {/* Game area */}
      {countdownDisplay === null && (
        <>
          {/* Timer */}
          <div
            style={{
              color: timeRemaining <= 5 ? '#EF5350' : '#FFF',
              fontSize: 24,
              fontWeight: 700,
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              marginBottom: 20,
            }}
          >
            {Math.ceil(timeRemaining)}s
          </div>

          {/* Rope visualization */}
          <div style={{ width: '80%', maxWidth: 600, marginBottom: 30 }}>
            {/* Labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span style={{ color: petPulling ? '#FF5252' : '#EF9A9A' }}>
                {petPulling ? '< PULL!' : '< Gloop'}
              </span>
              <span style={{ color: '#81C784' }}>You ></span>
            </div>

            {/* Track */}
            <div
              style={{
                width: '100%',
                height: 24,
                background: 'rgba(20, 20, 35, 0.9)',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Center marker */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: 2,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.3)',
                }}
              />

              {/* Win zones */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '10%',
                  height: '100%',
                  background: 'rgba(239, 83, 80, 0.3)',
                  borderRadius: '12px 0 0 12px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: '10%',
                  height: '100%',
                  background: 'rgba(102, 187, 106, 0.3)',
                  borderRadius: '0 12px 12px 0',
                }}
              />

              {/* Rope knot indicator */}
              <div
                style={{
                  position: 'absolute',
                  left: `${ropePercent}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#FFD54F',
                  boxShadow: '0 0 10px rgba(255, 213, 79, 0.6)',
                  transition: 'left 0.05s ease-out',
                }}
              />

              {/* Rope line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  width: `${ropePercent}%`,
                  height: 4,
                  background: '#8D6E63',
                  transform: 'translateY(-50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${ropePercent}%`,
                  top: '50%',
                  width: `${100 - ropePercent}%`,
                  height: 4,
                  background: '#8D6E63',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
          </div>

          {/* Pull button */}
          {result === 'playing' && (
            <button
              onMouseDown={handlePull}
              style={{
                padding: '16px 48px',
                fontSize: 20,
                fontWeight: 800,
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                color: '#FFF',
                background: 'linear-gradient(180deg, #66BB6A 0%, #43A047 100%)',
                border: '2px solid #388E3C',
                borderRadius: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(67, 160, 71, 0.4)',
                userSelect: 'none',
                transition: 'transform 0.05s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              PULL! >>>
            </button>
          )}

          {/* Result display */}
          {result !== 'playing' && (
            <div
              style={{
                padding: '16px 36px',
                borderRadius: 16,
                background:
                  result === 'player_win'
                    ? 'rgba(76, 175, 80, 0.9)'
                    : result === 'pet_win'
                      ? 'rgba(239, 83, 80, 0.9)'
                      : 'rgba(255, 183, 77, 0.9)',
                color: '#FFF',
                fontSize: 22,
                fontWeight: 800,
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                textAlign: 'center',
              }}
            >
              {result === 'player_win' && 'You Win! 🎉'}
              {result === 'pet_win' && 'Gloop Wins! 💪'}
              {result === 'draw' && "It's a Draw! 🤝"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
