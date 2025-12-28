import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const EXERCISE_COLORS = [
  { value: '#FFD700', label: 'Yellow', text: '#000000' },
  { value: '#FFFFFF', label: 'White', text: '#000000' },
  { value: '#000000', label: 'Black', text: '#FFFFFF' },
  { value: '#9333EA', label: 'Purple', text: '#FFFFFF' },
  { value: '#00FF00', label: 'Lime Green', text: '#000000' },
  { value: '#6B7280', label: 'Gray', text: '#FFFFFF' },
  { value: '#EF4444', label: 'Red', text: '#FFFFFF' },
  { value: '#3B82F6', label: 'Blue', text: '#FFFFFF' },
  { value: '#F97316', label: 'Orange', text: '#FFFFFF' },
  { value: '#EC4899', label: 'Pink', text: '#FFFFFF' }
];

export default function WholeRoomRotationalPanel({ onSave, initialData }) {
  const [config, setConfig] = useState(initialData || {
    sets: 1,
    setupTime: { minutes: 1, seconds: 0 },
    workTime: { minutes: 1, seconds: 0 },
    restTime: { minutes: 1, seconds: 0 },
    restBetweenSets: { minutes: 0, seconds: 10 },
    exercises: [
      { name: '', reps: '15', color: '#FFD700', notes: '', usePerSetReps: false, perSetReps: [] }
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



  const addExercise = () => {
    setConfig(prev => ({
      ...prev,
      exercises: [...prev.exercises, { 
        name: '', 
        reps: '15', 
        color: '#FFD700',
        notes: '',
        usePerSetReps: false,
        perSetReps: []
      }]
    }));
  };

  const togglePerSetReps = (index) => {
    setConfig(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i === index) {
          const usePerSetReps = !ex.usePerSetReps;
          return {
            ...ex,
            usePerSetReps,
            perSetReps: usePerSetReps ? Array(config.sets).fill(ex.reps) : []
          };
        }
        return ex;
      })
    }));
  };

  const handlePerSetRepChange = (exerciseIndex, setIndex, value) => {
    setConfig(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i === exerciseIndex) {
          const newPerSetReps = [...ex.perSetReps];
          newPerSetReps[setIndex] = value;
          return { ...ex, perSetReps: newPerSetReps };
        }
        return ex;
      })
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

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardContent className="p-6 space-y-6">
        {/* Header section with all global settings */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Sets</Label>
            <Input
              type="number"
              min="1"
              value={config.sets}
              onChange={(e) => handleSetChange('sets', parseInt(e.target.value) || 1)}
              className="w-full bg-gray-800 border-gray-600 text-white text-center"
            />
          </div>

          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Setup Time</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                min="0"
                value={config.setupTime.minutes}
                onChange={(e) => handleTimeChange('setupTime', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.setupTime.seconds.toString().padStart(2, '0')}
                onChange={(e) => handleTimeChange('setupTime', 'seconds', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="00"
              />
            </div>
          </div>

          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Work Time</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                min="0"
                value={config.workTime.minutes}
                onChange={(e) => handleTimeChange('workTime', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.workTime.seconds}
                onChange={(e) => handleTimeChange('workTime', 'seconds', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="00"
              />
            </div>
          </div>

          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Rest Time</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                min="0"
                value={config.restTime.minutes}
                onChange={(e) => handleTimeChange('restTime', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.restTime.seconds}
                onChange={(e) => handleTimeChange('restTime', 'seconds', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="00"
              />
            </div>
          </div>

          <div className="text-center">
            <Label className="text-gray-400 text-xs mb-2 block">Rest Between Sets</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                min="0"
                value={config.restBetweenSets.minutes}
                onChange={(e) => handleTimeChange('restBetweenSets', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.restBetweenSets.seconds}
                onChange={(e) => handleTimeChange('restBetweenSets', 'seconds', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="00"
              />
            </div>
          </div>
        </div>

        {/* Exercises list */}
        <div className="space-y-3">
          {config.exercises.map((exercise, index) => (
            <div key={index} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between mb-2">
                <Label className="text-yellow-400 font-bold text-base">Exercise {index + 1}</Label>
                {config.exercises.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(index)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 -mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-[1fr,auto] gap-4">
                <div>
                  <Label className="text-gray-400 text-xs mb-1 block">Exercise Name</Label>
                  <Input
                    value={exercise.name}
                    onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                    placeholder="Curl"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="w-24">
                  <Label className="text-gray-400 text-xs mb-1 block">Reps</Label>
                  <Input
                    value={exercise.reps}
                    onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                    placeholder="15"
                    className="bg-gray-800 border-gray-700 text-white text-center text-lg font-bold"
                    disabled={exercise.usePerSetReps}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id={`per-set-${index}`}
                  checked={exercise.usePerSetReps}
                  onCheckedChange={() => togglePerSetReps(index)}
                />
                <Label htmlFor={`per-set-${index}`} className="text-gray-400 text-sm cursor-pointer">
                  Different reps per set
                </Label>
              </div>

              {exercise.usePerSetReps && (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {Array.from({ length: config.sets }, (_, setIdx) => (
                    <div key={setIdx}>
                      <Label className="text-gray-400 text-xs mb-1 block">Set {setIdx + 1}</Label>
                      <Input
                        value={exercise.perSetReps[setIdx] || ''}
                        onChange={(e) => handlePerSetRepChange(index, setIdx, e.target.value)}
                        placeholder="10"
                        className="bg-gray-800 border-gray-700 text-white text-center"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[1fr,auto] gap-4 items-end">
                <div>
                  <Label className="text-gray-400 text-xs mb-1 block">Notes</Label>
                  <Input
                    value={exercise.notes}
                    onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                    placeholder="Additional instructions..."
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>

                <div className="w-32">
                  <Label className="text-gray-400 text-xs mb-1 block">Color</Label>
                  <Select value={exercise.color} onValueChange={(value) => handleExerciseChange(index, 'color', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: exercise.color }} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {EXERCISE_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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