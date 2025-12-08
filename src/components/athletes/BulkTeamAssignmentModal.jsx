import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle, Users } from "lucide-react";
import { Athlete, Team } from "@/entities/all";

export default function BulkTeamAssignmentModal({ open, onOpenChange, onComplete }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

        // Load all athletes and teams
        const allAthletes = await Athlete.list('-created_date', 10000);
        const allTeams = await Team.list();

        const normalizedAthletes = allAthletes.map(a => ({
          id: a.id,
          first_name: a.data?.first_name || a.first_name,
          last_name: a.data?.last_name || a.last_name,
          team_ids: a.data?.team_ids || a.team_ids || []
        }));

        const normalizedTeams = allTeams.map(t => ({
          id: t.id,
          name: t.data?.name || t.name
        }));

        const results = { success: 0, errors: [], skipped: 0 };

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 3) continue;

          const firstName = row[0];
          const lastName = row[1];
          const teamName = row[2];

          if (!firstName || !lastName || !teamName) {
            results.errors.push(`Row ${i + 2}: Missing required fields`);
            continue;
          }

          // Find athlete by name (case-insensitive)
          const athlete = normalizedAthletes.find(a => 
            a.first_name?.toLowerCase() === firstName.toLowerCase() &&
            a.last_name?.toLowerCase() === lastName.toLowerCase()
          );

          if (!athlete) {
            results.errors.push(`Row ${i + 2}: Athlete not found - ${firstName} ${lastName}`);
            continue;
          }

          // Find team by name (case-insensitive)
          const team = normalizedTeams.find(t => 
            t.name?.toLowerCase() === teamName.toLowerCase()
          );

          if (!team) {
            results.errors.push(`Row ${i + 2}: Team not found - ${teamName}`);
            continue;
          }

          // Check if athlete already has this team
          if (athlete.team_ids.includes(team.id)) {
            results.skipped++;
            continue;
          }

          // Add team to athlete's team_ids
          try {
            const updatedTeamIds = [...athlete.team_ids, team.id];
            await Athlete.update(athlete.id, { team_ids: updatedTeamIds });
            results.success++;

            // Update local cache
            athlete.team_ids = updatedTeamIds;
          } catch (error) {
            results.errors.push(`Row ${i + 2}: Failed to update ${firstName} ${lastName} - ${error.message}`);
          }
        }

        setResult(results);
        setIsProcessing(false);

        if (results.success > 0) {
          setTimeout(() => {
            onComplete();
            handleClose();
          }, 2000);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      setResult({
        success: 0,
        errors: [`Failed to process file: ${error.message}`],
        skipped: 0
      });
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-500" />
            Bulk Team Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <Alert className="bg-gray-900 border-gray-700">
            <AlertDescription className="text-gray-300">
              <p className="font-semibold mb-2">CSV Format:</p>
              <p className="text-sm mb-2">Upload a CSV with 3 columns: First Name, Last Name, Team Name</p>
              <div className="bg-black/50 p-3 rounded mt-2 font-mono text-xs">
                <div>First Name,Last Name,Team Name</div>
                <div>John,Smith,Varsity Football</div>
                <div>Jane,Doe,JV Basketball</div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                • Athletes must already exist in the system<br/>
                • Team names must match exactly (case-insensitive)<br/>
                • This will ADD teams to athletes (won't remove existing teams)
              </p>
            </AlertDescription>
          </Alert>

          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
              id="bulk-team-csv-upload"
            />
            <label htmlFor="bulk-team-csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                {file ? file.name : "Click to upload CSV file"}
              </p>
              <p className="text-gray-500 text-sm">
                CSV files only
              </p>
            </label>
          </div>

          {result && (
            <Alert className={
              result.errors.length === 0 
                ? "bg-green-950/20 border-green-800" 
                : "bg-yellow-950/20 border-yellow-800"
            }>
              {result.errors.length === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              )}
              <AlertDescription className={
                result.errors.length === 0 ? "text-green-300" : "text-yellow-300"
              }>
                <p className="font-semibold">
                  Successfully assigned {result.success} athlete{result.success !== 1 ? 's' : ''} to teams
                  {result.skipped > 0 && `, ${result.skipped} already assigned`}
                  {result.errors.length > 0 && `, ${result.errors.length} failed`}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2 text-xs max-h-40 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <p key={idx} className="text-red-400">• {error}</p>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isProcessing}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Assign Teams
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}