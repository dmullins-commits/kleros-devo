import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Team, Athlete, MetricRecord, Organization } from "@/entities/all";

export default function DataMigrationOrg() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async () => {
    setIsRunning(true);
    setProgress('Starting migration...');
    setError(null);
    setResults(null);

    try {
      // Step 1: Load all organizations
      setProgress('Loading organizations...');
      const orgs = await Organization.list();
      const orgMap = new Map(orgs.map(o => [o.id, o]));
      
      // Step 2: Load all teams and build team -> org mapping
      setProgress('Loading teams...');
      const teams = await Team.list();
      const teamToOrg = new Map();
      teams.forEach(t => {
        const orgId = t.data?.organization_id || t.organization_id;
        if (orgId) {
          teamToOrg.set(t.id, orgId);
        }
      });

      // Step 3: Migrate Athletes
      setProgress('Migrating athletes...');
      const athletes = await Athlete.list('-created_date', 100000);
      let athletesUpdated = 0;
      let athletesSkipped = 0;
      const athleteToOrg = new Map();

      for (const athlete of athletes) {
        const athleteData = athlete.data || athlete;
        const existingOrgId = athleteData.organization_id;
        
        // Skip if already has organization_id
        if (existingOrgId) {
          athletesSkipped++;
          athleteToOrg.set(athlete.id, existingOrgId);
          continue;
        }

        // Determine org from team_ids
        const teamIds = athleteData.team_ids || [];
        if (teamIds.length > 0) {
          const orgId = teamToOrg.get(teamIds[0]);
          if (orgId) {
            await Athlete.update(athlete.id, { organization_id: orgId });
            athleteToOrg.set(athlete.id, orgId);
            athletesUpdated++;
            setProgress(`Migrating athletes... ${athletesUpdated} updated`);
          }
        }
      }

      // Step 4: Migrate MetricRecords
      setProgress('Migrating metric records...');
      const records = await MetricRecord.list('-created_date', 1000000);
      let recordsUpdated = 0;
      let recordsSkipped = 0;
      let recordsBatched = [];

      for (const record of records) {
        const recordData = record.data || record;
        const existingOrgId = recordData.organization_id;
        
        // Skip if already has organization_id
        if (existingOrgId) {
          recordsSkipped++;
          continue;
        }

        // Determine org from athlete_id
        const athleteId = recordData.athlete_id;
        const orgId = athleteToOrg.get(athleteId);
        
        if (orgId) {
          recordsBatched.push({ id: record.id, organization_id: orgId });
          
          // Update in batches of 50
          if (recordsBatched.length >= 50) {
            await Promise.all(
              recordsBatched.map(r => MetricRecord.update(r.id, { organization_id: r.organization_id }))
            );
            recordsUpdated += recordsBatched.length;
            recordsBatched = [];
            setProgress(`Migrating metric records... ${recordsUpdated} updated`);
          }
        }
      }

      // Update remaining records
      if (recordsBatched.length > 0) {
        await Promise.all(
          recordsBatched.map(r => MetricRecord.update(r.id, { organization_id: r.organization_id }))
        );
        recordsUpdated += recordsBatched.length;
        setProgress(`Migrating metric records... ${recordsUpdated} updated (final batch)`);
      }

      setResults({
        athletesUpdated,
        athletesSkipped,
        recordsUpdated,
        recordsSkipped,
        totalOrganizations: orgs.length
      });

      setProgress('Migration completed successfully!');
    } catch (err) {
      console.error('Migration error:', err);
      setError(err.message || 'An error occurred during migration');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Database className="w-6 h-6 text-yellow-400" />
              Organization ID Migration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-yellow-950/20 border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <strong>Important:</strong> This migration will assign organization_id to all existing athletes and metric records.
                This operation should only be run once. Records that already have an organization_id will be skipped.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Migration Process:</h3>
              <ul className="text-gray-300 space-y-2 list-disc list-inside">
                <li>Load all organizations and teams</li>
                <li>Assign organization_id to athletes based on their team assignments</li>
                <li>Assign organization_id to metric records based on athlete associations</li>
                <li>Skip records that already have organization_id</li>
              </ul>
            </div>

            {progress && (
              <Alert className="bg-blue-950/20 border-blue-800">
                <Loader2 className={`h-4 w-4 text-blue-400 ${isRunning ? 'animate-spin' : ''}`} />
                <AlertDescription className="text-blue-300">
                  {progress}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="bg-red-950/20 border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {results && (
              <Alert className="bg-green-950/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <div className="space-y-2">
                    <p><strong>Migration Results:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>Organizations: {results.totalOrganizations}</li>
                      <li>Athletes Updated: {results.athletesUpdated}</li>
                      <li>Athletes Skipped: {results.athletesSkipped}</li>
                      <li>Records Updated: {results.recordsUpdated}</li>
                      <li>Records Skipped: {results.recordsSkipped}</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                onClick={runMigration}
                disabled={isRunning}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Run Migration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}