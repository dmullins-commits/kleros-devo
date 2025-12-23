import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, Trash2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function DiagnoseDates() {
  const [diagnosing, setDiagnosing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState(null);
  const [fixResults, setFixResults] = useState(null);

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setResults(null);
    try {
      const response = await base44.functions.invoke('diagnoseInvalidDates', {});
      setResults(response.data);
    } catch (error) {
      console.error('Diagnosis error:', error);
      setResults({ error: error.message });
    } finally {
      setDiagnosing(false);
    }
  };

  const handleFix = async () => {
    if (!confirm('This will DELETE all records with invalid dates. This cannot be undone. Continue?')) {
      return;
    }

    setFixing(true);
    setFixResults(null);
    try {
      const response = await base44.functions.invoke('fixAllInvalidDates', {});
      setFixResults(response.data);
    } catch (error) {
      console.error('Fix error:', error);
      setFixResults({ error: error.message });
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gray-950 border border-gray-800 mb-6">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              Date Diagnostics & Cleanup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-gray-300">
              Use this tool to diagnose and fix records with invalid dates that are causing "RangeError: Invalid time value" errors.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {diagnosing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Diagnose Issues
                  </>
                )}
              </Button>

              {results && results.summary && results.summary.invalid_records > 0 && (
                <Button
                  onClick={handleFix}
                  disabled={fixing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {fixing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Invalid Records
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="bg-gray-950 border border-gray-800 mb-6">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Diagnosis Results</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {results.error ? (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-400 font-semibold">Error: {results.error}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <div className="text-gray-400 text-sm mb-1">Total Records</div>
                      <div className="text-white text-2xl font-bold">{results.summary?.total_records}</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
                      <div className="text-green-400 text-sm mb-1">Valid Records</div>
                      <div className="text-green-400 text-2xl font-bold">{results.summary?.valid_records}</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg">
                      <div className="text-red-400 text-sm mb-1">Invalid Records</div>
                      <div className="text-red-400 text-2xl font-bold">{results.summary?.invalid_records}</div>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg">
                      <div className="text-yellow-400 text-sm mb-1">% Invalid</div>
                      <div className="text-yellow-400 text-2xl font-bold">{results.summary?.percentage_invalid}</div>
                    </div>
                  </div>

                  {results.invalid_samples && results.invalid_samples.length > 0 && (
                    <div>
                      <h3 className="text-white font-bold mb-3">Sample Invalid Records:</h3>
                      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-gray-700">
                            <tr className="text-gray-400">
                              <th className="text-left p-2">Record ID</th>
                              <th className="text-left p-2">Date Value</th>
                              <th className="text-left p-2">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {results.invalid_samples.map((record, idx) => (
                              <tr key={idx} className="text-gray-300">
                                <td className="p-2 font-mono text-xs">{record.id.substring(0, 8)}...</td>
                                <td className="p-2">
                                  <Badge className="bg-red-900 text-red-300">{String(record.recorded_date)}</Badge>
                                </td>
                                <td className="p-2">{record.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {results.date_range && (
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h3 className="text-white font-bold mb-2">Valid Date Range:</h3>
                      <div className="flex gap-6 text-gray-300">
                        <div>
                          <span className="text-gray-400">Earliest:</span> {results.date_range.earliest}
                        </div>
                        <div>
                          <span className="text-gray-400">Latest:</span> {results.date_range.latest}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {fixResults && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center gap-3 text-white">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Cleanup Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {fixResults.error ? (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-400 font-semibold">Error: {fixResults.error}</p>
                </div>
              ) : (
                <>
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                    <p className="text-green-400 font-bold text-lg mb-2">{fixResults.message}</p>
                    <div className="text-green-300">
                      <div>Total Invalid: {fixResults.total_invalid}</div>
                      <div>Successfully Deleted: {fixResults.deleted}</div>
                      {fixResults.errors && fixResults.errors.length > 0 && (
                        <div className="text-yellow-400 mt-2">
                          Errors: {fixResults.errors.length}
                        </div>
                      )}
                    </div>
                  </div>

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