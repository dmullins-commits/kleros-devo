import React from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Dumbbell, TrendingUp, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsGrid({ athletes, teams, recentRecords, workouts, isLoading }) {
  const stats = [
    {
      title: "Total Athletes",
      value: athletes.length,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgGlow: "bg-blue-500/20",
      change: "+12 this month"
    },
    {
      title: "Active Teams",
      value: teams.length,
      icon: Shield,
      color: "from-purple-500 to-purple-600", 
      bgGlow: "bg-purple-500/20",
      change: "3 in season"
    },
    {
      title: "Workout Plans",
      value: workouts.length,
      icon: Dumbbell,
      color: "from-yellow-400 to-yellow-500",
      bgGlow: "bg-yellow-500/20",
      change: "8 active programs"
    },
    {
      title: "Metrics Tracked",
      value: recentRecords.length,
      icon: Target,
      color: "from-green-500 to-green-600",
      bgGlow: "bg-green-500/20",
      change: "95% completion rate"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={stat.title} className="relative overflow-hidden bg-gray-950 border border-gray-800 group hover:border-gray-700 transition-all duration-300">
          <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-5">
            <div className={`w-full h-full rounded-full bg-gradient-to-r ${stat.color}`} />
          </div>
          
          <CardHeader className="relative z-10 p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{stat.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-2 bg-gray-800" />
                ) : (
                  <CardTitle className="text-3xl font-black mt-2 text-white group-hover:text-yellow-400 transition-colors duration-300">
                    {stat.value}
                  </CardTitle>
                )}
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                <stat.icon className="w-6 h-6 text-black" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 mr-1 text-green-400" />
              <span className="text-green-400 font-medium">{stat.change}</span>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}