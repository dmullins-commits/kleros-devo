import React, { useState } from "react";
import { Athlete } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Users } from "lucide-react";

export default function CleanupUnknownTeams() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [foundAthletes, setFoundAthletes] = useState([]);

  const runCleanup = async () => {
    setIsRunning(true);
    setProgress('Loading Cartersville athletes...');
    setResults(null);
    setError(null);
    setFoundAthletes([]);

    try {
      const cartersvilleOrgId = '6912475c3863d688ed34a496';
      
      // Load all Cartersville athletes
      const allAthletes = await Athlete.list('-created_date', 100000);
      const cartersvilleAthletes = allAthletes.filter(a => {
        const orgId = a.data?.organization_id || a.organization_id;
        return orgId === cartersvilleOrgId;
      });

      setProgress(`Found ${cartersvilleAthletes.length} Cartersville athletes. Checking for "unknown" teams...`);

      // Find athletes with "unknown" in team_ids
      const athletesWithUnknown = cartersvilleAthletes.filter(a => {
        const teamIds = a.data?.team_ids || a.team_ids || [];
        return teamIds.includes('unknown') || teamIds.includes('Unknown');
      });

      setFoundAthletes(athletesWithUnknown);
      setProgress(`Found ${athletesWithUnknown.length} athletes with "unknown" team. Removing...`);

      let updated = 0;
      let errors = 0;

      for (const athlete of athletesWithUnknown) {
        try {
          const currentTeamIds = athlete.data?.team_ids || athlete.team_ids || [];
          // Remove "unknown" and "Unknown" from the array
          const cleanedTeamIds = currentTeamIds.filter(
            id => id !== 'unknown' && id !== 'Unknown'
          );

          await Athlete.update(athlete.id, { team_ids: cleanedTeamIds });
          updated++;
          
          if (updated % 10 === 0) {
            setProgress(`Updated ${updated} of ${athletesWithUnknown.length} athletes...`);
          }
        } catch (err) {
          console.error(`Error updating athlete ${athlete.id}:`, err);
          errors++;
        }
      }

      setResults({
        total: athletesWithUnknown.length,
        updated,
        errors
      });
      setProgress('Cleanup complete!');
    } catch (err) {
      console.error('Cleanup error:', err);
      setError(err.message || 'Cleanup failed');
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
              <Users className="w-6 h-6 text-amber-400" />
              Remove "Unknown" Team from Cartersville Athletes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-yellow-950/20 border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <div className="font-bold mb-2">Info</div>
                <p className="text-sm">
                  This will find all Cartersville athletes with "unknown" in their team_ids array 
                  and remove it, leaving them with their other valid team assignments or an empty array.
                </p>
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
              <Alert className="bg-blue-950/20 border-blue-800">
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                <AlertDescription className="text-blue-300">
                  {progress}
                </AlertDescription>
              </Alert>
            )}

            {foundAthletes.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="text-white font-bold mb-3">Athletes with "unknown" team:</h4>
                <div className="space-y-2">
                  {foundAthletes.map(a => (
                    <div key={a.id} className="text-sm text-gray-300">
                      • {a.data?.first_name || a.first_name} {a.data?.last_name || a.last_name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results && (
              <Alert className="bg-green-950/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <div className="font-bold mb-2">Cleanup Results:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Athletes Found with "unknown": {results.total}</li>
                    <li>Successfully Updated: {results.updated}</li>
                    <li>Errors: {results.errors}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={runCleanup}
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black py-6 text-lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Cleaning Up...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Remove "Unknown" Teams from Cartersville Athletes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}