import React, { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { TrendingUp, BarChart3, User, FileDown, Crown, Calendar as CalendarIcon, X, Users } from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";

export default function IndividualProgressView({ athlete, metrics, records, isLoading, athletes }) {
  const reportRef = useRef(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [hiddenMetrics, setHiddenMetrics] = useState({});
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(null);
  const [selectedCompareAthletes, setSelectedCompareAthletes] = useState([]);
  const [athleteRenames, setAthleteRenames] = useState({});

  const categoryColors = {
    strength: "#EF4444",
    endurance: "#3B82F6",
    speed: "#FCD34D",
    agility: "#A855F7",
    body_composition: "#10B981",
    skill: "#F97316",
    other: "#6B7280"
  };

  // Validate date helper
  const isValidDate = (dateStr) => {
    if (!dateStr || dateStr === 'undefined' || dateStr === 'null' || dateStr.toString().trim() === '') {
      return false;
    }
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  // Get all dates with data
  const datesWithData = useMemo(() => {
    if (!athlete) return new Set();
    const dates = new Set();
    records.filter(r => {
      const athleteId = r.athlete_id || r.data?.athlete_id;
      return athleteId === athlete.id;
    }).forEach(r => {
      const date = r.recorded_date || r.data?.recorded_date;
      if (isValidDate(date)) dates.add(date);
    });
    return dates;
  }, [records, athlete]);

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    if (!startDate && !endDate) return records;
    return records.filter(r => {
      const date = r.recorded_date || r.data?.recorded_date;
      if (!isValidDate(date)) return false;
      const recordDate = new Date(date);
      if (startDate && recordDate < new Date(startDate)) return false;
      if (endDate && recordDate > new Date(endDate)) return false;
      return true;
    });
  }, [records, startDate, endDate]);

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

  const handleCompareSelection = (mode) => {
    if (mode === 'averages') {
      setCompareMode('averages');
      setSelectedCompareAthletes([]);
      setShowCompareDialog(false);
    } else if (mode === 'athletes') {
      setCompareMode('athletes');
    }
  };

  const toggleCompareAthlete = (athleteId) => {
    setSelectedCompareAthletes(prev => {
      if (prev.includes(athleteId)) {
        const newAthletes = prev.filter(id => id !== athleteId);
        if (newAthletes.length === 0) setCompareMode(null);
        return newAthletes;
      } else if (prev.length < 2) {
        return [...prev, athleteId];
      }
      return prev;
    });
  };

  const removeCompareAthlete = (athleteId) => {
    setSelectedCompareAthletes(prev => {
      const newAthletes = prev.filter(id => id !== athleteId);
      if (newAthletes.length === 0) setCompareMode(null);
      return newAthletes;
    });
    if (athleteRenames[athleteId]) {
      const newRenames = { ...athleteRenames };
      delete newRenames[athleteId];
      setAthleteRenames(newRenames);
    }
  };

  const renameAthlete = (athleteId) => {
    const compareAthlete = athletes?.find(a => a.id === athleteId);
    const currentName = athleteRenames[athleteId] || `${compareAthlete?.first_name || ''} ${compareAthlete?.last_name || ''}`.trim();
    const newName = prompt('Enter new display name:', currentName);
    
    if (newName && newName.trim()) {
      setAthleteRenames({ ...athleteRenames, [athleteId]: newName.trim() });
    }
  };



  const getMetricsByCategory = () => {
    if (!athlete) return {};

    const athleteRecords = filteredRecords.filter(r => {
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
          if (!isValidDate(dateA) || !isValidDate(dateB)) return 0;
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

  // NEW: Get combined chart data for all metrics in a category (with comparison data)
  const getCombinedChartData = (categoryMetrics) => {
    const allDates = new Set();
    categoryMetrics.forEach(({ records: metricRecords }) => {
      metricRecords.forEach(record => {
        const date = record.recorded_date || record.data?.recorded_date;
        if (isValidDate(date)) allDates.add(date);
      });
    });

    // Add dates from comparison athletes
    if (compareMode === 'athletes' && selectedCompareAthletes.length > 0) {
      categoryMetrics.forEach(({ metric }) => {
        records.filter(r => {
          const mId = r.metric_id || r.data?.metric_id;
          const aId = r.athlete_id || r.data?.athlete_id;
          return mId === metric.id && selectedCompareAthletes.includes(aId);
        }).forEach(r => {
          const date = r.recorded_date || r.data?.recorded_date;
          if (isValidDate(date)) allDates.add(date);
        });
      });
    }

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

        // Add comparison data
        if (compareMode === 'averages' && athletes) {
          const dayRecords = records.filter(r => {
            const recDate = r.recorded_date || r.data?.recorded_date;
            const mId = r.metric_id || r.data?.metric_id;
            const aId = r.athlete_id || r.data?.athlete_id;
            return recDate === date && mId === metric.id && athletes.some(a => a.id === aId);
          });
          if (dayRecords.length > 0) {
            const avg = dayRecords.reduce((sum, r) => sum + (r.value ?? r.data?.value ?? 0), 0) / dayRecords.length;
            dataPoint[`${metric.id}_avg`] = avg;
          }
        }

        // Add comparison athletes
        if (compareMode === 'athletes' && selectedCompareAthletes.length > 0) {
          selectedCompareAthletes.forEach(compareAthleteId => {
            const compareRecord = records.find(r => {
              const recDate = r.recorded_date || r.data?.recorded_date;
              const mId = r.metric_id || r.data?.metric_id;
              const aId = r.athlete_id || r.data?.athlete_id;
              return recDate === date && mId === metric.id && aId === compareAthleteId;
            });
            if (compareRecord) {
              const value = compareRecord.value ?? compareRecord.data?.value;
              dataPoint[`${metric.id}_${compareAthleteId}`] = value;
            }
          });
        }
      });
      return dataPoint;
    });
  };

  const compareableAthletes = athletes?.filter(a => a.id !== athlete?.id) || [];

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

  const handleLegendClick = (metricId) => {
    setHiddenMetrics(prev => ({
      ...prev,
      [metricId]: !prev[metricId]
    }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      if (!isValidDate(label)) return null;
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
    <>
      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="bg-gray-950 border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Compare Options</DialogTitle>
            <DialogDescription className="text-gray-400">
              {compareMode === 'athletes' 
                ? 'Select up to 2 athletes to compare (click legend to rename/remove)' 
                : 'Choose a comparison type'}
            </DialogDescription>
          </DialogHeader>

          {!compareMode || compareMode === 'averages' ? (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                onClick={() => handleCompareSelection('averages')}
                className="w-full h-20 border-gray-700 text-white hover:bg-gray-800 flex flex-col items-center justify-center gap-2"
              >
                <Users className="w-6 h-6" />
                <span className="font-bold">Compare to Averages</span>
                <span className="text-xs text-gray-400">Show team/class average</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setCompareMode('athletes')}
                className="w-full h-20 border-gray-700 text-white hover:bg-gray-800 flex flex-col items-center justify-center gap-2"
              >
                <Users className="w-6 h-6" />
                <span className="font-bold">Compare to Another Athlete</span>
                <span className="text-xs text-gray-400">Select up to 2 athletes</span>
              </Button>
            </div>
          ) : null}

          {compareMode === 'athletes' && (
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {compareableAthletes.map(a => {
                const isSelected = selectedCompareAthletes.includes(a.id);
                const canSelect = !isSelected && selectedCompareAthletes.length < 2;
                
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-500/20 border-blue-400' 
                        : canSelect
                          ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canSelect || isSelected ? toggleCompareAthlete(a.id) : null}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{a.first_name} {a.last_name}</p>
                        <p className="text-gray-400 text-xs">{a.class_grade} • {a.class_period}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompareDialog(false);
                setCompareMode(null);
              }}
              className="border-gray-700 text-gray-300"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
      {saveSuccess && (
        <Alert className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-400">
          <Crown className="h-5 w-5 text-amber-400" />
          <AlertDescription className="text-amber-200 font-semibold">
            Changes saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Date Range Filter & Export */}
      <Card className="bg-gray-950 border border-gray-800 no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-gray-400 font-semibold">View data:</span>

              <Popover open={showStartPicker} onOpenChange={setShowStartPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-gray-900 border-gray-700 text-white">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {startDate && isValidDate(startDate) ? `From ${format(new Date(startDate), 'MMM d, yyyy')}` : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, 'yyyy-MM-dd'));
                        setShowStartPicker(false);
                      }
                    }}
                    modifiers={{
                      hasData: (date) => datesWithData.has(format(date, 'yyyy-MM-dd'))
                    }}
                    modifiersStyles={{
                      hasData: { border: '2px solid #60a5fa', borderRadius: '4px' }
                    }}
                    className="bg-gray-950 text-white"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={showEndPicker} onOpenChange={setShowEndPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-gray-900 border-gray-700 text-white">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {endDate && isValidDate(endDate) ? `To ${format(new Date(endDate), 'MMM d, yyyy')}` : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(format(date, 'yyyy-MM-dd'));
                        setShowEndPicker(false);
                      }
                    }}
                    modifiers={{
                      hasData: (date) => datesWithData.has(format(date, 'yyyy-MM-dd'))
                    }}
                    modifiersStyles={{
                      hasData: { border: '2px solid #60a5fa', borderRadius: '4px' }
                    }}
                    className="bg-gray-950 text-white"
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCompareDialog(true)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Users className="w-4 h-4 mr-2" />
                Compare
              </Button>
              <Button 
                onClick={exportToPDF}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black shadow-lg shadow-amber-500/50"
              >
                <FileDown className="w-4 h-4 mr-2" />
                EXPORT TO PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          const categoryColor = categoryColors[category] || categoryColors.other;

          // Split into chunks of max 4 metrics
          const metricChunks = [];
          for (let i = 0; i < categoryMetrics.length; i += 4) {
            metricChunks.push(categoryMetrics.slice(i, i + 4));
          }

          return (
            <div key={category} className="category-section space-y-6">
              {metricChunks.map((chunkMetrics, chunkIdx) => {
                const combinedChartData = getCombinedChartData(chunkMetrics);

                return (
                  <Card key={`${category}-${chunkIdx}`} className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30">
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
                        {metricChunks.length > 1 && (
                          <Badge className="bg-gray-800 text-gray-300 font-bold">
                            Part {chunkIdx + 1} of {metricChunks.length}
                          </Badge>
                        )}
                        <Badge className="bg-gray-800 text-gray-300 font-bold">
                          {chunkMetrics.length} metrics
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                  {/* Combined Chart for All Metrics in Category */}
                  <div className="h-72 mb-4 print-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedChartData} margin={{ top: 20, right: 60, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(date) => {
                            if (!isValidDate(date)) return 'Invalid';
                            const [year, month, day] = date.split('-');
                            return format(new Date(year, month - 1, day), "MMM d");
                          }}
                        />
                        <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                        {chunkMetrics.length > 1 && (
                          <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                        )}
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ color: '#f59e0b', fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={(e) => {
                            if (e.dataKey) {
                              // Check if this is a comparison athlete
                              const match = e.dataKey.match(/^(.+)_([a-f0-9-]+)$/);
                              if (match && selectedCompareAthletes.includes(match[2])) {
                                const athleteId = match[2];
                                const action = window.confirm(`Options for ${e.value}:\n\nOK = Rename\nCancel = Remove`);
                                if (action === true) {
                                  renameAthlete(athleteId);
                                } else {
                                  removeCompareAthlete(athleteId);
                                }
                              } else {
                                handleLegendClick(e.dataKey);
                              }
                            }
                          }}
                          formatter={(value) => {
                            const metric = metrics.find(m => m.id === value);
                            return metric ? `${metric.name} (${metric.unit})` : value;
                          }}
                        />
                        {(() => {
                          const lines = [];
                          const colors = ['#EF4444', '#3B82F6', '#FCD34D', '#A855F7', '#10B981', '#F97316'];
                          
                          chunkMetrics.forEach(({ metric }, idx) => {
                            const color = colors[idx % colors.length];
                            const yAxisId = idx === 0 ? 'left' : 'right';
                            const isHidden = hiddenMetrics[metric.id];
                            
                            // Main athlete line
                            lines.push(
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
                                yAxisId={yAxisId}
                                hide={isHidden}
                                strokeOpacity={isHidden ? 0.2 : 1}
                              />
                            );

                            // Add average line
                            if (compareMode === 'averages') {
                              const avgColor = colors[(idx + 3) % colors.length];
                              lines.push(
                                <Line 
                                  key={`${metric.id}_avg`}
                                  type="linear" 
                                  dataKey={`${metric.id}_avg`}
                                  name={`${metric.name} (Avg)`}
                                  stroke={avgColor}
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  dot={{ fill: avgColor, r: 3 }}
                                  connectNulls
                                  yAxisId={yAxisId}
                                />
                              );
                            }

                            // Add comparison athlete lines
                            if (compareMode === 'athletes' && selectedCompareAthletes.length > 0) {
                              selectedCompareAthletes.forEach((compareAthleteId, aIdx) => {
                                const compareAthlete = athletes?.find(a => a.id === compareAthleteId);
                                const displayName = athleteRenames[compareAthleteId] || 
                                  `${compareAthlete?.first_name || ''} ${compareAthlete?.last_name || ''}`.trim();
                                const compareColor = colors[(idx + 3 + aIdx) % colors.length];
                                
                                lines.push(
                                  <Line 
                                    key={`${metric.id}_${compareAthleteId}`}
                                    type="linear" 
                                    dataKey={`${metric.id}_${compareAthleteId}`}
                                    name={`${metric.name} (${displayName})`}
                                    stroke={compareColor}
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    dot={{ fill: compareColor, r: 3 }}
                                    connectNulls
                                    yAxisId={yAxisId}
                                  />
                                );
                              });
                            }
                          });
                          
                          return lines;
                        })()}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Individual Metric Details */}
                  <div className="space-y-6 mt-4">
                    {chunkMetrics.map(({ metric, records: metricRecords }) => {
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
                                if (!isValidDate(firstDate)) return 'Invalid Date';
                                const [year, month, day] = firstDate.split('-');
                                return format(new Date(year, month - 1, day), "MMM d, yyyy");
                              })()}</div>
                            </div>
                            <div className="stat-box text-center">
                              <div className="text-amber-400/80 text-xs uppercase mb-1 font-black">Latest</div>
                              <div className="text-amber-400 font-black">{formatValue(latestValue, metric)} {metric.unit}</div>
                              <div className="text-amber-500/60 text-xs font-semibold">{(() => {
                                if (!isValidDate(latestDate)) return 'Invalid Date';
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
                      );
                    })}
                  </div>
                );
              })}
      </div>
    </div>
    </>
  );
}