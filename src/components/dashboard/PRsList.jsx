import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PRsList({ streakData, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <Flame className="w-6 h-6 text-orange-400" />
          Personal Records - Longest Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {streakData.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No active PR streaks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {streakData.map((streak, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-orange-400/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                    <Flame className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{streak.athleteName}</p>
                    <p className="text-sm text-gray-400">{streak.metricName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/50 font-bold text-lg">
                    {streak.streakCount} in a row
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}