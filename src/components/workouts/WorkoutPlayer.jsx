import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Play, Pause, StopCircle } from "lucide-react";

export default function WorkoutPlayer({ config, workoutName, onClose }) {
  const [phase, setPhase] = useState('setup'); // 'setup', 'work', 'rest', 'setRest', 'complete'
  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Calculate total workout time
  const calculateTotalTime = () => {
    const setupSeconds = (config.setupTime.minutes * 60) + config.setupTime.seconds;
    const exerciseTime = config.exercises.reduce((acc, ex) => {
      const work = (ex.workTime.minutes * 60) + ex.workTime.seconds;
      const rest = (ex.restTime.minutes * 60) + ex.restTime.seconds;
      return acc + work + rest;
    }, 0);
    const setRestTime = (config.restBetweenSets.minutes * 60) + config.restBetweenSets.seconds;
    return setupSeconds + (exerciseTime * config.sets) + (setRestTime * (config.sets - 1));
  };

  // Initialize with setup time
  useEffect(() => {
    const setupSeconds = (config.setupTime.minutes * 60) + config.setupTime.seconds;
    setPhase('setup');
    setCurrentSet(1);
    setCurrentExerciseIndex(0);
    setTimeRemaining(setupSeconds);
    setTotalWorkoutTime(calculateTotalTime());
    setElapsedTime(0);
    setIsPaused(true); // Start paused, user must click play
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playSound = (type, customNumber = null) => {
    const audio = new Audio();
    if (type === 'countdown') {
      // Simple beep sound using oscillator
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
      // Play bell sound
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
    } else if (type === 'number') {
      const numberToSpeak = customNumber !== null ? customNumber : timeRemaining;
      const msg = new SpeechSynthesisUtterance(numberToSpeak.toString());
      msg.rate = 1;
      msg.pitch = 1;
      msg.volume = 1;
      window.speechSynthesis.speak(msg);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          return 0;
        }
        
        const newTime = prev - 1;
        
        // Countdown beep at 3, 2, 1 - play immediately when hitting these numbers
        if ((newTime === 3 || newTime === 2 || newTime === 1) && (phase === 'setup' || phase === 'work')) {
          playSound('countdown');
        }
        
        return newTime;
      });
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const handleSliderChange = (e) => {
    const newElapsed = parseInt(e.target.value);
    setElapsedTime(newElapsed);
    
    // Pause and clear existing timer
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Calculate which phase we should be in based on elapsed time
    let accumulatedTime = 0;
    const setupSeconds = (config.setupTime.minutes * 60) + config.setupTime.seconds;
    
    // Setup phase
    if (newElapsed <= setupSeconds) {
      setPhase('setup');
      setCurrentSet(1);
      setCurrentExerciseIndex(0);
      setTimeRemaining(setupSeconds - newElapsed);
      return;
    }
    accumulatedTime += setupSeconds;
    
    // Calculate set and exercise
    for (let set = 1; set <= config.sets; set++) {
      for (let exerciseIdx = 0; exerciseIdx < config.exercises.length; exerciseIdx++) {
        const exercise = config.exercises[exerciseIdx];
        const workSeconds = (exercise.workTime.minutes * 60) + exercise.workTime.seconds;
        const restSeconds = (exercise.restTime.minutes * 60) + exercise.restTime.seconds;
        
        // Work phase
        if (newElapsed <= accumulatedTime + workSeconds) {
          setPhase('work');
          setCurrentSet(set);
          setCurrentExerciseIndex(exerciseIdx);
          setTimeRemaining(accumulatedTime + workSeconds - newElapsed);
          return;
        }
        accumulatedTime += workSeconds;
        
        // Rest phase (skip rest after last exercise of last set)
        if (exerciseIdx < config.exercises.length - 1 || set < config.sets) {
          if (newElapsed <= accumulatedTime + restSeconds) {
            setPhase('rest');
            setCurrentSet(set);
            setCurrentExerciseIndex(exerciseIdx);
            setTimeRemaining(accumulatedTime + restSeconds - newElapsed);
            return;
          }
          accumulatedTime += restSeconds;
        }
      }
      
      // Set rest (between sets)
      if (set < config.sets) {
        const setRestSeconds = (config.restBetweenSets.minutes * 60) + config.restBetweenSets.seconds;
        if (newElapsed <= accumulatedTime + setRestSeconds) {
          setPhase('setRest');
          setCurrentSet(set);
          setCurrentExerciseIndex(config.exercises.length - 1);
          setTimeRemaining(accumulatedTime + setRestSeconds - newElapsed);
          return;
        }
        accumulatedTime += setRestSeconds;
      }
    }
    
    // Workout complete
    setPhase('complete');
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
      // Move to first exercise work phase
      playSound('go');
      setPhase('work');
      const workSeconds = (config.exercises[0].workTime.minutes * 60) + config.exercises[0].workTime.seconds;
      setTimeRemaining(workSeconds);
      startTimer();
    } else if (phase === 'work') {
      // Move to rest phase or next exercise
      playSound('buzzer');
      const restSeconds = (config.exercises[currentExerciseIndex].restTime.minutes * 60) + 
                          config.exercises[currentExerciseIndex].restTime.seconds;
      setPhase('rest');
      setTimeRemaining(restSeconds);
      startTimer();
    } else if (phase === 'rest') {
      // Move to next exercise or set rest
      if (currentExerciseIndex < config.exercises.length - 1) {
        // Next exercise
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        playSound('go');
        setPhase('work');
        const workSeconds = (config.exercises[nextIndex].workTime.minutes * 60) + 
                           config.exercises[nextIndex].workTime.seconds;
        setTimeRemaining(workSeconds);
        startTimer();
      } else {
        // All exercises done, check if more sets
        if (currentSet < config.sets) {
          // Set rest
          setPhase('setRest');
          const setRestSeconds = (config.restBetweenSets.minutes * 60) + config.restBetweenSets.seconds;
          setTimeRemaining(setRestSeconds);
          startTimer();
        } else {
          // Workout complete
          setPhase('complete');
        }
      }
    } else if (phase === 'setRest') {
      // Start next set
      setCurrentSet(prev => prev + 1);
      setCurrentExerciseIndex(0);
      playSound('go');
      setPhase('work');
      const workSeconds = (config.exercises[0].workTime.minutes * 60) + config.exercises[0].workTime.seconds;
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

  const currentExercise = config.exercises[currentExerciseIndex];
  const nextExercise = currentExerciseIndex < config.exercises.length - 1 
    ? config.exercises[currentExerciseIndex + 1] 
    : null;

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
      {/* Top bar with slider and set indicator */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={totalWorkoutTime}
              value={elapsedTime}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${(elapsedTime / totalWorkoutTime) * 100}%, #374151 ${(elapsedTime / totalWorkoutTime) * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(elapsedTime)}</span>
              <span>{formatTime(totalWorkoutTime)}</span>
            </div>
          </div>
          <div className="text-yellow-400 text-lg font-bold tracking-wider whitespace-nowrap">
            SET {currentSet} / {config.sets}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose()}
            className="text-white hover:bg-white/10 w-10 h-10 flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="text-red-400 hover:bg-red-400/10 w-10 h-10 flex-shrink-0"
          >
            <StopCircle className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-between px-16 py-8">
        {/* Left side - Exercise list */}
        <div className="flex-1 max-w-md">
          {phase === 'setup' && (
            <div className="space-y-8">
              <h2 className="text-7xl font-black text-yellow-400 mb-12">Exercises:</h2>
              <div className="space-y-6">
                {config.exercises.map((ex, idx) => (
                  <p key={idx} className="text-4xl text-white font-bold">
                    {idx + 1}. {ex.name} {ex.reps && `- ${ex.reps} reps`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {phase === 'work' && (
            <>
              <h2 className="text-7xl font-black text-yellow-400 mb-4">
                {currentExercise.name}
              </h2>
              {currentExercise.reps && (
                <p className="text-4xl text-white font-bold">{currentExercise.reps} REPS</p>
              )}
              {currentExercise.notes && (
                <p className="text-2xl text-gray-400 mt-4">{currentExercise.notes}</p>
              )}
              {nextExercise && (
                <div className="mt-12 pt-8 border-t border-gray-700">
                  <p className="text-xl text-gray-500">NEXT:</p>
                  <p className="text-2xl text-gray-400">{nextExercise.name}</p>
                </div>
              )}
            </>
          )}

          {phase === 'rest' && (
            <>
              <h2 className="text-6xl font-black text-blue-400 mb-4">REST</h2>
              {nextExercise && (
                <div className="mt-8">
                  <p className="text-xl text-gray-500">NEXT:</p>
                  <p className="text-3xl text-white font-bold">{nextExercise.name}</p>
                </div>
              )}
            </>
          )}

          {phase === 'setRest' && (
            <>
              <h2 className="text-6xl font-black text-purple-400 mb-4">SET REST</h2>
              <p className="text-2xl text-white">Get ready for Set {currentSet + 1}</p>
            </>
          )}
        </div>

        {/* Right side - Timer and status */}
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Timer circle */}
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

          {/* Status text */}
          {phase === 'setup' && (
            <h2 className="text-6xl font-black text-white tracking-wide">GET READY</h2>
          )}

          {/* Play button */}
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
                  startTimer();
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