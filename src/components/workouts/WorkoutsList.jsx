import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Dumbbell, Play, Trash2, FileText, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutPlayer from "./WorkoutPlayer";
import RotationalWorkoutPlayer from "./RotationalWorkoutPlayer";
import StationsWorkoutPlayer from "./StationsWorkoutPlayer";
import MultiTimerPlayer from "./MultiTimerPlayer";
import WorkoutOverviewModal from "./WorkoutOverviewModal";
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

export default function WorkoutsList({ workouts, isLoading, onEdit, onDelete, onDuplicate }) {
  const [deleteWorkout, setDeleteWorkout] = useState(null);
  const [playingWorkout, setPlayingWorkout] = useState(null);
  const [overviewWorkout, setOverviewWorkout] = useState(null);

  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-6 space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-gray-800 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      {playingWorkout && playingWorkout.timer_sections?.length > 0 && (
        <MultiTimerPlayer
          timerSections={playingWorkout.timer_sections}
          workoutName={playingWorkout.name}
          onClose={() => setPlayingWorkout(null)}
        />
      )}

      {playingWorkout && !playingWorkout.timer_sections && playingWorkout.workout_type === 'whole_room_same' && (
        <WorkoutPlayer
          config={playingWorkout.workout_config}
          workoutName={playingWorkout.name}
          onClose={() => setPlayingWorkout(null)}
        />
      )}

      {playingWorkout && !playingWorkout.timer_sections && playingWorkout.workout_type === 'whole_room_rotational' && (
        <RotationalWorkoutPlayer
          config={playingWorkout.workout_config}
          workoutName={playingWorkout.name}
          onClose={() => setPlayingWorkout(null)}
        />
      )}

      {playingWorkout && !playingWorkout.timer_sections && playingWorkout.workout_type === 'stations' && (
        <StationsWorkoutPlayer
          config={playingWorkout.workout_config}
          workoutName={playingWorkout.name}
          onClose={() => setPlayingWorkout(null)}
        />
      )}
      
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            <AnimatePresence>
            {workouts.map((workout) => (
              <motion.div
                key={workout.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-300 group">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">{workout.name}</h3>
                        <p className="text-gray-400 text-sm mb-3">{workout.description}</p>
                        
                        <div className="flex gap-2 flex-wrap items-center">
                          {workout.timer_sections?.length > 0 ? (
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              <Dumbbell className="w-3 h-3 mr-1" />
                              {workout.timer_sections.length} timer{workout.timer_sections.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-600 text-gray-300 capitalize">
                              {workout.workout_type?.replace(/_/g, ' ') || 'Custom'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {(workout.workout_config || workout.timer_sections?.length > 0) && (
                          <Button
                            onClick={() => setPlayingWorkout(workout)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                        )}
                        {workout.timer_sections?.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => setOverviewWorkout(workout)}
                            className="border-gray-600 text-black bg-white hover:bg-gray-200"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Overview
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => onDuplicate(workout)}
                          className="border-gray-600 text-black bg-white hover:bg-gray-200"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onEdit(workout)}
                          className="border-gray-600 text-black bg-white hover:bg-gray-200"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteWorkout(workout)}
                          className="border-red-700 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {workouts.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-bold text-xl mb-2">No workouts created yet</h3>
              <p className="text-gray-500">Create your first workout to get started</p>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      <WorkoutOverviewModal
        workout={overviewWorkout}
        open={!!overviewWorkout}
        onClose={() => setOverviewWorkout(null)}
      />

      <AlertDialog open={!!deleteWorkout} onOpenChange={() => setDeleteWorkout(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Workout</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{deleteWorkout?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteWorkout && onDelete) {
                  onDelete(deleteWorkout.id);
                }
                setDeleteWorkout(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}