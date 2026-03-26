import React, { useCallback, useState } from 'react';
import { PetCanvas } from './components/PetCanvas';

// Import Gloop species to register it
import { gloop } from '../species/gloop';
import { gloopLifeStages } from '../species/gloop/stats';

const gloopConfig = gloop.getConfig();
const PET_SIZE = 64; // Default size, overridden per life stage

/**
 * Root application component.
 * Passes species config and life stage configs to the pet canvas.
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
    <PetCanvas
      spriteSheetConfig={gloopConfig.spriteSheet}
      animations={gloopConfig.animations}
      getAnimationName={getAnimationName}
      petSize={PET_SIZE}
      lifeStageConfigs={gloopLifeStages}
      onClick={handlePetClick}
      showStats={showStats}
    />
  );
}
