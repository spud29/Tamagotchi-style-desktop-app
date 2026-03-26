import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Position } from '../../engine/types';

interface Poop {
  id: string;
  position: Position;
  createdAt: number;
}

interface PoopManagerProps {
  petPosition: Position;
  cleanlinessLevel: number;
  onClean: () => void;
}

/**
 * Manages poop spawning and click-to-clean interactions.
 * Poop spawns near the pet when cleanliness is low.
 * Click on a poop to clean it up and restore cleanliness.
 */
export function PoopManager({
  petPosition,
  cleanlinessLevel,
  onClean,
}: PoopManagerProps): React.ReactElement {
  const [poops, setPoops] = useState<Poop[]>([]);
  const lastSpawnRef = useRef<number>(Date.now());
  const [cleaningId, setCleaningId] = useState<string | null>(null);

  // Spawn poop based on cleanliness level
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastSpawn = now - lastSpawnRef.current;

      // Spawn rate depends on cleanliness: lower cleanliness = more frequent poops
      // At 100 cleanliness: spawn every ~60s
      // At 0 cleanliness: spawn every ~15s
      const spawnInterval = 15000 + (cleanlinessLevel / 100) * 45000;

      if (timeSinceLastSpawn >= spawnInterval && poops.length < 5) {
        const offsetX = (Math.random() - 0.5) * 120;
        const offsetY = 30 + Math.random() * 40; // Below the pet

        setPoops((prev) => [
          ...prev,
          {
            id: `poop-${now}`,
            position: {
              x: petPosition.x + offsetX,
              y: petPosition.y + offsetY,
            },
            createdAt: now,
          },
        ]);
        lastSpawnRef.current = now;
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [petPosition, cleanlinessLevel, poops.length]);

  const handlePoopClick = useCallback(
    (poopId: string) => {
      // Play cleaning animation
      setCleaningId(poopId);

      // Remove poop after brief animation
      setTimeout(() => {
        setPoops((prev) => prev.filter((p) => p.id !== poopId));
        setCleaningId(null);
        onClean();
      }, 400);
    },
    [onClean]
  );

  return (
    <>
      {poops.map((poop) => (
        <div
          key={poop.id}
          onClick={() => handlePoopClick(poop.id)}
          style={{
            position: 'fixed',
            left: poop.position.x,
            top: poop.position.y,
            fontSize: 24,
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 9990,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            transform: cleaningId === poop.id ? 'scale(0.3) rotate(180deg)' : 'scale(1)',
            opacity: cleaningId === poop.id ? 0 : 1,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            if (cleaningId !== poop.id) {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }
          }}
          title="Click to clean!"
        >
          💩
        </div>
      ))}
      {/* Cleaning sparkle effect */}
      {cleaningId && (
        <div
          style={{
            position: 'fixed',
            left: poops.find((p) => p.id === cleaningId)?.position.x ?? 0,
            top: (poops.find((p) => p.id === cleaningId)?.position.y ?? 0) - 10,
            fontSize: 20,
            pointerEvents: 'none',
            zIndex: 9991,
          }}
        >
          ✨
        </div>
      )}
    </>
  );
}
