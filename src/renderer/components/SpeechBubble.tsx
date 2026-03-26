import React, { useEffect, useState } from 'react';
import { Position } from '../../engine/types';

interface SpeechBubbleProps {
  message: string | null;
  petPosition: Position;
  petSize: number;
  duration?: number;
  onDismiss?: () => void;
}

/**
 * Speech bubble that appears above the pet to show reactions or messages.
 * Auto-dismisses after a duration.
 */
export function SpeechBubble({
  message,
  petPosition,
  petSize,
  duration = 2500,
  onDismiss,
}: SpeechBubbleProps): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setDisplayMessage(null);
          onDismiss?.();
        }, 300); // Fade out duration
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setDisplayMessage(null);
    }
  }, [message, duration, onDismiss]);

  if (!displayMessage) return null;

  const bubbleX = petPosition.x + petSize / 2;
  const bubbleY = petPosition.y - 20;

  return (
    <div
      style={{
        position: 'fixed',
        left: bubbleX,
        top: bubbleY,
        transform: 'translate(-50%, -100%)',
        background: '#fff',
        color: '#333',
        padding: '8px 14px',
        borderRadius: 16,
        fontSize: 14,
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontWeight: 500,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        zIndex: 9998,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        maxWidth: 180,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {displayMessage}
      {/* Speech bubble tail */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid #fff',
        }}
      />
    </div>
  );
}
