import React, { useCallback, useEffect } from 'react';
import { usePetEngine } from '../hooks/usePetEngine';
import { SpriteSheetConfig, AnimationDef } from '../../engine/types';

interface PetCanvasProps {
  spriteSheetConfig: SpriteSheetConfig;
  animations: Record<string, AnimationDef>;
  getAnimationName: (state: string, direction?: string) => string;
  petSize: number;
  onClick?: () => void;
}

/**
 * Canvas component that renders the pet on screen.
 * Handles sprite rendering, animation, and click detection.
 */
export function PetCanvas({
  spriteSheetConfig,
  animations,
  getAnimationName,
  petSize,
  onClick,
}: PetCanvasProps): React.ReactElement {
  const { petState, canvasRef, isLoaded } = usePetEngine(
    spriteSheetConfig,
    animations,
    getAnimationName,
    petSize
  );

  // Handle mouse events for click detection on the pet
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if mouse is over the pet sprite
      const isOverPet =
        mouseX >= petState.position.x &&
        mouseX <= petState.position.x + petSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + petSize;

      // Toggle mouse event pass-through based on whether we're over the pet
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouse(!isOverPet);
      }
    },
    [petState.position, petSize, canvasRef]
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
        mouseX <= petState.position.x + petSize &&
        mouseY >= petState.position.y &&
        mouseY <= petState.position.y + petSize;

      if (isOverPet && onClick) {
        onClick();
      }
    },
    [petState.position, petSize, canvasRef, onClick]
  );

  // Set canvas to full window size
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

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
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
  );
}
