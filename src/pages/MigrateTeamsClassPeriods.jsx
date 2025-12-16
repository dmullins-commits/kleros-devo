import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Database } from "lucide-react";
import { Team, ClassPeriod, Athlete } from "@/entities/all";

export default function MigrateTeamsClassPeriods() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async () => {
    setIsRunning(true);
    setProgress([]);
    setResults(null);
    setError(null);

    try {
      setProgress(prev => [...prev, "Loading all data..."]);

      // Load all data
      const [allTeams, allClassPeriods, allAthletes] = await Promise.all([
        Team.list(),
        ClassPeriod.list(),
        Athlete.list()
      ]);

      setProgress(prev => [...prev, `Found ${allTeams.length} teams, ${allClassPeriods.length} class periods, ${allAthletes.length} athletes`]);

      const results = {
        teamsUpdated: 0,
        teamsSkipped: 0,
        classPeriodsUpdated: 0,
        classPeriodsSkipped: 0,
        errors: []
      };

      // Migrate Teams
      setProgress(prev => [...prev, "\nMigrating teams..."]);
      for (const team of allTeams) {
        const teamOrgId = team.data?.organization_id || team.organization_id;
        
        if (teamOrgId) {
          results.teamsSkipped++;
          continue;
        }

        // Find athletes assigned to this team
        const teamAthletes = allAthletes.filter(a => {
          const teamIds = a.data?.team_ids || a.team_ids || [];
          return teamIds.includes(team.id);
        });

        if (teamAthletes.length === 0) {
          setProgress(prev => [...prev, `⚠️ Team "${team.name || team.data?.name}" has no athletes - skipping`]);
          results.teamsSkipped++;
          continue;
        }

        // Get organization_id from first athlete
        const athleteOrgId = teamAthletes[0].data?.organization_id || teamAthletes[0].organization_id;
        
        if (!athleteOrgId) {
          setProgress(prev => [...prev, `⚠️ Team "${team.name || team.data?.name}" athletes have no org_id - skipping`]);
          results.teamsSkipped++;
          continue;
        }

        try {
          await Team.update(team.id, { organization_id: athleteOrgId });
          setProgress(prev => [...prev, `✓ Updated team "${team.name || team.data?.name}" with org_id`]);
          results.teamsUpdated++;
        } catch (err) {
          const errorMsg = `Failed to update team ${team.id}: ${err.message}`;
          results.errors.push(errorMsg);
          setProgress(prev => [...prev, `✗ ${errorMsg}`]);
        }
      }

      // Migrate Class Periods
      setProgress(prev => [...prev, "\nMigrating class periods..."]);
      for (const period of allClassPeriods) {
        const periodOrgId = period.data?.organization_id || period.organization_id;
        
        if (periodOrgId) {
          results.classPeriodsSkipped++;
          continue;
        }

        const periodName = period.data?.name || period.name;
        
        // Find athletes with this class period
        const periodAthletes = allAthletes.filter(a => {
          const classPeriod = a.data?.class_period || a.class_period;
          return classPeriod === periodName;
        });

        if (periodAthletes.length === 0) {
          setProgress(prev => [...prev, `⚠️ Class period "${periodName}" has no athletes - skipping`]);
          results.classPeriodsSkipped++;
          continue;
        }

        // Get organization_id from first athlete
        const athleteOrgId = periodAthletes[0].data?.organization_id || periodAthletes[0].organization_id;
        
        if (!athleteOrgId) {
          setProgress(prev => [...prev, `⚠️ Class period "${periodName}" athletes have no org_id - skipping`]);
          results.classPeriodsSkipped++;
          continue;
        }

        try {
          await ClassPeriod.update(period.id, { organization_id: athleteOrgId });
          setProgress(prev => [...prev, `✓ Updated class period "${periodName}" with org_id`]);
          results.classPeriodsUpdated++;
        } catch (err) {
          const errorMsg = `Failed to update class period ${period.id}: ${err.message}`;
          results.errors.push(errorMsg);
          setProgress(prev => [...prev, `✗ ${errorMsg}`]);
        }
      }

      setProgress(prev => [...prev, "\n✅ Migration complete!"]);
      setResults(results);

    } catch (err) {
      setError(err.message);
      setProgress(prev => [...prev, `\n❌ Error: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-400" />
              Migrate Teams & Class Periods Organization IDs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-blue-950/30 border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <p className="font-semibold mb-2">This migration will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Find all teams without organization_id</li>
                  <li>Find all class periods without organization_id</li>
                  <li>Assign organization_id based on their assigned athletes</li>
                  <li>Skip any that can't be determined automatically</li>
                </ul>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="bg-red-950/30 border-red-800">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {progress.length > 0 && (
              <Alert className="bg-gray-900 border-gray-700">
                <AlertDescription>
                  <div className="text-gray-300 font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {progress.join('\n')}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {results && (
              <Alert className="bg-green-950/30 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <p className="font-semibold mb-2">Migration Results:</p>
                  <ul className="space-y-1 text-sm">
                    <li>Teams updated: {results.teamsUpdated}</li>
                    <li>Teams skipped: {results.teamsSkipped}</li>
                    <li>Class periods updated: {results.classPeriodsUpdated}</li>
                    <li>Class periods skipped: {results.classPeriodsSkipped}</li>
                    {results.errors.length > 0 && (
                      <li className="text-red-400">Errors: {results.errors.length}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Running Migration...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
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