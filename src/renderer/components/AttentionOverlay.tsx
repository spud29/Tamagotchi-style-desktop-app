import React, { useEffect, useRef, useState } from 'react';
import { Position } from '../../engine/types';
import { AttentionBehavior } from '../../engine/AttentionSeeker';

interface AttentionOverlayProps {
  behavior: AttentionBehavior | null;
  petPosition: Position;
  petSize: number;
  cursorPosition: Position;
}

/**
 * Renders visual effects for attention-seeking behaviors.
 * Each behavior has its own visual indicator / animation.
 */
export function AttentionOverlay({
  behavior,
  petPosition,
  petSize,
  cursorPosition,
}: AttentionOverlayProps): React.ReactElement | null {
  if (!behavior) return null;

  switch (behavior) {
    case 'wave':
      return <WaveEffect petPosition={petPosition} petSize={petSize} cursorPosition={cursorPosition} />;
    case 'knock':
      return <KnockEffect />;
    case 'ride_cursor':
      return <RideCursorEffect cursorPosition={cursorPosition} petSize={petSize} />;
    case 'mess_icons':
    case 'yeet_icons':
      return <IconMischief behavior={behavior} petPosition={petPosition} petSize={petSize} />;
    default:
      return null;
  }
}

/** Wave at cursor: hand emoji floating near pet toward cursor */
function WaveEffect({
  petPosition,
  petSize,
  cursorPosition,
}: {
  petPosition: Position;
  petSize: number;
  cursorPosition: Position;
}): React.ReactElement {
  const [waveFrame, setWaveFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveFrame((f) => (f + 1) % 4);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Point hand toward cursor
  const petCenterX = petPosition.x + petSize / 2;
  const petCenterY = petPosition.y + petSize / 2;
  const dx = cursorPosition.x - petCenterX;
  const angle = dx > 0 ? 0 : 180;
  const waveRotations = [0, 15, 0, -15];

  return (
    <div
      style={{
        position: 'fixed',
        left: petCenterX + (dx > 0 ? petSize * 0.4 : -petSize * 0.7),
        top: petPosition.y - 5,
        fontSize: petSize * 0.4,
        transform: `scaleX(${dx > 0 ? 1 : -1}) rotate(${waveRotations[waveFrame]}deg)`,
        pointerEvents: 'none',
        zIndex: 9995,
        transition: 'transform 0.2s ease',
      }}
    >
      👋
    </div>
  );
}

/** Knock on screen: visual knock effect on nearest screen edge */
function KnockEffect(): React.ReactElement {
  const [knockFrame, setKnockFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setKnockFrame((f) => (f + 1) % 6);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const isKnocking = knockFrame % 2 === 0;

  return (
    <>
      {/* Screen edge flash */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: isKnocking ? '3px solid rgba(79, 195, 247, 0.4)' : '3px solid transparent',
          pointerEvents: 'none',
          zIndex: 9994,
          transition: 'border-color 0.15s ease',
          borderRadius: 4,
        }}
      />
      {/* Knock text */}
      {isKnocking && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            right: 20,
            transform: 'translateY(-50%)',
            fontSize: 24,
            pointerEvents: 'none',
            zIndex: 9995,
            opacity: 0.7,
          }}
        >
          🪟
        </div>
      )}
    </>
  );
}

/** Ride cursor: indicator that pet is attached to cursor */
function RideCursorEffect({
  cursorPosition,
  petSize,
}: {
  cursorPosition: Position;
  petSize: number;
}): React.ReactElement {
  return (
    <div
      style={{
        position: 'fixed',
        left: cursorPosition.x - petSize * 0.15,
        top: cursorPosition.y - petSize * 1.1,
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        pointerEvents: 'none',
        zIndex: 9995,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      Wheee!
    </div>
  );
}

/** Icon mischief: visual indicator that pet is messing with icons */
function IconMischief({
  behavior,
  petPosition,
  petSize,
}: {
  behavior: 'mess_icons' | 'yeet_icons';
  petPosition: Position;
  petSize: number;
}): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const emoji = behavior === 'yeet_icons' ? '💨' : '📂';

  return (
    <div
      style={{
        position: 'fixed',
        left: petPosition.x + petSize + 5,
        top: petPosition.y + petSize * 0.3,
        fontSize: 18,
        pointerEvents: 'none',
        zIndex: 9995,
        opacity: frame % 2 === 0 ? 1 : 0.5,
        transition: 'opacity 0.3s ease',
      }}
    >
      {emoji}
    </div>
  );
}
