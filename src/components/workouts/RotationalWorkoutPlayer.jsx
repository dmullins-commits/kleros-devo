import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Play, Pause, StopCircle } from "lucide-react";

export default function RotationalWorkoutPlayer({ config, workoutName, onClose }) {
  const [phase, setPhase] = useState('setup'); // 'setup', 'work', 'rest', 'complete'
  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseOrder, setExerciseOrder] = useState([]);
  
  const timerRef = useRef(null);

  const calculateTotalTime = () => {
    const setupSeconds = (config.setupTime?.minutes || 0) * 60 + (config.setupTime?.seconds || 0);
    const workSeconds = (config.workTime?.minutes || 0) * 60 + (config.workTime?.seconds || 0);
    const restSeconds = (config.restTime?.minutes || 0) * 60 + (config.restTime?.seconds || 0);
    const exerciseTime = (workSeconds + restSeconds) * config.exercises.length;
    const setRestSeconds = (config.restBetweenSets?.minutes || 0) * 60 + (config.restBetweenSets?.seconds || 0);
    return setupSeconds + (exerciseTime * config.sets) + (setRestSeconds * (config.sets - 1));
  };

  useEffect(() => {
    const setupSeconds = (config.setupTime?.minutes || 0) * 60 + (config.setupTime?.seconds || 0);
    setPhase('setup');
    setCurrentSet(1);
    setCurrentExerciseIndex(0);
    setTimeRemaining(setupSeconds);
    setTotalWorkoutTime(calculateTotalTime());
    setElapsedTime(0);
    setIsPaused(true);
    setExerciseOrder(config.exercises.map((_, idx) => idx));
    
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
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) return 0;
        
        const newTime = prev - 1;
        
        if ((newTime === 3 || newTime === 2 || newTime === 1) && (phase === 'work' || phase === 'rest')) {
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

  const rotateExercises = () => {
    setExerciseOrder(prev => {
      const newOrder = [...prev];
      const first = newOrder.shift();
      newOrder.push(first);
      return newOrder;
    });
  };

  const handlePhaseComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (phase === 'setup') {
      playSound('go');
      setPhase('work');
      const workSeconds = (config.workTime?.minutes || 0) * 60 + (config.workTime?.seconds || 0);
      setTimeRemaining(workSeconds);
      startTimer();
    } else if (phase === 'work') {
      // Move to rest phase
      setPhase('rest');
      const restSeconds = (config.restTime?.minutes || 0) * 60 + (config.restTime?.seconds || 0);
      setTimeRemaining(restSeconds);
      startTimer();
    } else if (phase === 'rest') {
      rotateExercises();
      
      const nextExerciseIndexInSet = (currentExerciseIndex + 1) % config.exercises.length;
      setCurrentExerciseIndex(nextExerciseIndexInSet);
      
      if (nextExerciseIndexInSet === 0) {
        if (currentSet < config.sets) {
          setCurrentSet(prev => prev + 1);
          playSound('go');
          setPhase('work');
          const workSeconds = (config.workTime?.minutes || 0) * 60 + (config.workTime?.seconds || 0);
          setTimeRemaining(workSeconds);
          startTimer();
        } else {
          setPhase('complete');
        }
      } else {
        playSound('go');
        setPhase('work');
        const workSeconds = (config.workTime?.minutes || 0) * 60 + (config.workTime?.seconds || 0);
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
              disabled
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
                {config.exercises.map((ex, idx) => (
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

          {phase === 'work' && (
            <div className="space-y-2">
              {/* Sets indicator at top */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-black text-white">Sets:</span>
                {Array.from({ length: config.sets }, (_, i) => i + 1).map((setNum) => (
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
              {exerciseOrder.map((originalIdx, displayIdx) => {
                const exercise = config.exercises[originalIdx];
                const isActive = displayIdx === 0;
                
                return (
                  <div
                    key={originalIdx}
                    className="flex items-center h-24 relative"
                    style={{ backgroundColor: exercise.color }}
                  >
                    {/* Exercise name in center */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-4">
                        {isActive && <span className="text-5xl" style={{ color: getColorForText(exercise.color) }}>▶</span>}
                        <h3 className="text-5xl font-black" style={{ color: getColorForText(exercise.color) }}>
                          {exercise.name}
                        </h3>
                      </div>
                    </div>

                    {/* Rep boxes */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <div 
                        className="border-4 px-6 py-2 text-3xl font-black"
                        style={{ 
                          borderColor: getColorForText(exercise.color),
                          color: getColorForText(exercise.color)
                        }}
                      >
                        {exercise.reps}
                      </div>
                    </div>

                    {/* Additional rep numbers on the right */}
                    <div className="flex gap-8 mr-8">
                      {Array(3).fill(0).map((_, i) => (
                        <span 
                          key={i} 
                          className="text-3xl font-black"
                          style={{ color: getColorForText(exercise.color) }}
                        >
                          {exercise.reps}
                        </span>
                      ))}
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