import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, CalendarCheck, AlertTriangle, CheckCircle } from "lucide-react";

export default function YesterdayOverview({ 
  overviewData, 
  incompleteWorkouts, 
  prsInLastSession, 
  athletesInLastSession, 
  prsByTeam, 
  prsByClass, 
  latestMetricName,
  groupAveragesBefore,
  groupAveragesAfter,
  isLoading 
}) {
  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-400" />,
    down: <TrendingDown className="w-4 h-4 text-red-400" />,
    same: <Minus className="w-4 h-4 text-gray-400" />,
  };

  const trendColors = {
    up: "bg-green-400/20 text-green-400 border-green-400/30",
    down: "bg-red-400/20 text-red-400 border-red-400/30",
    same: "bg-gray-400/20 text-gray-400 border-gray-400/30",
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-black" />
            </div>
            Latest Session
          </div>
          {athletesInLastSession > 0 && (
            <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-lg px-3 py-1">
              PRs: {prsInLastSession} / {athletesInLastSession}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      {/* PR Breakdown by Team and Class */}
      {((prsByTeam && prsByTeam.length > 0) || (prsByClass && prsByClass.length > 0)) && (
        <div className="p-4 border-b border-gray-800 bg-gray-900/30">
          <div className="grid md:grid-cols-2 gap-4">
            {prsByTeam && prsByTeam.length > 0 && (
              <div>
                <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">By Team</h4>
                <div className="space-y-1">
                  {prsByTeam.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{item.name}</span>
                      <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-xs">
                        {item.prs} / {item.athletes}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {prsByClass && prsByClass.length > 0 && (
              <div>
                <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">By Class Period</h4>
                <div className="space-y-1">
                  {prsByClass.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{item.name}</span>
                      <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-xs">
                        {item.prs} / {item.athletes}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <CardContent className="p-0">
        {/* Incomplete Workouts Section */}
        {incompleteWorkouts && incompleteWorkouts.length > 0 && (
          <div className="border-b border-gray-800">
            <div className="p-4 bg-red-950/20 border-b border-red-800/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-red-400 font-semibold">Incomplete Workouts</h3>
                <Badge className="bg-red-400/20 text-red-400 border-red-400/30">
                  {incompleteWorkouts.length}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm">Athletes who didn't complete their programmed repetitions</p>
            </div>
            <div className="divide-y divide-gray-800">
              {incompleteWorkouts.map((session, index) => (
                <div key={index} className="p-4 hover:bg-gray-900/50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{session.athleteName}</p>
                      <p className="text-gray-400 text-sm">{session.exercise_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">
                        {session.completed_reps}/{session.programmed_reps} reps
                      </div>
                      <Badge className="bg-red-400/20 text-red-400 border-red-400/30">
                        {Math.round(session.completion_percentage)}% complete
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Performance Data */}
        <div className="divide-y divide-gray-800">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-6 flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48 bg-gray-800" />
                  <Skeleton className="h-3 w-32 bg-gray-800" />
                </div>
                <Skeleton className="h-6 w-16 bg-gray-800" />
              </div>
            ))
          ) : overviewData.length === 0 && (!incompleteWorkouts || incompleteWorkouts.length === 0) ? (
            <div className="p-12 text-center">
              <CalendarCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No performance data from yesterday</p>
              <p className="text-gray-600 text-sm">Tracked metrics and workouts will appear here</p>
            </div>
          ) : (
            <>
              {overviewData.length > 0 && (
                <div className="p-4 bg-gray-900/20 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="text-green-400 font-semibold">Performance Metrics</h3>
                  </div>
                </div>
              )}
              {overviewData.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-900/50 transition-colors duration-200">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">
                        {item.athleteName} - <span className="text-gray-400">{item.metricName}</span>
                      </p>
                      <p className="text-yellow-400 font-bold text-lg">
                        {item.value}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={trendColors[item.trend]}>
                        {trendIcons[item.trend]}
                        <span className="ml-1">{item.change !== 0 ? item.change.toFixed(1) : 'No change'}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}