import React, { useState, useEffect, useCallback } from "react";
import { Athlete, Team, MetricRecord, Workout, Metric, VBTSession } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Target, Dumbbell, TrendingUp, Crown, Zap } from "lucide-react";
import { isYesterday, startOfMonth } from "date-fns";
import { useTeam } from "@/components/TeamContext";

import PerformanceStatsGrid from "../components/dashboard/PerformanceStatsGrid";
import PRsList from "../components/dashboard/PRsList";
import FlaggedAthletesList from "../components/dashboard/FlaggedAthletesList";

import TrendGraph from "../components/dashboard/TrendGraph";
import YesterdayOverview from "../components/dashboard/YesterdayOverview";

import TopPerformers from "../components/dashboard/TopPerformers";
import TeamOverview from "../components/dashboard/TeamOverview";

import { withRetry, staggeredApiCalls } from "@/components/utils/apiHelpers";

export default function Dashboard() {
  const { selectedTeamId, selectedOrganization, filteredTeams } = useTeam();
  const [athletes, setAthletes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [yesterdayOverviewData, setYesterdayOverviewData] = useState([]);
  const [incompleteWorkouts, setIncompleteWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);


  // Performance stats
  const [prsInLastSession, setPrsInLastSession] = useState(0);
  const [totalPRsThisMonth, setTotalPRsThisMonth] = useState(0);
  const [flaggedAthletes, setFlaggedAthletes] = useState(0);

  const [trendPercentage, setTrendPercentage] = useState(0);

  // Expanded data
  const [prsData, setPrsData] = useState([]);
  const [flaggedData, setFlaggedData] = useState([]);
  const [categoryGraphData, setCategoryGraphData] = useState({});
  const [graphData, setGraphData] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);

  const processYesterdayData = useCallback((allRecords, athletesData, metricsData) => {
    const yesterdayRecords = allRecords.filter(r => {
      if (!r.recorded_date) return false;
      const date = new Date(r.recorded_date);
      return !isNaN(date.getTime()) && isYesterday(date);
    });
    const overview = [];

    for (const record of yesterdayRecords) {
      const athlete = athletesData.find(a => a.id === record.athlete_id);
      const metric = metricsData.find(m => m.id === record.metric_id);
      if (!athlete || !metric) continue;

      const previousRecords = allRecords.filter(r => {
        if (!r.recorded_date || !record.recorded_date) return false;
        return r.athlete_id === record.athlete_id &&
               r.metric_id === record.metric_id &&
               new Date(r.recorded_date) < new Date(record.recorded_date);
      }).sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime());

      let trend = 'same';
      let change = 0;
      if (previousRecords.length > 0) {
        const previousRecord = previousRecords[0];
        change = record.value - previousRecord.value;

        if (change !== 0) {
          if (metric.target_higher) {
            trend = change > 0 ? 'up' : 'down';
          } else {
            trend = change < 0 ? 'up' : 'down';
          }
        }
      }
      
      overview.push({
        ...record,
        athleteName: `${athlete.first_name} ${athlete.last_name}`,
        metricName: metric.name,
        trend,
        change
      });
    }
    setYesterdayOverviewData(overview);
  }, []);

  const processIncompleteWorkouts = useCallback(async (athletesData) => {
    try {
      const vbtSessions = await withRetry(() => VBTSession.list());
      const yesterdayIncomplete = vbtSessions.filter(session => {
        if (!session.session_date) return false;
        const sessionDate = new Date(session.session_date);
        if (isNaN(sessionDate.getTime())) return false;
        const isYesterdaySession = isYesterday(sessionDate);
        const isIncomplete = session.completion_percentage < 100;
        return isYesterdaySession && isIncomplete;
      });

      const incompleteWithNames = yesterdayIncomplete.map(session => {
        const athlete = athletesData.find(a => a.id === session.athlete_id);
        return {
          ...session,
          athleteName: athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown Athlete'
        };
      });

      setIncompleteWorkouts(incompleteWithNames);
    } catch (error) {
      console.error('Error loading VBT sessions:', error);
      setIncompleteWorkouts([]);
    }
  }, []);

  const processPerformanceStats = useCallback((recordsData, athletesData, metricsData, teamsData) => {
    // Filter out records with invalid dates
    const validRecords = recordsData.filter(r => {
      if (!r.recorded_date) return false;
      const date = new Date(r.recorded_date);
      return !isNaN(date.getTime());
    });
    
    const sortedRecords = [...validRecords].sort((a, b) => 
      new Date(b.recorded_date) - new Date(a.recorded_date)
    );
    if (sortedRecords.length === 0) return;

    const latestDate = sortedRecords[0].recorded_date;
    const latestSessionRecords = recordsData.filter(r => r.recorded_date === latestDate);
    
    const athletesInSession = new Set(latestSessionRecords.map(r => r.athlete_id));

    let prsLastSession = 0;
    let prsThisMonth = 0;
    const prsDataMap = new Map();
    const monthStart = startOfMonth(new Date());

    latestSessionRecords.forEach(record => {
      const metric = metricsData.find(m => m.id === record.metric_id);
      if (!metric) return;

      const previousRecords = validRecords.filter(r => 
        r.athlete_id === record.athlete_id &&
        r.metric_id === record.metric_id &&
        new Date(r.recorded_date) < new Date(record.recorded_date)
      );

      if (previousRecords.length === 0) {
        prsLastSession++;
        if (new Date(record.recorded_date) >= monthStart) prsThisMonth++;
        
        const athlete = athletesData.find(a => a.id === record.athlete_id);
        if (athlete) {
          const key = `${record.athlete_id}_${record.metric_id}`;
          prsDataMap.set(key, {
            athleteName: `${athlete.first_name} ${athlete.last_name}`,
            metricName: metric.name,
            unit: metric.unit,
            improvement: record.value.toFixed(metric.decimal_places ?? 2),
            previousPR: 'N/A',
            newPR: record.value.toFixed(metric.decimal_places ?? 2)
          });
        }
      } else {
        const bestPrevious = metric.target_higher
          ? Math.max(...previousRecords.map(r => r.value))
          : Math.min(...previousRecords.map(r => r.value));
        
        const isPR = metric.target_higher 
          ? record.value > bestPrevious 
          : record.value < bestPrevious;

        if (isPR) {
          prsLastSession++;
          if (new Date(record.recorded_date) >= monthStart) prsThisMonth++;

          const athlete = athletesData.find(a => a.id === record.athlete_id);
          if (athlete) {
            const improvement = Math.abs(record.value - bestPrevious);
            const key = `${record.athlete_id}_${record.metric_id}`;
            prsDataMap.set(key, {
              athleteName: `${athlete.first_name} ${athlete.last_name}`,
              metricName: metric.name,
              unit: metric.unit,
              improvement: improvement.toFixed(metric.decimal_places ?? 2),
              previousPR: bestPrevious.toFixed(metric.decimal_places ?? 2),
              newPR: record.value.toFixed(metric.decimal_places ?? 2)
            });
          }
        }
      }
    });

    setPrsInLastSession(prsLastSession);
    setTotalPRsThisMonth(prsThisMonth);
    setPrsData(Array.from(prsDataMap.values()));

    const flaggedMap = new Map();
    let flaggedCount = 0;

    athletesData.forEach(athlete => {
      metricsData.forEach(metric => {
        const athleteRecords = validRecords
          .filter(r => r.athlete_id === athlete.id && r.metric_id === metric.id)
          .sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));

        if (athleteRecords.length >= 2) {
          const [latest, previous] = athleteRecords;
          const targetHigher = metric.target_higher !== false;
          const pr = targetHigher
            ? Math.max(...athleteRecords.map(r => r.value))
            : Math.min(...athleteRecords.map(r => r.value));
          
          // For "higher is better": threshold is 90% of PR (lower)
          // For "lower is better": threshold is 110% of PR (higher, since higher is worse)
          const threshold = targetHigher ? pr * 0.9 : pr * 1.1;
          
          const latestBelow = targetHigher 
            ? latest.value < threshold 
            : latest.value > threshold;
          const previousBelow = targetHigher 
            ? previous.value < threshold 
            : previous.value > threshold;

          if (latestBelow && previousBelow) {
            const key = `${athlete.id}_${metric.id}`;
            if (!flaggedMap.has(key)) {
              flaggedCount++;
              flaggedMap.set(key, {
                athleteName: `${athlete.first_name} ${athlete.last_name}`,
                metricName: metric.name,
                unit: metric.unit,
                pr: pr.toFixed(metric.decimal_places ?? 2),
                ninetyPercent: threshold.toFixed(metric.decimal_places ?? 2),
                latestValue: latest.value.toFixed(metric.decimal_places ?? 2),
                targetHigher: targetHigher
              });
            }
          }
        }
      });
    });

    setFlaggedAthletes(flaggedCount);
    setFlaggedData(Array.from(flaggedMap.values()));

    if (latestSessionRecords.length > 0) {
      const latestMetricId = latestSessionRecords[0].metric_id;
      const latestMetricObj = metricsData.find(m => m.id === latestMetricId);
      setLatestMetric(latestMetricObj);

      const metricRecords = validRecords.filter(r => r.metric_id === latestMetricId);
      const dates = [...new Set(metricRecords.map(r => r.recorded_date))].sort((a, b) => 
        new Date(b) - new Date(a)
      );

      if (dates.length >= 2) {
        const latestAvg = metricRecords
          .filter(r => r.recorded_date === dates[0])
          .reduce((sum, r) => sum + r.value, 0) / 
          metricRecords.filter(r => r.recorded_date === dates[0]).length;

        const previousAvg = metricRecords
          .filter(r => r.recorded_date === dates[1])
          .reduce((sum, r) => sum + r.value, 0) / 
          metricRecords.filter(r => r.recorded_date === dates[1]).length;

        const allPreviousRecords = metricRecords.filter(r => 
          new Date(r.recorded_date) < new Date(dates[0]) && 
          new Date(r.recorded_date) < new Date(dates[1])
        );
        const allPreviousAvg = allPreviousRecords.length > 0
          ? allPreviousRecords.reduce((sum, r) => sum + r.value, 0) / allPreviousRecords.length
          : 0;

        const percentChange = ((latestAvg - previousAvg) / previousAvg) * 100;
        setTrendPercentage(percentChange);

        const graphDataArray = [
          { name: 'All Previous', average: parseFloat(allPreviousAvg.toFixed(2)) },
          { name: 'Previous Session', average: parseFloat(previousAvg.toFixed(2)) },
          { name: 'Latest Session', average: parseFloat(latestAvg.toFixed(2)) }
        ];
        setGraphData(graphDataArray);
      }
    }

    // Build category-based graph data
    const categoryData = {};
    const categories = [...new Set(metricsData.map(m => m.category).filter(Boolean))];
    
    categories.forEach(category => {
      const categoryMetrics = metricsData.filter(m => m.category === category);
      const categoryRecords = validRecords.filter(r => 
        categoryMetrics.some(m => m.id === r.metric_id)
      );
      
      if (categoryRecords.length === 0) return;
      
      const dates = [...new Set(categoryRecords.map(r => r.recorded_date))].sort((a, b) => 
        new Date(b) - new Date(a)
      );
      
      if (dates.length >= 2) {
        const latestDateRecords = categoryRecords.filter(r => r.recorded_date === dates[0]);
        const previousDateRecords = categoryRecords.filter(r => r.recorded_date === dates[1]);
        const olderRecords = categoryRecords.filter(r => 
          new Date(r.recorded_date) < new Date(dates[1])
        );
        
        const latestAvg = latestDateRecords.reduce((sum, r) => sum + r.value, 0) / latestDateRecords.length;
        const previousAvg = previousDateRecords.reduce((sum, r) => sum + r.value, 0) / previousDateRecords.length;
        const olderAvg = olderRecords.length > 0 
          ? olderRecords.reduce((sum, r) => sum + r.value, 0) / olderRecords.length 
          : 0;
        
        categoryData[category] = [
          { name: 'All Previous', average: parseFloat(olderAvg.toFixed(2)) },
          { name: 'Previous Session', average: parseFloat(previousAvg.toFixed(2)) },
          { name: 'Latest Session', average: parseFloat(latestAvg.toFixed(2)) }
        ];
      }
    });
    
    setCategoryGraphData(categoryData);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all data first, then filter client-side for reliability
      const [athletesData, teamsData, allRecordsData, workoutsData, metricsData] = await staggeredApiCalls([
        () => withRetry(() => Athlete.list('-created_date', 10000)),
        () => Promise.resolve(filteredTeams),
        () => withRetry(() => MetricRecord.list('-recorded_date', 10000)),
        () => withRetry(() => Workout.list()),
        () => withRetry(() => Metric.list('-created_date', 1000))
      ], 200);
      
      // Normalize records - handle nested data structure
      const normalizedRecords = allRecordsData.map(r => ({
        id: r.id,
        athlete_id: r.data?.athlete_id || r.athlete_id,
        metric_id: r.data?.metric_id || r.metric_id,
        value: r.data?.value ?? r.value,
        recorded_date: r.data?.recorded_date || r.recorded_date,
        notes: r.data?.notes || r.notes,
        workout_id: r.data?.workout_id || r.workout_id
      }));
      
      // Normalize athletes
      const normalizedAthletes = athletesData.map(a => ({
        id: a.id,
        ...a.data,
        ...a,
        first_name: a.data?.first_name || a.first_name,
        last_name: a.data?.last_name || a.last_name,
        team_ids: a.data?.team_ids || a.team_ids || []
      }));
      
      // Normalize metrics
      const normalizedMetrics = metricsData.map(m => ({
        id: m.id,
        ...m.data,
        ...m,
        name: m.data?.name || m.name,
        unit: m.data?.unit || m.unit,
        category: m.data?.category || m.category,
        target_higher: m.data?.target_higher ?? m.target_higher ?? true,
        decimal_places: m.data?.decimal_places ?? m.decimal_places ?? 2
      }));
      
      // Filter athletes by team if a specific team is selected
      const filteredAthletes = selectedTeamId === 'all' 
        ? normalizedAthletes 
        : normalizedAthletes.filter(a => a.team_ids?.includes(selectedTeamId));
      
      // Use ALL records for stats calculation (not filtered by athlete) to properly calculate PRs
      // PRs need all historical data to determine if a value is a personal record
      
      setAthletes(filteredAthletes);
      setTeams(teamsData);
      setAllRecords(normalizedRecords);
      setRecentRecords(normalizedRecords.slice(0, 10));
      setWorkouts(workoutsData);
      setMetrics(normalizedMetrics);
      
      // Process stats with all records but filtered athletes
      processYesterdayData(normalizedRecords, filteredAthletes, normalizedMetrics);
      processIncompleteWorkouts(filteredAthletes);
      processPerformanceStats(normalizedRecords, filteredAthletes, normalizedMetrics, teamsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, selectedOrganization, filteredTeams, processYesterdayData, processIncompleteWorkouts, processPerformanceStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-yellow-600/5 blur-3xl" />
          <div className="relative z-10 text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Crown className="w-16 h-16 text-yellow-400" />
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 animate-pulse" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
              COMMAND CENTER
            </h1>
            <p className="text-gray-400 text-lg font-medium tracking-wide">
              Elite Performance Management System
            </p>
            <div className="flex justify-center gap-8 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">Real-time tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">Performance analytics</span>
              </div>
            </div>

          </div>
        </div>

        <PerformanceStatsGrid
          prsInLastSession={prsInLastSession}
          totalPRsThisMonth={totalPRsThisMonth}
          flaggedAthletes={flaggedAthletes}
          trendPercentage={trendPercentage}
          isLoading={isLoading}
        />

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <PRsList prsData={prsData} isLoading={isLoading} />
          <FlaggedAthletesList flaggedData={flaggedData} isLoading={isLoading} />
        </div>

        <div className="mt-6">
          <TrendGraph 
            categoryGraphData={categoryGraphData}
            isLoading={isLoading} 
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <YesterdayOverview 
              overviewData={yesterdayOverviewData} 
              incompleteWorkouts={incompleteWorkouts}
              prsInLastSession={prsInLastSession}
              athletesInLastSession={new Set(allRecords.filter(r => {
                const sortedRecords = [...allRecords].sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
                return sortedRecords.length > 0 && r.recorded_date === sortedRecords[0].recorded_date;
              }).map(r => r.athlete_id)).size}
              isLoading={isLoading} 
            />
            <TeamOverview teams={teams} athletes={athletes} isLoading={isLoading} />
          </div>
          <div>
            <TopPerformers athletes={athletes} records={recentRecords} isLoading={isLoading} />
          </div>
        </div>


      </div>
    </div>
  );
}