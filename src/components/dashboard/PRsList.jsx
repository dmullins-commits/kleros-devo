import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PRsList({ prsData, isLoading }) {
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
          <Trophy className="w-6 h-6 text-yellow-400" />
          Personal Records - Latest Session
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {prsData.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No PRs set in the latest session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prsData.map((pr, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-yellow-400/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{pr.athleteName}</p>
                    <p className="text-sm text-gray-400">{pr.metricName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 font-bold">
                    +{pr.improvement} {pr.unit}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {pr.previousPR} → {pr.newPR}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}