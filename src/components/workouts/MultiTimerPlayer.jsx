import React, { useState, useEffect } from 'react';
import WorkoutPlayer from './WorkoutPlayer';
import RotationalWorkoutPlayer from './RotationalWorkoutPlayer';
import StationsWorkoutPlayer from './StationsWorkoutPlayer';
import GetItDonePlayer from './GetItDonePlayer';

export default function MultiTimerPlayer({ timerSections, workoutName, onClose }) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [overallElapsedTime, setOverallElapsedTime] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const calculateSectionTime = (section) => {
    const config = section.config;
    if (!config) return 0;

    if (section.timer_type === 'get_it_done') {
      return (config.totalTime?.minutes || 0) * 60 + (config.totalTime?.seconds || 0);
    }

    const setupSecs = (config.setupTime?.minutes || 0) * 60 + (config.setupTime?.seconds || 0);
    const workSecs = (config.workTime?.minutes || 0) * 60 + (config.workTime?.seconds || 0);
    const restSecs = (config.restTime?.minutes || 0) * 60 + (config.restTime?.seconds || 0);
    
    if (section.timer_type === 'whole_room_same') {
      const exerciseCount = config.exercises?.length || 0;
      const exerciseTime = (workSecs + restSecs) * exerciseCount;
      const setRestSecs = (config.restBetweenSets?.minutes || 0) * 60 + (config.restBetweenSets?.seconds || 0);
      return setupSecs + (exerciseTime * config.sets) + (setRestSecs * (config.sets - 1));
    }
    
    if (section.timer_type === 'whole_room_rotational') {
      const exerciseCount = config.exercises?.length || 0;
      const exerciseTime = (workSecs + restSecs) * exerciseCount;
      const setRestSecs = (config.restBetweenSets?.minutes || 0) * 60 + (config.restBetweenSets?.seconds || 0);
      return setupSecs + (exerciseTime * config.sets) + (setRestSecs * (config.sets - 1));
    }
    
    if (section.timer_type === 'stations') {
      const maxExercises = config.stations?.length > 0 
        ? Math.max(...config.stations.map(s => (s.exercises || []).length))
        : 0;
      const exerciseTime = (workSecs + restSecs) * maxExercises;
      const setRestSecs = (config.restBetweenSets?.minutes || 0) * 60 + (config.restBetweenSets?.seconds || 0);
      const numStations = config.stations?.length || 1;
      const totalRotations = numStations > 1 ? numStations : 1;
      return setupSecs + (exerciseTime * config.sets * totalRotations) + (setRestSecs * (config.sets - 1) * totalRotations);
    }

    return 0;
  };

  const totalWorkoutTime = timerSections.reduce((total, section) => {
    return total + calculateSectionTime(section);
  }, 0);

  const elapsedBeforeCurrentSection = timerSections
    .slice(0, currentSectionIndex)
    .reduce((total, section) => total + calculateSectionTime(section), 0);

  const handleSectionComplete = () => {
    if (currentSectionIndex < timerSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setIsFirstLoad(false); // Auto-play subsequent sections
    } else {
      onClose();
    }
  };

  useEffect(() => {
    // Reset isFirstLoad when starting a new section (except first)
    if (currentSectionIndex > 0) {
      setIsFirstLoad(false);
    }
  }, [currentSectionIndex]);

  const currentSection = timerSections[currentSectionIndex];

  if (!currentSection) {
    return null;
  }

  const PlayerComponent = 
    currentSection.timer_type === 'whole_room_same' ? WorkoutPlayer :
    currentSection.timer_type === 'whole_room_rotational' ? RotationalWorkoutPlayer :
    currentSection.timer_type === 'stations' ? StationsWorkoutPlayer :
    currentSection.timer_type === 'get_it_done' ? GetItDonePlayer :
    null;

  if (!PlayerComponent) {
    return null;
  }

  return (
    <PlayerComponent
      config={currentSection.config}
      workoutName={`${workoutName} - ${currentSection.name} (${currentSectionIndex + 1}/${timerSections.length})`}
      onClose={handleSectionComplete}
      totalWorkoutTime={totalWorkoutTime}
      elapsedBeforeCurrentSection={elapsedBeforeCurrentSection}
      onElapsedTimeUpdate={(elapsed) => setOverallElapsedTime(elapsedBeforeCurrentSection + elapsed)}
      autoStartInMultiTimer={!isFirstLoad}
    />
  );
}