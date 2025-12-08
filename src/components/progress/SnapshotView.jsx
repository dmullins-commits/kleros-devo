import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Grid3X3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SnapshotView({ 
  athletes, 
  metrics, 
  records, 
  teams, 
  classPeriods,
  onBack 
}) {
  const [filterType, setFilterType] = useState(""); // "team" or "class"
  const [selectedFilterId, setSelectedFilterId] = useState("");
  const [selectedMetricIds, setSelectedMetricIds] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // When selectedFilterId changes in results view, keep the same metrics
  useEffect(() => {
    if (showResults && selectedFilterId && selectedMetricIds.length > 0) {
      // Just trigger a re-render with new filtered athletes
      // The useMemo hooks will automatically recalculate with new data
    }
  }, [selectedFilterId, showResults]);

  // Get filtered athletes
  const filteredAthletes = useMemo(() => {
    if (!selectedFilterId) return [];

    return athletes.filter(athlete => {
      if (filterType === "team") {
        return athlete.team_ids?.includes(selectedFilterId);
      }
      if (filterType === "class") {
        const athletePeriod = (athlete.class_period || "").toLowerCase().replace(/[^0-9a-z]/g, '');
        const selectedPeriod = selectedFilterId.toLowerCase().replace(/[^0-9a-z]/g, '');
        return athletePeriod === selectedPeriod || 
               athlete.class_period === selectedFilterId ||
               athletePeriod.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '') === 
               selectedPeriod.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '');
      }
      return false;
    }).sort((a, b) => {
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
  }, [athletes, filterType, selectedFilterId]);

  // Get all records for selected metrics and athletes
  const snapshotData = useMemo(() => {
    if (selectedMetricIds.length === 0 || filteredAthletes.length === 0) return null;

    const athleteIds = new Set(filteredAthletes.map(a => a.id));
    
    // Build data for each metric
    const metricsData = selectedMetricIds.map(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) return null;

      const metricRecords = records.filter(r => 
        r.metric_id === metricId && athleteIds.has(r.athlete_id)
      );

      // Get unique dates and sort them
      const dates = [...new Set(metricRecords.map(r => r.recorded_date))].sort();

      // Build data structure: athlete -> date -> value
      const dataByAthlete = {};
      const prByAthlete = {};

      filteredAthletes.forEach(athlete => {
        dataByAthlete[athlete.id] = {};
        
        const athleteRecords = metricRecords.filter(r => r.athlete_id === athlete.id);
        
        // Calculate PR for this athlete
        if (athleteRecords.length > 0) {
          prByAthlete[athlete.id] = metric.target_higher
            ? Math.max(...athleteRecords.map(r => r.value))
            : Math.min(...athleteRecords.map(r => r.value));
        }

        // Map records by date
        athleteRecords.forEach(record => {
          dataByAthlete[athlete.id][record.recorded_date] = record.value;
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
  }, [selectedMetricIds, filteredAthletes, metrics, records]);

  const handleView = () => {
    if (selectedFilterId && selectedMetricIds.length > 0) {
      setShowResults(true);
    }
  };

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
        headerParts.push(`${metric.name} - ${new Date(date).toLocaleDateString()}`);
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
    
    const filterName = filterType === "team" 
      ? teams.find(t => t.id === selectedFilterId)?.name || 'Team'
      : selectedFilterId;
    
    const metricNames = snapshotData.map(d => d.metric.name).join('_');
    link.download = `${filterName}_${metricNames}_Snapshot.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFilterType("");
    setSelectedFilterId("");
    setSelectedMetricIds([]);
    setShowResults(false);
  };

  const selectedTeam = teams.find(t => t.id === selectedFilterId);

  // Setup view
  if (!showResults) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Grid3X3 className="w-6 h-6 text-blue-400" />
              Snapshot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Filter Type Selection */}
            {!filterType && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">Step 1: Select Filter Type</label>
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setFilterType("team")}
                    variant="outline"
                    className="h-16 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-blue-400"
                  >
                    <span className="font-bold">By Team</span>
                  </Button>
                  <Button
                    onClick={() => setFilterType("class")}
                    variant="outline"
                    className="h-16 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-blue-400"
                  >
                    <span className="font-bold">By Class Period</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Team/Class Selection */}
            {filterType && !selectedFilterId && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">
                  Step 2: Select {filterType === "team" ? "Team" : "Class Period"}
                </label>
                <Select value={selectedFilterId} onValueChange={setSelectedFilterId}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder={`Choose a ${filterType === "team" ? "team" : "class period"}...`} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {filterType === "team" ? (
                      teams.map(team => (
                        <SelectItem key={team.id} value={team.id} className="text-white">
                          {team.name} - {team.sport}
                        </SelectItem>
                      ))
                    ) : (
                      classPeriods.map(period => (
                        <SelectItem key={period.id} value={period.name} className="text-white">
                          {period.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Metric Selection */}
            {selectedFilterId && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">Step 3: Select Metrics</label>
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
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {(filterType || selectedFilterId || selectedMetricIds.length > 0) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-gray-700 text-gray-300"
                >
                  Reset
                </Button>
              )}
              {filterType && !selectedFilterId && (
                <Button
                  variant="outline"
                  onClick={() => setFilterType("")}
                  className="border-gray-700 text-gray-300"
                >
                  Back
                </Button>
              )}
              {selectedFilterId && selectedMetricIds.length > 0 && (
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

        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-700 text-gray-300"
        >
          Back to Progress Tracking
        </Button>
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
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge className="bg-gray-800 text-white border border-gray-700">
                  {filteredAthletes.length} Athletes
                </Badge>
                <Badge className="bg-gray-800 text-white border border-gray-700">
                  {selectedMetricIds.length} Metric{selectedMetricIds.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {/* Filter Toggle Dropdown */}
              <div className="max-w-sm">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Switch {filterType === "team" ? "Team" : "Class Period"}
                </label>
                <Select value={selectedFilterId} onValueChange={setSelectedFilterId}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {filterType === "team" ? (
                      teams.map(team => (
                        <SelectItem key={team.id} value={team.id} className="text-white">
                          {team.name} - {team.sport}
                        </SelectItem>
                      ))
                    ) : (
                      classPeriods.map(period => (
                        <SelectItem key={period.id} value={period.name} className="text-white">
                          {period.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleExportCSV}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowResults(false)}
                className="border-gray-700 text-gray-300"
              >
                Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="sticky left-0 z-20 bg-gray-900 p-3 text-left text-white font-bold border-r-2 border-gray-700">
                    Athlete
                  </th>
                  {snapshotData.map(({ metric, dates }) => (
                    <React.Fragment key={metric.id}>
                      <th 
                        colSpan={dates.length} 
                        className="bg-gray-800 p-3 text-center text-white font-bold border-r-2 border-gray-700"
                      >
                        {metric.name} ({metric.unit})
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
                <tr className="border-b-2 border-gray-700">
                  <th className="sticky left-0 z-20 bg-gray-900 p-3 border-r-2 border-gray-700"></th>
                  {snapshotData.map(({ dates }) => (
                    <React.Fragment key={dates.join('-')}>
                      {dates.map(date => (
                        <th key={date} className="bg-gray-900 p-2 text-center text-white font-semibold text-xs min-w-[100px] border-r border-gray-800">
                          {new Date(date).toLocaleDateString()}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAthletes.map((athlete, athleteIndex) => (
                  <tr 
                    key={athlete.id} 
                    className={`border-b border-gray-800 ${athleteIndex % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/50'}`}
                  >
                    <td className="sticky left-0 z-10 bg-gray-900 p-3 font-semibold text-white border-r-2 border-gray-700">
                      {athlete.first_name} {athlete.last_name}
                    </td>
                    {snapshotData.map(({ metric, dates, dataByAthlete, prByAthlete }) => {
                      const pr = prByAthlete[athlete.id];
                      
                      return (
                        <React.Fragment key={`${athlete.id}-${metric.id}`}>
                          {dates.map(date => {
                            const value = dataByAthlete[athlete.id][date];
                            const isPR = value !== undefined && pr !== undefined && value === pr;
                            
                            return (
                              <td 
                                key={`${athlete.id}-${metric.id}-${date}`} 
                                className={`p-3 text-center font-mono font-semibold border-r border-gray-800 ${
                                  isPR 
                                    ? 'bg-yellow-400 text-black' 
                                    : value !== undefined 
                                      ? 'bg-black text-white' 
                                      : ''
                                }`}
                              >
                                {value !== undefined ? value.toFixed(metric.decimal_places ?? 2) : '-'}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      );
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