import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { TrendingUp, BarChart3, User, FileDown, Crown } from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription } from "@/components/ui/alert";

export default function IndividualProgressView({ athlete, metrics, records, isLoading }) {
  const reportRef = useRef(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const categoryColors = {
    strength: "#EF4444",
    endurance: "#3B82F6",
    speed: "#FCD34D",
    agility: "#A855F7",
    body_composition: "#10B981",
    skill: "#F97316",
    other: "#6B7280"
  };

  const exportToPDF = () => {
    if (!athlete) return;

    const printWindow = window.open('', '_blank');
    const reportHTML = reportRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${athlete.first_name} ${athlete.last_name} - Progress Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #FCD34D;
              padding-bottom: 20px;
            }
            .athlete-info {
              display: flex;
              justify-content: space-around;
              margin-bottom: 30px;
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
            }
            .category-section {
              margin-bottom: 10px;
            }
            .category-title {
              background: #333;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .metric-item {
              margin-bottom: 8px;
              padding: 6px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .print-chart-container {
              height: 140px !important;
              margin-bottom: 8px;
            }
            .metric-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .metric-stats {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 4px;
              margin-top: 3px;
            }
            .stat-box {
              text-align: center;
              padding: 4px;
              background: #f9f9f9;
              border-radius: 4px;
              font-size: 9px;
            }
            .metric-header {
              margin-bottom: 3px;
              font-size: 11px;
            }
            .athlete-info {
              padding: 8px;
              margin-bottom: 10px;
            }
            .header {
              margin-bottom: 10px;
              padding-bottom: 8px;
            }
            h1 { font-size: 18px !important; }
            .no-print { display: none; }
            .print-chart-container { height: 140px !important; }
            @media print {
              body { margin: 0; padding: 10px; }
              .print-chart-container { height: 140px !important; }
            }
          </style>
        </head>
        <body>
          ${reportHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };



  const getMetricsByCategory = () => {
    if (!athlete) return {};

    const athleteRecords = records.filter(r => {
      const athleteId = r.athlete_id || r.data?.athlete_id;
      return athleteId === athlete.id;
    });
    const grouped = {};

    metrics.forEach(metric => {
      const metricRecords = athleteRecords
        .filter(r => {
          const metricId = r.metric_id || r.data?.metric_id;
          return metricId === metric.id;
        })
        .sort((a, b) => {
          const dateA = a.recorded_date || a.data?.recorded_date;
          const dateB = b.recorded_date || b.data?.recorded_date;
          return new Date(dateA) - new Date(dateB);
        });

      if (metricRecords.length > 0) {
        if (!grouped[metric.category]) {
          grouped[metric.category] = [];
        }
        grouped[metric.category].push({
          metric,
          records: metricRecords
        });
      }
    });

    return grouped;
  };

  // NEW: Get combined chart data for all metrics in a category
  const getCombinedChartData = (categoryMetrics) => {
    const allDates = new Set();
    categoryMetrics.forEach(({ records: metricRecords }) => {
      metricRecords.forEach(record => {
        const date = record.recorded_date || record.data?.recorded_date;
        if (date) allDates.add(date);
      });
    });

    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      const dataPoint = { date };
      categoryMetrics.forEach(({ metric, records: metricRecords }) => {
        const record = metricRecords.find(r => {
          const recDate = r.recorded_date || r.data?.recorded_date;
          return recDate === date;
        });
        if (record) {
          const value = record.value ?? record.data?.value;
          dataPoint[metric.id] = value;
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

  // Get PR based on target_higher setting
  const getPR = (metricRecords, metric) => {
    const values = metricRecords.map(r => r.value ?? r.data?.value).filter(v => v != null);
    if (values.length === 0) return null;
    const targetHigher = metric.target_higher !== false; // default true
    return targetHigher ? Math.max(...values) : Math.min(...values);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const [year, month, day] = label.split('-');
      const safeDate = new Date(year, month - 1, day);
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">{format(safeDate, "MMM d, yyyy")}</p>
          {payload.map((entry, index) => {
            const metric = metrics.find(m => m.id === entry.dataKey);
            return (
              <p key={index} style={{ color: entry.color }}>
                {metric?.name}: {formatValue(entry.value, metric)} {metric?.unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const metricsByCategory = getMetricsByCategory();

  if (!athlete) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="py-16 text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">No athlete selected</h3>
          <p className="text-gray-500">Select an athlete to view their progress report</p>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(metricsByCategory).length === 0) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="py-16 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">No performance data</h3>
          <p className="text-gray-500">No metrics recorded for {athlete.first_name} {athlete.last_name} yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-400">
          <Crown className="h-5 w-5 text-amber-400" />
          <AlertDescription className="text-amber-200 font-semibold">
            Changes saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Export Button */}
      <div className="flex justify-end no-print">
        <Button 
          onClick={exportToPDF}
          className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black shadow-lg shadow-amber-500/50"
        >
          <FileDown className="w-4 h-4 mr-2" />
          EXPORT TO PDF
        </Button>
      </div>

      {/* Report Content */}
      <div ref={reportRef}>
        {/* Header for Print */}
        <div className="header mb-8 pb-6 border-b-2 border-yellow-400">
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', color: '#000' }}>
            Performance Progress Report
          </h1>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Generated on {format(new Date(), "MMMM d, yyyy")}
          </div>
        </div>

        {/* Athlete Info Card */}
        <Card className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300">
                {athlete.first_name} {athlete.last_name}
              </h2>
              <Badge className="bg-gradient-to-r from-amber-400/30 to-yellow-500/30 text-amber-200 border border-amber-400/50 text-lg px-4 py-2 font-black">
                {Object.values(metricsByCategory).flat().length} METRICS TRACKED
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metrics by Category - COMBINED GRAPHS */}
        {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => {
          const combinedChartData = getCombinedChartData(categoryMetrics);
          const categoryColor = categoryColors[category] || categoryColors.other;

          return (
            <div key={category} className="category-section">
              <Card className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30">
                <CardHeader className="border-b-2 border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-yellow-500/10">
                  <CardTitle className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-amber-400/50"
                      style={{ backgroundColor: `${categoryColor}30` }}
                    >
                      <BarChart3 className="w-4 h-4" style={{ color: categoryColor }} />
                    </div>
                    <span className="capitalize text-amber-200 font-black" style={{ background: 'transparent', padding: 0 }}>
                      {category.replace(/_/g, ' ')}
                    </span>
                    <Badge className="bg-gray-800 text-gray-300 font-bold">
                      {categoryMetrics.length} metrics
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Combined Chart for All Metrics in Category */}
                  <div className="h-72 mb-4 print-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(date) => {
                            const [year, month, day] = date.split('-');
                            return format(new Date(year, month - 1, day), "MMM d");
                          }}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                          formatter={(value) => {
                            const metric = metrics.find(m => m.id === value);
                            return metric ? `${metric.name} (${metric.unit})` : value;
                          }}
                        />
                        {categoryMetrics.map(({ metric }, idx) => {
                          const colors = ['#EF4444', '#3B82F6', '#FCD34D', '#A855F7', '#10B981', '#F97316'];
                          const color = colors[idx % colors.length];
                          return (
                            <Line 
                              key={metric.id}
                              type="linear" 
                              dataKey={metric.id}
                              name={`${metric.name} (${metric.unit})`}
                              stroke={color}
                              strokeWidth={3}
                              dot={{ fill: color, strokeWidth: 2, r: 5 }}
                              activeDot={{ r: 7 }}
                              connectNulls
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Individual Metric Details */}
                  <div className="space-y-6 mt-4">
                    {categoryMetrics.map(({ metric, records: metricRecords }) => {
                      const latestRecord = metricRecords[metricRecords.length - 1];
                      const firstRecord = metricRecords[0];
                      const latestValue = latestRecord.value ?? latestRecord.data?.value;
                      const firstValue = firstRecord.value ?? firstRecord.data?.value;
                      const latestDate = latestRecord.recorded_date || latestRecord.data?.recorded_date;
                      const firstDate = firstRecord.recorded_date || firstRecord.data?.recorded_date;
                      const totalChange = latestValue - firstValue;
                      const decimals = getDecimalPlaces(metric);
                      const percentChange = ((totalChange / firstValue) * 100).toFixed(1);
                      const targetHigher = metric.target_higher !== false;
                      const isPositiveChange = targetHigher ? totalChange > 0 : totalChange < 0;
                      const prValue = getPR(metricRecords, metric);

                      return (
                        <div key={metric.id} className="metric-item space-y-4 p-4 bg-black/30 border border-amber-400/20 rounded-lg">
                          <div className="metric-header flex justify-between items-start">
                            <div>
                              <h4 className="text-amber-200 font-black text-lg">{metric.name}</h4>
                              <p className="text-amber-400/80 text-sm font-semibold">{metric.description}</p>
                              <Badge variant="outline" className="border-amber-600 text-amber-300 mt-2 font-bold">
                                {metricRecords.length} total records
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-amber-400 font-black text-2xl">
                                {formatValue(latestValue, metric)} {metric.unit}
                              </div>
                              <div className={`flex items-center gap-1 justify-end mt-1 ${
                                isPositiveChange ? 'text-green-400' : totalChange === 0 ? 'text-gray-400' : 'text-red-400'
                              }`}>
                                <TrendingUp className={`w-4 h-4 ${totalChange < 0 ? 'rotate-180' : ''}`} />
                                <span className="text-sm font-black">
                                  {totalChange > 0 ? '+' : ''}{formatValue(totalChange, metric)} ({percentChange}%)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Summary */}
                          <div className="metric-stats grid grid-cols-3 gap-4 p-4 bg-gray-900/50 rounded-lg">
                            <div className="stat-box text-center">
                              <div className="text-amber-400/80 text-xs uppercase mb-1 font-black">First Record</div>
                              <div className="text-white font-black">{formatValue(firstValue, metric)} {metric.unit}</div>
                              <div className="text-amber-500/60 text-xs font-semibold">{(() => {
                                const [year, month, day] = firstDate.split('-');
                                return format(new Date(year, month - 1, day), "MMM d, yyyy");
                              })()}</div>
                            </div>
                            <div className="stat-box text-center">
                              <div className="text-amber-400/80 text-xs uppercase mb-1 font-black">Latest</div>
                              <div className="text-amber-400 font-black">{formatValue(latestValue, metric)} {metric.unit}</div>
                              <div className="text-amber-500/60 text-xs font-semibold">{(() => {
                                const [year, month, day] = latestDate.split('-');
                                return format(new Date(year, month - 1, day), "MMM d, yyyy");
                              })()}</div>
                            </div>
                            <div className="stat-box text-center">
                              <div className="text-amber-400/80 text-xs uppercase mb-1 font-black">PR</div>
                              <div className="text-green-400 font-black">
                                {formatValue(prValue, metric)} {metric.unit}
                              </div>
                              <div className="text-amber-500/60 text-xs font-semibold">{targetHigher ? 'Highest' : 'Lowest'}</div>
                            </div>
                          </div>


                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}