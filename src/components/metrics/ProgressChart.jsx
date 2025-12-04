import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";

export default function ProgressChart({ selectedMetric, records, athletes }) {
  const getChartData = () => {
    if (!selectedMetric) return [];
    
    const metricRecords = records.filter(r => r.metric_id === selectedMetric.id);
    
    // Group by date and calculate average
    const groupedByDate = {};
    metricRecords.forEach(record => {
      const date = record.recorded_date;
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(record.value);
    });

    return Object.entries(groupedByDate)
      .map(([date, values]) => ({
        date,
        value: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10); // Last 10 data points
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">{format(new Date(label), "MMM d, yyyy")}</p>
          <p className="text-yellow-400">
            {`Average: ${payload[0].value.toFixed(2)} ${selectedMetric?.unit || ''}`}
          </p>
          <p className="text-gray-400 text-sm">
            {`${payload[0].payload.count} record(s)`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gray-950 border border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-black" />
          </div>
          Progress Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!selectedMetric ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Select a metric</p>
            <p className="text-gray-600 text-sm">Choose a metric to view progress over time</p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h3 className="text-white font-bold text-lg">{selectedMetric.name}</h3>
              <p className="text-gray-400 text-sm">{selectedMetric.description}</p>
            </div>
            
            {getChartData().length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(date) => format(new Date(date), "MMM d")}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#FCD34D" 
                      strokeWidth={3}
                      dot={{ fill: '#FCD34D', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#FCD34D', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No data yet</p>
                <p className="text-gray-600 text-sm">Start recording values for this metric</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}