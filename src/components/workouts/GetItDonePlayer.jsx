import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Play, Pause, StopCircle } from "lucide-react";

export default function GetItDonePlayer({ config, workoutName, onClose, totalWorkoutTime: overallWorkoutTime, elapsedBeforeCurrentSection = 0, onElapsedTimeUpdate }) {
  const totalSeconds = (config.totalTime?.minutes || 0) * 60 + (config.totalTime?.seconds || 0);
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [isPaused, setIsPaused] = useState(true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const lastMinuteRef = useRef(Math.floor(totalSeconds / 60));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        
        const newTime = prev - 1;
        const currentMinute = Math.floor(newTime / 60);
        
        // Beep every minute
        if (currentMinute < lastMinuteRef.current && newTime > 0) {
          playBeep();
          lastMinuteRef.current = currentMinute;
        }
        
        return newTime;
      });
      setElapsedTime(prev => {
        const newElapsed = prev + 1;
        if (onElapsedTimeUpdate) {
          onElapsedTimeUpdate(newElapsed);
        }
        return newElapsed;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const playBeep = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.3;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
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

  const handleSliderChange = (e) => {
    const newElapsed = parseInt(e.target.value) - elapsedBeforeCurrentSection;
    if (newElapsed < 0) return;
    
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    setElapsedTime(newElapsed);
    setTimeRemaining(totalSeconds - newElapsed);
    lastMinuteRef.current = Math.floor((totalSeconds - newElapsed) / 60);
  };

  if (timeRemaining === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-black text-yellow-400 mb-4">TIME'S UP!</h1>
          <p className="text-2xl text-white">Great work!</p>
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

  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 360;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">{workoutName}</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStop}
              className="text-red-400 hover:bg-red-400/10 w-10 h-10"
            >
              <StopCircle className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onClose()}
              className="text-white hover:bg-white/10 w-10 h-10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-between px-16">
        {/* Exercises list on left */}
        <div className="flex-1 max-w-2xl space-y-4">
          <h3 className="text-4xl font-black text-yellow-400 mb-8">GET IT DONE!</h3>
          <div className="space-y-3">
            {config.exercises.map((exercise, index) => (
              <div key={index} className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <h4 className="text-3xl font-bold text-white">{exercise.name}</h4>
                  <div className="text-right">
                    <p className="text-2xl font-black text-yellow-400">{exercise.sets} x {exercise.reps}</p>
                    <p className="text-sm text-gray-400">Sets x Reps</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analog clock on right */}
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            <svg className="w-[400px] h-[400px]" viewBox="0 0 200 200">
              {/* Clock face */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#333"
                strokeWidth="4"
              />
              
              {/* Progress arc */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#FFD700"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 360)}`}
                transform="rotate(-90 100 100)"
                className="transition-all duration-1000"
              />

              {/* Clock hour markers */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x1 = 100 + 75 * Math.cos(angle);
                const y1 = 100 + 75 * Math.sin(angle);
                const x2 = 100 + 85 * Math.cos(angle);
                const y2 = 100 + 85 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#666"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Clock hand */}
              <line
                x1="100"
                y1="100"
                x2={100 + 70 * Math.cos((progress - 90) * (Math.PI / 180))}
                y2={100 + 70 * Math.sin((progress - 90) * (Math.PI / 180))}
                stroke="#FFD700"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Center dot */}
              <circle cx="100" cy="100" r="6" fill="#FFD700" />
            </svg>

            {/* Time display in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-black text-yellow-400">{formatTime(timeRemaining)}</span>
            </div>
          </div>

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