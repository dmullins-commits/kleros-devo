import React, { useState, useEffect, useMemo } from "react";
import { Metric, MetricRecord, Athlete, MetricCategory } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Calculator, Filter, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeam } from "@/components/TeamContext";

import MetricsList from "../components/metrics/MetricsList";
import MetricForm from "../components/metrics/MetricForm";
import CategoryManagementModal from "../components/metrics/CategoryManagementModal";
import AutoCalcSettingsModal from "../components/metrics/AutoCalcSettingsModal";
import MetricCSVUploadModal from "../components/metrics/MetricCSVUploadModal";

export default function Metrics() {
  const { selectedOrganization, filteredTeams } = useTeam();
  const [metrics, setMetrics] = useState([]);
  const [records, setRecords] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAutoCalcModal, setShowAutoCalcModal] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Get team IDs and athlete IDs for org filtering
  const teamIds = useMemo(() => filteredTeams.map(t => t.id), [filteredTeams]);
  const athleteIds = useMemo(() => athletes.map(a => a.id), [athletes]);

  useEffect(() => {
    loadData();
  }, [selectedOrganization?.id]);

  const loadData = async () => {
    if (!selectedOrganization) return;
    
    setIsLoading(true);
    try {
      // Load all data
      const [metricsData, recordsData, athletesData, categoriesData] = await Promise.all([
        Metric.list(),
        MetricRecord.list('-recorded_date', 1000000),
        Athlete.list(),
        MetricCategory.list()
      ]);
      
      // Filter athletes by organization
      const filteredAthletes = athletesData.filter(a => {
        const orgId = a.organization_id || a.data?.organization_id;
        return orgId === selectedOrganization.id;
      });
      
      // Get athlete IDs for filtering
      const athleteIdsSet = new Set(filteredAthletes.map(a => a.id));
      
      // Filter metrics by organization - ONLY show metrics belonging to this organization
      const filteredMetrics = metricsData.filter(m => {
        const orgId = m.organization_id || m.data?.organization_id;
        return orgId === selectedOrganization.id;
      });
      
      // Filter categories by organization (system categories + org-specific)
      const filteredCategories = categoriesData.filter(c => {
        const orgId = c.organization_id || c.data?.organization_id;
        return !orgId || c.is_mandatory || orgId === selectedOrganization.id;
      });
      
      // Filter records by org athletes (handle nested data structure)
      const filteredRecords = recordsData.filter(r => {
        const athleteId = r.athlete_id || r.data?.athlete_id;
        return athleteIdsSet.has(athleteId);
      });
      
      setMetrics(filteredMetrics);
      setRecords(filteredRecords);
      setAthletes(filteredAthletes);
      setCategories(filteredCategories);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (metricData) => {
    // Add organization_id to new metrics
    const dataToSave = {
      ...metricData,
      organization_id: selectedOrganization?.id
    };
    
    if (editingMetric) {
      await Metric.update(editingMetric.id, dataToSave);
    } else {
      await Metric.create(dataToSave);
    }
    setShowForm(false);
    setEditingMetric(null);
    loadData();
  };

  const handleDelete = async (metricId) => {
    try {
      await Metric.delete(metricId);
      loadData();
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  const handleReorder = async (reorderedMetrics) => {
    // Update the local state immediately for smooth UX
    setMetrics(reorderedMetrics);
    
    // Note: You could add server-side ordering if you add an "order" field to metrics
    // For now, the reordering is just client-side
  };

  const filteredMetrics = metrics.filter(metric => {
    if (selectedCategoryFilter === "all") return true;
    if (selectedCategoryFilter === "blank") return !metric.category || metric.category === "";
    return metric.category === selectedCategoryFilter;
  });

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-black via-gray-950 to-black border-2 border-amber-400/30 shadow-2xl shadow-amber-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-yellow-500/5 to-amber-400/10" />
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 tracking-tight">
                  MANAGE METRICS
                </h1>
                <p className="text-amber-200/80 font-bold tracking-wide">
                  Define & Configure Performance Metrics
                </p>
                <Badge className="mt-2 bg-gradient-to-r from-amber-400/30 to-yellow-500/30 text-amber-200 border border-amber-400/50 font-bold">
                  {filteredMetrics.length} OF {metrics.length} METRICS DISPLAYED
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => setShowForm(!showForm)}
                  className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 hover:from-amber-500 hover:via-yellow-600 hover:to-amber-500 text-black font-black shadow-lg shadow-amber-500/50 border-2 border-amber-300"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  CREATE METRIC
                </Button>
                <Button 
                  onClick={() => setShowCSVUpload(true)}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-amber-400 font-black border-2 border-amber-400/30"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  IMPORT CSV
                </Button>
                <Button 
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-amber-400 font-black border-2 border-amber-400/30"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  EDIT CATEGORIES
                </Button>
                <Button 
                  onClick={() => setShowAutoCalcModal(true)}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-amber-400 font-black border-2 border-amber-400/30"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  AUTO-CALC METRICS
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {showForm && (
            <MetricForm
              metric={editingMetric}
              categories={categories}
              organizationId={selectedOrganization?.id}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingMetric(null);
              }}
            />
          )}

          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-amber-400" />
            <label className="text-amber-300 font-bold text-sm">Filter by Category:</label>
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="w-64 bg-gray-900 border-amber-400/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all" className="text-white focus:bg-white focus:text-black font-semibold">
                  All Categories
                </SelectItem>
                <SelectItem value="blank" className="text-white focus:bg-white focus:text-black font-semibold italic">
                  No Category Assigned
                </SelectItem>
                {categories.sort((a, b) => a.order - b.order).map(category => (
                  <SelectItem key={category.id} value={category.name} className="text-white focus:bg-white focus:text-black">
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MetricsList 
            metrics={filteredMetrics}
            records={records}
            isLoading={isLoading}
            onEdit={(metric) => {
              setEditingMetric(metric);
              setShowForm(true);
            }}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        </div>

        <CategoryManagementModal
          open={showCategoryModal}
          onOpenChange={setShowCategoryModal}
          onCategoriesUpdated={loadData}
        />

        <AutoCalcSettingsModal
          open={showAutoCalcModal}
          onOpenChange={setShowAutoCalcModal}
        />

        <MetricCSVUploadModal
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          categories={categories}
          organizationId={selectedOrganization?.id}
          onUploadComplete={loadData}
        />
      </div>
    </div>
  );
}