import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight, AlertTriangle } from "lucide-react";
import { Metric } from "@/entities/all";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function MetricCSVUploadModal({ open, onOpenChange, categories, organizationId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState({});
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const metricFields = [
    { key: 'name', label: 'Metric Name', required: true },
    { key: 'unit', label: 'Unit', required: true },
    { key: 'category', label: 'Category', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'target_higher', label: 'Target Higher (true/false)', required: false },
    { key: 'decimal_places', label: 'Decimal Places (0-4)', required: false }
  ];

  const checkForDuplicates = async (parsedMetrics) => {
    const existingMetrics = await Metric.list();
    const orgMetrics = existingMetrics.filter(m => 
      !m.organization_id || m.organization_id === organizationId
    );
    const warnings = [];

    parsedMetrics.forEach((newMetric, index) => {
      const duplicates = orgMetrics.filter(existing => 
        existing.name?.toLowerCase() === newMetric.name?.toLowerCase()
      );

      if (duplicates.length > 0) {
        warnings.push({
          rowIndex: index + 1,
          metric: newMetric.name,
          existing: duplicates.map(d => d.name).join(', ')
        });
      }
    });

    setDuplicateWarnings(warnings);
    return warnings;
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setUploadStatus(null);
    setPreviewData([]);
    setShowMapping(false);
    setColumnMapping({});
    setDuplicateWarnings([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const preview = lines.slice(0, 4).map(line => line.split(',').map(cell => cell.trim()));
      setPreviewData(preview);
      
      const headers = preview[0];
      const autoMapping = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
        const matchingField = metricFields.find(f => 
          f.key === normalizedHeader || 
          f.label.toLowerCase().replace(/[^a-z]/g, '') === normalizedHeader.replace(/[^a-z]/g, '')
        );
        if (matchingField) {
          autoMapping[index] = matchingField.key;
        }
      });
      setColumnMapping(autoMapping);
      setShowMapping(true);
    };
    reader.readAsText(selectedFile);
  };

  const handleColumnMap = (columnIndex, fieldKey) => {
    setColumnMapping(prev => ({
      ...prev,
      [columnIndex]: fieldKey === 'skip' ? undefined : fieldKey
    }));
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

        const parsedMetrics = [];
        for (const row of rows) {
          const metricData = {};
          Object.entries(columnMapping).forEach(([colIndex, fieldKey]) => {
            if (fieldKey) {
              metricData[fieldKey] = row[parseInt(colIndex)] || '';
            }
          });

          if (metricData.name && metricData.unit && metricData.category) {
            // Parse boolean and number values
            let targetHigher = true;
            if (metricData.target_higher) {
              const val = metricData.target_higher.toLowerCase();
              targetHigher = val === 'true' || val === '1' || val === 'yes' || val === 'higher';
            }

            let decimalPlaces = 2;
            if (metricData.decimal_places) {
              const parsed = parseInt(metricData.decimal_places);
              if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
                decimalPlaces = parsed;
              }
            }

            parsedMetrics.push({
              name: metricData.name,
              unit: metricData.unit,
              category: metricData.category,
              description: metricData.description || '',
              target_higher: targetHigher,
              decimal_places: decimalPlaces,
              is_active: true,
              is_hidden: false,
              organization_id: organizationId
            });
          }
        }

        const warnings = await checkForDuplicates(parsedMetrics);

        if (warnings.length > 0 && skipDuplicates) {
          setUploadStatus({
            type: "warning",
            message: `Found ${warnings.length} potential duplicate${warnings.length !== 1 ? 's' : ''}. These will be skipped.`,
            warnings: warnings
          });
        }

        const results = { success: 0, skipped: 0, errors: [] };

        for (let i = 0; i < parsedMetrics.length; i++) {
          try {
            const metricRecord = parsedMetrics[i];
            const rowIndex = i + 1;
            
            const isDuplicate = warnings.some(w => w.rowIndex === rowIndex);
            
            if (isDuplicate && skipDuplicates) {
              results.skipped++;
              continue;
            }

            await Metric.create(metricRecord);
            results.success++;
            
            if (i < parsedMetrics.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            results.errors.push(`Row ${i + 2}: ${error.message}`);
          }
        }

        setUploadStatus({
          type: results.errors.length === 0 ? "success" : "partial",
          message: `Successfully imported ${results.success} metrics${results.skipped > 0 ? `, skipped ${results.skipped} duplicates` : ''}${results.errors.length > 0 ? `, ${results.errors.length} failed` : ''}`,
          errors: results.errors
        });

        if (results.success > 0) {
          onUploadComplete();
        }
        setIsUploading(false);
      };
      reader.readAsText(file);

    } catch (error) {
      setUploadStatus({
        type: "error",
        message: error.message || "Failed to upload CSV"
      });
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setUploadStatus(null);
    setShowMapping(false);
    setColumnMapping({});
    setDuplicateWarnings([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            Upload Metrics CSV
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <Alert className="bg-gray-900 border-gray-700">
            <AlertDescription className="text-gray-300">
              <p className="font-semibold mb-2">Upload Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Upload your CSV file with metric definitions</li>
                <li>Map each CSV column to the corresponding metric field</li>
                <li>Required fields: Metric Name, Unit, Category</li>
                <li>The system will automatically detect and skip duplicate metrics</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-amber-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
              id="metric-csv-upload"
            />
            <label htmlFor="metric-csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                {file ? file.name : "Click to upload CSV file"}
              </p>
              <p className="text-gray-500 text-sm">
                CSV files only
              </p>
            </label>
          </div>

          {showMapping && previewData.length > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-amber-400" />
                Map CSV Columns to Metric Fields
              </h3>
              <div className="space-y-3">
                {previewData[0].map((header, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center bg-black/30 p-3 rounded">
                    <div className="text-gray-300 font-semibold">
                      <span className="text-gray-500 text-sm">Column {index + 1}:</span>
                      <div className="text-white mt-1">{header}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sample: {previewData[1]?.[index] || 'N/A'}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                    <Select
                      value={columnMapping[index] || 'skip'}
                      onValueChange={(value) => handleColumnMap(index, value)}
                    >
                      <SelectTrigger className="bg-black/50 border-amber-400/30 text-white focus:border-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-950 border-gray-700 max-h-64">
                        <SelectItem value="skip" className="text-gray-400 hover:bg-gray-800">
                          Skip this column
                        </SelectItem>
                        {metricFields.map(field => (
                          <SelectItem 
                            key={field.key} 
                            value={field.key} 
                            className="text-white hover:bg-gray-800"
                          >
                            {field.label} {field.required && '(Required)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={setSkipDuplicates}
                    className="border-2 border-amber-400/50 data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400"
                  />
                  <label
                    htmlFor="skip-duplicates"
                    className="text-sm text-white cursor-pointer font-semibold"
                  >
                    Automatically skip duplicate metrics (recommended)
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2 ml-6">
                  Duplicates are detected by matching metric names
                </p>
              </div>
            </div>
          )}

          {uploadStatus && (
            <>
              <Alert className={
                uploadStatus.type === "success" 
                  ? "bg-green-950/20 border-green-800" 
                  : uploadStatus.type === "error"
                  ? "bg-red-950/20 border-red-800"
                  : uploadStatus.type === "warning"
                  ? "bg-amber-950/20 border-amber-800"
                  : "bg-yellow-950/20 border-yellow-800"
              }>
                {uploadStatus.type === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : uploadStatus.type === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <AlertDescription className={
                  uploadStatus.type === "success" ? "text-green-300" : 
                  uploadStatus.type === "warning" ? "text-amber-300" : "text-red-300"
                }>
                  <p className="font-semibold">{uploadStatus.message}</p>
                  {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                    <div className="mt-2 text-xs max-h-40 overflow-y-auto">
                      {uploadStatus.errors.map((error, idx) => (
                        <p key={idx} className="text-red-400">• {error}</p>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {duplicateWarnings.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Duplicate Metrics Detected
                  </h4>
                  <div className="space-y-2">
                    {duplicateWarnings.map((warning, idx) => (
                      <div key={idx} className="bg-black/30 p-3 rounded">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="border-amber-600 text-amber-400">
                            Row {warning.rowIndex}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{warning.metric}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Matches existing: <span className="text-amber-400">{warning.existing}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
              disabled={!file || !showMapping || isUploading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}