import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ColumnMappingModal({ 
  open, 
  onOpenChange, 
  csvData, 
  metrics, 
  athletes,
  onMappingComplete,
  multiMetricMode = false
}) {
  const [headers, setHeaders] = useState([]);
  const [sampleData, setSampleData] = useState([]);
  const [mapping, setMapping] = useState({
    firstName: '',
    lastName: '',
    date: '',
    metricColumns: {},
    metricNameColumn: '',
    valueColumn: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (csvData && csvData.length > 0) {
      // First row is headers
      const csvHeaders = csvData[0];
      setHeaders(csvHeaders);
      
      // Next 3 rows are sample data
      setSampleData(csvData.slice(1, 4));
      
      // Auto-detect common column names
      const autoMapping = {
        firstName: '',
        lastName: '',
        date: '',
        metricColumns: {},
        metricNameColumn: '',
        valueColumn: ''
      };
      
      csvHeaders.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        
        // Auto-detect first name column
        if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
          autoMapping.firstName = index.toString();
        } else if (lowerHeader === 'first' || lowerHeader === 'firstname') {
          autoMapping.firstName = index.toString();
        }
        
        // Auto-detect last name column
        if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
          autoMapping.lastName = index.toString();
        } else if (lowerHeader === 'last' || lowerHeader === 'lastname') {
          autoMapping.lastName = index.toString();
        }
        
        // Auto-detect date column
        if (lowerHeader.includes('date') || lowerHeader.includes('day') || lowerHeader.includes('time')) {
          autoMapping.date = index.toString();
        }
        
        // Multi-metric mode: Auto-detect metric name and value columns
        if (multiMetricMode) {
          if (lowerHeader === 'metric' || lowerHeader === 'metric name' || lowerHeader === 'test') {
            autoMapping.metricNameColumn = index.toString();
          }
          if (lowerHeader === 'value' || lowerHeader === 'result' || lowerHeader === 'score') {
            autoMapping.valueColumn = index.toString();
          }
        } else {
          // Auto-detect metric columns by matching metric names
          metrics.forEach(metric => {
            if (lowerHeader.includes(metric.name.toLowerCase()) || 
                lowerHeader.includes(metric.unit.toLowerCase())) {
              autoMapping.metricColumns[index.toString()] = metric.id;
            }
          });
        }
      });
      
      setMapping(autoMapping);
    }
  }, [csvData, metrics]);

  const handleMetricColumnChange = (columnIndex, metricId) => {
    setMapping(prev => ({
      ...prev,
      metricColumns: {
        ...prev.metricColumns,
        [columnIndex]: metricId
      }
    }));
  };

  const handleRemoveMetricColumn = (columnIndex) => {
    setMapping(prev => {
      const newMetricColumns = { ...prev.metricColumns };
      delete newMetricColumns[columnIndex];
      return {
        ...prev,
        metricColumns: newMetricColumns
      };
    });
  };

  const validateMapping = () => {
    if (!mapping.firstName) {
      setError('Please select the First Name column');
      return false;
    }
    if (!mapping.lastName) {
      setError('Please select the Last Name column');
      return false;
    }
    if (!mapping.date) {
      setError('Please select the Date column');
      return false;
    }
    
    if (multiMetricMode) {
      if (!mapping.metricNameColumn) {
        setError('Please select the Metric Name column');
        return false;
      }
      if (!mapping.valueColumn) {
        setError('Please select the Value column');
        return false;
      }
    } else {
      if (Object.keys(mapping.metricColumns).length === 0) {
        setError('Please map at least one metric column');
        return false;
      }
    }
    
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (validateMapping()) {
      onMappingComplete(mapping);
    }
  };

  const getColumnPreview = (columnIndex) => {
    return sampleData.map((row, idx) => (
      <div key={idx} className="text-xs text-gray-400 truncate">
        {row[columnIndex] || '—'}
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Map CSV Columns to System Fields
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">
            Match each column in your CSV to the corresponding field in the system
          </p>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {error && (
            <Alert className="bg-red-950/20 border-red-800">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Required Mappings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Required Fields</h3>
            
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">
                      First Name Column
                    </label>
                    <Select value={mapping.firstName} onValueChange={(value) => setMapping(prev => ({ ...prev, firstName: value }))}>
                      <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-950 border-gray-700">
                        <SelectItem value={null} className="text-gray-400">None</SelectItem>
                        {headers.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()} className="text-white">
                            Column {idx + 1}: {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-gray-600" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">
                      Sample Data
                    </label>
                    <div className="bg-black/30 border border-gray-700 rounded-md p-3 space-y-1">
                      {mapping.firstName ? getColumnPreview(parseInt(mapping.firstName)) : (
                        <div className="text-xs text-gray-500">Select a column to preview</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">
                      Last Name Column
                    </label>
                    <Select value={mapping.lastName} onValueChange={(value) => setMapping(prev => ({ ...prev, lastName: value }))}>
                      <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-950 border-gray-700">
                        <SelectItem value={null} className="text-gray-400">None</SelectItem>
                        {headers.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()} className="text-white">
                            Column {idx + 1}: {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-gray-600" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">
                      Sample Data
                    </label>
                    <div className="bg-black/30 border border-gray-700 rounded-md p-3 space-y-1">
                      {mapping.lastName ? getColumnPreview(parseInt(mapping.lastName)) : (
                        <div className="text-xs text-gray-500">Select a column to preview</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">
                      Date Column
                    </label>
                    <Select value={mapping.date} onValueChange={(value) => setMapping(prev => ({ ...prev, date: value }))}>
                      <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-950 border-gray-700">
                        <SelectItem value={null} className="text-gray-400">None</SelectItem>
                        {headers.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()} className="text-white">
                            Column {idx + 1}: {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-gray-600" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">
                      Sample Data
                    </label>
                    <div className="bg-black/30 border border-gray-700 rounded-md p-3 space-y-1">
                      {mapping.date ? getColumnPreview(parseInt(mapping.date)) : (
                        <div className="text-xs text-gray-500">Select a column to preview</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Multi-Metric Mode Fields */}
          {multiMetricMode ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Multi-Metric Mode</h3>
              <p className="text-sm text-gray-400">
                Map the column that contains metric names and the column that contains values
              </p>
              
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <label className="text-sm font-semibold text-gray-300 block mb-2">
                        Metric Name Column
                      </label>
                      <Select value={mapping.metricNameColumn} onValueChange={(value) => setMapping(prev => ({ ...prev, metricNameColumn: value }))}>
                        <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-950 border-gray-700">
                          <SelectItem value={null} className="text-gray-400">None</SelectItem>
                          {headers.map((header, idx) => (
                            <SelectItem key={idx} value={idx.toString()} className="text-white">
                              Column {idx + 1}: {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-600" />
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-gray-300 block mb-2">
                        Sample Data
                      </label>
                      <div className="bg-black/30 border border-gray-700 rounded-md p-3 space-y-1">
                        {mapping.metricNameColumn ? getColumnPreview(parseInt(mapping.metricNameColumn)) : (
                          <div className="text-xs text-gray-500">Select a column to preview</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <label className="text-sm font-semibold text-gray-300 block mb-2">
                        Value Column
                      </label>
                      <Select value={mapping.valueColumn} onValueChange={(value) => setMapping(prev => ({ ...prev, valueColumn: value }))}>
                        <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-950 border-gray-700">
                          <SelectItem value={null} className="text-gray-400">None</SelectItem>
                          {headers.map((header, idx) => (
                            <SelectItem key={idx} value={idx.toString()} className="text-white">
                              Column {idx + 1}: {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-600" />
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-gray-300 block mb-2">
                        Sample Data
                      </label>
                      <div className="bg-black/30 border border-gray-700 rounded-md p-3 space-y-1">
                        {mapping.valueColumn ? getColumnPreview(parseInt(mapping.valueColumn)) : (
                          <div className="text-xs text-gray-500">Select a column to preview</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Standard Metric Columns */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Metric Columns</h3>
              <Button
                onClick={() => {
                  const nextUnmapped = headers.findIndex((_, idx) => 
                    idx.toString() !== mapping.firstName && 
                    idx.toString() !== mapping.lastName && 
                    idx.toString() !== mapping.date && 
                    !mapping.metricColumns[idx.toString()]
                  );
                  if (nextUnmapped !== -1) {
                    handleMetricColumnChange(nextUnmapped.toString(), metrics[0]?.id || '');
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-black font-semibold text-sm"
              >
                Add Metric Column
              </Button>
            </div>

            <div className="space-y-3">
              {Object.entries(mapping.metricColumns).map(([columnIndex, metricId]) => (
                <Card key={columnIndex} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div>
                        <label className="text-sm font-semibold text-gray-300 block mb-2">
                          CSV Column
                        </label>
                        <Select value={columnIndex} onValueChange={(newCol) => {
                          const metric = mapping.metricColumns[columnIndex];
                          handleRemoveMetricColumn(columnIndex);
                          handleMetricColumnChange(newCol, metric);
                        }}>
                          <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            {headers.map((header, idx) => (
                              <SelectItem key={idx} value={idx.toString()} className="text-white">
                                Column {idx + 1}: {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-center">
                        <ArrowRight className="w-6 h-6 text-amber-500" />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-300 block mb-2">
                          Maps to Metric
                        </label>
                        <Select value={metricId} onValueChange={(value) => handleMetricColumnChange(columnIndex, value)}>
                          <SelectTrigger className="bg-black/50 border-gray-700 text-white">
                            <SelectValue placeholder="Select metric..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            {metrics.map(metric => (
                              <SelectItem key={metric.id} value={metric.id} className="text-white">
                                {metric.name} ({metric.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-300 block mb-2">
                          Sample Values
                        </label>
                        <div className="bg-black/30 border border-gray-700 rounded-md p-2 space-y-1 text-xs text-gray-400">
                          {getColumnPreview(parseInt(columnIndex))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMetricColumn(columnIndex)}
                      className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {Object.keys(mapping.metricColumns).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No metric columns mapped yet. Click "Add Metric Column" to start.
              </div>
            )}
            </div>
          )}

          {/* Summary */}
          <Card className="bg-gradient-to-r from-amber-950/20 to-amber-900/20 border-amber-800/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-2">Mapping Summary</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ First name from column: {mapping.firstName ? headers[parseInt(mapping.firstName)] : 'Not selected'}</li>
                    <li>✓ Last name from column: {mapping.lastName ? headers[parseInt(mapping.lastName)] : 'Not selected'}</li>
                    <li>✓ Dates from column: {mapping.date ? headers[parseInt(mapping.date)] : 'Not selected'}</li>
                    {multiMetricMode ? (
                      <>
                        <li>✓ Metric names from column: {mapping.metricNameColumn ? headers[parseInt(mapping.metricNameColumn)] : 'Not selected'}</li>
                        <li>✓ Values from column: {mapping.valueColumn ? headers[parseInt(mapping.valueColumn)] : 'Not selected'}</li>
                      </>
                    ) : (
                      <li>✓ {Object.keys(mapping.metricColumns).length} metric column(s) mapped</li>
                    )}
                    <li className="text-amber-400 mt-2">
                      Will process {sampleData.length} sample rows + remaining data
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
            >
              Confirm & Import Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}