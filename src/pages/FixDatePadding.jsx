import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, CheckCircle, AlertTriangle, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function FixDatePadding() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleFix = async () => {
    setRunning(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('fixDatePadding', {});
      setResult(response.data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 mb-2">
            FIX DATE PADDING
          </h1>
          <p className="text-gray-400 font-semibold">
            Ensure all dates use MM-DD-YYYY format with zero-padding
          </p>
        </div>

        {/* Instructions */}
        <Alert className="bg-gray-950 border-amber-400/30">
          <Calendar className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-gray-300">
            <p className="font-semibold mb-2">What this does:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Scans all metric records in the database</li>
              <li>Finds dates with single-digit months or days (e.g., 2025-9-5)</li>
              <li>Updates them to proper format (e.g., 2025-09-05)</li>
              <li>Ensures consistent MM-DD-YYYY display format</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action Card */}
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-amber-200 font-black flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Date Padding Fix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center">
              <Button
                onClick={handleFix}
                disabled={running}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold px-8 py-6 text-lg"
              >
                {running ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3" />
                    Scanning and Fixing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Date Padding Fix
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="bg-gray-950 border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white font-black flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Results
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Error
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {result.success ? (
                <>
                  <Alert className="bg-green-950/20 border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300 font-semibold">
                      {result.message}
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Records</p>
                      <p className="text-white text-2xl font-bold">{result.total}</p>
                    </div>
                    <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Fixed</p>
                      <p className="text-green-400 text-2xl font-bold">{result.fixed}</p>
                    </div>
                    <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Needed Fix</p>
                      <p className="text-amber-400 text-2xl font-bold">{result.needsFix || 0}</p>
                    </div>
                  </div>

                  {result.samples && result.samples.length > 0 && (
                    <div className="bg-black/50 border border-gray-700 rounded-lg p-4">
                      <h3 className="text-white font-bold mb-3">Sample Fixes:</h3>
                      <div className="space-y-2">
                        {result.samples.slice(0, 5).map((sample, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              {sample.oldDate}
                            </Badge>
                            <span className="text-gray-500">→</span>
                            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
                              {sample.newDate}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <Alert className="bg-red-950/20 border-red-800">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">
                        <p className="font-semibold mb-2">{result.errors.length} errors occurred:</p>
                        <div className="text-xs max-h-40 overflow-y-auto space-y-1">
                          {result.errors.slice(0, 10).map((err, idx) => (
                            <p key={idx}>• {err.oldDate}: {err.error}</p>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Alert className="bg-red-950/20 border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300 font-semibold">
                    {result.error || 'An unknown error occurred'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}