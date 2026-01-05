import React, { useState, useEffect, useMemo } from "react";
import { Workout, Team, Athlete } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/components/TeamContext";

import WorkoutsList from "../components/workouts/WorkoutsList";
import WorkoutForm from "../components/workouts/WorkoutForm";

export default function Workouts() {
  const { selectedOrganization, filteredTeams } = useTeam();
  const [workouts, setWorkouts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const formRef = React.useRef(null);

  const teamIds = useMemo(() => filteredTeams.map(t => t.id), [filteredTeams]);

  useEffect(() => {
    loadData();
  }, [selectedOrganization?.id]);

  useEffect(() => {
    if (showWorkoutForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showWorkoutForm]);

  const loadData = async () => {
    if (!selectedOrganization) return;
    
    setIsLoading(true);
    try {
      const [workoutsData, teamsData, athletesData] = await Promise.all([
        Workout.list(),
        Team.list(),
        Athlete.list()
      ]);
      
      // Filter teams by org
      const filteredTeamsData = teamsData.filter(t => 
        t.organization_id === selectedOrganization.id
      );
      
      // Filter athletes by org teams
      const filteredAthletes = athletesData.filter(a =>
        a.team_ids?.some(tid => teamIds.includes(tid))
      );
      
      // Filter workouts: show all if no teams assigned, or if assigned to current org's teams
      const orgTeamIds = filteredTeamsData.map(t => t.id);
      const filteredWorkouts = workoutsData.filter(w =>
        !w.assigned_teams?.length || 
        w.assigned_teams.some(tid => orgTeamIds.includes(tid))
      );
      
      setWorkouts(filteredWorkouts);
      setTeams(filteredTeamsData);
      setAthletes(filteredAthletes);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (workoutData) => {
    console.log('Saving workout data:', workoutData); // Debug log
    if (editingWorkout) {
      await Workout.update(editingWorkout.id, workoutData);
    } else {
      await Workout.create(workoutData);
    }
    setShowWorkoutForm(false);
    setEditingWorkout(null);
    loadData();
  };

  const handleDelete = async (workoutId) => {
    try {
      await Workout.delete(workoutId);
      loadData();
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
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
                  {workouts.length} workouts
                </Badge>
              </div>
              <Button 
                onClick={() => setShowWorkoutForm(!showWorkoutForm)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Workout
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {showWorkoutForm && (
            <div ref={formRef}>
              <WorkoutForm
                workout={editingWorkout}
                teams={teams}
                athletes={athletes}
                savedWorkouts={workouts}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowWorkoutForm(false);
                  setEditingWorkout(null);
                }}
              />
            </div>
          )}

          <WorkoutsList 
            workouts={workouts}
            isLoading={isLoading}
            onEdit={(workout) => {
              setEditingWorkout(workout);
              setShowWorkoutForm(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}