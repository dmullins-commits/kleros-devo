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

export default function StationsPanel({ onSave, initialData }) {
  const [config, setConfig] = useState(initialData || {
    sets: 1,
    setupTime: { minutes: 1, seconds: 0 },
    workTime: { minutes: 1, seconds: 0 },
    restTime: { minutes: 1, seconds: 0 },
    restBetweenSets: { minutes: 0, seconds: 10 },
    stations: [
      {
        exercises: [
          { name: '', reps: '15', color: '#FFD700', notes: '', usePerSetReps: false, perSetReps: [] }
        ]
      }
    ]
  });

  const handleSetChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeChange = (field, type, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: { ...(prev[field] || {}), [type]: parseInt(value) || 0 }
    }));
  };

  const handleExerciseChange = (stationIndex, exerciseIndex, field, value) => {
    setConfig(prev => ({
      ...prev,
      stations: prev.stations.map((station, sIdx) => {
        if (sIdx === stationIndex) {
          return {
            ...station,
            exercises: station.exercises.map((ex, eIdx) =>
              eIdx === exerciseIndex ? { ...ex, [field]: value } : ex
            )
          };
        }
        return station;
      })
    }));
  };

  const addStation = () => {
    if (config.stations.length < 4) {
      setConfig(prev => ({
        ...prev,
        stations: [...prev.stations, {
          exercises: [
            { name: '', reps: '15', color: '#FFD700', notes: '', usePerSetReps: false, perSetReps: [] }
          ]
        }]
      }));
    }
  };

  const removeStation = (stationIndex) => {
    if (config.stations.length > 1) {
      setConfig(prev => ({
        ...prev,
        stations: prev.stations.filter((_, i) => i !== stationIndex)
      }));
    }
  };

  const addExercise = (stationIndex) => {
    setConfig(prev => ({
      ...prev,
      stations: prev.stations.map((station, i) => {
        if (i === stationIndex) {
          return {
            ...station,
            exercises: [...station.exercises, {
              name: '',
              reps: '15',
              color: i === 0 ? '#FFD700' : station.exercises[0]?.color || '#FFD700',
              notes: '',
              usePerSetReps: false,
              perSetReps: []
            }]
          };
        }
        return station;
      })
    }));
  };

  const removeExercise = (stationIndex, exerciseIndex) => {
    setConfig(prev => ({
      ...prev,
      stations: prev.stations.map((station, i) => {
        if (i === stationIndex && station.exercises.length > 1) {
          return {
            ...station,
            exercises: station.exercises.filter((_, eIdx) => eIdx !== exerciseIndex)
          };
        }
        return station;
      })
    }));
  };

  const togglePerSetReps = (stationIndex, exerciseIndex) => {
    setConfig(prev => ({
      ...prev,
      stations: prev.stations.map((station, sIdx) => {
        if (sIdx === stationIndex) {
          return {
            ...station,
            exercises: station.exercises.map((ex, eIdx) => {
              if (eIdx === exerciseIndex) {
                const usePerSetReps = !ex.usePerSetReps;
                return {
                  ...ex,
                  usePerSetReps,
                  perSetReps: usePerSetReps ? Array(config.sets).fill(ex.reps) : []
                };
              }
              return ex;
            })
          };
        }
        return station;
      })
    }));
  };

  const handlePerSetRepChange = (stationIndex, exerciseIndex, setIndex, value) => {
    setConfig(prev => ({
      ...prev,
      stations: prev.stations.map((station, sIdx) => {
        if (sIdx === stationIndex) {
          return {
            ...station,
            exercises: station.exercises.map((ex, eIdx) => {
              if (eIdx === exerciseIndex) {
                const newPerSetReps = [...ex.perSetReps];
                newPerSetReps[setIndex] = value;
                return { ...ex, perSetReps: newPerSetReps };
              }
              return ex;
            })
          };
        }
        return station;
      })
    }));
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
                value={config.setupTime?.minutes || 0}
                onChange={(e) => handleTimeChange('setupTime', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={(config.setupTime?.seconds || 0).toString().padStart(2, '0')}
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
                value={config.workTime?.minutes || 0}
                onChange={(e) => handleTimeChange('workTime', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.workTime?.seconds || 0}
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
                value={config.restTime?.minutes || 0}
                onChange={(e) => handleTimeChange('restTime', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.restTime?.seconds || 0}
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
                value={config.restBetweenSets?.minutes || 0}
                onChange={(e) => handleTimeChange('restBetweenSets', 'minutes', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="M"
              />
              <span className="text-gray-400 self-center">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={config.restBetweenSets?.seconds || 0}
                onChange={(e) => handleTimeChange('restBetweenSets', 'seconds', e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white text-center"
                placeholder="00"
              />
            </div>
          </div>
        </div>

        {/* Stations */}
        <div className="space-y-6">
          {config.stations.map((station, stationIndex) => (
            <Card key={stationIndex} className="bg-gray-900 border-gray-700">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-yellow-400 font-bold text-xl">Station {stationIndex + 1}</Label>
                  {config.stations.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeStation(stationIndex)}
                      className="border-red-700 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Station
                    </Button>
                  )}
                </div>

                {/* Exercises for this station */}
                <div className="space-y-3">
                  {station.exercises.map((exercise, exerciseIndex) => (
                    <div key={exerciseIndex} className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between mb-2">
                        <Label className="text-gray-300 font-bold text-base">Exercise {exerciseIndex + 1}</Label>
                        {station.exercises.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExercise(stationIndex, exerciseIndex)}
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
                            onChange={(e) => handleExerciseChange(stationIndex, exerciseIndex, 'name', e.target.value)}
                            placeholder="Row"
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </div>

                        <div className="w-24">
                          <Label className="text-gray-400 text-xs mb-1 block">Reps</Label>
                          <Input
                            value={exercise.reps}
                            onChange={(e) => handleExerciseChange(stationIndex, exerciseIndex, 'reps', e.target.value)}
                            placeholder="15"
                            className="bg-gray-800 border-gray-700 text-white text-center text-lg font-bold"
                            disabled={exercise.usePerSetReps}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id={`per-set-${stationIndex}-${exerciseIndex}`}
                          checked={exercise.usePerSetReps}
                          onCheckedChange={() => togglePerSetReps(stationIndex, exerciseIndex)}
                        />
                        <Label htmlFor={`per-set-${stationIndex}-${exerciseIndex}`} className="text-gray-400 text-sm cursor-pointer">
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
                                onChange={(e) => handlePerSetRepChange(stationIndex, exerciseIndex, setIdx, e.target.value)}
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
                            onChange={(e) => handleExerciseChange(stationIndex, exerciseIndex, 'notes', e.target.value)}
                            placeholder="Additional instructions..."
                            className="bg-gray-800 border-gray-700 text-white text-sm"
                          />
                        </div>

                        {stationIndex === 0 && (
                          <div className="w-32">
                            <Label className="text-gray-400 text-xs mb-1 block">Color</Label>
                            <Select value={exercise.color} onValueChange={(value) => handleExerciseChange(stationIndex, exerciseIndex, 'color', value)}>
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={() => addExercise(stationIndex)}
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise to Station {stationIndex + 1}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Station button */}
        {config.stations.length < 4 && (
          <Button
            type="button"
            onClick={addStation}
            variant="outline"
            className="w-full border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Station ({config.stations.length}/4)
          </Button>
        )}

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