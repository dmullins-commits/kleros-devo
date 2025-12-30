import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function WorkoutOverviewModal({ workout, open, onClose }) {
  if (!workout) return null;

  const renderTimerSection = (section, index) => {
    const { name, timer_type, config } = section;

    if (timer_type === 'stations') {
      return (
        <div key={index} className="space-y-4">
          <h3 className="text-2xl font-bold text-yellow-400">{name}</h3>
          <div className="flex gap-6 flex-wrap">
            {config.stations?.map((station, stationIdx) => (
              <div key={stationIdx} className="bg-gray-800 p-4 rounded-lg min-w-[250px]">
                <h4 className="text-xl font-bold text-white mb-3">Station {stationIdx + 1}</h4>
                <div className="space-y-2">
                  {station.exercises?.map((ex, exIdx) => (
                    <div key={exIdx} className="text-gray-300">
                      <p className="font-semibold">{ex.name}</p>
                      <p className="text-sm text-gray-400">
                        {config.sets} sets × {ex.reps} reps
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (timer_type === 'whole_room_same') {
      return (
        <div key={index} className="space-y-4">
          <h3 className="text-2xl font-bold text-yellow-400">{name}</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-white mb-2"><span className="font-bold">Sets:</span> {config.sets}</p>
            <div className="space-y-2">
              {config.exercises?.map((ex, exIdx) => (
                <div key={exIdx} className="text-gray-300">
                  <p className="font-semibold">{ex.name}</p>
                  <p className="text-sm text-gray-400">{ex.reps} reps</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (timer_type === 'whole_room_rotational') {
      return (
        <div key={index} className="space-y-4">
          <h3 className="text-2xl font-bold text-yellow-400">{name}</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-white mb-2"><span className="font-bold">Sets:</span> {config.sets}</p>
            <div className="space-y-2">
              {config.exercises?.map((ex, exIdx) => (
                <div key={exIdx} className="text-gray-300">
                  <p className="font-semibold">{ex.name}</p>
                  <p className="text-sm text-gray-400">{ex.reps} reps</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (timer_type === 'get_it_done') {
      return (
        <div key={index} className="space-y-4">
          <h3 className="text-2xl font-bold text-yellow-400">{name}</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-white mb-2">
              <span className="font-bold">Total Time:</span> {config.totalTime?.minutes}:{String(config.totalTime?.seconds || 0).padStart(2, '0')}
            </p>
            <div className="space-y-2">
              {config.exercises?.map((ex, exIdx) => (
                <div key={exIdx} className="text-gray-300">
                  <p className="font-semibold">{ex.name}</p>
                  <p className="text-sm text-gray-400">
                    {ex.sets} sets × {ex.reps} reps
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-white">{workout.name}</DialogTitle>
          {workout.description && (
            <p className="text-gray-400">{workout.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {workout.timer_sections?.length > 0 ? (
            workout.timer_sections.map((section, index) => renderTimerSection(section, index))
          ) : (
            <div className="text-gray-400">No workout configuration available</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}