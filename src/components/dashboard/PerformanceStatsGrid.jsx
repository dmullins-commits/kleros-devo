import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Flag, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PerformanceStatsGrid({ 
  prsInLastSession, 
  totalPRsThisMonth, 
  flaggedAthletes, 
  trendPercentage,
  trendMetricName,
  isLoading 
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-950 border border-gray-800">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-800 rounded w-24" />
                <div className="h-8 bg-gray-800 rounded w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-gradient-to-br from-green-950/30 via-gray-950 to-gray-950 border-2 border-green-500/30 hover:border-green-500/50 transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-green-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            PRs in Last Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-white mb-1">
            {prsInLastSession}
          </div>
          <p className="text-xs text-gray-400 font-semibold">
            {totalPRsThisMonth} PRs this month
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-950/30 via-gray-950 to-gray-950 border-2 border-red-500/30 hover:border-red-500/50 transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-red-300 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-white mb-1">
            {flaggedAthletes}
          </div>
          <p className="text-xs text-gray-400 font-semibold">
            Athletes outside 90% of PR
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-950/30 via-gray-950 to-gray-950 border-2 border-amber-500/30 hover:border-amber-500/50 transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-black mb-1 ${trendPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trendPercentage >= 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-400 font-semibold">
            {trendMetricName ? `${trendMetricName} vs previous session` : 'vs previous session'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}