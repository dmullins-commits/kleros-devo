import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Dumbbell, Zap, ListChecks } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutsList({ workouts, isLoading, onEdit }) {
  const difficultyColors = {
    beginner: "bg-green-400/20 text-green-400",
    intermediate: "bg-yellow-400/20 text-yellow-400",
    advanced: "bg-orange-400/20 text-orange-400",
    elite: "bg-red-400/20 text-red-400",
  };

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
                          <Badge className={difficultyColors[workout.difficulty] || 'bg-gray-400/20 text-gray-400'}>
                            {workout.difficulty}
                          </Badge>
                          <Badge variant="outline" className="border-gray-600 text-gray-300 capitalize">
                            {workout.category?.replace('_', ' ')}
                          </Badge>
                           <Badge variant="outline" className="border-gray-600 text-gray-300">
                            <ListChecks className="w-3 h-3 mr-1" />
                            {workout.exercises.length} exercises
                          </Badge>
                          {workout.vbt_compatible && (
                            <Badge className="bg-blue-400/20 text-blue-400 border border-blue-400/30">
                              <Zap className="w-3 h-3 mr-1" /> VBT Ready
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(workout)}
                        className="text-gray-400 hover:text-yellow-400 hover:bg-gray-800"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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
  );
}