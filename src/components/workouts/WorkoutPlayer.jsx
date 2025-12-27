import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Play, Pause, StopCircle } from "lucide-react";

export default function WorkoutPlayer({ config, workoutName, onClose }) {
  const [phase, setPhase] = useState('setup'); // 'setup', 'work', 'rest', 'setRest', 'complete'
  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize with setup time
  useEffect(() => {
    const setupSeconds = (config.setupTime.minutes * 60) + config.setupTime.seconds;
    setTimeRemaining(setupSeconds);
    startTimer();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playSound = (type) => {
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
      // Play go sound
      const msg = new SpeechSynthesisUtterance('Go!');
      msg.rate = 1.2;
      msg.pitch = 1.2;
      msg.volume = 1;
      window.speechSynthesis.speak(msg);
    } else if (type === 'buzzer') {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 400;
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'number') {
      const msg = new SpeechSynthesisUtterance(timeRemaining.toString());
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
        
        // Countdown audio at 5, 4, 3, 2, 1
        if (prev <= 5 && prev > 0 && (phase === 'setup' || phase === 'work')) {
          playSound('number');
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    if (timeRemaining === 0) {
      handlePhaseComplete();
    }
  }, [timeRemaining, isPaused]);

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
      {/* Top bar with X and Stop */}
      <div className="absolute top-4 right-4 flex gap-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onClose()}
          className="text-white hover:bg-white/10 w-12 h-12"
        >
          <X className="w-8 h-8" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStop}
          className="text-red-400 hover:bg-red-400/10 w-12 h-12"
        >
          <StopCircle className="w-8 h-8" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Set indicator */}
        <div className="text-yellow-400 text-2xl font-bold mb-8">
          SET {currentSet} / {config.sets}
        </div>

        {/* Timer circle */}
        <div className="relative mb-12">
          <svg className="w-80 h-80" viewBox="0 0 200 200">
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
            <span className="text-8xl font-black text-yellow-400">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Phase and exercise info */}
        <div className="text-center space-y-6 max-w-4xl">
          {phase === 'setup' && (
            <>
              <h2 className="text-5xl font-black text-white mb-8">GET READY</h2>
              <div className="space-y-3">
                <p className="text-2xl text-yellow-400 font-bold">Exercises:</p>
                {config.exercises.map((ex, idx) => (
                  <p key={idx} className="text-xl text-white">
                    {idx + 1}. {ex.name} {ex.reps && `- ${ex.reps} reps`}
                  </p>
                ))}
              </div>
            </>
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
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <Button
          onClick={togglePause}
          size="lg"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold w-20 h-20 rounded-full"
        >
          {isPaused ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />}
        </Button>
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