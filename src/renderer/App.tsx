import React, { useCallback, useEffect, useState } from 'react';
import { PetCanvas } from './components/PetCanvas';
import { StatsPanel } from './components/StatsPanel';

// Import Gloop species to register it
import { gloop } from '../species/gloop';
import { gloopLifeStages } from '../species/gloop/stats';

const gloopConfig = gloop.getConfig();
const PET_SIZE = 64;
const DECAY_RATES = gloopLifeStages.baby.statDecayRates;

/**
 * Root application component.
 * Manages save/load lifecycle, stats panel, and tray action routing.
 */
export function App(): React.ReactElement {
  const [showStats, setShowStats] = useState(false);

  const getAnimationName = useCallback(
    (state: string, direction?: string) => {
      return gloop.getAnimationName(state, direction);
    },
    []
  );

  const handlePetClick = useCallback(() => {
    setShowStats((prev) => !prev);
  }, []);

  return (
    <>
      <PetCanvas
        spriteSheetConfig={gloopConfig.spriteSheet}
        animations={gloopConfig.animations}
        getAnimationName={getAnimationName}
        petSize={PET_SIZE}
        decayRates={DECAY_RATES}
        onClick={handlePetClick}
        showStats={showStats}
      />
    </>
  );
}
