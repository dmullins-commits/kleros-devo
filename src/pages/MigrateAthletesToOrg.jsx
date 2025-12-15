import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Database, CheckCircle, Loader2 } from "lucide-react";
import { Athlete, Team } from "@/entities/all";

export default function MigrateAthletesToOrg() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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
        const orgId = team.data?.organization_id || team.organization_id;
        if (orgId) {
          teamToOrgMap[team.id] = orgId;
        }
      });
      
      console.log('Team to Org Map:', teamToOrgMap);

      // Load all athletes
      setProgress('Loading athletes...');
      const allAthletes = await Athlete.list('-created_date', 1000000);
      console.log(`Found ${allAthletes.length} athletes`);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < allAthletes.length; i++) {
        const athlete = allAthletes[i];
        const athleteData = athlete.data || athlete;
        
        // Check if athlete already has organization_id
        if (athleteData.organization_id) {
          skipped++;
          continue;
        }

        // Get team_ids
        const teamIds = athleteData.team_ids || [];
        if (teamIds.length === 0) {
          console.log(`Athlete ${athlete.id} has no teams, skipping`);
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
          console.log(`No organization found for athlete ${athlete.id} teams:`, teamIds);
          skipped++;
          continue;
        }

        try {
          // Update athlete with organization_id
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
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Database className="w-6 h-6 text-yellow-400" />
              Migrate Athletes to Organizations
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