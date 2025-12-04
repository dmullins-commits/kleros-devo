import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, Search, Crown, AlertCircle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AthleteSelector({ athletes, selectedAthlete, onSelect, searchTerm, setSearchTerm, isLoading }) {
  const statusColors = {
    active: "bg-green-400/20 text-green-400 border-green-400/30",
    injured: "bg-red-400/20 text-red-400 border-red-400/30",
    inactive: "bg-gray-400/20 text-gray-400 border-gray-400/30"
  };

  const statusIcons = {
    active: Crown,
    injured: AlertCircle,
    inactive: User
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-black" />
          </div>
          Select Athlete
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search athletes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-400"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-3 border border-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-gray-800" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24 bg-gray-800" />
                    <Skeleton className="h-3 w-16 bg-gray-800" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            athletes.map((athlete) => {
              const StatusIcon = statusIcons[athlete.status] || User;
              
              return (
                <div
                  key={athlete.id}
                  onClick={() => onSelect(athlete)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedAthlete?.id === athlete.id 
                      ? 'border-yellow-400 bg-yellow-400/10' 
                      : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {athlete.profile_image ? (
                        <img 
                          src={athlete.profile_image} 
                          alt={`${athlete.first_name} ${athlete.last_name}`}
                          className="w-10 h-10 rounded-full object-cover border border-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-gray-600">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border border-black ${statusColors[athlete.status]}`}>
                          <StatusIcon className="w-2 h-2" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {athlete.first_name} {athlete.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                          #{athlete.jersey_number || '00'}
                        </Badge>
                        <span className="text-gray-500 text-xs">
                          {athlete.position || 'Athlete'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {athletes.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No athletes found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}