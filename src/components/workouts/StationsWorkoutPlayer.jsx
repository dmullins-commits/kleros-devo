import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Play, Pause, StopCircle } from "lucide-react";

export default function StationsWorkoutPlayer({ config, workoutName, onClose }) {
  const migratedConfig = {
    ...config,
    sets: config.sets || 1,
    setupTime: config.setupTime || { minutes: 1, seconds: 0 },
    workTime: config.workTime || { minutes: 1, seconds: 0 },
    restTime: config.restTime || { minutes: 1, seconds: 0 },
    restBetweenSets: config.restBetweenSets || { minutes: 0, seconds: 10 },
    stations: (config.stations || []).map(station => ({
      ...station,
      exercises: (station.exercises || []).map(ex => ({
        ...ex,
        usePerSetReps: ex.usePerSetReps || false,
        perSetReps: ex.perSetReps || []
      }))
    }))
  };

  const [phase, setPhase] = useState('setup');
  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const timerRef = useRef(null);

  const calculateTotalTime = () => {
    const setupSeconds = (migratedConfig.setupTime?.minutes || 0) * 60 + (migratedConfig.setupTime?.seconds || 0);
    const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
    const restSeconds = (migratedConfig.restTime?.minutes || 0) * 60 + (migratedConfig.restTime?.seconds || 0);
    
    const maxExercises = migratedConfig.stations.length > 0 
      ? Math.max(...migratedConfig.stations.map(s => (s.exercises || []).length))
      : 0;
    const exerciseTime = (workSeconds + restSeconds) * maxExercises;
    const setRestSeconds = (migratedConfig.restBetweenSets?.minutes || 0) * 60 + (migratedConfig.restBetweenSets?.seconds || 0);
    return setupSeconds + (exerciseTime * migratedConfig.sets) + (setRestSeconds * (migratedConfig.sets - 1));
  };

  useEffect(() => {
    const setupSeconds = (migratedConfig.setupTime?.minutes || 0) * 60 + (migratedConfig.setupTime?.seconds || 0);
    setPhase('setup');
    setCurrentSet(1);
    setCurrentExerciseIndex(0);
    setTimeRemaining(setupSeconds);
    setTotalWorkoutTime(calculateTotalTime());
    setElapsedTime(0);
    setIsPaused(true);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playSound = (type) => {
    if (type === 'countdown') {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'go') {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1200;
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'buzzer') {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 300;
      gainNode.gain.value = 0.6;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.0);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) return 0;
        
        const newTime = prev - 1;
        
        if ((newTime === 3 || newTime === 2 || newTime === 1) && (phase === 'setup' || phase === 'work' || phase === 'rest')) {
          playSound('countdown');
        }
        
        return newTime;
      });
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startTimer();
    
    if (timeRemaining === 0) {
      handlePhaseComplete();
    }
  }, [isPaused]);

  useEffect(() => {
    if (timeRemaining === 0 && !isPaused) {
      handlePhaseComplete();
    }
  }, [timeRemaining]);

  const handlePhaseComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (phase === 'setup') {
      playSound('go');
      setPhase('work');
      const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
      setTimeRemaining(workSeconds);
      startTimer();
    } else if (phase === 'work') {
      playSound('buzzer');
      setPhase('rest');
      const restSeconds = (migratedConfig.restTime?.minutes || 0) * 60 + (migratedConfig.restTime?.seconds || 0);
      setTimeRemaining(restSeconds);
      startTimer();
    } else if (phase === 'rest') {
      const maxExercises = migratedConfig.stations.length > 0 
        ? Math.max(...migratedConfig.stations.map(s => (s.exercises || []).length))
        : 0;
      const nextExerciseIndex = currentExerciseIndex + 1;
      
      if (nextExerciseIndex >= maxExercises) {
        if (currentSet < migratedConfig.sets) {
          setCurrentSet(prev => prev + 1);
          playSound('go');
          setPhase('work');
          setCurrentExerciseIndex(0);
          const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
          setTimeRemaining(workSeconds);
          startTimer();
        } else {
          setPhase('complete');
        }
      } else {
        playSound('go');
        setPhase('work');
        setCurrentExerciseIndex(nextExerciseIndex);
        const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
        setTimeRemaining(workSeconds);
        startTimer();
      }
    }
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
    if (isPaused) {
      startTimer();
    }
  };

  const handleStop = () => {
    setShowStopConfirm(true);
    setIsPaused(true);
  };

  const confirmStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorForText = (bgColor) => {
    const colors = {
      '#FFD700': '#000000',
      '#FFFFFF': '#000000',
      '#000000': '#FFFFFF',
      '#9333EA': '#FFFFFF',
      '#00FF00': '#000000',
      '#6B7280': '#FFFFFF',
      '#EF4444': '#FFFFFF',
      '#3B82F6': '#FFFFFF',
      '#F97316': '#FFFFFF',
      '#EC4899': '#FFFFFF'
    };
    return colors[bgColor] || '#FFFFFF';
  };

  if (phase === 'complete') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-black text-yellow-400 mb-4">WORKOUT COMPLETE!</h1>
          <p className="text-2xl text-white">Great job!</p>
          <Button
            onClick={onClose}
            className="mt-8 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-8 py-6"
          >
            Exit
          </Button>
        </div>
      </div>
    );
  }

  const numStations = migratedConfig.stations.length;
  const stationWidth = numStations === 2 ? 'w-[390px]' : numStations === 3 ? 'w-[260px]' : 'w-[195px]';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={totalWorkoutTime}
              value={elapsedTime}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${(elapsedTime / totalWorkoutTime) * 100}%, #374151 ${(elapsedTime / totalWorkoutTime) * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(elapsedTime)}</span>
              <span>{formatTime(totalWorkoutTime)}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose()}
            className="text-white hover:bg-white/10 w-10 h-10"
          >
            <X className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="text-red-400 hover:bg-red-400/10 w-10 h-10"
          >
            <StopCircle className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-between gap-8 px-16 pt-24">
        {/* Stations */}
        {(phase === 'work' || phase === 'rest') && migratedConfig.stations.map((station, stationIdx) => (
          <div key={stationIdx} className={`${stationWidth} space-y-2`}>
            {/* Sets indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-black text-white">Sets:</span>
              {Array.from({ length: migratedConfig.sets }, (_, i) => i + 1).map((setNum) => (
                <div
                  key={setNum}
                  className={`text-2xl font-black ${
                    setNum === currentSet 
                      ? 'text-white border-2 border-white px-3 py-1' 
                      : 'text-gray-600 px-3 py-1'
                  }`}
                >
                  {setNum}
                </div>
              ))}
            </div>

            {/* Exercise rows */}
            {station.exercises.map((exercise, exIdx) => {
              const isActive = exIdx === currentExerciseIndex;
              const color = migratedConfig.stations[0]?.exercises?.[exIdx]?.color || exercise.color || '#FFFFFF';
              
              const displayReps = exercise.usePerSetReps && exercise.perSetReps && exercise.perSetReps[currentSet - 1]
                ? exercise.perSetReps[currentSet - 1]
                : exercise.reps;
              
              return (
                <div
                  key={exIdx}
                  className="flex items-center h-16 relative"
                  style={{ backgroundColor: isActive && phase === 'work' ? color : '#000000' }}
                >
                  <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <div 
                      className="border-2 px-3 py-1 text-xl font-black"
                      style={{ 
                        borderColor: isActive && phase === 'work' ? getColorForText(color) : '#6B7280',
                        color: isActive && phase === 'work' ? getColorForText(color) : '#6B7280'
                      }}
                    >
                      {displayReps}
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center gap-2">
                    {isActive && phase === 'work' && (
                      <span className="text-2xl" style={{ color: getColorForText(color) }}>▶</span>
                    )}
                    <h3 
                      className="text-3xl font-black"
                      style={{ color: isActive && phase === 'work' ? getColorForText(color) : '#FFFFFF' }}
                    >
                      {exercise.name}
                    </h3>
                  </div>

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {Array.from({ length: migratedConfig.sets }, (_, i) => (
                      <span 
                        key={i}
                        className="text-lg font-black"
                        style={{ color: isActive && phase === 'work' ? getColorForText(color) : '#6B7280' }}
                      >
                        {displayReps}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Setup phase */}
        {phase === 'setup' && (
          <div className="flex-1 max-w-5xl grid grid-cols-1 gap-6">
            <h2 className="text-7xl font-black text-yellow-400 mb-8 text-center">Stations:</h2>
            <div className={`grid ${numStations === 2 ? 'grid-cols-2' : numStations === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-6`}>
              {migratedConfig.stations.map((station, stationIdx) => (
                <div key={stationIdx} className="space-y-4">
                  <h3 className="text-3xl font-black text-white mb-4">Station {stationIdx + 1}</h3>
                  {station.exercises.map((ex, idx) => {
                    const color = migratedConfig.stations[0]?.exercises?.[idx]?.color || ex.color || '#FFD700';
                    return (
                      <div 
                        key={idx}
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: color }}
                      >
                        <p className="text-2xl font-bold" style={{ color: getColorForText(color) }}>
                          {ex.name} - {ex.reps}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timer */}
        {(phase === 'work' || phase === 'rest') && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6">
            <h2 className="text-4xl font-black text-yellow-400 tracking-wide">Stations</h2>
            
            <span className="text-[120px] font-black text-yellow-400">{formatTime(timeRemaining)}</span>

            {phase === 'work' && (
              <h2 className="text-5xl font-black text-green-400 tracking-wide">WORK</h2>
            )}

            {phase === 'rest' && (
              <h2 className="text-5xl font-black text-blue-400 tracking-wide">REST</h2>
            )}

            <Button
              onClick={togglePause}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-24 h-24 rounded-full shadow-2xl shadow-yellow-400/50"
            >
              {isPaused ? <Play className="w-10 h-10" /> : <Pause className="w-10 h-10" />}
            </Button>
          </div>
        )}

        {phase === 'setup' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6">
            <span className="text-[100px] font-black text-yellow-400">{formatTime(timeRemaining)}</span>

            <h2 className="text-5xl font-black text-white tracking-wide">GET READY</h2>

            <Button
              onClick={togglePause}
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-24 h-24 rounded-full shadow-2xl shadow-yellow-400/50"
            >
              {isPaused ? <Play className="w-10 h-10" /> : <Pause className="w-10 h-10" />}
            </Button>
          </div>
        )}
      </div>

      {/* Stop confirmation dialog */}
      {showStopConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">End Workout Early?</h3>
            <p className="text-gray-400 mb-6">Are you sure you want to stop this workout?</p>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowStopConfirm(false);
                  setIsPaused(false);
                }}
                variant="outline"
                className="flex-1 border-gray-600 text-white"
              >
                Continue
              </Button>
              <Button
                onClick={confirmStop}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                End Workout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}