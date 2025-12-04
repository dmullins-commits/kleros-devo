import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamProgressView({ metrics, records, athletes, isLoading }) {
  const categoryColors = {
    strength: "#EF4444",
    endurance: "#3B82F6",
    speed: "#FCD34D",
    agility: "#A855F7",
    body_composition: "#10B981",
    skill: "#F97316",
    other: "#6B7280"
  };

  const getMetricsByCategory = () => {
    const grouped = {};
    metrics.forEach(metric => {
      // Only include metrics that have records
      const hasRecords = records.some(r => {
        const mId = r.metric_id || r.data?.metric_id;
        return mId === metric.id;
      });
      
      if (hasRecords) {
        const category = metric.category || 'other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(metric);
      }
    });
    return grouped;
  };

  const getTeamAverageData = (metricId) => {
    const metricRecords = records.filter(r => {
      const mId = r.metric_id || r.data?.metric_id;
      return mId === metricId;
    });
    const dateGroups = {};

    metricRecords.forEach(record => {
      const date = record.recorded_date || record.data?.recorded_date;
      const value = record.value ?? record.data?.value;
      if (!date || value == null) return;
      
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(value);
    });

    const chartData = Object.entries(dateGroups)
      .map(([date, values]) => ({
        date,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10);

    return chartData;
  };

  // Get combined chart data for all metrics in a category
  const getCombinedCategoryChartData = (categoryMetrics) => {
    const allDates = new Set();
    
    categoryMetrics.forEach(metric => {
      const metricRecords = records.filter(r => {
        const mId = r.metric_id || r.data?.metric_id;
        return mId === metric.id;
      });
      metricRecords.forEach(record => {
        const date = record.recorded_date || record.data?.recorded_date;
        if (date) allDates.add(date);
      });
    });

    const sortedDates = Array.from(allDates).sort().slice(-15);
    
    return sortedDates.map(date => {
      const dataPoint = { date };
      categoryMetrics.forEach(metric => {
        const dayRecords = records.filter(r => {
          const recDate = r.recorded_date || r.data?.recorded_date;
          const mId = r.metric_id || r.data?.metric_id;
          return recDate === date && mId === metric.id;
        });
        if (dayRecords.length > 0) {
          const avg = dayRecords.reduce((sum, r) => sum + (r.value ?? r.data?.value ?? 0), 0) / dayRecords.length;
          dataPoint[metric.id] = parseFloat(avg.toFixed(2));
        }
      });
      return dataPoint;
    });
  };

  const getDecimalPlaces = (metric) => metric?.decimal_places ?? 2;
  
  const formatValue = (value, metric) => {
    const decimals = getDecimalPlaces(metric);
    return value?.toFixed(decimals);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">{format(new Date(label), "MMM d, yyyy")}</p>
          {payload.map((entry, index) => {
            if (entry.value == null) return null;
            const metric = metrics.find(m => m.id === entry.dataKey);
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {formatValue(entry.value, metric)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const metricsByCategory = getMetricsByCategory();

  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="bg-gray-950 border border-gray-800">
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-gray-800" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (Object.keys(metricsByCategory).length === 0) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="py-16 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">No metrics defined</h3>
          <p className="text-gray-500">Create metrics to start tracking team progress</p>
        </CardContent>
      </Card>
    );
  }

  const lineColors = ['#EF4444', '#3B82F6', '#FCD34D', '#A855F7', '#10B981', '#F97316', '#EC4899', '#14B8A6'];

  return (
    <div className="space-y-8">
      {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => {
        const combinedChartData = getCombinedCategoryChartData(categoryMetrics);
        const categoryColor = categoryColors[category] || categoryColors.other;

        return (
          <Card key={category} className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center gap-3 text-white">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${categoryColor}30` }}
                >
                  <BarChart3 className="w-4 h-4" style={{ color: categoryColor }} />
                </div>
                <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                <Badge className="bg-gray-800 text-gray-300">
                  {categoryMetrics.length} metrics
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Combined Category Chart */}
              {combinedChartData.length > 0 ? (
                <div className="h-72 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(date) => format(new Date(date), "MMM d")}
                      />
                      <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                      />
                      {categoryMetrics.map((metric, idx) => {
                        const metricName = metric.name || metric.data?.name || 'Unknown';
                        const metricUnit = metric.unit || metric.data?.unit || '';
                        return (
                          <Line 
                            key={metric.id}
                            type="linear" 
                            dataKey={metric.id}
                            name={`${metricName} (${metricUnit})`}
                            stroke={lineColors[idx % lineColors.length]}
                            strokeWidth={2}
                            dot={{ fill: lineColors[idx % lineColors.length], strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data recorded for this category yet
                </div>
              )}

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryMetrics.map((metric, idx) => {
                  const chartData = getTeamAverageData(metric.id);
                  const latestAvg = chartData.length > 0 ? chartData[chartData.length - 1].average : 0;
                  const previousAvg = chartData.length > 1 ? chartData[chartData.length - 2].average : 0;
                  const change = latestAvg - previousAvg;
                  const targetHigher = metric.target_higher !== false; // default true
                  const isPositiveChange = targetHigher ? change > 0 : change < 0;
                  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
                  const decimals = getDecimalPlaces(metric);

                  return (
                    <div key={metric.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: lineColors[idx % lineColors.length] }}
                        />
                        <h4 className="text-white font-bold">{metric.name || metric.data?.name || 'Unknown'}</h4>
                      </div>
                      <div className="text-yellow-400 font-bold text-xl">
                        {latestAvg.toFixed(decimals)} {metric.unit || metric.data?.unit || ''}
                      </div>
                      {change !== 0 && (
                        <div className={`flex items-center gap-1 mt-1 ${
                          isPositiveChange ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                          <span className="text-xs font-medium">
                            {change > 0 ? '+' : ''}{change.toFixed(decimals)} avg
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}