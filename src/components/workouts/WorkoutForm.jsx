import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Dumbbell, Plus, Trash2 } from "lucide-react";

export default function WorkoutForm({ workout, teams, athletes, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(workout || {
    name: '',
    description: '',
    exercises: [{ name: '', sets: 3, reps: '10', weight: '', rest: '60s', notes: '' }],
    duration_minutes: 60,
    difficulty: 'intermediate',
    category: 'strength',
    assigned_teams: [],
    assigned_athletes: [],
    vbt_compatible: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamToggle = (teamId) => {
    setFormData(prev => ({
      ...prev,
      assigned_teams: prev.assigned_teams.includes(teamId)
        ? prev.assigned_teams.filter(id => id !== teamId)
        : [...prev.assigned_teams, teamId]
    }));
  };

  const addExercise = () => {
    setFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '', rest: '60s', notes: '' }]
    }));
  };

  const removeExercise = (index) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExercise = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Dumbbell className="w-6 h-6 text-yellow-400" />
              {workout ? 'Edit Workout' : 'Create New Workout'}
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Workout Name *</Label>
                <Input
                  placeholder="Upper Body Strength"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value))}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="strength" className="text-white">Strength</SelectItem>
                    <SelectItem value="power" className="text-white">Power</SelectItem>
                    <SelectItem value="speed" className="text-white">Speed</SelectItem>
                    <SelectItem value="endurance" className="text-white">Endurance</SelectItem>
                    <SelectItem value="recovery" className="text-white">Recovery</SelectItem>
                    <SelectItem value="vbt_specific" className="text-white">VBT Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleChange('difficulty', value)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="beginner" className="text-white">Beginner</SelectItem>
                    <SelectItem value="intermediate" className="text-white">Intermediate</SelectItem>
                    <SelectItem value="advanced" className="text-white">Advanced</SelectItem>
                    <SelectItem value="elite" className="text-white">Elite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                placeholder="Workout description..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white h-24"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">Assign to Teams *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={formData.assigned_teams.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                      className="border-gray-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                    />
                    <label htmlFor={`team-${team.id}`} className="text-sm text-white cursor-pointer">
                      {team.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Exercises *</Label>
                <Button type="button" onClick={addExercise} size="sm" className="bg-gray-800 hover:bg-gray-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Exercise
                </Button>
              </div>

              {formData.exercises.map((exercise, index) => (
                <Card key={index} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-yellow-400 font-semibold">Exercise {index + 1}</span>
                      {formData.exercises.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExercise(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white col-span-2 md:col-span-3"
                      />
                      <Input
                        type="number"
                        placeholder="Sets"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                      <Input
                        placeholder="Reps"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                      <Input
                        placeholder="Weight"
                        value={exercise.weight}
                        onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
              <Button type="button" variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold">
                <Save className="w-4 h-4 mr-2" />
                {workout ? 'Update' : 'Create'} Workout
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}