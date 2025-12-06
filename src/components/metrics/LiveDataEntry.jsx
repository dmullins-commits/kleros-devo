import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clipboard, Play, Save, ArrowUpDown, CheckCircle, Trophy, Medal, Award, Check, UserPlus } from "lucide-react";
import { Team, MetricRecord, ClassPeriod, Athlete } from "@/entities/all";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateAllAutoMetrics } from "@/components/utils";
import { useTeam } from "@/components/TeamContext";
import PrintableLeaderboard from "./PrintableLeaderboard";
import QuickAddAthleteModal from "./QuickAddAthleteModal";

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function LiveDataEntry({ metrics: rawMetrics, athletes: rawAthletes, onDataSaved, isLoading }) {
  const { selectedOrganization } = useTeam();
  const [teams, setTeams] = useState([]);
  const [classPeriods, setClassPeriods] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedClassPeriod, setSelectedClassPeriod] = useState("all");
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [testDate, setTestDate] = useState(getLocalDateString());
  const [dataGrid, setDataGrid] = useState([]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allRecords, setAllRecords] = useState([]);
  const [showFemaleLeaderboard, setShowFemaleLeaderboard] = useState(true);
  const [showPrintableLeaderboard, setShowPrintableLeaderboard] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Normalize athletes and metrics to handle nested data structures
  const athletes = (rawAthletes || []).map(a => ({
    id: a.id,
    first_name: a.data?.first_name || a.first_name,
    last_name: a.data?.last_name || a.last_name,
    team_ids: a.data?.team_ids || a.team_ids || [],
    class_period: a.data?.class_period || a.class_period,
    gender: a.data?.gender || a.gender,
    status: a.data?.status || a.status || 'active'
  }));

  const metrics = (rawMetrics || []).map(m => ({
    id: m.id,
    name: m.data?.name || m.name,
    unit: m.data?.unit || m.unit,
    category: m.data?.category || m.category,
    target_higher: m.data?.target_higher ?? m.target_higher ?? true,
    decimal_places: m.data?.decimal_places ?? m.decimal_places ?? 2,
    is_auto_calculated: m.data?.is_auto_calculated ?? m.is_auto_calculated ?? false,
    is_hidden: m.data?.is_hidden ?? m.is_hidden ?? false
  }));

  useEffect(() => {
    loadTeams();
    loadClassPeriods();
    loadAllRecords();
  }, []);

  const loadTeams = async () => {
    const teamsData = await Team.list();
    // Normalize teams to handle nested data structures
    const normalizedTeams = teamsData.map(t => ({
      id: t.id,
      name: t.data?.name || t.name,
      sport: t.data?.sport || t.sport
    }));
    setTeams(normalizedTeams);
  };

  const loadClassPeriods = async () => {
    const periodsData = await ClassPeriod.list();
    // Normalize class periods to handle nested data structures
    const normalizedPeriods = periodsData.map(p => ({
      id: p.id,
      name: p.data?.name || p.name,
      order: p.data?.order ?? p.order ?? 0
    }));
    setClassPeriods(normalizedPeriods.sort((a, b) => a.order - b.order));
  };

  const loadAllRecords = async () => {
    const recordsData = await MetricRecord.list();
    // Normalize records to handle nested data structures
    const normalizedRecords = recordsData.map(r => ({
      id: r.id,
      athlete_id: r.data?.athlete_id || r.athlete_id,
      metric_id: r.data?.metric_id || r.metric_id,
      value: r.data?.value ?? r.value,
      recorded_date: r.data?.recorded_date || r.recorded_date
    }));
    setAllRecords(normalizedRecords);
  };

  const handleMetricToggle = (metricId) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const beginTesting = () => {
    // Filter to only active athletes
    let teamAthletes = athletes.filter(a => a.status === 'active' || !a.status);
    
    // Filter by team if selected
    if (selectedTeamId && selectedTeamId !== "" && selectedTeamId !== "null") {
      teamAthletes = teamAthletes.filter(a => a.team_ids?.includes(selectedTeamId));
    }

    if (selectedClassPeriod !== "all") {
      teamAthletes = teamAthletes.filter(a => a.class_period === selectedClassPeriod);
    }
    
    console.log('Athletes for testing:', teamAthletes.length, teamAthletes);

    teamAthletes.sort((a, b) => {
      const periodA = a.class_period || 'ZZZ';
      const periodB = b.class_period || 'ZZZ';

      if (periodA !== periodB) {
        return periodA.localeCompare(periodB);
      }

      const lastNameA = a.last_name || '';
      const lastNameB = b.last_name || '';
      return lastNameA.localeCompare(lastNameB);
    });

    const initialGrid = teamAthletes.map(athlete => ({
      athlete_id: athlete.id,
      athlete_name: `${athlete.first_name} ${athlete.last_name}`,
      gender: athlete.gender,
      class_period: athlete.class_period || 'N/A',
      values: {}
    }));

    setDataGrid(initialGrid);
    setIsTestingMode(true);
    setSaveSuccess(false);
  };

  const handleAthleteAdded = async (newAthlete) => {
    // Add the new athlete to the dataGrid immediately without refreshing parent
    // This prevents losing entered data during testing mode
    const newRow = {
      athlete_id: newAthlete.id,
      athlete_name: `${newAthlete.first_name} ${newAthlete.last_name}`,
      gender: newAthlete.gender,
      class_period: newAthlete.class_period || 'N/A',
      values: {}
    };
    
    setDataGrid(prev => [...prev, newRow]);
  };

  const handleValueChange = (athleteId, metricId, value) => {
    setDataGrid(prev => prev.map(row =>
      row.athlete_id === athleteId
        ? { ...row, values: { ...row.values, [metricId]: value } }
        : row
    ));
  };

  const handleSort = (column) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);

    const sorted = [...dataGrid].sort((a, b) => {
      let aVal, bVal;

      if (column === 'name') {
        aVal = a.athlete_name;
        bVal = b.athlete_name;
      } else if (column === 'class_period') {
        aVal = a.class_period;
        bVal = b.class_period;
      } else {
        aVal = parseFloat(a.values[column]) || 0;
        bVal = parseFloat(b.values[column]) || 0;
      }

      if (aVal < bVal) return newDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return newDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setDataGrid(sorted);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const recordsToCreate = [];

      dataGrid.forEach(row => {
        Object.entries(row.values).forEach(([metricId, value]) => {
          if (value && value !== '') {
            recordsToCreate.push({
              athlete_id: row.athlete_id,
              metric_id: metricId,
              value: parseFloat(value),
              recorded_date: testDate
            });
          }
        });
      });

      if (recordsToCreate.length > 0) {
        await MetricRecord.bulkCreate(recordsToCreate);
        
        // Update height and weight from metrics
        const athleteIds = [...new Set(recordsToCreate.map(r => r.athlete_id))];
        const allRecords = await MetricRecord.list();
        
        for (const athleteId of athleteIds) {
          const athleteUpdate = {};
          
          // Find Height metric
          const heightMetric = metrics.find(m => m.name === 'Height');
          if (heightMetric) {
            const heightRecords = allRecords.filter(r => r.athlete_id === athleteId && r.metric_id === heightMetric.id)
              .sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
            if (heightRecords.length > 0) {
              athleteUpdate.height = heightRecords[0].value;
            }
          }
          
          // Find Bodyweight metric
          const bodyweightMetric = metrics.find(m => m.name === 'Bodyweight');
          if (bodyweightMetric) {
            const bodyweightRecords = allRecords.filter(r => r.athlete_id === athleteId && r.metric_id === bodyweightMetric.id)
              .sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
            if (bodyweightRecords.length > 0) {
              athleteUpdate.weight = bodyweightRecords[0].value;
            }
          }
          
          // Update auto-calculated metrics
          if (selectedOrganization?.auto_calc_settings) {
            const calculatedMetrics = await calculateAllAutoMetrics(
              athleteId,
              allRecords,
              metrics,
              selectedOrganization.auto_calc_settings
            );
            athleteUpdate.calculated_metrics = calculatedMetrics;
          }
          
          if (Object.keys(athleteUpdate).length > 0) {
            await Athlete.update(athleteId, athleteUpdate);
          }
        }
        
        setSaveSuccess(true);
        await loadAllRecords();
        onDataSaved();

        setTimeout(() => {
          setShowPrintableLeaderboard(true);
        }, 1000);

        setTimeout(() => {
          setIsTestingMode(false);
          setSelectedMetrics([]);
          setSelectedTeamId("");
          setSelectedClassPeriod("all");
          setDataGrid([]);
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving records:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAthletePR = (athleteId, metricId) => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return null;

    const athleteRecords = allRecords.filter(r => r.athlete_id === athleteId && r.metric_id === metricId);
    if (athleteRecords.length === 0) return null;

    if (metric.target_higher) {
      return Math.max(...athleteRecords.map(r => r.value));
    } else {
      return Math.min(...athleteRecords.map(r => r.value));
    }
  };

  const isNewPR = (athleteId, metricId, currentValue) => {
    if (!currentValue || currentValue === '') return false;
    
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return false;

    const pr = getAthletePR(athleteId, metricId);
    if (pr === null) return true;

    const value = parseFloat(currentValue);
    return metric.target_higher ? value > pr : value < pr;
  };

  const getLeaderboardData = (gender) => {
    if (selectedMetrics.length === 0) return [];

    const metricId = selectedMetrics[0];
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return [];

    const leaderboard = dataGrid
      .filter(row => !gender || row.gender === gender)
      .map(row => {
        const currentBest = row.values[metricId] ? parseFloat(row.values[metricId]) : null;
        const pr = getAthletePR(row.athlete_id, metricId);
        
        return {
          athlete_id: row.athlete_id,
          athlete_name: row.athlete_name,
          current_value: currentBest,
          pr: pr,
          is_new_pr: currentBest && pr && (
            metric.target_higher ? currentBest > pr : currentBest < pr
          ) || (currentBest && pr === null)
        };
      })
      .filter(item => item.current_value !== null)
      .sort((a, b) => {
        if (metric.target_higher) {
          return b.current_value - a.current_value;
        } else {
          return a.current_value - b.current_value;
        }
      });

    return leaderboard;
  };

  const renderLeaderboard = (leaderboardData, title) => {
    const primaryMetric = selectedMetricObjects[0];

    return (
      <Card className="bg-gradient-to-br from-amber-950/30 via-gray-950 to-gray-950 border-2 border-amber-400/40 sticky top-4">
        <CardHeader className="border-b border-amber-400/30 bg-gradient-to-r from-amber-900/20 to-transparent">
          <CardTitle className="flex items-center gap-3 text-amber-200">
            <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
            {title}
          </CardTitle>
          {primaryMetric && (
            <p className="text-sm text-amber-300/70 font-semibold mt-1">
              {primaryMetric.name} ({primaryMetric.unit})
            </p>
          )}
        </CardHeader>
        <CardContent className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">Start entering data to see live rankings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardData.map((item, index) => {
                const Icon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Award : null;
                const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-500';
                const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-2 border-yellow-400/50' : 
                                index === 1 ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/10 border-2 border-gray-400/50' : 
                                index === 2 ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-2 border-amber-500/50' : 
                                'bg-gray-900/50 border border-gray-700';

                return (
                  <div key={item.athlete_id} className={`p-3 rounded-lg ${bgColor} transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8">
                        {Icon ? (
                          <Icon className={`w-6 h-6 ${rankColor}`} />
                        ) : (
                          <span className={`text-lg font-black ${rankColor}`}>#{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold truncate">{item.athlete_name}</p>
                          {item.is_new_pr && (
                            <>
                              <Check className="w-4 h-4 text-green-400" />
                              <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs">
                                NEW PR!
                              </Badge>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-semibold">
                          PR: {item.pr ? item.pr.toFixed(primaryMetric?.decimal_places ?? 2) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-black ${index < 3 ? rankColor : 'text-white'}`}>
                          {item.current_value.toFixed(primaryMetric?.decimal_places ?? 2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const selectedMetricObjects = metrics
    .filter(m => selectedMetrics.includes(m.id) && !m.is_auto_calculated)
    .sort((a, b) => {
      if (a.is_hidden === b.is_hidden) return a.name.localeCompare(b.name);
      return a.is_hidden ? 1 : -1;
    });

  const selectableMetrics = metrics.filter(m => !m.is_auto_calculated);

  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!isTestingMode) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="flex items-center gap-3 text-white">
            <Clipboard className="w-6 h-6 text-yellow-400" />
            Setup Live Data Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Test Date</label>
            <Input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Select Team (Optional)</label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="All Athletes" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value={null} className="text-white">All Athletes</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id} className="text-white">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Filter by Class Period</label>
              <Select value={selectedClassPeriod} onValueChange={setSelectedClassPeriod}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-white">All Periods</SelectItem>
                  {classPeriods.map(period => (
                    <SelectItem key={period.id} value={period.name} className="text-white">
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 block mb-3">
              Select Metrics to Record
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectableMetrics.map(metric => (
                <div
                  key={metric.id}
                  onClick={() => handleMetricToggle(metric.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedMetrics.includes(metric.id)
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                  } ${metric.is_hidden ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-medium">{metric.name}</h4>
                      <p className="text-gray-400 text-xs mt-1">{metric.unit}</p>
                      {metric.is_hidden && (
                        <Badge className="mt-2 text-xs bg-gray-700 text-gray-400">Hidden</Badge>
                      )}
                    </div>
                    {selectedMetrics.includes(metric.id) && (
                      <CheckCircle className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={beginTesting}
            disabled={selectedMetrics.length === 0}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-6 text-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Begin Testing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const maleLeaderboard = getLeaderboardData('Male');
  const femaleLeaderboard = getLeaderboardData('Female');
  const primaryMetric = selectedMetricObjects[0];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Clipboard className="w-6 h-6 text-yellow-400" />
                  Live Data Entry - {new Date(testDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                    {dataGrid.length} athletes • {selectedMetrics.length} metrics
                  </Badge>
                  <Button
                    onClick={() => setShowQuickAddModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-black font-black"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Athlete
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {saveSuccess && (
                <Alert className="mb-6 bg-green-950/20 border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-300">
                    Successfully saved {dataGrid.reduce((sum, row) => sum + Object.keys(row.values).length, 0)} records!
                  </AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto overflow-y-auto mb-6 border border-gray-800 rounded-lg">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b-2 border-gray-700">
                      <th className="text-left p-3 bg-gray-900">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('class_period')}
                          className="text-gray-300 hover:text-white font-semibold"
                        >
                          Period
                          <ArrowUpDown className="w-4 h-4 ml-2" />
                        </Button>
                      </th>
                      <th className="text-left p-3 bg-gray-900">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('name')}
                          className="text-gray-300 hover:text-white font-semibold"
                        >
                          Athlete Name
                          <ArrowUpDown className="w-4 h-4 ml-2" />
                        </Button>
                      </th>
                      {selectedMetricObjects.map(metric => (
                        <React.Fragment key={metric.id}>
                          <th className="text-left p-3 bg-gray-900">
                            <div className="text-gray-300 font-semibold flex flex-col">
                              <span>All-Time PR</span>
                              <span className="text-xs text-gray-500 font-normal">({metric.unit})</span>
                            </div>
                          </th>
                          <th className="text-left p-3 bg-gray-900">
                            <div className="text-gray-300 font-semibold flex flex-col">
                              <span>{metric.target_higher ? '90%' : '110%'} of PR</span>
                              <span className="text-xs text-gray-500 font-normal">({metric.unit})</span>
                            </div>
                          </th>
                          <th className="text-left p-3 bg-gray-900">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort(metric.id)}
                              className="text-gray-300 hover:text-white font-semibold flex-col items-start"
                            >
                              <span>{metric.name}</span>
                              <span className="text-xs text-gray-500 font-normal">({metric.unit})</span>
                              <ArrowUpDown className="w-4 h-4 ml-2" />
                            </Button>
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataGrid.map((row, index) => {
                      const hasNewPR = selectedMetrics.some(metricId => 
                        isNewPR(row.athlete_id, metricId, row.values[metricId])
                      );

                      return (
                        <tr key={row.athlete_id} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/50'}`}>
                          <td className="p-3">
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              {row.class_period}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className={`font-medium ${hasNewPR ? 'bg-yellow-400 text-black px-2 py-1 rounded' : 'text-white'}`}>
                              {row.athlete_name}
                            </span>
                          </td>
                          {selectedMetricObjects.map(metric => {
                            const decimalPlaces = metric.decimal_places ?? 2;
                            const step = decimalPlaces === 0 ? '1' : `0.${'0'.repeat(decimalPlaces - 1)}1`;
                            const placeholder = decimalPlaces === 0 ? '0' : `0.${'0'.repeat(decimalPlaces)}`;
                            const pr = getAthletePR(row.athlete_id, metric.id);
                            const threshold = pr ? (metric.target_higher ? pr * 0.9 : pr * 1.1).toFixed(decimalPlaces) : null;
                            
                            return (
                              <React.Fragment key={metric.id}>
                                <td className="p-3">
                                  <span className="text-gray-400 font-semibold">
                                    {pr !== null ? pr.toFixed(decimalPlaces) : '-'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="text-gray-500 font-semibold">
                                    {threshold !== null ? threshold : '-'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <Input
                                    type="number"
                                    step={step}
                                    value={row.values[metric.id] || ''}
                                    onChange={(e) => handleValueChange(row.athlete_id, metric.id, e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white w-24"
                                    placeholder={placeholder}
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <Button
                  variant="outline"
                  onClick={() => setIsTestingMode(false)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black px-8"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save All Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
            <Checkbox
              id="show-female"
              checked={showFemaleLeaderboard}
              onCheckedChange={setShowFemaleLeaderboard}
              className="border-gray-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
            />
            <label htmlFor="show-female" className="text-white font-semibold cursor-pointer">
              Show Female Leaderboard
            </label>
          </div>
          
          {renderLeaderboard(maleLeaderboard, "MALE ATHLETES")}
          
          {showFemaleLeaderboard && (
            <div className="mt-4">
              {renderLeaderboard(femaleLeaderboard, "FEMALE ATHLETES")}
            </div>
          )}
        </div>
      </div>

      <PrintableLeaderboard
        open={showPrintableLeaderboard}
        onClose={() => setShowPrintableLeaderboard(false)}
        maleLeaderboard={maleLeaderboard}
        femaleLeaderboard={femaleLeaderboard}
        metric={primaryMetric}
        testDate={testDate}
      />

      <QuickAddAthleteModal
        open={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onAthleteAdded={handleAthleteAdded}
        prefilledTeamId={selectedTeamId}
        prefilledClassPeriod={selectedClassPeriod}
      />
    </>
  );
}