import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FlaggedAthletesList({ flaggedData, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <Flag className="w-6 h-6 text-red-400" />
          Flagged Athletes - Performance Below 90%
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {flaggedData.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No flagged athletes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedData.map((athlete, index) => (
              <div key={index} className="p-4 bg-gray-900/50 border border-red-800/30 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                      <Flag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{athlete.athleteName}</p>
                      <p className="text-sm text-gray-400">{athlete.metricName}</p>
                    </div>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">
                    Under 90%
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">PR</p>
                    <p className="text-white font-bold">{athlete.pr} {athlete.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">90% Threshold</p>
                    <p className="text-amber-400 font-bold">{athlete.ninetyPercent} {athlete.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Latest</p>
                    <p className="text-red-400 font-bold">{athlete.latestValue} {athlete.unit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}