import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";

export default function GetItDonePanel({ onSave, initialData }) {
  const [config, setConfig] = useState(initialData || {
    totalTime: { minutes: 20, seconds: 0 },
    exercises: []
  });

  const addExercise = () => {
    setConfig(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: '', sets: 3, reps: 10 }]
    }));
  };

  const removeExercise = (index) => {
    setConfig(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExercise = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const handleSave = () => {
    if (config.exercises.length > 0) {
      onSave(config);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <Label className="text-gray-300">Total Time</Label>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-gray-400 text-sm">Minutes</Label>
              <Input
                type="number"
                min="0"
                value={config.totalTime.minutes}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  totalTime: { ...prev.totalTime, minutes: parseInt(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex-1">
              <Label className="text-gray-400 text-sm">Seconds</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.totalTime.seconds}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  totalTime: { ...prev.totalTime, seconds: parseInt(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-gray-300">Exercises</Label>
            <Button
              type="button"
              onClick={addExercise}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
          </div>

          <div className="space-y-3">
            {config.exercises.map((exercise, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">Exercise Name</Label>
                  <Input
                    placeholder="e.g., Push-ups"
                    value={exercise.name}
                    onChange={(e) => updateExercise(index, 'name', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="w-24">
                  <Label className="text-gray-400 text-sm">Sets</Label>
                  <Input
                    type="number"
                    min="1"
                    value={exercise.sets}
                    onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value) || 1)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="w-24">
                  <Label className="text-gray-400 text-sm">Reps</Label>
                  <Input
                    type="number"
                    min="1"
                    value={exercise.reps}
                    onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value) || 1)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => removeExercise(index)}
                  variant="outline"
                  size="icon"
                  className="border-red-700 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={config.exercises.length === 0}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}