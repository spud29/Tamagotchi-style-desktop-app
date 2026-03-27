import React from 'react';
import { Memorial } from '../../engine/DeathRebirth';

interface DeathRebirthUIProps {
  /** Whether the ghost mourning phase is active */
  isGhost: boolean;
  /** Seconds remaining in the mourning period */
  mourningTimeRemaining: number;
  /** Whether rebirth is available */
  rebirthReady: boolean;
  /** Memorial of the deceased pet */
  memorial: Memorial | null;
  /** Callback to start a new egg */
  onRebirth: () => void;
}

/**
 * Death and rebirth overlay UI.
 * Shows during ghost phase (mourning) and rebirth prompt.
 */
export function DeathRebirthUI({
  isGhost,
  mourningTimeRemaining,
  rebirthReady,
  memorial,
  onRebirth,
}: DeathRebirthUIProps): React.ReactElement | null {
  if (!isGhost && !rebirthReady) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9990,
        pointerEvents: rebirthReady ? 'auto' : 'none',
      }}
    >
      {/* Ghost mourning phase */}
      {isGhost && (
        <div
          style={{
            background: 'rgba(20, 20, 35, 0.95)',
            borderRadius: 16,
            padding: '16px 28px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            minWidth: 240,
          }}
        >
          <div
            style={{
              fontSize: 32,
              marginBottom: 8,
            }}
          >
            👻
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {memorial?.name ?? 'Gloop'} has passed away...
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 12,
            }}
          >
            Mourning... {Math.ceil(mourningTimeRemaining)}s
          </div>
        </div>
      )}

      {/* Rebirth prompt */}
      {rebirthReady && (
        <div
          style={{
            background: 'rgba(20, 20, 35, 0.95)',
            borderRadius: 16,
            padding: '20px 28px',
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            minWidth: 280,
          }}
        >
          {/* Memorial */}
          {memorial && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🪦</div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                In memory of {memorial.name}
              </div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {memorial.lifeStage} stage &middot; {Math.floor(memorial.ageMinutes)} minutes old
              </div>
            </div>
          )}

          {/* Rebirth prompt */}
          <div
            style={{
              color: '#FFD54F',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            A new egg awaits...
          </div>

          <button
            onClick={onRebirth}
            style={{
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              color: '#FFF',
              background: 'linear-gradient(180deg, #FFD54F 0%, #FFB300 100%)',
              border: '2px solid #FF8F00',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 179, 0, 0.3)',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            Start New Egg
          </button>
        </div>
      )}
    </div>
  );
}
