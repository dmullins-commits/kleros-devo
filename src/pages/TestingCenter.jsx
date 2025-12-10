import React, { useState, useEffect } from "react";
import { Metric, MetricRecord, Athlete, MetricCategory } from "@/entities/all";
import { Clipboard, Zap, Target, FileSpreadsheet, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/components/TeamContext";

import LiveDataEntry from "../components/metrics/LiveDataEntry";
import RawDataPanel from "../components/metrics/RawDataPanel";
import LatestLeaderboardModal from "../components/metrics/LatestLeaderboardModal";
import QuickAddMetricModal from "../components/metrics/QuickAddMetricModal";

export default function TestingCenter() {
  const { selectedOrganization, filteredTeams } = useTeam();
  const [metrics, setMetrics] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRawData, setShowRawData] = useState(false);
  const [showLatestLeaderboard, setShowLatestLeaderboard] = useState(false);
  const [showQuickAddMetric, setShowQuickAddMetric] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedOrganization?.id]);
  
  const handleMetricAdded = (newMetric) => {
    setMetrics(prev => [...prev, newMetric]);
    setShowQuickAddMetric(false);
  };

  const loadData = async () => {
    if (!selectedOrganization) return;
    
    setIsLoading(true);
    try {
      const [metricsData, athletesData, categoriesData] = await Promise.all([
        Metric.list(),
        Athlete.list('-created_date', 10000),
        MetricCategory.list()
      ]);
      
      // Get team IDs for this org
      const teamIds = filteredTeams.map(t => t.id);
      
      // Filter athletes by org teams
      const orgAthletes = athletesData.filter(a => 
        (a.data?.team_ids || a.team_ids || []).some(tid => teamIds.includes(tid))
      );
      
      // Get athlete IDs for filtering metrics
      const athleteIdsSet = new Set(orgAthletes.map(a => a.id));
      
      // Load all records to see which metrics have data for this org
      const recordsData = await MetricRecord.list();
      const orgMetricsWithData = new Set(
        recordsData
          .filter(r => athleteIdsSet.has(r.data?.athlete_id || r.athlete_id))
          .map(r => r.data?.metric_id || r.metric_id)
      );
      
      // Filter metrics: org-specific OR orphaned with data
      const orgMetrics = metricsData.filter(m => {
        const metricOrgId = m.data?.organization_id || m.organization_id;
        const hasMatchingOrg = metricOrgId === selectedOrganization.id;
        const isOrphanedWithData = !metricOrgId && orgMetricsWithData.has(m.id);
        return hasMatchingOrg || isOrphanedWithData;
      });
      
      // Normalize metrics
      const normalizedMetrics = orgMetrics.map(m => ({
        id: m.id,
        name: m.data?.name || m.name,
        unit: m.data?.unit || m.unit,
        category: m.data?.category || m.category,
        target_higher: m.data?.target_higher ?? m.target_higher ?? true,
        decimal_places: m.data?.decimal_places ?? m.decimal_places ?? 2,
        is_auto_calculated: m.data?.is_auto_calculated ?? m.is_auto_calculated ?? false,
        is_hidden: m.data?.is_hidden ?? m.is_hidden ?? false
      }));
      
      // Normalize athletes
      const normalizedAthletes = orgAthletes.map(a => ({
        id: a.id,
        first_name: a.data?.first_name || a.first_name,
        last_name: a.data?.last_name || a.last_name,
        team_ids: a.data?.team_ids || a.team_ids || [],
        class_period: a.data?.class_period || a.class_period,
        gender: a.data?.gender || a.gender,
        status: a.data?.status || a.status || 'active'
      }));
      
      // Filter categories by org
      const orgCategories = categoriesData.filter(c => 
        !c.organization_id || c.is_mandatory || c.organization_id === selectedOrganization.id
      );
      
      setMetrics(normalizedMetrics);
      setAthletes(normalizedAthletes);
      setCategories(orgCategories);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-black via-gray-950 to-black border-2 border-amber-400/30 shadow-2xl shadow-amber-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-yellow-500/5 to-amber-400/10" />
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 tracking-tight">
                  TESTING CENTER
                </h1>
                <p className="text-amber-200/80 font-bold tracking-wide">
                  Live Performance Data Entry & Recording
                </p>
                <div className="flex gap-3 mt-3">
                  <Badge className="bg-gradient-to-r from-amber-400/30 to-yellow-500/30 text-amber-200 border border-amber-400/50 font-bold">
                    {athletes.length} ATHLETES
                  </Badge>
                  <Badge className="bg-gradient-to-r from-amber-400/30 to-yellow-500/30 text-amber-200 border border-amber-400/50 font-bold">
                    {metrics.filter(m => !m.is_auto_calculated).length} METRICS AVAILABLE
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setShowRawData(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  Raw Data
                </Button>
                <Button
                  onClick={() => setShowLatestLeaderboard(true)}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-black"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Latest Leaderboard
                </Button>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-bold">Real-time data entry</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Target className="w-4 h-4" />
                    <span className="text-sm font-bold">Multi-athlete testing</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Clipboard className="w-4 h-4" />
                    <span className="text-sm font-bold">Batch data recording</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <LiveDataEntry 
          metrics={{ 
            ...metrics, 
            onQuickAddMetric: () => setShowQuickAddMetric(true) 
          }}
          athletes={athletes}
          onDataSaved={loadData}
          isLoading={isLoading}
        />

        {showRawData && (
          <RawDataPanel onClose={() => setShowRawData(false)} />
        )}

        {showLatestLeaderboard && (
          <LatestLeaderboardModal 
            onClose={() => setShowLatestLeaderboard(false)}
            metrics={metrics}
            athletes={athletes}
          />
        )}

        <QuickAddMetricModal
          open={showQuickAddMetric}
          onClose={() => setShowQuickAddMetric(false)}
          onMetricAdded={handleMetricAdded}
          categories={categories}
        />
      </div>
    </div>
  );
}