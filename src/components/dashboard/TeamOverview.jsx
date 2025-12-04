import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamOverview({ teams, athletes, isLoading }) {
  const getTeamStats = (team) => {
    const teamAthletes = athletes.filter(a => a.team_ids?.includes(team.id));
    const activeAthletes = teamAthletes.filter(a => a.status === 'active' || !a.status).length;
    const injuredAthletes = teamAthletes.filter(a => a.status === 'injured').length;
    
    return {
      total: teamAthletes.length,
      active: activeAthletes,
      injured: injuredAthletes
    };
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          Team Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-4 border border-gray-800 rounded-lg">
                <Skeleton className="h-5 w-32 mb-3 bg-gray-800" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 bg-gray-800" />
                  <Skeleton className="h-6 w-16 bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No teams created yet</p>
            <p className="text-gray-600 text-sm">Create teams to organize your athletes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => {
              const stats = getTeamStats(team);
              return (
                <div key={team.id} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{team.name}</h3>
                      <p className="text-gray-400 text-sm">{team.sport}</p>
                    </div>
                    <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                      {team.season || 'Active'}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">{stats.total} total</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">{stats.active} active</span>
                    </div>
                    {stats.injured > 0 && (
                      <div className="flex items-center gap-1">
                        <UserX className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm">{stats.injured} injured</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}