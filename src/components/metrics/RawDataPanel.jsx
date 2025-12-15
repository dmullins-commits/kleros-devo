import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, FileSpreadsheet, ArrowRight, Calendar, Download } from "lucide-react";
import { MetricRecord, Athlete, Metric, MetricCategory } from "@/entities/all";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatDateDisplay = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};

const formatDateShort = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
};

import { useTeam } from "@/components/TeamContext";

export default function RawDataPanel({ onClose }) {
  const { selectedOrganization } = useTeam();
  const [records, setRecords] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [organizedData, setOrganizedData] = useState([]);
  const [editedValues, setEditedValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateSelection, setShowDateSelection] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDate, setExportDate] = useState('');
  const [exportMetricId, setExportMetricId] = useState('');
  const [viewAllMode, setViewAllMode] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    if (!selectedOrganization?.id) return;
    
    setIsLoading(true);
    try {
      // Filter by organization_id at database level
      const [recordsData, athletesData, metricsData] = await Promise.all([
        MetricRecord.filter({ organization_id: selectedOrganization.id }),
        Athlete.filter({ organization_id: selectedOrganization.id }),
        Metric.filter({ organization_id: selectedOrganization.id })
      ]);
      
      const dates = [...new Set(recordsData.map(r => r.recorded_date || r.data?.recorded_date))].sort((a, b) => 
        new Date(b) - new Date(a)
      );
      
      setAvailableDates(dates);
      setRecords(recordsData);
      setAthletes(athletesData);
      setMetrics(metricsData);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (date) => {
    if (!selectedOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const [recordsData, athletesData, metricsData, categoriesData] = await Promise.all([
        MetricRecord.filter({ organization_id: selectedOrganization.id }),
        Athlete.filter({ organization_id: selectedOrganization.id }),
        Metric.filter({ organization_id: selectedOrganization.id }),
        MetricCategory.list()
      ]);
      
      const filteredRecords = recordsData.filter(r => (r.recorded_date || r.data?.recorded_date) === date);
      
      setRecords(recordsData);
      setAthletes(athletesData);
      setMetrics(metricsData);
      setCategories(categoriesData);
      
      organizeData(filteredRecords, athletesData, metricsData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setShowDateSelection(false);
    setViewAllMode(false);
    await loadData(date);
  };

  const handleViewAll = async () => {
    setViewAllMode(true);
    setShowDateSelection(false);
    setSelectedDate(null);
    await loadAllData();
  };

  const loadAllData = async () => {
    if (!selectedOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const [recordsData, athletesData, metricsData, categoriesData] = await Promise.all([
        MetricRecord.filter({ organization_id: selectedOrganization.id }),
        Athlete.filter({ organization_id: selectedOrganization.id }),
        Metric.filter({ organization_id: selectedOrganization.id }),
        MetricCategory.list()
      ]);
      
      setRecords(recordsData);
      setAthletes(athletesData);
      setMetrics(metricsData);
      setCategories(categoriesData);
      
      organizeAllData(recordsData, athletesData, metricsData);
    } finally {
      setIsLoading(false);
    }
  };

  const organizeAllData = (recordsData, athletesData, metricsData) => {
    const grouped = {};
    
    recordsData.forEach(record => {
      const key = `${record.recorded_date}_${record.athlete_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          date: record.recorded_date,
          athlete_id: record.athlete_id,
          metrics: {}
        };
      }
      grouped[key].metrics[record.metric_id] = {
        value: record.value,
        record_id: record.id
      };
    });

    // Sort by date (oldest to newest), then alphabetically by last name
    const organized = Object.values(grouped).sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      const athleteA = athletesData.find(ath => ath.id === a.athlete_id);
      const athleteB = athletesData.find(ath => ath.id === b.athlete_id);
      const nameA = athleteA ? `${athleteA.last_name}, ${athleteA.first_name}` : '';
      const nameB = athleteB ? `${athleteB.last_name}, ${athleteB.first_name}` : '';
      return nameA.localeCompare(nameB);
    });

    setOrganizedData(organized);
  };

  const handleExportCSV = async () => {
    if (!exportDate || !exportMetricId || !selectedOrganization?.id) return;

    // Reload records filtered by organization
    const allRecords = await MetricRecord.filter({ organization_id: selectedOrganization.id });
    const allAthletes = athletes.length > 0 ? athletes : await Athlete.filter({ organization_id: selectedOrganization.id });
    
    const metric = metrics.find(m => m.id === exportMetricId);
    if (!metric) return;

    const dateRecords = allRecords.filter(r => 
      r.recorded_date === exportDate && r.metric_id === exportMetricId
    );

    if (dateRecords.length === 0) {
      alert('No data found for the selected date and metric.');
      return;
    }
    
    const csvData = dateRecords.map(record => {
      const athlete = allAthletes.find(a => a.id === record.athlete_id);
      return {
        'Athlete Name': athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown',
        'Gender': athlete?.gender || '',
        'Class Period': athlete?.class_period || '',
        'Metric': metric.name,
        'Value': record.value,
        'Unit': metric.unit,
        'Date': exportDate
      };
    });

    csvData.sort((a, b) => {
      if (metric.target_higher) {
        return b.Value - a.Value;
      } else {
        return a.Value - b.Value;
      }
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metric.name}_${exportDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    setShowDateSelection(true);
  };

  const organizeData = (recordsData, athletesData, metricsData) => {
    const grouped = {};
    
    recordsData.forEach(record => {
      const key = `${record.recorded_date}_${record.athlete_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          date: record.recorded_date,
          athlete_id: record.athlete_id,
          metrics: {}
        };
      }
      grouped[key].metrics[record.metric_id] = {
        value: record.value,
        record_id: record.id
      };
    });

    const organized = Object.values(grouped).sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      const athleteA = athletesData.find(ath => ath.id === a.athlete_id);
      const athleteB = athletesData.find(ath => ath.id === b.athlete_id);
      const nameA = athleteA ? `${athleteA.last_name}, ${athleteA.first_name}` : '';
      const nameB = athleteB ? `${athleteB.last_name}, ${athleteB.first_name}` : '';
      return nameA.localeCompare(nameB);
    });

    setOrganizedData(organized);
  };

  const handleValueChange = (rowKey, metricId, value) => {
    setEditedValues(prev => ({
      ...prev,
      [`${rowKey}_${metricId}`]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      for (const [key, value] of Object.entries(editedValues)) {
        // Key format is: ${date}_${athleteId}_${metricId}
        // Date format is YYYY-MM-DD (contains hyphens, not underscores)
        const parts = key.split('_');
        const date = parts[0]; // YYYY-MM-DD
        const athleteId = parts[1];
        const metricId = parts.slice(2).join('_'); // Join in case metric ID has underscores
        const rowKey = `${date}_${athleteId}`;
        
        const row = organizedData.find(r => `${r.date}_${r.athlete_id}` === rowKey);
        if (!row) continue;

        const existingRecord = row.metrics[metricId];
        
        if (value === '' || value === null) {
          if (existingRecord?.record_id) {
            await MetricRecord.delete(existingRecord.record_id);
          }
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) continue;

          if (existingRecord?.record_id) {
            await MetricRecord.update(existingRecord.record_id, { value: numValue });
          } else {
            await MetricRecord.create({
              athlete_id: athleteId,
              metric_id: metricId,
              value: numValue,
              recorded_date: date,
              organization_id: selectedOrganization.id
            });
          }
        }
      }

      setSaveSuccess(true);
      setEditedValues({});
      
      if (viewAllMode) {
        await loadAllData();
      } else {
        await loadData(selectedDate);
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const metricsByCategory = {};
  const uncategorizedMetrics = [];

  metrics.filter(m => !m.is_auto_calculated).forEach(metric => {
    if (metric.category) {
      if (!metricsByCategory[metric.category]) {
        metricsByCategory[metric.category] = [];
      }
      metricsByCategory[metric.category].push(metric);
    } else {
      uncategorizedMetrics.push(metric);
    }
  });

  const sortedCategories = categories
    .filter(cat => !cat.is_hidden && metricsByCategory[cat.name])
    .sort((a, b) => a.order - b.order);

  const selectableMetrics = metrics.filter(m => !m.is_auto_calculated);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
      </div>
    );
  }

  if (showDateSelection) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="bg-gray-950 border border-gray-800 w-full max-w-2xl">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Calendar className="w-6 h-6 text-yellow-400" />
              Select Testing Date
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-300 mb-6">
              Choose a date to view and edit data collected during that testing session.
            </p>
            
            {/* View All Button */}
            <Button
              onClick={handleViewAll}
              className="w-full mb-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold h-auto py-4"
            >
              <FileSpreadsheet className="w-5 h-5 mr-3" />
              <div className="flex flex-col items-start">
                <span className="font-bold text-lg">View All Data</span>
                <span className="text-sm text-purple-200">See all records sorted by date and athlete name</span>
              </div>
              <ArrowRight className="w-5 h-5 ml-auto" />
            </Button>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
              {availableDates.map(date => {
                const parts = formatDateDisplay(date).split(', ');
                return (
                  <Button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white h-auto py-4 justify-start"
                  >
                    <Calendar className="w-5 h-5 mr-3 text-yellow-400" />
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg">
                        {parts[1]}, {parts[2]}
                      </span>
                      <span className="text-sm text-gray-400">
                        {parts[0]}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 ml-auto text-yellow-400" />
                  </Button>
                );
              })}
            </div>
            <div className="flex justify-between mt-6">
              <Button
                onClick={() => {
                  setShowExportModal(true);
                  setShowDateSelection(false);
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showExportModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="bg-gray-950 border border-gray-800 w-full max-w-md">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center gap-3 text-white">
              <Download className="w-6 h-6 text-blue-400" />
              Export to CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Select Date</label>
              <Select value={exportDate} onValueChange={setExportDate}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {availableDates.map(date => (
                    <SelectItem key={date} value={date} className="text-white">
                      {formatDateDisplay(date).split(', ').slice(1).join(', ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Select Metric</label>
              <Select value={exportMetricId} onValueChange={setExportMetricId}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {selectableMetrics.map(metric => (
                    <SelectItem key={metric.id} value={metric.id} className="text-white">
                      {metric.name} ({metric.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExportModal(false);
                  setShowDateSelection(true);
                }}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportCSV}
                disabled={!exportDate || !exportMetricId}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-950 border border-gray-800 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        <CardHeader className="border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-white">
              <FileSpreadsheet className="w-6 h-6 text-yellow-400" />
              Raw Data Editor - {viewAllMode ? 'All Data' : formatDateDisplay(selectedDate).split(', ').slice(1).join(', ')}
            </CardTitle>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <Alert className="bg-green-950/20 border-green-800 py-2 px-4">
                  <AlertDescription className="text-green-300 text-sm">
                    Changes saved successfully!
                  </AlertDescription>
                </Alert>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setShowDateSelection(true);
                  setViewAllMode(false);
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {viewAllMode ? 'Select Date' : 'Change Date'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || Object.keys(editedValues).length === 0}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          <div className="overflow-auto h-full">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gray-900">
                <tr>
                  <th className="border border-gray-700 p-2 bg-gray-900 text-left text-gray-300 font-bold sticky left-0 z-20">
                    Date
                  </th>
                  <th className="border border-gray-700 p-2 bg-gray-900 text-left text-gray-300 font-bold sticky left-[100px] z-20">
                    Athlete Name
                  </th>
                  {sortedCategories.map(category => {
                    const categoryMetrics = metricsByCategory[category.name] || [];
                    return categoryMetrics.map((metric, idx) => (
                      <th 
                        key={metric.id} 
                        className={`border border-gray-700 p-2 text-left text-gray-300 font-bold ${
                          idx === 0 ? 'bg-amber-900/30' : 'bg-gray-900'
                        }`}
                        style={idx === 0 ? { borderLeft: '3px solid #c9a961' } : {}}
                      >
                        <div className="flex flex-col">
                          {idx === 0 && (
                            <span className="text-amber-400 text-xs font-black mb-1">
                              {category.name.toUpperCase()}
                            </span>
                          )}
                          <span>{metric.name}</span>
                          <span className="text-xs text-gray-500 font-normal">({metric.unit})</span>
                        </div>
                      </th>
                    ));
                  })}
                  {uncategorizedMetrics.length > 0 && uncategorizedMetrics.map((metric, idx) => (
                    <th 
                      key={metric.id} 
                      className={`border border-gray-700 p-2 text-left text-gray-300 font-bold ${
                        idx === 0 ? 'bg-gray-800/50' : 'bg-gray-900'
                      }`}
                      style={idx === 0 ? { borderLeft: '3px solid #6b7280' } : {}}
                    >
                      <div className="flex flex-col">
                        {idx === 0 && (
                          <span className="text-gray-500 text-xs font-black mb-1">
                            UNCATEGORIZED
                          </span>
                        )}
                        <span>{metric.name}</span>
                        <span className="text-xs text-gray-500 font-normal">({metric.unit})</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizedData.map((row, rowIndex) => {
                  const athlete = athletes.find(a => a.id === row.athlete_id);
                  const athleteName = athlete ? `${athlete.last_name}, ${athlete.first_name}` : 'Unknown';
                  const rowKey = `${row.date}_${row.athlete_id}`;

                  return (
                    <tr key={rowKey} className={rowIndex % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/50'}>
                      <td className="border border-gray-700 p-2 text-white sticky left-0 z-10 bg-inherit font-medium whitespace-nowrap">
                        {formatDateShort(row.date)}
                      </td>
                      <td className="border border-gray-700 p-2 text-white sticky left-[100px] z-10 bg-inherit font-medium whitespace-nowrap">
                        {athleteName}
                      </td>
                      {sortedCategories.map(category => {
                        const categoryMetrics = metricsByCategory[category.name] || [];
                        return categoryMetrics.map((metric, idx) => {
                          const existingValue = row.metrics[metric.id]?.value;
                          const editKey = `${rowKey}_${metric.id}`;
                          const displayValue = editedValues[editKey] !== undefined 
                            ? editedValues[editKey] 
                            : (existingValue !== undefined ? existingValue : '');
                          
                          const decimalPlaces = metric.decimal_places ?? 2;
                          const step = decimalPlaces === 0 ? '1' : `0.${'0'.repeat(decimalPlaces - 1)}1`;

                          return (
                            <td 
                              key={metric.id} 
                              className="border border-gray-700 p-1"
                              style={idx === 0 ? { borderLeft: '3px solid #c9a961' } : {}}
                            >
                              <Input
                                type="number"
                                step={step}
                                value={displayValue}
                                onChange={(e) => handleValueChange(rowKey, metric.id, e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white w-20 h-8 text-sm"
                              />
                            </td>
                          );
                        });
                      })}
                      {uncategorizedMetrics.map((metric, idx) => {
                        const existingValue = row.metrics[metric.id]?.value;
                        const editKey = `${rowKey}_${metric.id}`;
                        const displayValue = editedValues[editKey] !== undefined 
                          ? editedValues[editKey] 
                          : (existingValue !== undefined ? existingValue : '');
                        
                        const decimalPlaces = metric.decimal_places ?? 2;
                        const step = decimalPlaces === 0 ? '1' : `0.${'0'.repeat(decimalPlaces - 1)}1`;

                        return (
                          <td 
                            key={metric.id} 
                            className="border border-gray-700 p-1"
                            style={idx === 0 ? { borderLeft: '3px solid #6b7280' } : {}}
                          >
                            <Input
                              type="number"
                              step={step}
                              value={displayValue}
                              onChange={(e) => handleValueChange(rowKey, metric.id, e.target.value)}
                              className="bg-gray-800 border-gray-700 text-white w-20 h-8 text-sm"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}