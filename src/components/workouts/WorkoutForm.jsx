import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Dumbbell, Edit, Play, FolderOpen } from "lucide-react";
import WholeRoomSameExercisePanel from "./WholeRoomSameExercisePanel";
import WholeRoomRotationalPanel from "./WholeRoomRotationalPanel";
import StationsPanel from "./StationsPanel";
import GetItDonePanel from "./GetItDonePanel";
import WorkoutPlayer from "./WorkoutPlayer";
import RotationalWorkoutPlayer from "./RotationalWorkoutPlayer";
import StationsWorkoutPlayer from "./StationsWorkoutPlayer";
import GetItDonePlayer from "./GetItDonePlayer";
import MultiTimerPlayer from "./MultiTimerPlayer";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WorkoutForm({ workout, teams, athletes, onSubmit, onCancel, savedWorkouts = [] }) {
  const [formData, setFormData] = useState(workout || {
    name: '',
    description: '',
    workout_type: 'multi_timer',
    workout_config: null,
    timer_sections: [],
    assigned_teams: teams.length > 0 ? [teams[0].id] : [],
    assigned_athletes: []
  });
  const [showPlayer, setShowPlayer] = useState(false);
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  const [currentTimerSection, setCurrentTimerSection] = useState(null);
  const [editingTimerIndex, setEditingTimerIndex] = useState(null);
  const [showSavedSegments, setShowSavedSegments] = useState(false);
  const [selectedSavedWorkout, setSelectedSavedWorkout] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting workout with config:', formData);
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
    if (formData.timer_sections?.length > 0) {
      setShowPlayer(true);
    }
  };

  const handleAddTimer = () => {
    setCurrentTimerSection({
      name: '',
      timer_type: '',
      config: null
    });
  };

  const handleSaveTimerSection = (section) => {
    const updatedSections = [...(formData.timer_sections || [])];
    if (editingTimerIndex !== null) {
      updatedSections[editingTimerIndex] = section;
    } else {
      updatedSections.push(section);
    }
    setFormData(prev => ({ ...prev, timer_sections: updatedSections }));
    setCurrentTimerSection(null);
    setEditingTimerIndex(null);
    setIsConfigSaved(false);
  };

  const handleEditTimer = (index) => {
    setCurrentTimerSection(formData.timer_sections[index]);
    setEditingTimerIndex(index);
  };

  const handleDeleteTimer = (index) => {
    setFormData(prev => ({
      ...prev,
      timer_sections: prev.timer_sections.filter((_, i) => i !== index)
    }));
  };

  const handleAddSavedSegment = (savedWorkout) => {
    setSelectedSavedWorkout(savedWorkout);
  };

  const confirmAddSavedSegment = () => {
    if (selectedSavedWorkout) {
      // Add all timer sections from the saved workout
      if (selectedSavedWorkout.timer_sections?.length > 0) {
        setFormData(prev => ({
          ...prev,
          timer_sections: [...prev.timer_sections, ...selectedSavedWorkout.timer_sections]
        }));
      } else if (selectedSavedWorkout.workout_config) {
        // If it's a legacy single-config workout, convert it to a timer section
        const newSection = {
          name: selectedSavedWorkout.name,
          timer_type: selectedSavedWorkout.workout_type || 'whole_room_same',
          config: selectedSavedWorkout.workout_config
        };
        setFormData(prev => ({
          ...prev,
          timer_sections: [...prev.timer_sections, newSection]
        }));
      }
    }
    setSelectedSavedWorkout(null);
    setShowSavedSegments(false);
  };

  const handleTimerSectionConfigSave = (config) => {
    setCurrentTimerSection(prev => ({ ...prev, config }));
    setIsConfigSaved(true);
  };

  const handleSaveCurrentSection = () => {
    if (currentTimerSection && currentTimerSection.name && currentTimerSection.config) {
      handleSaveTimerSection(currentTimerSection);
    }
  };

  return (
    <>
      {showPlayer && formData.timer_sections?.length > 0 && (
        <MultiTimerPlayer
          timerSections={formData.timer_sections}
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

            {/* Timer Sections Configuration */}
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold">Workout Timers</h3>
                </div>

                  {formData.timer_sections?.length > 0 && !currentTimerSection && (
                    <div className="space-y-2">
                      {formData.timer_sections.map((section, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                          <GripVertical className="w-5 h-5 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-white font-bold">{section.name}</p>
                            <p className="text-gray-400 text-sm capitalize">{section.timer_type.replace(/_/g, ' ')}</p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleEditTimer(index)}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDeleteTimer(index)}
                            variant="outline"
                            size="sm"
                            className="border-red-700 text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!currentTimerSection && formData.timer_sections?.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">No timers added yet</p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          type="button"
                          onClick={handleAddTimer}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Timer
                        </Button>
                        {savedWorkouts.length > 0 && (
                          <Button
                            type="button"
                            onClick={() => setShowSavedSegments(true)}
                            variant="outline"
                            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Add Saved Segment
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {currentTimerSection && (
                    <div className="space-y-4 p-4 border border-gray-700 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Section Name</Label>
                        <Input
                          placeholder="e.g., Warmup, Main Workout, Cool Down"
                          value={currentTimerSection.name}
                          onChange={(e) => setCurrentTimerSection(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Timer Type</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            onClick={() => {
                              setCurrentTimerSection(prev => ({ ...prev, timer_type: 'whole_room_same', config: null }));
                              setIsConfigSaved(false);
                            }}
                            className={`h-16 ${
                              currentTimerSection.timer_type === 'whole_room_same'
                                ? 'bg-yellow-400 text-black'
                                : 'bg-gray-800 text-white'
                            }`}
                          >
                            Same Exercise
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setCurrentTimerSection(prev => ({ ...prev, timer_type: 'whole_room_rotational', config: null }));
                              setIsConfigSaved(false);
                            }}
                            className={`h-16 ${
                              currentTimerSection.timer_type === 'whole_room_rotational'
                                ? 'bg-yellow-400 text-black'
                                : 'bg-gray-800 text-white'
                            }`}
                          >
                            Rotational
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setCurrentTimerSection(prev => ({ ...prev, timer_type: 'stations', config: null }));
                              setIsConfigSaved(false);
                            }}
                            className={`h-16 ${
                              currentTimerSection.timer_type === 'stations'
                                ? 'bg-yellow-400 text-black'
                                : 'bg-gray-800 text-white'
                            }`}
                          >
                            Stations
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setCurrentTimerSection(prev => ({ ...prev, timer_type: 'get_it_done', config: null }));
                              setIsConfigSaved(false);
                            }}
                            className={`h-16 ${
                              currentTimerSection.timer_type === 'get_it_done'
                                ? 'bg-yellow-400 text-black'
                                : 'bg-gray-800 text-white'
                            }`}
                          >
                            Get It Done
                          </Button>
                        </div>
                      </div>

                      {currentTimerSection.timer_type === 'whole_room_same' && !isConfigSaved && (
                        <WholeRoomSameExercisePanel 
                          onSave={handleTimerSectionConfigSave}
                          initialData={currentTimerSection.config}
                        />
                      )}

                      {currentTimerSection.timer_type === 'whole_room_rotational' && !isConfigSaved && (
                        <WholeRoomRotationalPanel 
                          onSave={handleTimerSectionConfigSave}
                          initialData={currentTimerSection.config}
                        />
                      )}

                      {currentTimerSection.timer_type === 'stations' && !isConfigSaved && (
                        <StationsPanel 
                          onSave={handleTimerSectionConfigSave}
                          initialData={currentTimerSection.config}
                        />
                      )}

                      {currentTimerSection.timer_type === 'get_it_done' && !isConfigSaved && (
                        <GetItDonePanel 
                          onSave={handleTimerSectionConfigSave}
                          initialData={currentTimerSection.config}
                        />
                      )}

                      {isConfigSaved && currentTimerSection.config && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleSaveCurrentSection}
                            disabled={!currentTimerSection.name}
                            className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Section {!currentTimerSection.name && '(Enter Section Name)'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setCurrentTimerSection(null);
                              setEditingTimerIndex(null);
                              setIsConfigSaved(false);
                            }}
                            variant="outline"
                            className="border-gray-600 text-white"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                {formData.timer_sections?.length > 0 && !currentTimerSection && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleAddTimer}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold border border-gray-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Timer
                      </Button>
                      {savedWorkouts.length > 0 && (
                        <Button
                          type="button"
                          onClick={() => setShowSavedSegments(true)}
                          variant="outline"
                          className="flex-1 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Add Saved Segment
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={handlePlay}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black text-lg py-6"
                      >
                        <Save className="w-5 h-5 mr-2" />
                        Save Workout Configuration
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {formData.timer_sections?.length === 0 && (
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
                <Button type="button" variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>

    {/* Saved Segments Modal */}
    <AlertDialog open={showSavedSegments} onOpenChange={setShowSavedSegments}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-yellow-400" />
            Add Saved Segment
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Select a saved workout to add its timers to your current workout.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {savedWorkouts.filter(w => w.id !== workout?.id).map((savedWorkout) => (
            <div
              key={savedWorkout.id}
              onClick={() => handleAddSavedSegment(savedWorkout)}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-yellow-400 cursor-pointer transition-colors"
            >
              <h4 className="text-white font-bold">{savedWorkout.name}</h4>
              <p className="text-gray-400 text-sm">{savedWorkout.description}</p>
              <p className="text-yellow-400 text-xs mt-1">
                {savedWorkout.timer_sections?.length > 0 
                  ? `${savedWorkout.timer_sections.length} timer${savedWorkout.timer_sections.length > 1 ? 's' : ''}`
                  : savedWorkout.workout_config ? '1 timer' : 'No timers'
                }
              </p>
            </div>
          ))}
          {savedWorkouts.filter(w => w.id !== workout?.id).length === 0 && (
            <p className="text-gray-500 text-center py-8">No other saved workouts available</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Confirmation Dialog */}
    <AlertDialog open={!!selectedSavedWorkout} onOpenChange={() => setSelectedSavedWorkout(null)}>
      <AlertDialogContent className="bg-gray-900 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Add Saved Segment?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to add "{selectedSavedWorkout?.name}" to your current workout?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            No
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmAddSavedSegment}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}