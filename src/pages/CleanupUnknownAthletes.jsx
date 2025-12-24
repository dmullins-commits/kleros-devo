import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useTeam } from "@/components/TeamContext";

export default function CleanupUnknownAthletes() {
  const { selectedOrganization } = useTeam();
  const [deleting, setDeleting] = useState(false);
  const [results, setResults] = useState(null);

  const handleDelete = async () => {
    if (!selectedOrganization) {
      alert('No organization selected');
      return;
    }

    if (!confirm(`This will DELETE all records with "Unknown" athletes (orphaned records) in ${selectedOrganization.name}. This cannot be undone. Continue?`)) {
      return;
    }

    setDeleting(true);
    setResults(null);
    try {
      const response = await base44.functions.invoke('deleteUnknownAthleteRecords', {
        organizationId: selectedOrganization.id
      });
      setResults(response.data);
    } catch (error) {
      console.error('Deletion error:', error);
      setResults({ error: error.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-950 border border-gray-800 mb-6">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Cleanup Unknown Athlete Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-gray-300">
              This tool will delete all metric records that have "Unknown" athletes (orphaned records where the athlete no longer exists).
            </p>
            
            {selectedOrganization && (
              <div className="bg-gray-900 p-4 rounded-lg">
                <p className="text-white font-semibold mb-1">Current Organization:</p>
                <p className="text-gray-300">{selectedOrganization.name}</p>
              </div>
            )}

            <Button
              onClick={handleDelete}
              disabled={deleting || !selectedOrganization}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Unknown Athlete Records
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center gap-3 text-white">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Cleanup Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {results.error ? (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-400 font-semibold">Error: {results.error}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg">
                      <div className="text-yellow-400 text-sm mb-1">Total Unknown Records</div>
                      <div className="text-yellow-400 text-2xl font-bold">{results.total_unknown}</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
                      <div className="text-green-400 text-sm mb-1">Successfully Deleted</div>
                      <div className="text-green-400 text-2xl font-bold">{results.deleted}</div>
                    </div>
                  </div>

                  {results.errors && results.errors.length > 0 && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                      <p className="text-red-400 font-semibold mb-2">Errors: {results.errors.length}</p>
                      <div className="space-y-1">
                        {results.errors.map((err, idx) => (
                          <div key={idx} className="text-red-300 text-sm">
                            Record {err.record_id.substring(0, 8)}...: {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Refresh Page
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}