import React, { useState, useEffect } from "react";
import { Workout, WorkoutCycle, Team, Athlete } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Dumbbell, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import WorkoutsList from "../components/workouts/WorkoutsList";
import WorkoutForm from "../components/workouts/WorkoutForm";
import CycleBuilder from "../components/workouts/CycleBuilder";

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workoutsData, cyclesData, teamsData, athletesData] = await Promise.all([
        Workout.list(),
        WorkoutCycle.list(),
        Team.list(),
        Athlete.list()
      ]);
      setWorkouts(workoutsData);
      setCycles(cyclesData);
      setTeams(teamsData);
      setAthletes(athletesData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (workoutData) => {
    if (editingWorkout) {
      await Workout.update(editingWorkout.id, workoutData);
    } else {
      await Workout.create(workoutData);
    }
    setShowWorkoutForm(false);
    setEditingWorkout(null);
    loadData();
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-gray-950 to-gray-900 border border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-yellow-600/5" />
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  Workout Builder
                </h1>
                <p className="text-gray-400 font-medium">
                  Create and program training sessions
                </p>
                <Badge className="mt-2 bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                  {workouts.length} workouts • {cycles.length} cycles
                </Badge>
              </div>
              <Button 
                onClick={() => setShowWorkoutForm(!showWorkoutForm)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Workout
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="workouts" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 bg-gray-950 border border-gray-800">
            <TabsTrigger value="workouts" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              <Dumbbell className="w-4 h-4 mr-2" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="cycles" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              <Calendar className="w-4 h-4 mr-2" />
              Training Cycles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="space-y-8">
            {showWorkoutForm && (
              <WorkoutForm
                workout={editingWorkout}
                teams={teams}
                athletes={athletes}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowWorkoutForm(false);
                  setEditingWorkout(null);
                }}
              />
            )}

            <WorkoutsList 
              workouts={workouts}
              isLoading={isLoading}
              onEdit={(workout) => {
                setEditingWorkout(workout);
                setShowWorkoutForm(true);
              }}
            />
          </TabsContent>

          <TabsContent value="cycles">
            <CycleBuilder 
              cycles={cycles}
              workouts={workouts}
              teams={teams}
              athletes={athletes}
              isLoading={isLoading}
              onUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}