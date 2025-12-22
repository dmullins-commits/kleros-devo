import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Grid3X3, Edit, Save, X, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MetricRecord } from "@/entities/all";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function SnapshotView({ 
  athletes, // All athletes from parent
  metrics, 
  records, 
  teams, 
  classPeriods,
  onBack 
}) {
  const [selectedMetricIds, setSelectedMetricIds] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'team', 'class'
  const [filterValue, setFilterValue] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // DEBUG: Log received props
  React.useEffect(() => {
    console.log('=== SnapshotView Props Debug ===', {
      athletesCount: athletes.length,
      metricsCount: metrics.length,
      recordsCount: records.length,
      sampleAthletes: athletes.slice(0, 2).map(a => ({ id: a.id, name: `${a.first_name} ${a.last_name}` })),
      sampleMetrics: metrics.slice(0, 3).map(m => ({ id: m.id, name: m.name, unit: m.unit, decimal_places: m.decimal_places })),
      sampleRecords: records.slice(0, 3).map(r => ({ id: r.id, athlete_id: r.athlete_id, metric_id: r.metric_id, value: r.value, recorded_date: r.recorded_date }))
    });
  }, [athletes, metrics, records]);

  // Filter athletes based on selected filter
  const filteredAthletes = useMemo(() => {
    let filtered = athletes;
    
    if (filterType === 'team' && filterValue !== 'all') {
      filtered = athletes.filter(a => a.team_ids?.includes(filterValue));
    } else if (filterType === 'class' && filterValue !== 'all') {
      filtered = athletes.filter(a => a.class_period === filterValue);
    }
    
    return [...filtered].sort((a, b) => {
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
  }, [athletes, filterType, filterValue]);

  // Get all dates with data for selected metrics
  const datesWithData = useMemo(() => {
    if (selectedMetricIds.length === 0) return new Set();
    
    const dates = new Set();
    records.forEach(r => {
      const rMetricId = r.data?.metric_id || r.metric_id;
      const rDate = r.data?.recorded_date || r.recorded_date;
      if (selectedMetricIds.includes(rMetricId)) {
        dates.add(rDate);
      }
    });
    return dates;
  }, [records, selectedMetricIds]);

  // Get all records for selected metrics and athletes
  const snapshotData = useMemo(() => {
    if (selectedMetricIds.length === 0 || filteredAthletes.length === 0) return null;

    const athleteIds = new Set(filteredAthletes.map(a => a.id));
    
    console.log('=== SnapshotView Data Processing Debug ===', {
      selectedMetricIds,
      filteredAthletesCount: filteredAthletes.length,
      athleteIdsCount: athleteIds.size,
      totalRecordsCount: records.length
    });
    
    // Build data for each metric
    const metricsData = selectedMetricIds.map(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) {
        console.warn('Metric not found:', metricId);
        return null;
      }

      // Handle both nested and flat data structures for metric_id and athlete_id
      let metricRecords = records.filter(r => {
        const rMetricId = r.data?.metric_id || r.metric_id;
        const rAthleteId = r.data?.athlete_id || r.athlete_id;
        return rMetricId === metricId && athleteIds.has(rAthleteId);
      });
      
      console.log(`Metric "${metric.name}" (${metricId}):`, {
        metricRecordsFound: metricRecords.length,
        sampleRecord: metricRecords[0] ? {
          id: metricRecords[0].id,
          athlete_id: metricRecords[0].data?.athlete_id || metricRecords[0].athlete_id,
          metric_id: metricRecords[0].data?.metric_id || metricRecords[0].metric_id,
          value: metricRecords[0].data?.value ?? metricRecords[0].value,
          recorded_date: metricRecords[0].data?.recorded_date || metricRecords[0].recorded_date
        } : 'No records'
      });

      // Filter by start date if set
      if (startDate) {
        metricRecords = metricRecords.filter(r => {
          const recordDate = r.data?.recorded_date || r.recorded_date;
          return new Date(recordDate) >= new Date(startDate);
        });
      }

      // Get unique dates and sort them
      // Handle both nested and flat data structures for recorded_date
      const dates = [...new Set(metricRecords.map(r => r.data?.recorded_date || r.recorded_date))].sort();

      // Build data structure: athlete -> date -> value
      const dataByAthlete = {};
      const prByAthlete = {};

      filteredAthletes.forEach(athlete => {
        dataByAthlete[athlete.id] = {};
        
        const athleteRecords = metricRecords.filter(r => {
          const rAthleteId = r.data?.athlete_id || r.athlete_id;
          return rAthleteId === athlete.id;
        });
        
        // Calculate PR for this athlete
        if (athleteRecords.length > 0) {
          prByAthlete[athlete.id] = metric.target_higher
            ? Math.max(...athleteRecords.map(r => r.data?.value ?? r.value))
            : Math.min(...athleteRecords.map(r => r.data?.value ?? r.value));
        }

        // Map records by date
        athleteRecords.forEach(record => {
          const recordedDate = record.data?.recorded_date || record.recorded_date;
          const value = record.data?.value ?? record.value;

          if (value === undefined || value === null) {
            console.warn(`Invalid value for athlete ${athlete.id}, metric ${metric.name}, date ${recordedDate}:`, value);
          }

          dataByAthlete[athlete.id][recordedDate] = value;
        });
      });

      return {
        metric,
        dates,
        dataByAthlete,
        prByAthlete
      };
    }).filter(Boolean);

    return metricsData.length > 0 ? metricsData : null;
  }, [selectedMetricIds, filteredAthletes, metrics, records, startDate]);



  const handleMetricToggle = (metricId) => {
    setSelectedMetricIds(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleExportCSV = () => {
    if (!snapshotData) return;

    // Build CSV with all metrics
    const headerParts = ['Athlete'];
    snapshotData.forEach(({ metric, dates }) => {
      dates.forEach(date => {
        try {
          const [year, month, day] = date.split('-');
          const formattedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
          headerParts.push(`${metric.name} - ${formattedDate}`);
        } catch (e) {
          headerParts.push(`${metric.name} - ${date}`);
        }
      });
    });
    
    const rows = [headerParts];

    filteredAthletes.forEach(athlete => {
      const row = [`${athlete.first_name} ${athlete.last_name}`];
      
      snapshotData.forEach(({ metric, dates, dataByAthlete }) => {
        dates.forEach(date => {
          const value = dataByAthlete[athlete.id][date];
          row.push(value !== undefined ? value.toFixed(metric.decimal_places ?? 2) : '');
        });
      });
      
      rows.push(row);
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const metricNames = snapshotData.map(d => d.metric.name).join('_');
    link.download = `Snapshot_${metricNames}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleView = () => {
    setShowResults(true);
    setIsEditing(false);
    setEditedValues({});
  };

  const handleReset = () => {
    setSelectedMetricIds([]);
    setShowResults(false);
    setIsEditing(false);
    setEditedValues({});
    setStartDate(null);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditedValues({});
    }
    setIsEditing(!isEditing);
  };

  const handleValueEdit = (athleteId, metricId, date, value) => {
    const key = `${athleteId}|||${metricId}|||${date}`;
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [];
      
      // Process edited values
      for (const [key, value] of Object.entries(editedValues)) {
        const [athleteId, metricId, date] = key.split('|||');
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) continue;

        // Find existing record
        const existingRecord = records.find(r => 
          r.athlete_id === athleteId && 
          r.metric_id === metricId && 
          r.recorded_date === date
        );

        if (existingRecord) {
          // Update existing record
          updates.push(MetricRecord.update(existingRecord.id, { value: numValue }));
        } else {
          // Create new record with organization_id
          const athlete = athletes.find(a => a.id === athleteId);
          updates.push(MetricRecord.create({
            athlete_id: athleteId,
            metric_id: metricId,
            value: numValue,
            recorded_date: date,
            organization_id: athlete?.organization_id
          }));
        }
      }

      // Wait for all updates to complete
      await Promise.all(updates);

      // Clear edited values and exit edit mode
      setEditedValues({});
      setIsEditing(false);

      // Refresh data - trigger parent reload
      window.location.reload();
    } catch (error) {
      console.error('Error saving records:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Metric selection view
  if (!showResults) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Grid3X3 className="w-6 h-6 text-blue-400" />
              Select Metrics for Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Metric Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-300">Select Metrics</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-900 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
                {metrics.filter(m => !m.is_auto_calculated && m.is_active !== false).map(metric => (
                  <label
                    key={metric.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedMetricIds.includes(metric.id)
                        ? 'bg-blue-500/20 border-2 border-blue-400'
                        : 'bg-gray-800 border-2 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMetricIds.includes(metric.id)}
                      onChange={() => handleMetricToggle(metric.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-white font-semibold">{metric.name}</div>
                      <div className="text-gray-400 text-xs">{metric.unit}</div>
                    </div>
                  </label>
                ))}
              </div>
              {metrics.filter(m => !m.is_auto_calculated && m.is_active !== false).length === 0 && (
                <p className="text-sm text-gray-400">No metrics available. Please create metrics first.</p>
              )}
              {selectedMetricIds.length > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50">
                  {selectedMetricIds.length} metric{selectedMetricIds.length !== 1 ? 's' : ''} selected
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onBack}
                className="border-gray-700 text-gray-300"
              >
                Back
              </Button>
              {selectedMetricIds.length > 0 && (
                <Button
                  onClick={handleView}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
                >
                  View Snapshot
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results view
  if (!snapshotData) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-12 text-center">
          <p className="text-gray-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-3">
              Performance Snapshot
            </h2>
            
            {/* Filter Dropdown */}
            <div className="flex gap-3 mb-4">
              <Select value={filterType} onValueChange={(value) => {
                setFilterType(value);
                setFilterValue('all');
              }}>
                <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-white focus:bg-white focus:text-black">All Athletes</SelectItem>
                  <SelectItem value="team" className="text-white focus:bg-white focus:text-black">Filter by Team</SelectItem>
                  <SelectItem value="class" className="text-white focus:bg-white focus:text-black">Filter by Class</SelectItem>
                </SelectContent>
              </Select>
              
              {filterType === 'team' && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[200px] bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all" className="text-white focus:bg-white focus:text-black">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id} className="text-white focus:bg-white focus:text-black">
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {filterType === 'class' && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[200px] bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all" className="text-white focus:bg-white focus:text-black">All Classes</SelectItem>
                    {classPeriods.map(period => (
                      <SelectItem key={period.id} value={period.name} className="text-white focus:bg-white focus:text-black">
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-gray-800 text-white border border-gray-700">
                {filteredAthletes.length} Athletes
              </Badge>
              <Badge className="bg-gray-800 text-white border border-gray-700">
                {selectedMetricIds.length} Metric{selectedMetricIds.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {startDate ? `Since ${format(new Date(startDate), 'MMM d, yyyy')}` : 'Show since...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, 'yyyy-MM-dd'));
                        setShowDatePicker(false);
                      }
                    }}
                    modifiers={{
                      hasData: (date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        return datesWithData.has(dateStr);
                      }
                    }}
                    modifiersStyles={{
                      hasData: {
                        border: '2px solid #60a5fa',
                        borderRadius: '4px'
                      }
                    }}
                    className="bg-gray-950 text-white"
                  />
                  {startDate && (
                    <div className="p-2 border-t border-gray-800">
                      <Button
                        onClick={() => {
                          setStartDate(null);
                          setShowDatePicker(false);
                        }}
                        variant="outline"
                        className="w-full border-gray-700 text-white hover:bg-gray-800"
                      >
                        Clear Date Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || Object.keys(editedValues).length === 0}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleEditToggle}
                    variant="outline"
                    className="border-gray-700 text-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleEditToggle}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-gray-700 text-gray-300"
                  >
                    Back
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="border-b-2 border-gray-700">
                  <th className="sticky left-0 z-40 bg-gray-900 p-3 text-left text-white font-bold border-r-2 border-gray-700">
                    Athlete
                  </th>
                  {snapshotData.map(({ metric, dates }) => (
                    <th 
                      key={metric.id}
                      colSpan={dates.length} 
                      className="bg-gray-800 p-3 text-center text-white font-bold border-r-2 border-gray-700"
                    >
                      {metric.name} ({metric.unit})
                    </th>
                  ))}
                </tr>
                <tr className="border-b-2 border-gray-700">
                  <th className="sticky left-0 z-40 bg-gray-900 p-3 border-r-2 border-gray-700"></th>
                  {snapshotData.map(({ metric, dates }) => 
                   dates.map(date => (
                     <th key={`${metric.id}-${date}`} className="bg-gray-900 p-2 text-center text-white font-semibold text-xs min-w-[100px] border-r border-gray-800">
                       {(() => {
                         try {
                           if (!date) return 'Invalid Date';
                           const [year, month, day] = date.split('-');
                           if (!year || !month || !day) return 'Invalid Date';
                           return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                         } catch (e) {
                           console.error('Date parsing error:', date, e);
                           return 'Invalid Date';
                         }
                       })()}
                     </th>
                   ))
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAthletes.map((athlete, athleteIndex) => (
                  <tr 
                    key={athlete.id} 
                    className={`border-b border-gray-800 ${athleteIndex % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/50'}`}
                  >
                    <td className={`sticky left-0 z-20 p-3 font-semibold text-white border-r-2 border-gray-700 ${athleteIndex % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/50'}`}>
                      {athlete.first_name} {athlete.last_name}
                    </td>
                    {snapshotData.map(({ metric, dates, dataByAthlete, prByAthlete }) => {
                      const pr = prByAthlete[athlete.id];
                      
                      return dates.map(date => {
                            const value = dataByAthlete[athlete.id][date];
                            const isPR = value !== undefined && pr !== undefined && value === pr;
                            const key = `${athlete.id}|||${metric.id}|||${date}`;
                            const editedValue = editedValues[key];
                            const displayValue = editedValue !== undefined ? editedValue : value;

                            // DEBUG: Log value processing for first few cells
                            if (Math.random() < 0.05) { // Only log 5% to avoid console spam
                              console.log('Cell value debug:', {
                                athleteName: `${athlete.first_name} ${athlete.last_name}`,
                                metricName: metric.name,
                                date,
                                rawValue: value,
                                displayValue,
                                decimalPlaces: metric.decimal_places,
                                isNumber: typeof displayValue === 'number',
                                isPR
                              });
                            }

                            return (
                              <td 
                                key={`${athlete.id}-${metric.id}-${date}`} 
                                className={`p-2 text-center font-mono font-semibold border-r border-gray-800 ${
                                  isPR 
                                    ? 'bg-yellow-400 text-black' 
                                    : value !== undefined 
                                      ? 'bg-black text-white' 
                                      : ''
                                }`}
                                >
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step={metric.decimal_places === 0 ? '1' : `0.${'0'.repeat(metric.decimal_places - 1)}1`}
                                    value={displayValue !== undefined ? displayValue : ''}
                                    onChange={(e) => handleValueEdit(athlete.id, metric.id, date, e.target.value)}
                                    className="w-20 h-8 text-center bg-gray-800 border-gray-700 text-white font-mono"
                                    placeholder="-"
                                  />
                                ) : (
                                  displayValue !== undefined && displayValue !== null 
                                    ? Number(displayValue).toFixed(metric.decimal_places ?? 2) 
                                    : '-'
                                )}
                              </td>
                            );
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-6 items-center text-sm">
            <span className="text-gray-400 font-semibold">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 rounded border border-yellow-500"></div>
              <span className="text-white">Personal Record (PR)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded border border-gray-700"></div>
              <span className="text-white">Non-PR Value</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}