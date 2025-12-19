import React, { useState } from "react";
import { Metric, MetricCategory } from "@/entities/all";
import { Clipboard, Zap, Target, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/components/TeamContext";
import { useMetrics, useAthletes, useTeams, useClassPeriods } from "@/components/hooks/useDataQueries";

import LiveDataEntry from "../components/metrics/LiveDataEntry";
import RawDataPanel from "../components/metrics/RawDataPanel";
import QuickAddMetricModal from "../components/metrics/QuickAddMetricModal";

export default function TestingCenter() {
  const { selectedOrganization } = useTeam();
  const [categories, setCategories] = useState([]);
  const [showRawData, setShowRawData] = useState(false);
  const [showQuickAddMetric, setShowQuickAddMetric] = useState(false);

  // Use React Query hooks for automatic caching and deduplication
  const { data: metrics = [], isLoading: metricsLoading } = useMetrics(selectedOrganization?.id);
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes(selectedOrganization?.id);
  const { data: teams = [] } = useTeams(selectedOrganization?.id);
  const { data: classPeriods = [] } = useClassPeriods(selectedOrganization?.id);
  const isLoading = metricsLoading || athletesLoading;
  const handleMetricAdded = async () => {
    setShowQuickAddMetric(false);
    // React Query will automatically refetch data
  };

  React.useEffect(() => {
    const loadCategories = async () => {
      if (!selectedOrganization?.id) return;
      const categoriesData = await MetricCategory.list();
      const orgCategories = categoriesData.filter(c => 
        !c.organization_id || c.is_mandatory || c.organization_id === selectedOrganization.id
      );
      setCategories(orgCategories);
    };
    loadCategories();
  }, [selectedOrganization?.id]);

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
          metrics={metrics}
          athletes={athletes}
          onDataSaved={() => {}}
          isLoading={isLoading}
          onQuickAddMetric={() => setShowQuickAddMetric(true)}
        />

        {showRawData && (
          <RawDataPanel onClose={() => setShowRawData(false)} />
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