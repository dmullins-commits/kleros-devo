import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { WorkoutCycle } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';

// A full implementation would be very complex, involving drag-and-drop, etc.
// This is a simplified version to demonstrate the structure.
export default function CycleBuilder({ cycles, workouts, teams, athletes, isLoading, onUpdate }) {

  const [showCycleForm, setShowCycleForm] = useState(false);
  
  const createCycle = async () => {
    // Dummy cycle for demonstration
    await WorkoutCycle.create({
      name: "New Prep Phase Cycle",
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setDate(new Date().getDate() + 28)).toISOString().split('T')[0],
      phase: "preparation",
      weeks: []
    });
    onUpdate();
  };
  
  const deleteCycle = async (cycleId) => {
    await WorkoutCycle.delete(cycleId);
    onUpdate();
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <Calendar className="w-6 h-6 text-yellow-400" />
          Training Cycle Builder
        </CardTitle>
        <Button onClick={createCycle} className="bg-yellow-400 text-black hover:bg-yellow-500">
            <Plus className="w-4 h-4 mr-2"/>
            New Cycle
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
           <div className="space-y-4">
            {Array(2).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full bg-gray-800 rounded-lg" />
            ))}
          </div>
        ) : cycles.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">No training cycles</h3>
            <p className="text-gray-500">Create a new cycle to start programming workouts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cycles.map(cycle => (
              <Card key={cycle.id} className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row justify-between items-start">
                  <div>
                    <h3 className="text-white font-bold">{cycle.name}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                    </p>
                  </div>
                   <div className="flex gap-2">
                      <Button variant="ghost" size="icon"><Edit className="w-4 h-4 text-gray-400 hover:text-yellow-400"/></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCycle(cycle.id)}><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500"/></Button>
                   </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 italic">Cycle programming details would be displayed here.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}