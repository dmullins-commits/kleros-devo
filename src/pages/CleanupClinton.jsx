import React, { useState } from "react";
import { MetricRecord } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2, CheckCircle, Loader2 } from "lucide-react";

export default function CleanupClinton() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runCleanup = async () => {
    setIsRunning(true);
    setProgress('Loading Clinton metric records...');
    setResults(null);
    setError(null);

    try {
      // Load all metric records
      const allRecords = await MetricRecord.list('-created_date', 1000000);
      
      // Filter for Clinton organization
      const clintonOrgId = '69384eecf7670d1e5e908bf4';
      const clintonRecords = allRecords.filter(r => {
        const orgId = r.data?.organization_id || r.organization_id;
        return orgId === clintonOrgId;
      });

      setProgress(`Found ${clintonRecords.length} Clinton records. Deleting...`);

      let deleted = 0;
      let errors = 0;

      for (let i = 0; i < clintonRecords.length; i++) {
        try {
          await MetricRecord.delete(clintonRecords[i].id);
          deleted++;
          
          if (deleted % 100 === 0) {
            setProgress(`Deleted ${deleted} of ${clintonRecords.length} records...`);
          }
        } catch (err) {
          console.error(`Error deleting record ${clintonRecords[i].id}:`, err);
          errors++;
        }
      }

      setResults({
        total: clintonRecords.length,
        deleted,
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
              <Trash2 className="w-6 h-6 text-red-400" />
              Delete Clinton Metric Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-red-950/20 border-red-800">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                <div className="font-bold mb-2">WARNING</div>
                <p className="text-sm">
                  This will permanently delete all metric record values for the Clinton organization.
                  Athletes, teams, and metric definitions will remain intact.
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
                  <div className="font-bold mb-2">Cleanup Results:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Total Records Found: {results.total}</li>
                    <li>Successfully Deleted: {results.deleted}</li>
                    <li>Errors: {results.errors}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={runCleanup}
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-6 text-lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Deleting Records...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete All Clinton Metric Records
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}