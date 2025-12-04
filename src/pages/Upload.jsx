import React, { useState, useEffect } from "react";
import { Athlete, Metric, MetricRecord } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload as UploadIcon, FileSpreadsheet, Target, Zap, CheckCircle, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FileUploadZone from "../components/upload/FileUploadZone";
import ColumnMappingModal from "../components/upload/ColumnMappingModal";
import MissingAthletesModal from "../components/upload/MissingAthletesModal";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [dataType, setDataType] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [missingAthletes, setMissingAthletes] = useState([]);
  const [showMissingAthletesModal, setShowMissingAthletesModal] = useState(false);
  const [pendingRecordsData, setPendingRecordsData] = useState(null);
  const [pendingMapping, setPendingMapping] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metricsData, athletesData] = await Promise.all([
        Metric.list(),
        Athlete.list()
      ]);
      setMetrics(metricsData);
      setAthletes(athletesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setCsvData(null);
    setProcessedData(null);
    setError(null);
    setSuccess(null);
    setDataType(null);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Handle CSV with quotes and commas
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const result = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (match[1] !== undefined) {
          result.push(match[1].replace(/^"|"$/g, '').replace(/""/g, '"'));
        }
      }
      return result;
    });
  };

  const processFile = async (type) => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setDataType(type);

    try {
      // Read CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsed = parseCSV(text);
        setCsvData(parsed);
        setShowMappingModal(true);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsText(file);
    } catch (error) {
      setError(error.message || "Error processing file");
      setIsProcessing(false);
    }
  };

  const handleMappingComplete = async (mapping) => {
    setShowMappingModal(false);
    setIsProcessing(true);

    try {
      const records = [];
      const missingAthletesMap = new Map();
      const rowsWithMissingAthletes = [];
      
      // Skip header row, process data rows
      for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Get first name and last name from separate columns
        const firstName = row[parseInt(mapping.firstName)]?.trim();
        const lastName = row[parseInt(mapping.lastName)]?.trim();
        
        if (!firstName || !lastName) continue;
        
        // Find matching athlete
        const athlete = athletes.find(a => 
          a.first_name?.toLowerCase() === firstName.toLowerCase() && 
          a.last_name?.toLowerCase() === lastName.toLowerCase()
        );
        
        if (!athlete) {
          // Track missing athlete
          const key = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
          if (!missingAthletesMap.has(key)) {
            missingAthletesMap.set(key, { firstName, lastName });
          }
          // Store row data for later processing
          rowsWithMissingAthletes.push({ row, firstName, lastName, rowIndex: i });
          continue;
        }
        
        // Get date
        const dateStr = row[parseInt(mapping.date)]?.trim();
        if (!dateStr) continue;
        
        // Parse date (handle various formats)
        let recordDate;
        try {
          recordDate = new Date(dateStr);
          if (isNaN(recordDate.getTime())) {
            throw new Error('Invalid date');
          }
          recordDate = recordDate.toISOString().split('T')[0];
        } catch {
          console.warn(`Invalid date: ${dateStr}`);
          continue;
        }
        
        // Process each metric column
        for (const [columnIndex, metricId] of Object.entries(mapping.metricColumns)) {
          const value = parseFloat(row[parseInt(columnIndex)]?.trim());
          if (isNaN(value)) continue;
          
          records.push({
            athlete_id: athlete.id,
            metric_id: metricId,
            value: value,
            recorded_date: recordDate,
            notes: `Imported from CSV: ${file.name}`
          });
        }
      }
      
      // Check if there are missing athletes
      if (missingAthletesMap.size > 0) {
        setMissingAthletes(Array.from(missingAthletesMap.values()));
        setPendingRecordsData({ records, rowsWithMissingAthletes });
        setPendingMapping(mapping);
        setShowMissingAthletesModal(true);
        setIsProcessing(false);
        return;
      }
      
      setProcessedData(records);
      setIsProcessing(false);
    } catch (error) {
      setError(error.message || "Error processing data");
      setIsProcessing(false);
    }
  };

  const handleCreateMissingAthletes = async (newAthletes) => {
    setShowMissingAthletesModal(false);
    setIsProcessing(true);

    try {
      // Refresh athletes list to include new ones
      const athletesData = await Athlete.list();
      const updatedAthletes = athletesData.map(a => ({
        id: a.id,
        ...a.data,
        ...a
      }));
      setAthletes(updatedAthletes);

      // Process the rows that were missing athletes
      const additionalRecords = [];
      const { rowsWithMissingAthletes } = pendingRecordsData;
      
      for (const { row, firstName, lastName } of rowsWithMissingAthletes) {
        // Find the newly created athlete
        const athlete = updatedAthletes.find(a => 
          a.first_name?.toLowerCase() === firstName.toLowerCase() && 
          a.last_name?.toLowerCase() === lastName.toLowerCase()
        );
        
        if (!athlete) continue;
        
        // Get date
        const dateStr = row[parseInt(pendingMapping.date)]?.trim();
        if (!dateStr) continue;
        
        let recordDate;
        try {
          recordDate = new Date(dateStr);
          if (isNaN(recordDate.getTime())) continue;
          recordDate = recordDate.toISOString().split('T')[0];
        } catch {
          continue;
        }
        
        // Process each metric column
        for (const [columnIndex, metricId] of Object.entries(pendingMapping.metricColumns)) {
          const value = parseFloat(row[parseInt(columnIndex)]?.trim());
          if (isNaN(value)) continue;
          
          additionalRecords.push({
            athlete_id: athlete.id,
            metric_id: metricId,
            value: value,
            recorded_date: recordDate,
            notes: `Imported from CSV: ${file.name}`
          });
        }
      }
      
      // Combine existing records with new ones
      const allRecords = [...pendingRecordsData.records, ...additionalRecords];
      setProcessedData(allRecords);
      setMissingAthletes([]);
      setPendingRecordsData(null);
      setPendingMapping(null);
      setIsProcessing(false);
    } catch (error) {
      setError(error.message || "Error processing data after creating athletes");
      setIsProcessing(false);
    }
  };

  const handleSkipMissingAthletes = () => {
    setShowMissingAthletesModal(false);
    // Just use the records we already have (without missing athletes)
    setProcessedData(pendingRecordsData.records);
    setMissingAthletes([]);
    setPendingRecordsData(null);
    setPendingMapping(null);
  };

  const saveData = async () => {
    if (!processedData) return;

    setIsSaving(true);
    try {
      await MetricRecord.bulkCreate(processedData);
      setSuccess(`Successfully imported ${processedData.length} metric records!`);
      setFile(null);
      setCsvData(null);
      setProcessedData(null);
      setDataType(null);
    } catch (error) {
      setError("Error saving data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-gray-800">
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <UploadIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Data Upload Center
                </h1>
                <p className="text-gray-400 font-medium">
                  Import performance metrics with intelligent column mapping
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-gray-300 text-sm">CSV/Excel compatible</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className="text-gray-300 text-sm">Automatic athlete matching</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span className="text-gray-300 text-sm">Smart column detection</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-950/20 border-red-800">
            <AlertDescription className="text-red-300 font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-950/20 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">
          {!file && (
            <FileUploadZone onFileSelect={handleFileSelect} />
          )}

          {file && !processedData && (
            <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="text-white">Select Data Type</CardTitle>
                <p className="text-gray-400 text-sm">Choose what type of data you're uploading</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => processFile('metric_records')}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black h-24 flex flex-col gap-2 font-bold shadow-lg"
                  >
                    <FileSpreadsheet className="w-8 h-8" />
                    Performance Data
                    <span className="text-xs font-normal opacity-80">Import athlete metrics with column mapping</span>
                  </Button>
                  <Button
                    onClick={() => processFile('vbt_sessions')}
                    disabled={isProcessing}
                    className="bg-gray-800 hover:bg-gray-700 text-white h-24 flex flex-col gap-2 font-semibold border border-gray-700"
                  >
                    <Activity className="w-8 h-8" />
                    VBT Sessions
                    <span className="text-xs font-normal opacity-70">Import velocity-based training data</span>
                  </Button>
                </div>
                
                {isProcessing && (
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 text-amber-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
                      <span className="font-semibold">Processing your file...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {processedData && (
            <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800">
              <CardHeader className="border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-950">
                <CardTitle className="text-white">Preview Imported Data</CardTitle>
                <p className="text-gray-400 text-sm">
                  {processedData.length} records ready to import
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="max-h-96 overflow-y-auto mb-6 bg-black/30 border border-gray-800 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 sticky top-0">
                      <tr>
                        <th className="p-3 text-left text-gray-400 font-semibold">Athlete</th>
                        <th className="p-3 text-left text-gray-400 font-semibold">Metric</th>
                        <th className="p-3 text-left text-gray-400 font-semibold">Value</th>
                        <th className="p-3 text-left text-gray-400 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.slice(0, 50).map((record, idx) => {
                        const athlete = athletes.find(a => a.id === record.athlete_id);
                        const metric = metrics.find(m => m.id === record.metric_id);
                        return (
                          <tr key={idx} className="border-b border-gray-800">
                            <td className="p-3 text-white font-semibold">
                              {athlete?.first_name} {athlete?.last_name}
                            </td>
                            <td className="p-3 text-gray-300">{metric?.name}</td>
                            <td className="p-3 text-amber-400 font-semibold">
                              {record.value} {metric?.unit}
                            </td>
                            <td className="p-3 text-gray-400">{record.recorded_date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {processedData.length > 50 && (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Showing first 50 of {processedData.length} records
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setProcessedData(null);
                      setCsvData(null);
                      setDataType(null);
                    }}
                    className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveData}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Import {processedData.length} Records
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <ColumnMappingModal
          open={showMappingModal}
          onOpenChange={setShowMappingModal}
          csvData={csvData}
          metrics={metrics}
          athletes={athletes}
          onMappingComplete={handleMappingComplete}
        />

        <MissingAthletesModal
          open={showMissingAthletesModal}
          onOpenChange={setShowMissingAthletesModal}
          missingAthletes={missingAthletes}
          onCreateAthletes={handleCreateMissingAthletes}
          onSkip={handleSkipMissingAthletes}
        />
        </div>
        </div>
        );
}