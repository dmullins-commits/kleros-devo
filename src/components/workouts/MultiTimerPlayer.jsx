import React, { useState } from 'react';
import WorkoutPlayer from './WorkoutPlayer';
import RotationalWorkoutPlayer from './RotationalWorkoutPlayer';
import StationsWorkoutPlayer from './StationsWorkoutPlayer';

export default function MultiTimerPlayer({ timerSections, workoutName, onClose }) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const handleSectionComplete = () => {
    if (currentSectionIndex < timerSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const currentSection = timerSections[currentSectionIndex];

  if (!currentSection) {
    return null;
  }

  const PlayerComponent = 
    currentSection.timer_type === 'whole_room_same' ? WorkoutPlayer :
    currentSection.timer_type === 'whole_room_rotational' ? RotationalWorkoutPlayer :
    currentSection.timer_type === 'stations' ? StationsWorkoutPlayer :
    null;

  if (!PlayerComponent) {
    return null;
  }

  return (
    <PlayerComponent
      config={currentSection.config}
      workoutName={`${workoutName} - ${currentSection.name} (${currentSectionIndex + 1}/${timerSections.length})`}
      onClose={handleSectionComplete}
    />
  );
}