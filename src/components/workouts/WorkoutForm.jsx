import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Dumbbell, Edit, Play } from "lucide-react";
import WholeRoomSameExercisePanel from "./WholeRoomSameExercisePanel";
import WorkoutPlayer from "./WorkoutPlayer";

export default function WorkoutForm({ workout, teams, athletes, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(workout || {
    name: '',
    description: '',
    workout_type: '',
    workout_config: null,
    assigned_teams: [],
    assigned_athletes: []
  });
  const [showPlayer, setShowPlayer] = useState(false);
  const [isConfigSaved, setIsConfigSaved] = useState(!!workout?.workout_config);

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

  const handleConfigSave = (config) => {
    setFormData(prev => ({ ...prev, workout_config: config }));
    setIsConfigSaved(true);
  };

  const handleEditConfig = () => {
    setIsConfigSaved(false);
  };

  const handlePlay = () => {
    if (formData.workout_config) {
      setShowPlayer(true);
    }
  };

  return (
    <>
      {showPlayer && formData.workout_config && (
        <WorkoutPlayer
          config={formData.workout_config}
          workoutName={formData.name}
          onClose={() => setShowPlayer(false)}
        />
      )}
      
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
              <Label className="text-gray-300">Workout Type *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  type="button"
                  onClick={() => {
                    handleChange('workout_type', 'whole_room_same');
                    setIsConfigSaved(false);
                  }}
                  className={`h-24 flex flex-col items-center justify-center gap-2 ${
                    formData.workout_type === 'whole_room_same'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                      : 'bg-gray-900 border border-gray-700 text-white hover:bg-gray-800'
                  }`}
                >
                  <Dumbbell className="w-6 h-6" />
                  <span className="font-bold">Whole Room - Same Exercise</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleChange('workout_type', 'whole_room_rotational')}
                  className={`h-24 flex flex-col items-center justify-center gap-2 ${
                    formData.workout_type === 'whole_room_rotational'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                      : 'bg-gray-900 border border-gray-700 text-white hover:bg-gray-800'
                  }`}
                  disabled
                >
                  <Dumbbell className="w-6 h-6" />
                  <span className="font-bold">Whole Room - Rotational</span>
                  <span className="text-xs">(Coming Soon)</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleChange('workout_type', 'stations')}
                  className={`h-24 flex flex-col items-center justify-center gap-2 ${
                    formData.workout_type === 'stations'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                      : 'bg-gray-900 border border-gray-700 text-white hover:bg-gray-800'
                  }`}
                  disabled
                >
                  <Dumbbell className="w-6 h-6" />
                  <span className="font-bold">Stations</span>
                  <span className="text-xs">(Coming Soon)</span>
                </Button>
              </div>
            </div>

            {/* Configuration panel */}
            {formData.workout_type === 'whole_room_same' && !isConfigSaved && (
              <WholeRoomSameExercisePanel 
                onSave={handleConfigSave}
                initialData={formData.workout_config}
              />
            )}

            {/* Config saved state with edit and play buttons */}
            {formData.workout_type === 'whole_room_same' && isConfigSaved && formData.workout_config && (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-white font-bold">Workout Configured</h3>
                      <p className="text-gray-400 text-sm">
                        {formData.workout_config.exercises.length} exercises • {formData.workout_config.sets} set(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleEditConfig}
                        variant="outline"
                        className="border-gray-600 text-white hover:bg-gray-800"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePlay}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
    </>
  );
}