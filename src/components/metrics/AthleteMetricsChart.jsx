import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, BarChart3, TrendingUp, Target } from "lucide-react";
import { format } from "date-fns";

export default function AthleteMetricsChart({ athlete, metrics, records }) {
  const getAthleteMetrics = () => {
    if (!athlete) return [];
    
    const athleteRecords = records.filter(r => r.athlete_id === athlete.id);
    const metricGroups = {};
    
    athleteRecords.forEach(record => {
      const metric = metrics.find(m => m.id === record.metric_id);
      if (!metric) return;
      
      if (!metricGroups[metric.id]) {
        metricGroups[metric.id] = {
          metric,
          records: []
        };
      }
      
      metricGroups[metric.id].records.push(record);
    });
    
    // Sort records by date for each metric
    Object.values(metricGroups).forEach(group => {
      group.records.sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date));
    });
    
    return Object.values(metricGroups);
  };

  const getChartData = (metricRecords) => {
    return metricRecords.map((record, index) => ({
      date: record.recorded_date,
      value: record.value,
      index: index + 1
    }));
  };

  const categoryColors = {
    strength: "#EF4444",
    endurance: "#3B82F6", 
    speed: "#FCD34D",
    agility: "#A855F7",
    body_composition: "#10B981",
    skill: "#F97316",
    other: "#6B7280"
  };

  const CustomTooltip = ({ active, payload, label, metric }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">{format(new Date(label), "MMM d, yyyy")}</p>
          <p className="text-yellow-400">
            {`${payload[0].value} ${metric?.unit || ''}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const athleteMetrics = getAthleteMetrics();

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-black" />
          </div>
          {athlete ? `${athlete.first_name} ${athlete.last_name} - Performance Tracking` : 'Performance Tracking'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!athlete ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Select an athlete</p>
            <p className="text-gray-600 text-sm">Choose an athlete to view their performance metrics</p>
          </div>
        ) : athleteMetrics.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No performance data</p>
            <p className="text-gray-600 text-sm">No metrics recorded for this athlete yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {athleteMetrics.map(({ metric, records: metricRecords }) => {
              const chartData = getChartData(metricRecords);
              const latestValue = metricRecords[metricRecords.length - 1];
              const previousValue = metricRecords.length > 1 ? metricRecords[metricRecords.length - 2] : null;
              
              let trend = 'same';
              let change = 0;
              if (previousValue) {
                change = latestValue.value - previousValue.value;
                if (change !== 0) {
                  if (metric.target_higher) {
                    trend = change > 0 ? 'up' : 'down';
                  } else {
                    trend = change < 0 ? 'up' : 'down';
                  }
                }
              }

              return (
                <div key={metric.id} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-lg">{metric.name}</h3>
                      <p className="text-gray-400 text-sm">{metric.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge 
                          className="border"
                          style={{ 
                            backgroundColor: `${categoryColors[metric.category]}20`,
                            color: categoryColors[metric.category],
                            borderColor: `${categoryColors[metric.category]}50`
                          }}
                        >
                          {metric.category.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {metricRecords.length} records
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold text-2xl">
                        {latestValue.value} {metric.unit}
                      </div>
                      {change !== 0 && (
                        <div className={`flex items-center gap-1 mt-1 ${
                          trend === 'up' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
                          <span className="text-sm font-medium">
                            {change > 0 ? '+' : ''}{change.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(date) => format(new Date(date), "MMM d")}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip content={(props) => <CustomTooltip {...props} metric={metric} />} />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={categoryColors[metric.category]}
                          strokeWidth={3}
                          dot={{ fill: categoryColors[metric.category], strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, stroke: categoryColors[metric.category], strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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