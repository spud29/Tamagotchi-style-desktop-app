import React, { useCallback, useRef, useState } from 'react';
import { Position } from '../../engine/types';

interface FoodItem {
  id: string;
  name: string;
  icon: string;
  hungerRestore: number;
  color: string;
}

const FOOD_ITEMS: FoodItem[] = [
  { id: 'apple', name: 'Apple', icon: '🍎', hungerRestore: 15, color: '#E53935' },
  { id: 'pizza', name: 'Pizza', icon: '🍕', hungerRestore: 25, color: '#FF8F00' },
  { id: 'cake', name: 'Cake', icon: '🍰', hungerRestore: 20, color: '#F48FB1' },
  { id: 'fish', name: 'Fish', icon: '🐟', hungerRestore: 30, color: '#42A5F5' },
];

interface FeedingUIProps {
  visible: boolean;
  petPosition: Position;
  petSize: number;
  onFeed: (hungerRestore: number) => void;
  onClose: () => void;
}

interface DragState {
  food: FoodItem | null;
  x: number;
  y: number;
  isDragging: boolean;
}

/**
 * Drag-food-to-pet feeding minigame.
 * Shows a tray of food items that can be dragged to the pet's mouth.
 */
export function FeedingUI({
  visible,
  petPosition,
  petSize,
  onFeed,
  onClose,
}: FeedingUIProps): React.ReactElement | null {
  const [dragState, setDragState] = useState<DragState>({
    food: null,
    x: 0,
    y: 0,
    isDragging: false,
  });
  const [feedResult, setFeedResult] = useState<string | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, food: FoodItem) => {
      e.preventDefault();
      setDragState({
        food,
        x: e.clientX,
        y: e.clientY,
        isDragging: true,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging) return;
      setDragState((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    },
    [dragState.isDragging]
  );

  const handleMouseUp = useCallback(
    () => {
      if (!dragState.isDragging || !dragState.food) return;

      // Check if dropped on the pet
      const petCenterX = petPosition.x + petSize / 2;
      const petCenterY = petPosition.y + petSize / 2;
      const dropRadius = petSize * 0.8;
      const dx = dragState.x - petCenterX;
      const dy = dragState.y - petCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < dropRadius) {
        // Successfully fed!
        onFeed(dragState.food.hungerRestore);
        setFeedResult(`${dragState.food.icon} Yum! +${dragState.food.hungerRestore} hunger`);
        setTimeout(() => setFeedResult(null), 1500);
      }

      setDragState({ food: null, x: 0, y: 0, isDragging: false });
    },
    [dragState, petPosition, petSize, onFeed]
  );

  if (!visible) return null;

  // Position food tray at the bottom center of the screen
  const trayWidth = FOOD_ITEMS.length * 70 + 24;
  const trayX = (window.innerWidth - trayWidth) / 2;

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
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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

      {/* Instruction text */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 35, 0.9)',
          color: '#4FC3F7',
          padding: '8px 20px',
          borderRadius: 20,
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        Drag food to Gloop!
      </div>

      {/* Feed result notification */}
      {feedResult && (
        <div
          style={{
            position: 'fixed',
            top: petPosition.y - 40,
            left: petPosition.x + petSize / 2,
            transform: 'translateX(-50%)',
            background: 'rgba(76, 175, 80, 0.9)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 16,
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            pointerEvents: 'none',
            animation: 'fadeUp 1.5s ease-out forwards',
          }}
        >
          {feedResult}
        </div>
      )}

      {/* Drop target highlight on pet */}
      {dragState.isDragging && (
        <div
          style={{
            position: 'fixed',
            left: petPosition.x - petSize * 0.15,
            top: petPosition.y - petSize * 0.15,
            width: petSize * 1.3,
            height: petSize * 1.3,
            borderRadius: '50%',
            border: '3px dashed rgba(79, 195, 247, 0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Food tray */}
      <div
        ref={trayRef}
        style={{
          position: 'fixed',
          bottom: 20,
          left: trayX,
          width: trayWidth,
          display: 'flex',
          gap: 8,
          padding: '12px',
          background: 'rgba(20, 20, 35, 0.92)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          border: '1px solid rgba(79, 195, 247, 0.3)',
        }}
      >
        {FOOD_ITEMS.map((food) => (
          <div
            key={food.id}
            onMouseDown={(e) => handleMouseDown(e, food)}
            style={{
              width: 56,
              height: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `rgba(${hexToRgb(food.color)}, 0.15)`,
              borderRadius: 12,
              cursor: 'grab',
              userSelect: 'none',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: 28 }}>{food.icon}</span>
            <span
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.7)',
                fontFamily: '"Segoe UI", system-ui, sans-serif',
                marginTop: 2,
              }}
            >
              +{food.hungerRestore}
            </span>
          </div>
        ))}
      </div>

      {/* Dragged food cursor follower */}
      {dragState.isDragging && dragState.food && (
        <div
          style={{
            position: 'fixed',
            left: dragState.x - 20,
            top: dragState.y - 20,
            fontSize: 40,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            zIndex: 10003,
          }}
        >
          {dragState.food.icon}
        </div>
      )}
    </div>
  );
}

/** Convert hex color to RGB string for rgba() */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
