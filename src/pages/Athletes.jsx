import React, { useState, useEffect, useMemo } from "react";
import { Athlete } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Filter, Settings, Grid3X3, List, Upload, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/components/TeamContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import AthleteGrid from "../components/athletes/AthleteGrid";
import AthleteListView from "../components/athletes/AthleteListView";
import AthleteForm from "../components/athletes/AthleteForm";
import AthleteFilters from "../components/athletes/AthleteFilters";
import TeamManagementModal from "../components/teams/TeamManagementModal";
import AthleteCSVUploadModal from "../components/athletes/AthleteCSVUploadModal";
import DuplicateManagementModal from "../components/athletes/DuplicateManagementModal";
import BulkTeamAssignmentModal from "../components/athletes/BulkTeamAssignmentModal";

import { useAthletes, useClassPeriods, useInvalidateQueries } from "@/components/hooks/useDataQueries";

export default function Athletes() {
  const { selectedTeamId, selectedOrganization, filteredTeams, refreshTeams } = useTeam();
  const { invalidateAthletes, invalidateTeams } = useInvalidateQueries();
  
  // Use React Query hooks - fetch all athletes for the selected organization
  const { data: allAthletes = [], isLoading: athletesLoading, refetch: refetchAthletes } = useAthletes(
    selectedOrganization?.id
  );
  const { data: classPeriods = [] } = useClassPeriods(selectedOrganization?.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [filters, setFilters] = useState({ team: "all", status: "all" });
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBulkTeamAssignment, setShowBulkTeamAssignment] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [errorMessage, setErrorMessage] = useState(null);

  const teams = filteredTeams;
  const isLoading = athletesLoading;

  // Filter and sort athletes
  const athletes = useMemo(() => {
    let filtered = allAthletes; // Start with all athletes from the organization

    // Apply team filter if a specific team is selected
    if (filters.team !== "all") {
      filtered = filtered.filter(a => a.team_ids?.includes(filters.team));
    }
    
    // Sort alphabetically by last name, then first name
    return [...filtered].sort((a, b) => {
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
  }, [allAthletes, filters.team]);

  // Calculate duplicates
  const duplicateCount = useMemo(() => {
    if (athletes.length === 0) return 0;
    
    const processed = new Set();
    let count = 0;

    athletes.forEach((athlete, index) => {
      if (processed.has(athlete.id)) return;

      const duplicates = athletes.filter((other, otherIndex) => {
        if (otherIndex <= index || processed.has(other.id)) return false;
        
        const nameMatch = 
          athlete.first_name?.toLowerCase() === other.first_name?.toLowerCase() &&
          athlete.last_name?.toLowerCase() === other.last_name?.toLowerCase();
        
        const emailMatch = 
          athlete.email && other.email && 
          athlete.email.toLowerCase() === other.email.toLowerCase();
        
        const pinMatch = 
          athlete.pin && other.pin && 
          athlete.pin === other.pin;

        return nameMatch || emailMatch || pinMatch;
      });

      if (duplicates.length > 0) {
        count++;
        duplicates.forEach(a => processed.add(a.id));
        processed.add(athlete.id);
      }
    });

    return count;
  }, [athletes]);

  const loadData = async () => {
    invalidateAthletes(selectedOrganization?.id);
    invalidateTeams(selectedOrganization?.id);
    await refetchAthletes();
  };

  const handleSubmit = async (athleteData) => {
    setErrorMessage(null);
    
    // Automatically add organization_id if creating new athlete
    const dataToSubmit = editingAthlete 
      ? athleteData 
      : { ...athleteData, organization_id: selectedOrganization?.id };
    
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let delay = 1000;
    
    while (retryCount < maxRetries) {
      try {
        if (editingAthlete) {
          await Athlete.update(editingAthlete.id, dataToSubmit);
        } else {
          await Athlete.create(dataToSubmit);
        }
        
        setShowForm(false);
        setEditingAthlete(null);
        await loadData();
        return;
        
      } catch (error) {
        console.error('Error saving athlete:', error);
        
        if (error.message?.includes('Rate limit') || error.response?.data?.message?.includes('Rate limit')) {
          retryCount++;
          
          if (retryCount < maxRetries) {
            setErrorMessage(`Rate limit reached. Retrying in ${delay/1000} seconds... (Attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            setErrorMessage('Unable to save athlete due to rate limits. Please wait a moment and try again.');
            throw error;
          }
        } else {
          setErrorMessage(error.message || 'Failed to save athlete. Please try again.');
          throw error;
        }
      }
    }
  };

  const handleDelete = async (athleteId) => {
    try {
      await Athlete.delete(athleteId);
      await loadData();
    } catch (error) {
      console.error('Error deleting athlete:', error);
      if (error.response?.status === 404 || error.message?.includes('not found')) {
        // Athlete already deleted, just refresh the list
        await loadData();
      } else {
        setErrorMessage(error.message || 'Failed to delete athlete. Please try again.');
      }
    }
  };

  const handleDuplicatesDeleted = async (athleteIds) => {
    // Just refresh the data - the modal handles the actual deletion
    await loadData();
  };

  const filteredAthletes = athletes.filter(athlete => {
    const nameMatch = `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const teamMatch = filters.team === "all" || athlete.team_ids?.includes(filters.team);
    const statusMatch = filters.status === "all" || athlete.status === filters.status;
    return nameMatch && teamMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-gray-800">
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white tracking-tight">
                  Manage Roster
                </h1>
                <p className="text-gray-400 font-medium tracking-wide">
                  Championship-Level Athlete Management
                </p>
                <div className="flex gap-3 mt-3">
                  <Badge className="bg-gray-800 text-white border border-gray-700 font-semibold">
                    {filteredAthletes.length} Athletes
                  </Badge>
                  <Badge className="bg-gray-800 text-white border border-gray-700 font-semibold">
                    {teams.length} Teams
                  </Badge>
                  {duplicateCount > 0 && (
                    <Badge 
                      className="bg-amber-500/20 text-amber-400 border border-amber-400/50 font-bold cursor-pointer hover:bg-amber-500/30 transition-colors"
                      onClick={() => setShowDuplicates(true)}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {duplicateCount} Potential Duplicate{duplicateCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-semibold border border-gray-700"
                >
                  {viewMode === "grid" ? (
                    <>
                      <List className="w-5 h-5 mr-2" />
                      List View
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="w-5 h-5 mr-2" />
                      Grid View
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowCSVUpload(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-semibold border border-gray-700"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload CSV
                </Button>
                <Button 
                  onClick={() => setShowBulkTeamAssignment(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-semibold border border-gray-700"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Assign Teams
                </Button>
                <Button 
                  onClick={() => setShowTeamManagement(true)}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-semibold border border-gray-700"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Manage
                </Button>
                <Button 
                  onClick={() => {
                    setShowForm(!showForm);
                    setErrorMessage(null);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Athlete
                </Button>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <Alert className="mb-6 bg-red-950/20 border-red-800">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 font-semibold">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search athletes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:border-amber-500"
            />
          </div>
          <AthleteFilters 
            teams={teams}
            filters={filters}
            setFilters={setFilters}
          />
        </div>

        {showForm && (
          <AthleteForm
            athlete={editingAthlete}
            teams={teams}
            classPeriods={classPeriods}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAthlete(null);
              setErrorMessage(null);
            }}
          />
        )}

        {viewMode === "list" ? (
          <AthleteListView
            athletes={filteredAthletes}
            teams={teams}
            classPeriods={classPeriods}
            onDataUpdated={loadData}
          />
        ) : (
          <AthleteGrid 
            athletes={filteredAthletes}
            teams={teams}
            isLoading={isLoading}
            onEdit={(athlete) => {
              setEditingAthlete(athlete);
              setShowForm(true);
              setErrorMessage(null);
            }}
            onDelete={handleDelete}
          />
        )}

        <TeamManagementModal
          open={showTeamManagement}
          onOpenChange={setShowTeamManagement}
          onTeamsUpdated={loadData}
        />

        <AthleteCSVUploadModal
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          teams={teams}
          classPeriods={classPeriods}
          selectedOrganization={selectedOrganization}
          onUploadComplete={loadData}
        />

        <DuplicateManagementModal
          open={showDuplicates}
          onOpenChange={setShowDuplicates}
          athletes={athletes}
          onDuplicatesDeleted={handleDuplicatesDeleted}
        />

        <BulkTeamAssignmentModal
          open={showBulkTeamAssignment}
          onOpenChange={setShowBulkTeamAssignment}
          onComplete={loadData}
        />
      </div>
    </div>
  );
}