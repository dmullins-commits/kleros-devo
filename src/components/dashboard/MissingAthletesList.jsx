import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserX, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MissingAthletesList({ missingAthletes, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <UserX className="w-6 h-6 text-blue-400" />
          Athletes Missing from Latest Session
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {missingAthletes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">All athletes participated in the latest session</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {missingAthletes.map((athlete, index) => (
              <div key={index} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-blue-400/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserX className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{athlete.name}</p>
                    {athlete.team && (
                      <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs mt-1">
                        {athlete.team}
                      </Badge>
                    )}
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