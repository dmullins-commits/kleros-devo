import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Trophy, Target } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity({ records, athletes, isLoading }) {
  const getAthleteName = (athleteId) => {
    const athlete = athletes.find(a => a.id === athleteId);
    return athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown Athlete';
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-black" />
          </div>
          Recent Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-800">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-6 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full bg-gray-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48 bg-gray-800" />
                  <Skeleton className="h-3 w-24 bg-gray-800" />
                </div>
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No recent activity</p>
              <p className="text-gray-600 text-sm">Start tracking metrics to see activity here</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.id} className="p-6 hover:bg-gray-900/50 transition-colors duration-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full flex items-center justify-center border-2 border-gray-600">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {getAthleteName(record.athlete_id)} recorded new metric
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-yellow-400/30 text-yellow-400 bg-yellow-400/10">
                        {record.value} units
                      </Badge>
                      <span className="text-gray-500 text-sm">
                        {record.created_date && !isNaN(new Date(record.created_date).getTime()) 
                          ? format(new Date(record.created_date), "MMM d, h:mm a")
                          : 'Unknown date'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}