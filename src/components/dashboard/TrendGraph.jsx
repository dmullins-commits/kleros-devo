import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from "lucide-react";

const categoryColors = {
  strength: "#EF4444",
  endurance: "#3B82F6",
  speed: "#FCD34D",
  agility: "#A855F7",
  body_composition: "#10B981",
  skill: "#F97316",
  other: "#6B7280"
};

export default function TrendGraph({ categoryGraphData, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(categoryGraphData || {});

  if (categories.length === 0) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="flex items-center gap-3 text-white">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Performance Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          Performance Trend Analysis by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map(category => {
            const data = categoryGraphData[category];
            const color = categoryColors[category] || categoryColors.other;
            
            return (
              <div key={category} className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <h3 className="text-white font-bold capitalize mb-4 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  {category.replace(/_/g, ' ')}
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar 
                      dataKey="average" 
                      fill={color}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}