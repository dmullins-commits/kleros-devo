import React, { useState, useEffect } from "react";
import { Athlete, Team, Organization } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Database, CheckCircle, Loader2, Users, RefreshCw } from "lucide-react";

export default function DataMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [unassignedAthletes, setUnassignedAthletes] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState({});
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [orgIdMigrationStatus, setOrgIdMigrationStatus] = useState('idle');
  const [orgIdMigrationResults, setOrgIdMigrationResults] = useState(null);

  useEffect(() => {
    loadUnassignedAthletes();
  }, []);

  const loadUnassignedAthletes = async () => {
    try {
      setIsLoadingUnassigned(true);
      const [athletes, orgs] = await Promise.all([
        Athlete.filter({ organization_id: null }),
        Organization.list()
      ]);
      setUnassignedAthletes(athletes);
      setOrganizations(orgs);
    } catch (err) {
      console.error('Error loading unassigned athletes:', err);
    } finally {
      setIsLoadingUnassigned(false);
    }
  };

  const handleOrgSelect = (athleteId, orgId) => {
    setSelectedOrgs(prev => ({
      ...prev,
      [athleteId]: orgId
    }));
  };

  const handleSaveAssignments = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updates = Object.entries(selectedOrgs).map(([athleteId, orgId]) => 
        Athlete.update(athleteId, { organization_id: orgId })
      );
      await Promise.all(updates);
      setSaveSuccess(true);
      setTimeout(() => {
        loadUnassignedAthletes();
        setSelectedOrgs({});
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError('Failed to save assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const runOrgIdMigration = async () => {
    setOrgIdMigrationStatus('running');
    setOrgIdMigrationResults(null);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('assignOrganizationIds', {});
      console.log('Migration response:', response);
      
      // Check if response.data exists (axios-style response)
      const data = response.data || response;
      
      if (data.success) {
        setOrgIdMigrationResults(data.stats);
        setOrgIdMigrationStatus('success');
      } else {
        setOrgIdMigrationStatus('error');
        setError(data.error || JSON.stringify(data) || 'Unknown error');
      }
    } catch (error) {
      console.error('Organization ID migration error:', error);
      setOrgIdMigrationStatus('error');
      setError(error.message || error.toString());
    }
  };

  const runMigration = async () => {
    setIsRunning(true);
    setProgress('Starting migration...');
    setResults(null);
    setError(null);

    try {
      // Load all teams
      setProgress('Loading teams...');
      const allTeams = await Team.list('-created_date', 1000000);
      
      // Build team ID to org ID map
      const teamToOrgMap = {};
      allTeams.forEach(team => {
        const teamData = team.data || team;
        const orgId = teamData.organization_id;
        if (orgId) {
          teamToOrgMap[team.id] = orgId;
        }
      });

      // Load all athletes
      setProgress('Loading athletes...');
      const allAthletes = await Athlete.list('-created_date', 1000000);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < allAthletes.length; i++) {
        const athlete = allAthletes[i];
        const athleteData = athlete.data || athlete;
        
        // Get team_ids
        const teamIds = athleteData.team_ids || [];
        if (teamIds.length === 0) {
          skipped++;
          continue;
        }

        // Find organization from first team
        let organizationId = null;
        for (const teamId of teamIds) {
          if (teamToOrgMap[teamId]) {
            organizationId = teamToOrgMap[teamId];
            break;
          }
        }

        if (!organizationId) {
          skipped++;
          continue;
        }

        // ALWAYS update to correct organization based on team assignment
        // This will fix any mismatched organization_id values
        try {
          await Athlete.update(athlete.id, {
            organization_id: organizationId
          });
          updated++;
          
          if (updated % 10 === 0) {
            setProgress(`Migrated ${updated} athletes...`);
          }
        } catch (err) {
          console.error(`Error updating athlete ${athlete.id}:`, err);
          errors++;
        }
      }

      setResults({
        total: allAthletes.length,
        updated,
        skipped,
        errors
      });
      setProgress('Migration complete!');
    } catch (err) {
      console.error('Migration error:', err);
      setError(err.message || 'Migration failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Users className="w-6 h-6 text-yellow-400" />
              Unassigned Athletes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingUnassigned ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              </div>
            ) : unassignedAthletes.length === 0 ? (
              <Alert className="bg-green-950/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  All athletes are assigned to organizations!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-blue-950/20 border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    {unassignedAthletes.length} athlete(s) need to be assigned to an organization
                  </AlertDescription>
                </Alert>

                {saveSuccess && (
                  <Alert className="bg-green-950/20 border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300">
                      Successfully assigned athletes to organizations!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {unassignedAthletes.map(athlete => {
                    const athleteData = athlete.data || athlete;
                    return (
                      <div key={athlete.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
                        <div className="flex-1">
                          <p className="text-white font-semibold">
                            {athleteData.first_name} {athleteData.last_name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {athleteData.class_grade && `Grade ${athleteData.class_grade}`}
                            {athleteData.class_period && ` • Period ${athleteData.class_period}`}
                          </p>
                        </div>
                        <Select 
                          value={selectedOrgs[athlete.id] || ""} 
                          onValueChange={(value) => handleOrgSelect(athlete.id, value)}
                        >
                          <SelectTrigger className="w-64 bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {organizations.map(org => {
                              const orgData = org.data || org;
                              return (
                                <SelectItem key={org.id} value={org.id} className="text-white">
                                  {orgData.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={handleSaveAssignments}
                  disabled={Object.keys(selectedOrgs).length === 0 || isSaving}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black py-6 text-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Save Assignments ({Object.keys(selectedOrgs).length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border border-purple-400/30">
          <CardHeader className="border-b border-purple-400/30">
            <CardTitle className="flex items-center gap-3 text-purple-200">
              <AlertCircle className="w-6 h-6 text-purple-400" />
              Debug: Data Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Button
              onClick={async () => {
                try {
                  const [records, athletes, metrics, orgs] = await Promise.all([
                    base44.entities.MetricRecord.list('-created_date', 100),
                    base44.entities.Athlete.list('-created_date', 100),
                    base44.entities.Metric.list('-created_date', 100),
                    Organization.list()
                  ]);
                  
                  console.log('=== DATA DEBUG ===');
                  console.log('Organizations:', orgs.map(o => ({ id: o.id, name: o.name || o.data?.name })));
                  console.log('Sample Athletes (first 5):', athletes.slice(0, 5).map(a => ({
                    id: a.id,
                    name: `${a.first_name || a.data?.first_name} ${a.last_name || a.data?.last_name}`,
                    org_id: a.organization_id || a.data?.organization_id
                  })));
                  console.log('Sample Records (first 5):', records.slice(0, 5).map(r => ({
                    id: r.id,
                    athlete_id: r.athlete_id || r.data?.athlete_id,
                    metric_id: r.metric_id || r.data?.metric_id,
                    org_id: r.organization_id || r.data?.organization_id,
                    value: r.value || r.data?.value
                  })));
                  console.log('Sample Metrics (first 5):', metrics.slice(0, 5).map(m => ({
                    id: m.id,
                    name: m.name || m.data?.name,
                    org_id: m.organization_id || m.data?.organization_id
                  })));
                  
                  // Count by org
                  const athletesByOrg = {};
                  const recordsByOrg = {};
                  const metricsByOrg = {};
                  
                  athletes.forEach(a => {
                    const orgId = a.organization_id || a.data?.organization_id || 'null';
                    athletesByOrg[orgId] = (athletesByOrg[orgId] || 0) + 1;
                  });
                  
                  records.forEach(r => {
                    const orgId = r.organization_id || r.data?.organization_id || 'null';
                    recordsByOrg[orgId] = (recordsByOrg[orgId] || 0) + 1;
                  });
                  
                  metrics.forEach(m => {
                    const orgId = m.organization_id || m.data?.organization_id || 'null';
                    metricsByOrg[orgId] = (metricsByOrg[orgId] || 0) + 1;
                  });
                  
                  console.log('Athletes by org:', athletesByOrg);
                  console.log('Records by org:', recordsByOrg);
                  console.log('Metrics by org:', metricsByOrg);
                  
                  alert('Debug info logged to console. Check browser console (F12).');
                } catch (err) {
                  console.error('Debug error:', err);
                  alert('Error: ' + err.message);
                }
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold"
            >
              Run Data Debug (Check Console)
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border border-amber-400/30">
          <CardHeader className="border-b border-amber-400/30">
            <CardTitle className="flex items-center gap-3 text-amber-200">
              <RefreshCw className="w-6 h-6 text-amber-400" />
              Assign Organization IDs to Records & Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Alert className="bg-blue-950/20 border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <div className="font-bold mb-2">This migration will:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Assign organization_id to all MetricRecords based on their athlete's organization</li>
                  <li>Assign organization_id to all Metrics based on where they're used</li>
                  <li>Skip records that already have an organization_id</li>
                </ul>
              </AlertDescription>
            </Alert>

            {orgIdMigrationResults && (
              <Alert className="bg-green-950/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <div className="font-bold mb-2">Migration Complete!</div>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <p className="font-bold">Metric Records:</p>
                      <ul className="list-disc list-inside">
                        <li>Updated: {orgIdMigrationResults.records?.updated || 0}</li>
                        <li>Skipped: {orgIdMigrationResults.records?.skipped || 0}</li>
                        <li>Total: {orgIdMigrationResults.records?.total || 0}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold">Metrics:</p>
                      <ul className="list-disc list-inside">
                        <li>Updated: {orgIdMigrationResults.metrics?.updated || 0}</li>
                        <li>Skipped: {orgIdMigrationResults.metrics?.skipped || 0}</li>
                        <li>Total: {orgIdMigrationResults.metrics?.total || 0}</li>
                      </ul>
                    </div>
                  </div>
                  {orgIdMigrationResults.errors > 0 && (
                    <p className="text-yellow-400 mt-2">⚠️ {orgIdMigrationResults.errors} errors occurred</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={runOrgIdMigration}
              disabled={orgIdMigrationStatus === 'running'}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-black py-6 text-lg"
            >
              {orgIdMigrationStatus === 'running' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Assign Organization IDs to Records & Metrics
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Database className="w-6 h-6 text-yellow-400" />
              Assign Athletes to Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-blue-950/20 border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <div className="font-bold mb-2">This migration will:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Assign each athlete to an organization based on their team assignments</li>
                  <li>Skip athletes that already have an organization_id</li>
                  <li>Skip athletes with no team assignments</li>
                </ul>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="bg-red-950/20 border-red-800">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {progress && (
              <Alert className="bg-yellow-950/20 border-yellow-800">
                <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
                <AlertDescription className="text-yellow-300">
                  {progress}
                </AlertDescription>
              </Alert>
            )}

            {results && (
              <Alert className="bg-green-950/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <div className="font-bold mb-2">Migration Results:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Total Athletes: {results.total}</li>
                    <li>Updated: {results.updated}</li>
                    <li>Skipped: {results.skipped}</li>
                    <li>Errors: {results.errors}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black py-6 text-lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Run Migration
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}