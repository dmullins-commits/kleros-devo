import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Crown, Dumbbell } from "lucide-react";

export default function WorkoutOverviewModal({ workout, open, onClose }) {
  if (!workout) return null;

  const renderTimerSection = (section, index) => {
    const { name, timer_type, config } = section;

    if (timer_type === 'stations') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#d4af37] to-[#a67c52] rounded-full flex items-center justify-center">
              <span className="text-black font-black text-sm">{index + 1}</span>
            </div>
            <h3 className="text-lg font-black text-[#d4af37] tracking-wide uppercase">{name}</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {config.stations?.map((station, stationIdx) => (
              <div key={stationIdx} className="bg-black/40 border border-[#c9a961]/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#c9a961]/20">
                  <Crown className="w-3 h-3 text-[#d4af37]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Station {stationIdx + 1}</h4>
                </div>
                <div className="space-y-1.5">
                  {station.exercises?.map((ex, exIdx) => (
                    <div key={exIdx}>
                      <p className="text-sm font-bold text-white">{ex.name}</p>
                      <p className="text-xs text-[#c9a961]">{config.sets}×{ex.reps}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (timer_type === 'whole_room_same' || timer_type === 'whole_room_rotational') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#d4af37] to-[#a67c52] rounded-full flex items-center justify-center">
              <span className="text-black font-black text-sm">{index + 1}</span>
            </div>
            <h3 className="text-lg font-black text-[#d4af37] tracking-wide uppercase">{name}</h3>
          </div>
          <div className="bg-black/40 border border-[#c9a961]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-[#d4af37]" />
              <span className="text-sm font-black text-white uppercase tracking-wider">{config.sets} Sets</span>
            </div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2">
              {config.exercises?.map((ex, exIdx) => (
                <div key={exIdx} className="flex items-baseline gap-2">
                  <span className="text-[#c9a961] font-black text-xs">{exIdx + 1}.</span>
                  <span className="text-white font-bold text-sm">{ex.name}</span>
                  <span className="text-[#c9a961] text-xs ml-auto">{ex.reps}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (timer_type === 'get_it_done') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#d4af37] to-[#a67c52] rounded-full flex items-center justify-center">
              <span className="text-black font-black text-sm">{index + 1}</span>
            </div>
            <h3 className="text-lg font-black text-[#d4af37] tracking-wide uppercase">{name}</h3>
            <span className="text-[#c9a961] text-sm font-bold ml-auto">
              {config.totalTime?.minutes}:{String(config.totalTime?.seconds || 0).padStart(2, '0')}
            </span>
          </div>
          <div className="bg-black/40 border border-[#c9a961]/30 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-x-6 gap-y-2">
              {config.exercises?.map((ex, exIdx) => (
                <div key={exIdx} className="flex items-baseline gap-2">
                  <span className="text-[#c9a961] font-black text-xs">{exIdx + 1}.</span>
                  <span className="text-white font-bold text-sm">{ex.name}</span>
                  <span className="text-[#c9a961] text-xs ml-auto">{ex.sets}×{ex.reps}</span>
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
      <DialogContent className="bg-gradient-to-br from-gray-950 via-gray-900 to-black border-2 border-[#c9a961]/50 text-white max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#c9a961]/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative px-8 py-6 border-b border-[#c9a961]/30 bg-black/40">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-[#d4af37]" />
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide uppercase">{workout.name}</h2>
                {workout.description && (
                  <p className="text-sm text-[#c9a961] mt-1">{workout.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {workout.timer_sections?.length > 0 ? (
              workout.timer_sections.map((section, index) => renderTimerSection(section, index))
            ) : (
              <div className="text-[#c9a961] text-center py-12">No workout configuration available</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}