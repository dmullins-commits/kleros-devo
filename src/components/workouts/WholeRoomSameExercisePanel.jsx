import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";

export default function WholeRoomSameExercisePanel({ onSave, initialData }) {
  const [config, setConfig] = useState(initialData || {
    sets: 1,
    setupTime: { minutes: 1, seconds: 0 },
    restBetweenSets: { minutes: 0, seconds: 10 },
    exercises: [
      { name: '', workTime: { minutes: 0, seconds: 30 }, restTime: { minutes: 0, seconds: 30 }, reps: '', notes: '' }
    ]
  });

  const handleSetChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeChange = (field, type, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: { ...prev[field], [type]: parseInt(value) || 0 }
    }));
  };

  const handleExerciseChange = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const handleExerciseTimeChange = (index, timeField, type, value) => {
    setConfig(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { 
          ...ex, 
          [timeField]: { ...ex[timeField], [type]: parseInt(value) || 0 }
        } : ex
      )
    }));
  };

  const addExercise = () => {
    setConfig(prev => ({
      ...prev,
      exercises: [...prev.exercises, { 
        name: '', 
        workTime: { minutes: 0, seconds: 30 }, 
        restTime: { minutes: 0, seconds: 30 }, 
        reps: '', 
        notes: '' 
      }]
    }));
  };

  const removeExercise = (index) => {
    if (config.exercises.length > 1) {
      setConfig(prev => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index)
      }));
    }
  };

  const formatTime = (time) => {
    const mins = time.minutes || 0;
    const secs = time.seconds || 0;
    return `${mins} min ${secs} sec`;
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardContent className="p-6 space-y-6">
        {/* Header section with sets, setup time, and rest between sets */}
        <div className="flex items-center justify-between gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Sets</Label>
            <Input
              type="number"
              min="1"
              value={config.sets}
              onChange={(e) => handleSetChange('sets', parseInt(e.target.value) || 1)}
              className="w-20 bg-gray-800 border-gray-600 text-white text-center"
            />
          </div>

          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Setup Time</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={config.setupTime.minutes}
                onChange={(e) => handleTimeChange('setupTime', 'minutes', e.target.value)}
                className="w-24 bg-gray-800 border-gray-600 text-white text-center text-lg"
                placeholder="M"
              />
              <span className="text-gray-400 self-center text-xl">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.setupTime.seconds.toString().padStart(2, '0')}
                onChange={(e) => handleTimeChange('setupTime', 'seconds', e.target.value)}
                className="w-24 bg-gray-800 border-gray-600 text-white text-center text-lg"
                placeholder="00"
              />
            </div>
          </div>

          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Rest Between Sets</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={config.restBetweenSets.minutes}
                onChange={(e) => handleTimeChange('restBetweenSets', 'minutes', e.target.value)}
                className="w-24 bg-gray-800 border-gray-600 text-white text-center text-lg"
                placeholder="M"
              />
              <span className="text-gray-400 self-center text-xl">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.restBetweenSets.seconds}
                onChange={(e) => handleTimeChange('restBetweenSets', 'seconds', e.target.value)}
                className="w-24 bg-gray-800 border-gray-600 text-white text-center text-lg"
                placeholder="S"
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Total time: {(() => {
            const setupSecs = (config.setupTime.minutes * 60) + config.setupTime.seconds;
            const exerciseSecs = config.exercises.reduce((acc, ex) => {
              const work = (ex.workTime.minutes * 60) + ex.workTime.seconds;
              const rest = (ex.restTime.minutes * 60) + ex.restTime.seconds;
              return acc + work + rest;
            }, 0);
            const setRestSecs = (config.restBetweenSets.minutes * 60) + config.restBetweenSets.seconds;
            const totalSecs = setupSecs + (exerciseSecs * config.sets) + (setRestSecs * (config.sets - 1));
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            return `${mins} min ${secs} sec`;
          })()}
        </div>

        {/* Exercises list */}
        <div className="space-y-3">
          {config.exercises.map((exercise, index) => (
            <div key={index} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-4">
                <Label className="text-yellow-400 font-semibold text-sm whitespace-nowrap">Exercise {index + 1}</Label>
                <div className="flex-1 grid grid-cols-[1fr,auto,auto,auto,auto] gap-3 items-end">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Exercise Name</Label>
                    <Input
                      value={exercise.name}
                      onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                      placeholder="Curl"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div className="w-20">
                    <Label className="text-gray-400 text-xs mb-1 block">Reps</Label>
                    <Input
                      value={exercise.reps}
                      onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                      placeholder="15"
                      className="bg-gray-800 border-gray-700 text-white text-center"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Work Time</Label>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        min="0"
                        value={exercise.workTime.minutes}
                        onChange={(e) => handleExerciseTimeChange(index, 'workTime', 'minutes', e.target.value)}
                        className="w-14 bg-gray-800 border-gray-700 text-white text-center"
                        placeholder="0"
                      />
                      <span className="text-gray-500">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={exercise.workTime.seconds}
                        onChange={(e) => handleExerciseTimeChange(index, 'workTime', 'seconds', e.target.value)}
                        className="w-14 bg-gray-800 border-gray-700 text-white text-center"
                        placeholder="30"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Rest Time</Label>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        min="0"
                        value={exercise.restTime.minutes}
                        onChange={(e) => handleExerciseTimeChange(index, 'restTime', 'minutes', e.target.value)}
                        className="w-14 bg-gray-800 border-gray-700 text-white text-center"
                        placeholder="0"
                      />
                      <span className="text-gray-500">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={exercise.restTime.seconds}
                        onChange={(e) => handleExerciseTimeChange(index, 'restTime', 'seconds', e.target.value)}
                        className="w-14 bg-gray-800 border-gray-700 text-white text-center"
                        placeholder="5"
                      />
                    </div>
                  </div>

                  {config.exercises.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-1 block">Notes</Label>
                <Textarea
                  value={exercise.notes}
                  onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                  placeholder="Additional instructions..."
                  className="bg-gray-800 border-gray-700 text-white h-16 text-sm resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Exercise button */}
        <Button
          type="button"
          onClick={addExercise}
          variant="outline"
          className="w-full border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Exercise
        </Button>

        {/* Save button */}
        <Button
          onClick={() => onSave(config)}
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
        >
          Save Workout Configuration
        </Button>
      </CardContent>
    </Card>
  );
}