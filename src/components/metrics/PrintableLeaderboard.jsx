import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Check, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PrintableLeaderboard({ open, onClose, maleLeaderboard, femaleLeaderboard, metric, testDate }) {
  const handlePrint = () => {
    window.print();
  };

  const renderLeaderboard = (leaderboardData, title) => {
    if (!leaderboardData || leaderboardData.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-black text-amber-400 mb-4 border-b-2 border-amber-400/50 pb-2">
          {title}
        </h2>
        <div className="space-y-2">
          {leaderboardData.map((item, index) => {
            const Icon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Award : null;
            const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-500';
            const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-2 border-yellow-400/50' : 
                            index === 1 ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/10 border-2 border-gray-400/50' : 
                            index === 2 ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-2 border-amber-500/50' : 
                            'bg-gray-900/50 border border-gray-700';

            return (
              <div key={item.athlete_id} className={`p-4 rounded-lg ${bgColor}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10">
                    {Icon ? (
                      <Icon className={`w-8 h-8 ${rankColor}`} />
                    ) : (
                      <span className={`text-xl font-black ${rankColor}`}>#{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-lg">{item.athlete_name}</p>
                      {item.is_new_pr && (
                        <>
                          <Check className="w-5 h-5 text-green-400" />
                          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
                            NEW PR!
                          </Badge>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 font-semibold">
                      Previous PR: {item.pr ? item.pr.toFixed(metric?.decimal_places ?? 2) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${index < 3 ? rankColor : 'text-white'}`}>
                      {item.current_value.toFixed(metric?.decimal_places ?? 2)}
                    </p>
                    <p className="text-xs text-gray-500">{metric?.unit}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-white text-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Session Leaderboard - {new Date(testDate).toLocaleDateString()}
            </div>
            <Button
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>

        <div className="print-content">
          <div className="mb-6 print:mb-8">
            <h1 className="text-3xl font-black text-amber-400 mb-2">
              PERFORMANCE LEADERBOARD
            </h1>
            <p className="text-gray-400 font-semibold">
              {metric?.name} ({metric?.unit}) - {new Date(testDate).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderLeaderboard(maleLeaderboard, "MALE ATHLETES")}
            {renderLeaderboard(femaleLeaderboard, "FEMALE ATHLETES")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}