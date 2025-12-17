import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, UserX, ArrowRight } from "lucide-react";
import { Athlete, MetricRecord, Metric, Organization } from "@/entities/all";

export default function FixUnknownAthletes() {
  const [isLoading, setIsLoading] = useState(true);
  const [unknownAthletes, setUnknownAthletes] = useState([]);
  const [allAthletes, setAllAthletes] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [recordsToReassign, setRecordsToReassign] = useState([]);
  const [reassignments, setReassignments] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [cartersvilleOrg, setCartersvilleOrg] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Find Cartersville organization
      const orgs = await Organization.list();
      const cartersville = orgs.find(o => 
        (o.data?.name || o.name)?.toLowerCase().includes('cartersville')
      );

      if (!cartersville) {
        alert("Cartersville organization not found");
        return;
      }

      setCartersvilleOrg(cartersville);

      // Load all athletes from Cartersville
      const athletesData = await Athlete.filter({ organization_id: cartersville.id });
      
      // Find "unknown" athletes
      const unknown = athletesData.filter(a => {
        const firstName = (a.data?.first_name || a.first_name || '').toLowerCase();
        const lastName = (a.data?.last_name || a.last_name || '').toLowerCase();
        return firstName.includes('unknown') || lastName.includes('unknown');
      });

      setUnknownAthletes(unknown);

      // Get real athletes (not unknown)
      const realAthletes = athletesData.filter(a => {
        const firstName = (a.data?.first_name || a.first_name || '').toLowerCase();
        const lastName = (a.data?.last_name || a.last_name || '').toLowerCase();
        return !firstName.includes('unknown') && !lastName.includes('unknown');
      }).sort((a, b) => {
        const aLast = a.data?.last_name || a.last_name || '';
        const bLast = b.data?.last_name || b.last_name || '';
        return aLast.localeCompare(bLast);
      });

      setAllAthletes(realAthletes);

      // Load metrics
      const metricsData = await Metric.filter({ organization_id: cartersville.id });
      setMetrics(metricsData);

      // Load records for unknown athletes
      if (unknown.length > 0) {
        const unknownIds = unknown.map(a => a.id);
        const allRecords = await MetricRecord.filter({ organization_id: cartersville.id });
        const unknownRecords = allRecords.filter(r => {
          const athleteId = r.data?.athlete_id || r.athlete_id;
          return unknownIds.includes(athleteId);
        });

        setRecordsToReassign(unknownRecords);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassign = (recordId, newAthleteId) => {
    setReassignments(prev => ({
      ...prev,
      [recordId]: newAthleteId
    }));
  };

  const processReassignments = async () => {
    setIsProcessing(true);
    try {
      const updates = [];
      const skipped = [];

      for (const record of recordsToReassign) {
        const newAthleteId = reassignments[record.id];
        
        if (!newAthleteId) {
          skipped.push(record.id);
          continue;
        }

        updates.push(
          MetricRecord.update(record.id, { athlete_id: newAthleteId })
        );
      }

      await Promise.all(updates);

      setResults({
        updated: updates.length,
        skipped: skipped.length
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error processing reassignments:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteUnknownRecords = async () => {
    if (!confirm('Are you sure you want to DELETE all records for unknown athletes? This cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const deletes = recordsToReassign.map(r => MetricRecord.delete(r.id));
      await Promise.all(deletes);

      alert(`Deleted ${deletes.length} records`);
      await loadData();
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-8 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!cartersvilleOrg) {
    return (
      <div className="min-h-screen bg-black p-8">
        <Alert className="bg-red-950/30 border-red-800">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            Cartersville organization not found
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-3">
              <UserX className="w-6 h-6 text-red-400" />
              Fix Unknown Athletes - Cartersville
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-blue-950/30 border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <p className="font-semibold mb-2">Found:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{unknownAthletes.length} "unknown" athlete(s)</li>
                  <li>{recordsToReassign.length} metric records to reassign</li>
                  <li>{allAthletes.length} real athletes available</li>
                </ul>
              </AlertDescription>
            </Alert>

            {results && (
              <Alert className="bg-green-950/30 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <p className="font-semibold">Completed!</p>
                  <p className="text-sm">Updated: {results.updated}, Skipped: {results.skipped}</p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {recordsToReassign.length > 0 && (
          <>
            <Card className="bg-gray-950 border border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white">Reassign Records</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recordsToReassign.map(record => {
                    const metric = metrics.find(m => m.id === (record.data?.metric_id || record.metric_id));
                    const unknownAthlete = unknownAthletes.find(a => a.id === (record.data?.athlete_id || record.athlete_id));
                    const value = record.data?.value || record.value;
                    const date = record.data?.recorded_date || record.recorded_date;

                    return (
                      <div key={record.id} className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-semibold">
                            {metric?.data?.name || metric?.name || 'Unknown Metric'}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Value: {value} | Date: {new Date(date).toLocaleDateString()} | From: {unknownAthlete?.data?.first_name || unknownAthlete?.first_name} {unknownAthlete?.data?.last_name || unknownAthlete?.last_name}
                          </p>
                        </div>
                        
                        <ArrowRight className="w-5 h-5 text-gray-600" />
                        
                        <Select
                          value={reassignments[record.id] || ''}
                          onValueChange={(value) => handleReassign(record.id, value)}
                        >
                          <SelectTrigger className="w-64 bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select athlete..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-64">
                            {allAthletes.map(athlete => (
                              <SelectItem key={athlete.id} value={athlete.id} className="text-white focus:bg-white focus:text-black">
                                {athlete.data?.first_name || athlete.first_name} {athlete.data?.last_name || athlete.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={processReassignments}
                    disabled={isProcessing || Object.keys(reassignments).length === 0}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
                  >
                    {isProcessing ? 'Processing...' : `Reassign ${Object.keys(reassignments).length} Record(s)`}
                  </Button>

                  <Button
                    onClick={deleteUnknownRecords}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-red-700 text-red-400 hover:bg-red-950/30"
                  >
                    Delete All Unknown Records
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {recordsToReassign.length === 0 && (
          <Alert className="bg-green-950/30 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              No records found for unknown athletes. All data is properly assigned!
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}