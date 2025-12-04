import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopPerformers({ athletes, records, isLoading }) {
  const getTopPerformers = () => {
    const athleteRecords = {};
    records.forEach(record => {
      if (!athleteRecords[record.athlete_id]) {
        athleteRecords[record.athlete_id] = [];
      }
      athleteRecords[record.athlete_id].push(record);
    });

    return Object.entries(athleteRecords)
      .map(([athleteId, records]) => {
        const athlete = athletes.find(a => a.id === athleteId);
        return {
          athlete,
          recordCount: records.length,
          avgValue: records.reduce((sum, r) => sum + r.value, 0) / records.length
        };
      })
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 5);
  };

  const rankIcons = [Crown, Medal, Award];
  const rankColors = [
    "text-yellow-400 bg-yellow-400/20",
    "text-gray-300 bg-gray-300/20", 
    "text-amber-600 bg-amber-600/20"
  ];

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <Crown className="w-4 h-4 text-black" />
          </div>
          Elite Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full bg-gray-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32 bg-gray-800" />
                  <Skeleton className="h-3 w-20 bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {getTopPerformers().map((performer, index) => {
              const RankIcon = rankIcons[Math.min(index, 2)] || Award;
              const colorClass = rankColors[Math.min(index, 2)] || "text-gray-400 bg-gray-400/20";
              
              return (
                <div key={performer.athlete?.id || index} className="flex items-center gap-4 p-4 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all duration-200">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <RankIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {performer.athlete ? `${performer.athlete.first_name} ${performer.athlete.last_name}` : 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                        {performer.recordCount} records
                      </Badge>
                      <span className="text-gray-500 text-xs">
                        Avg: {performer.avgValue.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold text-lg">#{index + 1}</div>
                  </div>
                </div>
              );
            })}
            
            {getTopPerformers().length === 0 && (
              <div className="text-center py-8">
                <Crown className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No performance data yet</p>
                <p className="text-gray-600 text-sm">Start tracking metrics to see top performers</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}