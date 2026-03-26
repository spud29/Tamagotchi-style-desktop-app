import { useEffect, useRef, useState } from 'react';
import { Position } from '../../engine/types';

/**
 * Track the mouse cursor position across the overlay window.
 * Used for pet attention behaviors (wave at cursor, ride cursor, etc.)
 */
export function useCursorTracking(): Position {
  const [cursorPos, setCursorPos] = useState<Position>({ x: 0, y: 0 });
  const posRef = useRef(cursorPos);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      posRef.current = pos;
      setCursorPos(pos);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return cursorPos;
}
