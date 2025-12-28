import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    sets: 4,
    setupTime: { minutes: 1, seconds: 0 },
    exercises: [
      { name: '', reps: '', color: '#FFD700', workTime: { minutes: 0, seconds: 30 } }
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
        reps: '', 
        color: '#FFD700',
        workTime: { minutes: 0, seconds: 30 }
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

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardContent className="p-6 space-y-6">
        {/* Header section with sets and setup time */}
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
        </div>

        {/* Exercises list */}
        <div className="space-y-3">
          {config.exercises.map((exercise, index) => {
            const selectedColor = EXERCISE_COLORS.find(c => c.value === exercise.color) || EXERCISE_COLORS[0];
            return (
              <div key={index} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="text-yellow-400 font-semibold text-sm whitespace-nowrap">Exercise {index + 1}</Label>
                  <div className="flex-1 grid grid-cols-[1fr,auto,auto,auto,auto] gap-3 items-end">
                    <div>
                      <Label className="text-gray-400 text-xs mb-1 block">Exercise Name</Label>
                      <Input
                        value={exercise.name}
                        onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                        placeholder="Bench Press"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>

                    <div className="w-20">
                      <Label className="text-gray-400 text-xs mb-1 block">Reps</Label>
                      <Input
                        value={exercise.reps}
                        onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                        placeholder="10"
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

                    <div className="w-32">
                      <Label className="text-gray-400 text-xs mb-1 block">Color</Label>
                      <Select value={exercise.color} onValueChange={(value) => handleExerciseChange(index, 'color', value)}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: exercise.color }} />
                            <SelectValue />
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
              </div>
            );
          })}
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