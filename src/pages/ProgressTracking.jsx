import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, User, FileDown, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/components/TeamContext";
import { useAthletes, useMetrics, useMetricRecords, useTeams, useClassPeriods } from "@/components/hooks/useDataQueries";

import TeamProgressView from "../components/progress/TeamProgressView";
import IndividualProgressView from "../components/progress/IndividualProgressView";
import SnapshotView from "../components/progress/SnapshotView";

export default function ProgressTracking() {
  const { selectedOrganization, filteredTeams: contextFilteredTeams } = useTeam();
  const [viewMode, setViewMode] = useState(""); // "", "team", "individual", "snapshot"
  const [filterType, setFilterType] = useState(""); // "team" or "class"
  const [selectedFilterId, setSelectedFilterId] = useState(""); // team id or class period name
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  // Use React Query hooks for data fetching
  const { data: athletes = [], isLoading: isLoadingAthletes } = useAthletes(selectedOrganization?.id);
  const { data: metrics = [], isLoading: isLoadingMetrics } = useMetrics(selectedOrganization?.id);
  const { data: records = [], isLoading: isLoadingRecords } = useMetricRecords(selectedOrganization?.id);
  const { data: teams = [], isLoading: isLoadingTeams } = useTeams(selectedOrganization?.id);
  const { data: classPeriods = [], isLoading: isLoadingClassPeriods } = useClassPeriods(selectedOrganization?.id);

  const isLoading = isLoadingAthletes || isLoadingMetrics || isLoadingRecords || isLoadingTeams || isLoadingClassPeriods;

  // Get filtered athletes based on filter type and selection
  const filteredAthletes = useMemo(() => athletes.filter(athlete => {
    if (filterType === "team" && selectedFilterId) {
      return athlete.team_ids?.includes(selectedFilterId);
    }
    if (filterType === "class" && selectedFilterId) {
      // Handle variations in class period naming (e.g., "6" vs "6th", "4th" vs "4")
      const athletePeriod = (athlete.class_period || "").toLowerCase().replace(/[^0-9a-z]/g, '');
      const selectedPeriod = selectedFilterId.toLowerCase().replace(/[^0-9a-z]/g, '');
      return athletePeriod === selectedPeriod || 
             athlete.class_period === selectedFilterId ||
             athletePeriod.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '') === 
             selectedPeriod.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '');
    }
    return false;
  }), [athletes, filterType, selectedFilterId]);

  // Get filtered records based on filtered athletes
  const filteredRecords = useMemo(() => {
    const athleteIds = new Set(filteredAthletes.map(a => a.id));
    return records.filter(r => athleteIds.has(r.athlete_id));
  }, [records, filteredAthletes]);

  const selectedAthlete = useMemo(() => 
    athletes.find(a => a.id === selectedAthleteId), 
    [athletes, selectedAthleteId]
  );
  
  const selectedTeam = useMemo(() => 
    teams.find(t => t.id === selectedFilterId), 
    [teams, selectedFilterId]
  );
  
  // Use locally loaded teams as primary source
  const availableTeams = teams.length > 0 ? teams : contextFilteredTeams;

  const handleBack = () => {
    if (selectedAthleteId) {
      setSelectedAthleteId("");
    } else if (selectedFilterId) {
      setSelectedFilterId("");
    } else if (filterType) {
      setFilterType("");
    } else {
      setViewMode("");
    }
  };


  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-gray-950 to-gray-900 border border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-yellow-600/5" />
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  Progress Tracking
                </h1>
                <p className="text-gray-400 font-medium">
                  Monitor team and individual athlete performance trends
                </p>
                <Badge className="mt-2 bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                  {records.length} total records tracked
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: View Mode Selection */}
        {!viewMode && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card
              className="bg-gray-950 border-2 border-gray-800 hover:border-yellow-400 cursor-pointer transition-all group"
              onClick={() => setViewMode("team")}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-400/30 transition-all">
                  <Users className="w-8 h-8 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Team Average</h2>
                <p className="text-gray-400">
                  View aggregate performance data for a team or class
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-950 border-2 border-gray-800 hover:border-yellow-400 cursor-pointer transition-all group"
              onClick={() => setViewMode("individual")}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-400/30 transition-all">
                  <User className="w-8 h-8 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Individual</h2>
                <p className="text-gray-400">
                  View performance data for a specific athlete
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-950 border-2 border-gray-800 hover:border-blue-400 cursor-pointer transition-all group"
              onClick={() => setViewMode("snapshot")}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-400/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-400/30 transition-all">
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Snapshot</h2>
                <p className="text-gray-400">
                  Excel-style view of all data for a metric
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Filter Type Selection (Team or Class) - Skip for snapshot */}
        {viewMode && viewMode !== "snapshot" && !filterType && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">
                Select Filter Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  onClick={() => setFilterType("team")}
                  variant="outline"
                  className="h-20 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-yellow-400 flex flex-col items-center justify-center"
                >
                  <Users className="w-6 h-6 mb-2 text-yellow-400" />
                  <span className="font-bold">By Team</span>
                </Button>
                <Button
                  onClick={() => setFilterType("class")}
                  variant="outline"
                  className="h-20 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-yellow-400 flex flex-col items-center justify-center"
                >
                  <BarChart3 className="w-6 h-6 mb-2 text-yellow-400" />
                  <span className="font-bold">By Class Period</span>
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-700 text-gray-300 mt-4"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Team or Class - Skip for snapshot */}
        {viewMode && viewMode !== "snapshot" && filterType && !selectedFilterId && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">
                Select {filterType === "team" ? "Team" : "Class Period"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Select value={selectedFilterId} onValueChange={setSelectedFilterId}>
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder={`Choose a ${filterType === "team" ? "team" : "class period"}...`} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  {filterType === "team" ? (
                    availableTeams.map(team => (
                      <SelectItem key={team.id} value={team.id} className="text-white focus:bg-white focus:text-black">
                        {team.name} - {team.sport}
                      </SelectItem>
                    ))
                  ) : (
                    classPeriods.map(period => (
                      <SelectItem key={period.id} value={period.name} className="text-white focus:bg-white focus:text-black">
                        {period.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-700 text-gray-300"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4 (Individual only): Select Athlete */}
        {viewMode === "individual" && filterType && selectedFilterId && !selectedAthleteId && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Select Athlete</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Choose an athlete..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  {filteredAthletes.map(athlete => (
                    <SelectItem key={athlete.id} value={athlete.id} className="text-white focus:bg-white focus:text-black">
                      {athlete.first_name} {athlete.last_name} {athlete.jersey_number ? `- #${athlete.jersey_number}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredAthletes.length === 0 && (
                <p className="text-gray-400 text-sm">No athletes found for this {filterType === "team" ? "team" : "class period"}.</p>
              )}
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-700 text-gray-300"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team Progress View */}
        {viewMode === "team" && filterType && selectedFilterId && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-700 text-gray-300"
              >
                Back
              </Button>
              <h2 className="text-xl font-bold text-white">
                {filterType === "team" ? selectedTeam?.name : selectedFilterId}
              </h2>
            </div>
            <TeamProgressView 
              metrics={metrics}
              records={filteredRecords}
              athletes={filteredAthletes}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Individual Progress View */}
        {viewMode === "individual" && selectedAthleteId && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-700 text-gray-300"
              >
                Back
              </Button>
              <h2 className="text-xl font-bold text-white">
                {selectedAthlete?.first_name} {selectedAthlete?.last_name}
              </h2>
            </div>
            <IndividualProgressView
              athlete={selectedAthlete}
              metrics={metrics}
              records={records}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Snapshot View - Direct to Metric Selection */}
        {viewMode === "snapshot" && (
          <SnapshotView
            athletes={athletes}
            metrics={metrics}
            records={records}
            teams={teams}
            classPeriods={classPeriods}
            onBack={() => setViewMode("")}
          />
        )}
      </div>
    </div>
  );
}