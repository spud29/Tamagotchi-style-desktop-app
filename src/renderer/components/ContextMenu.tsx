import React from 'react';

interface MenuAction {
  label: string;
  icon: string;
  action: string;
  disabled?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  actions: MenuAction[];
  onAction: (action: string) => void;
  onClose: () => void;
}

/**
 * Right-click context menu that appears when the pet is right-clicked.
 * Provides quick access to care actions.
 */
export function ContextMenu({
  visible,
  x,
  y,
  actions,
  onAction,
  onClose,
}: ContextMenuProps): React.ReactElement | null {
  if (!visible) return null;

  // Keep menu within screen bounds
  const menuWidth = 160;
  const menuHeight = actions.length * 36 + 16;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <>
      {/* Invisible backdrop to close menu on click-away */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          left: adjustedX,
          top: adjustedY,
          width: menuWidth,
          background: 'rgba(20, 20, 35, 0.95)',
          borderRadius: 10,
          padding: '6px 0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          border: '1px solid rgba(79, 195, 247, 0.3)',
          zIndex: 10001,
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          fontSize: 13,
          pointerEvents: 'auto',
        }}
      >
        {actions.map((item) => (
          <div
            key={item.action}
            onClick={() => {
              if (!item.disabled) {
                onAction(item.action);
                onClose();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              cursor: item.disabled ? 'default' : 'pointer',
              color: item.disabled ? 'rgba(255,255,255,0.3)' : '#fff',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(79, 195, 247, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Default menu actions for pet care */
export function getDefaultMenuActions(isAlive: boolean, isSleeping: boolean): MenuAction[] {
  return [
    { label: 'Feed', icon: '🍖', action: 'feed', disabled: !isAlive },
    { label: 'Play', icon: '🎮', action: 'play', disabled: !isAlive || isSleeping },
    { label: 'Clean', icon: '🧼', action: 'clean', disabled: !isAlive },
    { label: 'Medicine', icon: '💊', action: 'medicine', disabled: !isAlive },
    { label: 'Sleep', icon: '💤', action: 'sleep', disabled: !isAlive || isSleeping },
    { label: 'Stats', icon: '📊', action: 'stats' },
  ];
}
