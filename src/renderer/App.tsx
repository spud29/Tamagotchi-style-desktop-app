import React, { useCallback, useState } from 'react';
import { PetCanvas } from './components/PetCanvas';

// Import Gloop species to register it
import { gloop } from '../species/gloop';

const gloopConfig = gloop.getConfig();
const PET_SIZE = 64;

/**
 * Root application component.
 * Sets up the pet canvas with the Gloop species.
 */
export function App(): React.ReactElement {
  const [showDebug, setShowDebug] = useState(false);

  const getAnimationName = useCallback(
    (state: string, direction?: string) => {
      return gloop.getAnimationName(state, direction);
    },
    []
  );

  const handlePetClick = useCallback(() => {
    // Toggle debug info on click (temporary for Phase 1)
    setShowDebug((prev) => !prev);
  }, []);

  return (
    <>
      <PetCanvas
        spriteSheetConfig={gloopConfig.spriteSheet}
        animations={gloopConfig.animations}
        getAnimationName={getAnimationName}
        petSize={PET_SIZE}
        onClick={handlePetClick}
      />
      {showDebug && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#4FC3F7',
            padding: '8px 12px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <div>Gloop v0.1.0 - Phase 1</div>
          <div>Click pet to toggle this panel</div>
          <div>Species: {gloopConfig.name}</div>
        </div>
      )}
    </>
  );
}
