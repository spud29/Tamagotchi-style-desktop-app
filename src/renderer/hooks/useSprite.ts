import { useEffect, useRef, useState } from 'react';
import { SpriteSheet } from '../../sprites/SpriteSheet';
import { SpriteSheetConfig } from '../../engine/types';

/**
 * Hook to load and manage a sprite sheet.
 * Returns the loaded sprite sheet and loading status.
 */
export function useSprite(config: SpriteSheetConfig): {
  spriteSheet: SpriteSheet | null;
  isLoaded: boolean;
  error: string | null;
} {
  const spriteSheetRef = useRef<SpriteSheet | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sheet = new SpriteSheet(config);
    spriteSheetRef.current = sheet;

    sheet
      .load()
      .then(() => setIsLoaded(true))
      .catch((err) => {
        console.warn('Sprite sheet load failed (will use placeholder):', err);
        setError(err.message);
        setIsLoaded(true); // Mark as loaded anyway so fallback renders
      });
  }, [config]);

  return {
    spriteSheet: spriteSheetRef.current,
    isLoaded,
    error,
  };
}
