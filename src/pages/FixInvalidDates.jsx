import React, { useState, useEffect } from 'react';
import { useTeam } from "@/components/TeamContext";
import { MetricRecord } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle, CheckCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FixInvalidDates() {
  const { selectedOrgId } = useTeam();
  const [loading, setLoading] = useState(true);
  const [invalidDateGroups, setInvalidDateGroups] = useState([]);
  const [corrections, setCorrections] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (selectedOrgId && selectedOrgId !== 'all') {
      loadInvalidDates();
    }
  }, [selectedOrgId]);

  const loadInvalidDates = async () => {
    setLoading(true);
    try {
      // Fetch all records for the organization
      let allRecords = [];
      let skip = 0;
      const limit = 5000;
      let hasMore = true;

      while (hasMore) {
        const batch = await MetricRecord.list('-created_date', limit, skip);
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        const orgBatch = batch.filter(r => {
          const orgId = r.data?.organization_id || r.organization_id;
          return orgId === selectedOrgId;
        });

        allRecords = allRecords.concat(orgBatch);

        if (batch.length < limit) {
          hasMore = false;
        } else {
          skip += limit;
        }
      }

      // Find records with invalid dates
      const invalidRecords = allRecords.filter(r => {
        const date = r.data?.recorded_date || r.recorded_date;
        if (!date) return true;
        
        // Check if date matches YYYY-MM-DD format
        const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(date);
        return !validFormat;
      });

      // Group by invalid date value
      const groups = {};
      invalidRecords.forEach(r => {
        const date = r.data?.recorded_date || r.recorded_date || 'undefined';
        if (!groups[date]) {
          groups[date] = {
            invalidDate: date,
            count: 0,
            records: []
          };
        }
        groups[date].count++;
        groups[date].records.push(r);
      });

      setInvalidDateGroups(Object.values(groups));
    } catch (error) {
      console.error('Error loading invalid dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectionChange = (invalidDate, correctedDate) => {
    setCorrections(prev => ({
      ...prev,
      [invalidDate]: correctedDate
    }));
  };

  const handleApplyCorrections = async () => {
    setSaving(true);
    setSuccess(null);
    
    try {
      let totalUpdated = 0;

      for (const [invalidDate, correctedDate] of Object.entries(corrections)) {
        if (!correctedDate) continue;

        // Validate corrected date format
        const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(correctedDate);
        if (!validFormat) {
          alert(`Invalid date format for "${invalidDate}". Please use YYYY-MM-DD format.`);
          continue;
        }

        // Find the group with this invalid date
        const group = invalidDateGroups.find(g => g.invalidDate === invalidDate);
        if (!group) continue;

        // Update all records in this group
        for (const record of group.records) {
          await MetricRecord.update(record.id, {
            recorded_date: correctedDate
          });
          totalUpdated++;
          
          // Small delay to avoid rate limiting
          if (totalUpdated % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      setSuccess(`Successfully updated ${totalUpdated} records!`);
      
      // Reload the data
      setTimeout(() => {
        loadInvalidDates();
        setCorrections({});
      }, 2000);
    } catch (error) {
      console.error('Error applying corrections:', error);
      alert('Error applying corrections: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 mb-2">
            FIX INVALID DATES
          </h1>
          <p className="text-gray-400 font-semibold">
            Correct date formatting issues in metric records
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <Alert className="bg-green-950/20 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Alert className="bg-gray-950 border-amber-400/30">
          <Calendar className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-gray-300">
            <p className="font-semibold mb-2">Instructions:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Invalid dates are shown below grouped by their current value</li>
              <li>Enter the correct date in YYYY-MM-DD format (e.g., 2025-09-15)</li>
              <li>All records with that invalid date will be updated to the corrected date</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Invalid Dates List */}
        {invalidDateGroups.length === 0 ? (
          <Card className="bg-gray-950 border-gray-800">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-white mb-2">All dates are valid!</p>
              <p className="text-gray-400">No invalid dates found in the database.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-gray-950 border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-amber-200 font-black flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Invalid Dates Found: {invalidDateGroups.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {invalidDateGroups.map((group, index) => (
                  <div
                    key={index}
                    className="bg-black/50 border border-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">
                            Invalid Date
                          </Badge>
                          <span className="text-white font-mono font-bold text-lg">
                            {group.invalidDate === 'undefined' || group.invalidDate === 'null' 
                              ? '(empty/null)' 
                              : group.invalidDate}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          Affects {group.count} record{group.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-gray-300 font-semibold text-sm min-w-[120px]">
                        Correct Date:
                      </label>
                      <Input
                        type="date"
                        value={corrections[group.invalidDate] || ''}
                        onChange={(e) => handleCorrectionChange(group.invalidDate, e.target.value)}
                        className="flex-1 bg-gray-900 border-gray-700 text-white"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setCorrections({})}
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800"
                disabled={saving || Object.keys(corrections).length === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={handleApplyCorrections}
                disabled={saving || Object.keys(corrections).length === 0}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                    Applying Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Apply Corrections ({Object.keys(corrections).length})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}