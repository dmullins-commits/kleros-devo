import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Play, Pause, StopCircle } from "lucide-react";

export default function RotationalWorkoutPlayer({ config, workoutName, onClose, totalWorkoutTime: overallWorkoutTime, elapsedBeforeCurrentSection = 0, onElapsedTimeUpdate }) {
  // Migrate old config format to new format if needed
  const migratedConfig = {
    ...config,
    sets: config.sets || 1,
    setupTime: config.setupTime || { minutes: 1, seconds: 0 },
    workTime: config.workTime || { minutes: 1, seconds: 0 },
    restTime: config.restTime || { minutes: 1, seconds: 0 },
    restBetweenSets: config.restBetweenSets || { minutes: 0, seconds: 10 },
    exercises: (config.exercises || []).map(ex => ({
      ...ex,
      usePerSetReps: ex.usePerSetReps || false,
      perSetReps: ex.perSetReps || []
    }))
  };

  const [phase, setPhase] = useState('setup'); // 'setup', 'work', 'rest', 'setRest', 'complete'
  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(elapsedBeforeCurrentSection === 0); // Auto-start only if not first timer
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [colorRotation, setColorRotation] = useState(0);
  
  const timerRef = useRef(null);

  const calculateTotalTime = () => {
    const setupSeconds = (migratedConfig.setupTime?.minutes || 0) * 60 + (migratedConfig.setupTime?.seconds || 0);
    const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
    const restSeconds = (migratedConfig.restTime?.minutes || 0) * 60 + (migratedConfig.restTime?.seconds || 0);
    const exerciseTime = (workSeconds + restSeconds) * (migratedConfig.exercises?.length || 0);
    const setRestSeconds = (migratedConfig.restBetweenSets?.minutes || 0) * 60 + (migratedConfig.restBetweenSets?.seconds || 0);
    return setupSeconds + (exerciseTime * (migratedConfig.sets || 1)) + (setRestSeconds * ((migratedConfig.sets || 1) - 1));
  };

  useEffect(() => {
    const setupSeconds = (migratedConfig.setupTime?.minutes || 0) * 60 + (migratedConfig.setupTime?.seconds || 0);
    setPhase('setup');
    setCurrentSet(1);
    setCurrentExerciseIndex(0);
    setTimeRemaining(setupSeconds);
    setTotalWorkoutTime(calculateTotalTime());
    setElapsedTime(0);
    setIsPaused(elapsedBeforeCurrentSection === 0); // Auto-start only if not first timer
    setColorRotation(0);
    
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

  const rotateColors = () => {
    setColorRotation(prev => (prev + 1) % migratedConfig.exercises.length);
  };

  const handlePhaseComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (phase === 'setup') {
      playSound('go');
      setPhase('work');
      const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
      setTimeRemaining(workSeconds);
      startTimer();
    } else if (phase === 'work') {
      // Move to rest phase and rotate colors
      playSound('buzzer');
      rotateColors();
      setPhase('rest');
      const restSeconds = (migratedConfig.restTime?.minutes || 0) * 60 + (migratedConfig.restTime?.seconds || 0);
      setTimeRemaining(restSeconds);
      startTimer();
    } else if (phase === 'rest') {
      const nextExerciseIndexInSet = (currentExerciseIndex + 1) % migratedConfig.exercises.length;
      
      if (nextExerciseIndexInSet === 0) {
        // Finished all exercises in this set
        if (currentSet < migratedConfig.sets) {
          // Move to rest between sets
          setPhase('setRest');
          const setRestSeconds = (migratedConfig.restBetweenSets?.minutes || 0) * 60 + (migratedConfig.restBetweenSets?.seconds || 0);
          setTimeRemaining(setRestSeconds);
          startTimer();
        } else {
          setPhase('complete');
        }
      } else {
        // Move to next exercise
        playSound('go');
        setPhase('work');
        setCurrentExerciseIndex(nextExerciseIndexInSet);
        const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
        setTimeRemaining(workSeconds);
        startTimer();
      }
    } else if (phase === 'setRest') {
      // Start next set
      setCurrentSet(prev => prev + 1);
      setCurrentExerciseIndex(0);
      playSound('go');
      setPhase('work');
      const workSeconds = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
      setTimeRemaining(workSeconds);
      startTimer();
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

  useEffect(() => {
    if (phase === 'complete' && config.totalWorkoutTime) {
      // Auto-transition in multi-timer mode
      onClose();
    }
  }, [phase]);

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
              onChange={(e) => {
                const newElapsed = parseInt(e.target.value);
                setElapsedTime(newElapsed);
                setIsPaused(true);
                if (timerRef.current) clearInterval(timerRef.current);
                
                // Calculate phase based on elapsed time
                let accTime = 0;
                const setupSecs = (migratedConfig.setupTime?.minutes || 0) * 60 + (migratedConfig.setupTime?.seconds || 0);
                
                if (newElapsed <= setupSecs) {
                  setPhase('setup');
                  setCurrentSet(1);
                  setCurrentExerciseIndex(0);
                  setColorRotation(0);
                  setTimeRemaining(setupSecs - newElapsed);
                  return;
                }
                accTime += setupSecs;

                const workSecs = (migratedConfig.workTime?.minutes || 0) * 60 + (migratedConfig.workTime?.seconds || 0);
                const restSecs = (migratedConfig.restTime?.minutes || 0) * 60 + (migratedConfig.restTime?.seconds || 0);
                
                for (let set = 1; set <= migratedConfig.sets; set++) {
                  for (let exIdx = 0; exIdx < migratedConfig.exercises.length; exIdx++) {
                    if (newElapsed <= accTime + workSecs) {
                      setPhase('work');
                      setCurrentSet(set);
                      setCurrentExerciseIndex(exIdx);
                      setColorRotation(Math.floor((set - 1) * migratedConfig.exercises.length + exIdx) % migratedConfig.exercises.length);
                      setTimeRemaining(accTime + workSecs - newElapsed);
                      return;
                    }
                    accTime += workSecs;
                    
                    if (newElapsed <= accTime + restSecs) {
                      setPhase('rest');
                      setCurrentSet(set);
                      setCurrentExerciseIndex(exIdx);
                      setColorRotation(Math.floor((set - 1) * migratedConfig.exercises.length + exIdx) % migratedConfig.exercises.length);
                      setTimeRemaining(accTime + restSecs - newElapsed);
                      return;
                    }
                    accTime += restSecs;
                  }
                }
                
                setPhase('complete');
              }}
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
      <div className="flex-1 flex items-center justify-between px-16 py-8">
        {/* Left side - Exercise list */}
        <div className="flex-1 max-w-3xl">
          {phase === 'setup' && (
            <div className="space-y-8">
              <h2 className="text-7xl font-black text-yellow-400 mb-12">Exercises:</h2>
              <div className="space-y-6">
                {migratedConfig.exercises.map((ex, idx) => (
                  <div 
                    key={idx}
                    className="p-6 rounded-lg"
                    style={{ backgroundColor: ex.color }}
                  >
                    <p className="text-4xl font-bold" style={{ color: getColorForText(ex.color) }}>
                      {idx + 1}. {ex.name} - {ex.reps} reps
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(phase === 'work' || phase === 'rest') && (
            <div className="space-y-2">
              {/* Sets indicator at top */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-black text-white">Sets:</span>
                {Array.from({ length: migratedConfig.sets }, (_, i) => i + 1).map((setNum) => (
                  <div
                    key={setNum}
                    className={`text-4xl font-black ${
                      setNum === currentSet 
                        ? 'text-white border-4 border-white px-4 py-2' 
                        : 'text-gray-600 px-4 py-2'
                    }`}
                  >
                    {setNum}
                  </div>
                ))}
              </div>

              {/* Exercise rows */}
              {migratedConfig.exercises.map((exercise, exIdx) => {
                const rotatedColorIdx = (exIdx + colorRotation) % migratedConfig.exercises.length;
                const displayColor = migratedConfig.exercises[rotatedColorIdx].color;
                const isActive = exIdx === currentExerciseIndex;
                
                // Get reps for current set
                const displayReps = exercise.usePerSetReps && exercise.perSetReps && exercise.perSetReps[currentSet - 1]
                  ? exercise.perSetReps[currentSet - 1]
                  : exercise.reps;
                
                return (
                  <div
                    key={exIdx}
                    className="flex items-center h-24 relative"
                    style={{ backgroundColor: displayColor }}
                  >
                    {/* Rep boxes */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <div 
                        className="border-4 px-6 py-2 text-3xl font-black"
                        style={{ 
                          borderColor: getColorForText(displayColor),
                          color: getColorForText(displayColor)
                        }}
                      >
                        {displayReps}
                      </div>
                    </div>

                    {/* Exercise name in center */}
                    <div className="flex-1 text-center">
                      <h3 className="text-5xl font-black" style={{ color: getColorForText(displayColor) }}>
                        {exercise.name}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side - Timer */}
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="relative">
            <svg className="w-[450px] h-[450px]" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#333"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#FFD700"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={0}
                transform="rotate(-90 100 100)"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[120px] font-black text-yellow-400">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          {phase === 'setup' && (
            <h2 className="text-6xl font-black text-white tracking-wide">GET READY</h2>
          )}

          {phase === 'work' && (
            <h2 className="text-6xl font-black text-green-400 tracking-wide">WORK</h2>
          )}

          {phase === 'rest' && (
            <h2 className="text-6xl font-black text-blue-400 tracking-wide">REST</h2>
          )}

          {phase === 'setRest' && (
            <h2 className="text-6xl font-black text-purple-400 tracking-wide">SET REST</h2>
          )}

          <Button
            onClick={togglePause}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-28 h-28 rounded-full shadow-2xl shadow-yellow-400/50"
          >
            {isPaused ? <Play className="w-12 h-12" /> : <Pause className="w-12 h-12" />}
          </Button>
        </div>
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