import React, { useState, useEffect } from "react";
import { Athlete, Team, Organization, MetricRecord, Workout, VBTSession } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Database, AlertTriangle, CheckCircle, Users, Target, Dumbbell, Activity } from "lucide-react";

export default function DataMigration() {
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  
  const [sourceOrgId, setSourceOrgId] = useState('');
  const [sourceTeamId, setSourceTeamId] = useState('');
  const [destOrgId, setDestOrgId] = useState('');
  const [destTeamId, setDestTeamId] = useState('');
  
  const [dataToMigrate, setDataToMigrate] = useState({
    athletes: true,
    metricRecords: true,
    workouts: false,
    vbtSessions: true
  });
  
  const [preview, setPreview] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgsData, teamsData, athletesData] = await Promise.all([
        Organization.list(),
        Team.list(),
        Athlete.list()
      ]);
      setOrganizations(orgsData);
      setTeams(teamsData);
      setAthletes(athletesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getSourceTeams = () => {
    if (!sourceOrgId) return teams;
    return teams.filter(t => t.organization_id === sourceOrgId);
  };

  const getDestTeams = () => {
    if (!destOrgId) return teams;
    return teams.filter(t => t.organization_id === destOrgId);
  };

  const generatePreview = async () => {
    if (!sourceTeamId || !destTeamId) {
      setError('Please select both source and destination teams');
      return;
    }

    if (sourceTeamId === destTeamId) {
      setError('Source and destination teams cannot be the same');
      return;
    }

    setError(null);
    
    try {
      const sourceTeam = teams.find(t => t.id === sourceTeamId);
      const destTeam = teams.find(t => t.id === destTeamId);
      
      // Get athletes from source team
      const sourceAthletes = athletes.filter(a => a.team_ids?.includes(sourceTeamId));
      
      // Get metric records for those athletes
      const allRecords = await MetricRecord.list();
      const athleteIds = sourceAthletes.map(a => a.id);
      const records = allRecords.filter(r => athleteIds.includes(r.athlete_id));
      
      // Get VBT sessions
      const allSessions = await VBTSession.list();
      const sessions = allSessions.filter(s => athleteIds.includes(s.athlete_id));
      
      // Get workouts assigned to source team
      const allWorkouts = await Workout.list();
      const workouts = allWorkouts.filter(w => w.assigned_teams?.includes(sourceTeamId));

      setPreview({
        sourceTeam,
        destTeam,
        athletesCount: sourceAthletes.length,
        recordsCount: records.length,
        sessionsCount: sessions.length,
        workoutsCount: workouts.length
      });
    } catch (error) {
      setError('Error generating preview: ' + error.message);
    }
  };

  const executeMigration = async () => {
    if (!preview) return;

    setIsMigrating(true);
    setError(null);
    setSuccess(null);

    try {
      let migratedCounts = {
        athletes: 0,
        records: 0,
        sessions: 0,
        workouts: 0
      };

      // Get source athletes
      const sourceAthletes = athletes.filter(a => a.team_ids?.includes(sourceTeamId));
      const athleteIds = sourceAthletes.map(a => a.id);

      // Migrate Athletes
      if (dataToMigrate.athletes) {
        for (const athlete of sourceAthletes) {
          // Update team_ids array
          const newTeamIds = [...(athlete.team_ids || [])];
          const sourceIndex = newTeamIds.indexOf(sourceTeamId);
          if (sourceIndex > -1) {
            newTeamIds[sourceIndex] = destTeamId;
          }
          
          await Athlete.update(athlete.id, { team_ids: newTeamIds });
          migratedCounts.athletes++;
        }
      }

      // Migrate Metric Records
      if (dataToMigrate.metricRecords) {
        const allRecords = await MetricRecord.list();
        const records = allRecords.filter(r => athleteIds.includes(r.athlete_id));
        
        for (const record of records) {
          // Records follow athletes, no direct team reference
          migratedCounts.records++;
        }
      }

      // Migrate VBT Sessions
      if (dataToMigrate.vbtSessions) {
        const allSessions = await VBTSession.list();
        const sessions = allSessions.filter(s => athleteIds.includes(s.athlete_id));
        
        for (const session of sessions) {
          // Sessions follow athletes, no direct team reference
          migratedCounts.sessions++;
        }
      }

      // Migrate Workouts
      if (dataToMigrate.workouts) {
        const allWorkouts = await Workout.list();
        const workouts = allWorkouts.filter(w => w.assigned_teams?.includes(sourceTeamId));
        
        for (const workout of workouts) {
          const newTeams = [...(workout.assigned_teams || [])];
          const sourceIndex = newTeams.indexOf(sourceTeamId);
          if (sourceIndex > -1) {
            newTeams[sourceIndex] = destTeamId;
          }
          
          await Workout.update(workout.id, { assigned_teams: newTeams });
          migratedCounts.workouts++;
        }
      }

      setSuccess(`Successfully migrated: ${migratedCounts.athletes} athletes, ${migratedCounts.records} records, ${migratedCounts.sessions} VBT sessions, ${migratedCounts.workouts} workouts`);
      setPreview(null);
      setSourceTeamId('');
      setDestTeamId('');
      await loadData();
    } catch (error) {
      setError('Migration failed: ' + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-gray-800">
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Data Migration
                </h1>
                <p className="text-gray-400 font-medium">
                  Move data between teams and organizations
                </p>
              </div>
            </div>
            
            <Alert className="bg-amber-950/20 border-amber-800/50">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-300 text-sm font-semibold">
                Use this tool to correct data entry errors or reorganize team structures. Athletes and their associated data will be moved to the destination team.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-950/20 border-red-800">
            <AlertDescription className="text-red-300 font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-950/20 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">{success}</AlertDescription>
          </Alert>
        )}

        {/* Selection Cards */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Source Selection */}
          <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-red-400" />
                </div>
                Source (Move FROM)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Source Organization</label>
                <Select value={sourceOrgId} onValueChange={(val) => {
                  setSourceOrgId(val);
                  setSourceTeamId('');
                  setPreview(null);
                }}>
                  <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id} className="text-white">
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Source Team *</label>
                <Select value={sourceTeamId} onValueChange={(val) => {
                  setSourceTeamId(val);
                  setPreview(null);
                }}>
                  <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    {getSourceTeams().map(team => (
                      <SelectItem key={team.id} value={team.id} className="text-white">
                        {team.name} - {team.sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Destination Selection */}
          <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-green-400" />
                </div>
                Destination (Move TO)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Destination Organization</label>
                <Select value={destOrgId} onValueChange={(val) => {
                  setDestOrgId(val);
                  setDestTeamId('');
                  setPreview(null);
                }}>
                  <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id} className="text-white">
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Destination Team *</label>
                <Select value={destTeamId} onValueChange={(val) => {
                  setDestTeamId(val);
                  setPreview(null);
                }}>
                  <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    {getDestTeams().map(team => (
                      <SelectItem key={team.id} value={team.id} className="text-white">
                        {team.name} - {team.sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Selection */}
        <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800 mb-8">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white">What to Migrate</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-black/30 rounded-lg border border-gray-800">
                <Checkbox
                  id="athletes"
                  checked={dataToMigrate.athletes}
                  onCheckedChange={(checked) => setDataToMigrate(prev => ({ ...prev, athletes: checked }))}
                  className="border-amber-500 data-[state=checked]:bg-amber-500"
                />
                <label htmlFor="athletes" className="flex items-center gap-2 text-white font-semibold cursor-pointer">
                  <Users className="w-4 h-4 text-amber-400" />
                  Athletes
                </label>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-black/30 rounded-lg border border-gray-800">
                <Checkbox
                  id="records"
                  checked={dataToMigrate.metricRecords}
                  onCheckedChange={(checked) => setDataToMigrate(prev => ({ ...prev, metricRecords: checked }))}
                  className="border-amber-500 data-[state=checked]:bg-amber-500"
                />
                <label htmlFor="records" className="flex items-center gap-2 text-white font-semibold cursor-pointer">
                  <Target className="w-4 h-4 text-amber-400" />
                  Metric Records
                </label>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-black/30 rounded-lg border border-gray-800">
                <Checkbox
                  id="sessions"
                  checked={dataToMigrate.vbtSessions}
                  onCheckedChange={(checked) => setDataToMigrate(prev => ({ ...prev, vbtSessions: checked }))}
                  className="border-amber-500 data-[state=checked]:bg-amber-500"
                />
                <label htmlFor="sessions" className="flex items-center gap-2 text-white font-semibold cursor-pointer">
                  <Activity className="w-4 h-4 text-amber-400" />
                  VBT Sessions
                </label>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-black/30 rounded-lg border border-gray-800">
                <Checkbox
                  id="workouts"
                  checked={dataToMigrate.workouts}
                  onCheckedChange={(checked) => setDataToMigrate(prev => ({ ...prev, workouts: checked }))}
                  className="border-amber-500 data-[state=checked]:bg-amber-500"
                />
                <label htmlFor="workouts" className="flex items-center gap-2 text-white font-semibold cursor-pointer">
                  <Dumbbell className="w-4 h-4 text-amber-400" />
                  Workouts
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={generatePreview}
            disabled={!sourceTeamId || !destTeamId}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold px-8"
          >
            Generate Preview
          </Button>
        </div>

        {/* Preview */}
        {preview && (
          <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border-2 border-amber-500/50 mb-8">
            <CardHeader className="border-b border-amber-500/30 bg-amber-500/5">
              <CardTitle className="text-white">Migration Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-white mb-1">{preview.sourceTeam.name}</div>
                  <div className="text-sm text-gray-400">{preview.sourceTeam.sport}</div>
                </div>
                <ArrowRight className="w-8 h-8 text-amber-500 mx-4" />
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-white mb-1">{preview.destTeam.name}</div>
                  <div className="text-sm text-gray-400">{preview.destTeam.sport}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {dataToMigrate.athletes && (
                  <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                    <Users className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{preview.athletesCount}</div>
                    <div className="text-xs text-gray-400">Athletes</div>
                  </div>
                )}
                {dataToMigrate.metricRecords && (
                  <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                    <Target className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{preview.recordsCount}</div>
                    <div className="text-xs text-gray-400">Records</div>
                  </div>
                )}
                {dataToMigrate.vbtSessions && (
                  <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                    <Activity className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{preview.sessionsCount}</div>
                    <div className="text-xs text-gray-400">VBT Sessions</div>
                  </div>
                )}
                {dataToMigrate.workouts && (
                  <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                    <Dumbbell className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{preview.workoutsCount}</div>
                    <div className="text-xs text-gray-400">Workouts</div>
                  </div>
                )}
              </div>

              <Alert className="bg-amber-950/20 border-amber-800/50 mb-6">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-300 text-sm font-semibold">
                  This action will update team assignments. Athletes will be moved to the destination team, and all associated data will follow them.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPreview(null)}
                  className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeMigration}
                  disabled={isMigrating}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
                >
                  {isMigrating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Execute Migration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}