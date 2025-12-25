import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  FileDown, ArrowLeft, Plus, Trash2, Save, Lock, Unlock, 
  Type, BarChart3, Move, GripVertical, Settings, TrendingUp, BarChart2, Users
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function ReportEditor({
  reportType,
  athlete,
  team,
  classPeriod,
  filterType,
  metrics,
  records,
  athletes,
  organization,
  categories,
  initialTemplate,
  onBack
}) {
  // Generate default title based on report type
  const getDefaultTitle = () => {
    if (reportType === 'individual') {
      return `${athlete?.first_name || ''} ${athlete?.last_name || ''} Progress Report`;
    } else {
      const groupName = filterType === 'team' ? team?.name : classPeriod;
      return `${groupName || ''} Progress Report`;
    }
  };

  const [elements, setElements] = useState(initialTemplate?.elements || [
    { id: 'header', type: 'text', content: getDefaultTitle(),
      fontSize: 28, fontWeight: 'bold', locked: false }
  ]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const reportRef = useRef(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(null); // 'averages' or 'athletes'
  const [selectedCompareAthletes, setSelectedCompareAthletes] = useState([]);
  const [athleteRenames, setAthleteRenames] = useState({}); // { athleteId: customName }

  // Get relevant records based on report type (handle both flat and nested data structures)
  const relevantRecords = reportType === 'individual' 
    ? records.filter(r => {
        const athleteId = r.athlete_id || r.data?.athlete_id;
        return athleteId === athlete?.id;
      })
    : records.filter(r => {
        const athleteId = r.athlete_id || r.data?.athlete_id;
        return athletes.some(a => a.id === athleteId);
      });

  // Add text element
  const addTextElement = () => {
    const newElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: 'New Text Block',
      fontSize: 16,
      fontWeight: 'normal',
      locked: false
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Add line graph element with auto-inserted summary table
  const addGraphElement = () => {
    const timestamp = Date.now();
    const graphElement = {
      id: `graph-${timestamp}`,
      type: 'graph',
      graphType: 'line',
      title: 'Performance Chart',
      metricIds: [],
      height: 300,
      locked: false,
      linkedSummaryId: `summary-${timestamp}`
    };
    const summaryElement = {
      id: `summary-${timestamp}`,
      type: 'summary',
      metricIds: [],
      locked: false,
      linkedGraphId: `graph-${timestamp}`
    };
    setElements([...elements, graphElement, summaryElement]);
    setSelectedElement(graphElement.id);
  };

  // Add bar graph element with auto-inserted summary table
  const addBarGraphElement = () => {
    const timestamp = Date.now();
    const graphElement = {
      id: `graph-${timestamp}`,
      type: 'graph',
      graphType: 'bar',
      title: 'Performance Chart',
      metricIds: [],
      height: 300,
      locked: false,
      linkedSummaryId: `summary-${timestamp}`,
      compareMode: null,
      compareAthletes: []
    };
    const summaryElement = {
      id: `summary-${timestamp}`,
      type: 'summary',
      metricIds: [],
      locked: false,
      linkedGraphId: `graph-${timestamp}`
    };
    setElements([...elements, graphElement, summaryElement]);
    setSelectedElement(graphElement.id);
  };

  // Add compare mode to selected graph
  const handleCompareSelection = (mode) => {
    if (!selectedEl || selectedEl.type !== 'graph') return;
    
    if (mode === 'averages') {
      updateElement(selectedEl.id, { compareMode: 'averages', compareAthletes: [] });
      setShowCompareDialog(false);
    } else if (mode === 'athletes') {
      setCompareMode('athletes');
      // Keep dialog open for athlete selection
    }
  };

  // Toggle compare athlete
  const toggleCompareAthlete = (athleteId) => {
    if (!selectedEl || selectedEl.type !== 'graph') return;
    
    const currentAthletes = selectedEl.compareAthletes || [];
    let newAthletes;
    
    if (currentAthletes.includes(athleteId)) {
      newAthletes = currentAthletes.filter(id => id !== athleteId);
    } else if (currentAthletes.length < 2) {
      newAthletes = [...currentAthletes, athleteId];
    } else {
      return; // Max 2 athletes
    }
    
    updateElement(selectedEl.id, { 
      compareMode: newAthletes.length > 0 ? 'athletes' : null, 
      compareAthletes: newAthletes 
    });
  };

  // Remove compare athlete
  const removeCompareAthlete = (athleteId) => {
    if (!selectedEl || selectedEl.type !== 'graph') return;
    
    const currentAthletes = selectedEl.compareAthletes || [];
    const newAthletes = currentAthletes.filter(id => id !== athleteId);
    
    updateElement(selectedEl.id, { 
      compareMode: newAthletes.length > 0 ? 'athletes' : null, 
      compareAthletes: newAthletes 
    });
    
    // Remove rename if exists
    if (athleteRenames[athleteId]) {
      const newRenames = { ...athleteRenames };
      delete newRenames[athleteId];
      setAthleteRenames(newRenames);
    }
  };

  // Rename athlete
  const renameAthlete = (athleteId) => {
    const currentName = athleteRenames[athleteId] || athletes.find(a => a.id === athleteId)?.first_name + ' ' + athletes.find(a => a.id === athleteId)?.last_name;
    const newName = prompt('Enter new display name:', currentName);
    
    if (newName && newName.trim()) {
      setAthleteRenames({ ...athleteRenames, [athleteId]: newName.trim() });
    }
  };

  // Add summary table element
  const addSummaryElement = () => {
    const newElement = {
      id: `summary-${Date.now()}`,
      type: 'summary',
      title: 'Metrics Summary',
      metricIds: [],
      locked: false
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Update element
  const updateElement = (id, updates) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  // Delete element
  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  // Handle drag end
  const handleDragEnd = (result) => {
    if (!result.destination || isLocked) return;
    
    const items = Array.from(elements);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setElements(items);
  };

  // Toggle element lock
  const toggleElementLock = (id) => {
    updateElement(id, { locked: !elements.find(el => el.id === id)?.locked });
  };

  // Toggle metric in graph (also updates linked summary table)
  const toggleMetricInElement = (elementId, metricId) => {
    setElements(prevElements => {
      const element = prevElements.find(el => el.id === elementId);
      if (!element) return prevElements;
      
      const currentMetrics = element.metricIds || [];
      const newMetrics = currentMetrics.includes(metricId)
        ? currentMetrics.filter(id => id !== metricId)
        : [...currentMetrics, metricId];
      
      return prevElements.map(el => {
        if (el.id === elementId) {
          return { ...el, metricIds: newMetrics };
        }
        // If this is a graph with a linked summary, update the summary too
        if (element.type === 'graph' && element.linkedSummaryId && el.id === element.linkedSummaryId) {
          return { ...el, metricIds: newMetrics };
        }
        // If this is a summary with a linked graph, update the graph too
        if (element.type === 'summary' && element.linkedGraphId && el.id === element.linkedGraphId) {
          return { ...el, metricIds: newMetrics };
        }
        return el;
      });
    });
  };

  // Get metrics sorted by category order
  const getSortedMetrics = () => {
    if (!categories || categories.length === 0) return metrics;
    
    const categoryOrder = {};
    categories.forEach((cat, idx) => {
      categoryOrder[cat.name] = idx;
    });
    
    return [...metrics].sort((a, b) => {
      const orderA = categoryOrder[a.category] ?? 999;
      const orderB = categoryOrder[b.category] ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // Get metrics grouped by category
  const getMetricsGroupedByCategory = () => {
    const sorted = getSortedMetrics();
    const grouped = {};
    
    sorted.forEach(metric => {
      const category = metric.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(metric);
    });
    
    // Return in category order
    const orderedCategories = categories.map(c => c.name).filter(name => grouped[name]);
    const otherCategories = Object.keys(grouped).filter(name => !orderedCategories.includes(name));
    
    return [...orderedCategories, ...otherCategories].map(category => ({
      category,
      metrics: grouped[category]
    }));
  };

  // Get chart data for a graph element (with comparison data)
  const getChartData = (metricIds, element) => {
    console.log('getChartData called with metricIds:', metricIds);
    console.log('relevantRecords count:', relevantRecords.length);
    
    const allDates = new Set();
    metricIds.forEach(metricId => {
      relevantRecords.filter(r => {
        const mId = r.metric_id || r.data?.metric_id;
        return mId === metricId;
      }).forEach(r => {
        const date = r.recorded_date || r.data?.recorded_date;
        if (date) allDates.add(date);
      });
    });

    // Add dates from comparison athletes if applicable
    if (element?.compareMode === 'athletes' && element?.compareAthletes?.length > 0) {
      metricIds.forEach(metricId => {
        records.filter(r => {
          const mId = r.metric_id || r.data?.metric_id;
          const aId = r.athlete_id || r.data?.athlete_id;
          return mId === metricId && element.compareAthletes.includes(aId);
        }).forEach(r => {
          const date = r.recorded_date || r.data?.recorded_date;
          if (date) allDates.add(date);
        });
      });
    }

    console.log('allDates:', Array.from(allDates));

    const sortedDates = Array.from(allDates).sort();
    
    const chartData = sortedDates.map(date => {
      const dataPoint = { date };
      
      // Main athlete/team data
      metricIds.forEach(metricId => {
        if (reportType === 'individual') {
          const record = relevantRecords.find(r => {
            const recDate = r.recorded_date || r.data?.recorded_date;
            const mId = r.metric_id || r.data?.metric_id;
            return recDate === date && mId === metricId;
          });
          if (record) {
            const value = record.value ?? record.data?.value;
            dataPoint[metricId] = value;
          }
        } else {
          const dayRecords = relevantRecords.filter(r => {
            const recDate = r.recorded_date || r.data?.recorded_date;
            const mId = r.metric_id || r.data?.metric_id;
            return recDate === date && mId === metricId;
          });
          if (dayRecords.length > 0) {
            const avg = dayRecords.reduce((sum, r) => sum + (r.value ?? r.data?.value ?? 0), 0) / dayRecords.length;
            dataPoint[metricId] = avg;
          }
        }
      });

      // Add comparison data
      if (element?.compareMode === 'averages' && reportType === 'individual') {
        // Add team/class averages
        metricIds.forEach(metricId => {
          const dayRecords = records.filter(r => {
            const recDate = r.recorded_date || r.data?.recorded_date;
            const mId = r.metric_id || r.data?.metric_id;
            const aId = r.athlete_id || r.data?.athlete_id;
            return recDate === date && mId === metricId && athletes.some(a => a.id === aId);
          });
          if (dayRecords.length > 0) {
            const avg = dayRecords.reduce((sum, r) => sum + (r.value ?? r.data?.value ?? 0), 0) / dayRecords.length;
            dataPoint[`${metricId}_avg`] = avg;
          }
        });
      }

      // Add comparison athletes
      if (element?.compareMode === 'athletes' && element?.compareAthletes?.length > 0) {
        element.compareAthletes.forEach(compareAthleteId => {
          metricIds.forEach(metricId => {
            const record = records.find(r => {
              const recDate = r.recorded_date || r.data?.recorded_date;
              const mId = r.metric_id || r.data?.metric_id;
              const aId = r.athlete_id || r.data?.athlete_id;
              return recDate === date && mId === metricId && aId === compareAthleteId;
            });
            if (record) {
              const value = record.value ?? record.data?.value;
              dataPoint[`${metricId}_${compareAthleteId}`] = value;
            }
          });
        });
      }

      return dataPoint;
    });
    
    console.log('chartData:', chartData);
    return chartData;
  };

  // Get summary data
  const getSummaryData = (metricIds) => {
    return metricIds.map(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) return null;

      const metricRecords = relevantRecords.filter(r => {
        const mId = r.metric_id || r.data?.metric_id;
        return mId === metricId;
      });
      if (metricRecords.length === 0) return null;

      const sortedRecords = [...metricRecords].sort((a, b) => {
        const dateA = a.recorded_date || a.data?.recorded_date;
        const dateB = b.recorded_date || b.data?.recorded_date;
        return new Date(dateA) - new Date(dateB);
      });
      const values = sortedRecords.map(r => r.value ?? r.data?.value).filter(v => v != null);
      
      if (values.length === 0) return null;
      
      return {
        metric,
        first: values[0],
        last: values[values.length - 1],
        peak: metric.target_higher ? Math.max(...values) : Math.min(...values),
        count: values.length
      };
    }).filter(Boolean);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const content = reportRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: white; color: black; }
            .report-element { margin-bottom: 20px; page-break-inside: avoid; }
            .chart-container { height: 300px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${content}
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Save as template
  const handleSaveTemplate = async () => {
    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    try {
      await base44.entities.ReportTemplate.create({
        name: templateName,
        report_type: reportType,
        elements: elements,
        organization_id: organization?.id
      });
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const colors = ['#EF4444', '#3B82F6', '#FCD34D', '#A855F7', '#10B981', '#F97316'];

  // Render element based on type
  const renderElement = (element, index) => {
    const isSelected = selectedElement === element.id;
    
    return (
      <Draggable 
        key={element.id} 
        draggableId={element.id} 
        index={index}
        isDragDisabled={isLocked || element.locked}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`report-element relative group ${isSelected ? 'ring-2 ring-amber-400' : ''} ${snapshot.isDragging ? 'opacity-75' : ''}`}
            onClick={() => !isLocked && setSelectedElement(element.id)}
          >
            {/* Drag Handle & Controls */}
            {!isLocked && (
              <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 no-print">
                <div {...provided.dragHandleProps} className="cursor-grab p-1 hover:bg-gray-700 rounded">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )}

            {/* Element Content */}
            {element.type === 'text' && (
              <div 
                className="p-4 bg-gray-900/50 rounded-lg border border-gray-800"
                style={{ fontSize: element.fontSize, fontWeight: element.fontWeight }}
              >
                {isSelected && !isLocked ? (
                  <Input
                    value={element.content}
                    onChange={(e) => updateElement(element.id, { content: e.target.value })}
                    className="bg-transparent border-none text-white p-0 focus:ring-0"
                    style={{ fontSize: element.fontSize, fontWeight: element.fontWeight }}
                  />
                ) : (
                  <span className="text-white">{element.content}</span>
                )}
              </div>
            )}

            {element.type === 'graph' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="border-b border-gray-800 py-3">
                  {isSelected && !isLocked ? (
                    <Input
                      value={element.title}
                      onChange={(e) => updateElement(element.id, { title: e.target.value })}
                      className="bg-transparent border-none text-white font-bold"
                    />
                  ) : (
                    <CardTitle className="text-white text-lg">{element.title}</CardTitle>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {element.metricIds && element.metricIds.length > 0 ? (
                    <div style={{ height: element.height }} className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        {element.graphType === 'bar' ? (
                          <BarChart data={getChartData(element.metricIds, element)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#9CA3AF"
                              tickFormatter={(date) => format(new Date(date), "MMM d")}
                            />
                            {(() => {
                              const selectedMetrics = element.metricIds.map(id => metrics.find(m => m.id === id)).filter(Boolean);
                              const chartData = getChartData(element.metricIds);
                              const uniqueUnits = [...new Set(selectedMetrics.map(m => m.unit))];
                              
                              // Calculate averages for each metric to check scale differences
                              const metricAverages = {};
                              element.metricIds.forEach(metricId => {
                                const values = chartData.map(d => d[metricId]).filter(v => v != null);
                                if (values.length > 0) {
                                  metricAverages[metricId] = values.reduce((sum, v) => sum + v, 0) / values.length;
                                }
                              });
                              
                              // Check if metrics have very different scales (>4 units apart)
                              const avgValues = Object.values(metricAverages);
                              const needsDualAxisForScale = avgValues.length >= 2 && 
                                Math.abs(Math.max(...avgValues) - Math.min(...avgValues)) > 4;
                              
                              const hasMultipleUnits = uniqueUnits.length > 1;
                              const needsDualAxis = hasMultipleUnits || needsDualAxisForScale;
                              
                              // Split metrics into two groups for dual axis
                              let leftAxisMetrics = selectedMetrics;
                              let rightAxisMetrics = [];
                              
                              if (needsDualAxis) {
                                if (hasMultipleUnits) {
                                  leftAxisMetrics = selectedMetrics.filter(m => m.unit === uniqueUnits[0]);
                                  rightAxisMetrics = selectedMetrics.filter(m => m.unit !== uniqueUnits[0]);
                                } else {
                                  // Split by scale - first metric on left, others with different scale on right
                                  const sortedByAvg = element.metricIds
                                    .map(id => ({ id, avg: metricAverages[id] || 0 }))
                                    .sort((a, b) => b.avg - a.avg);
                                  
                                  leftAxisMetrics = selectedMetrics.filter(m => m.id === sortedByAvg[0].id);
                                  rightAxisMetrics = selectedMetrics.filter(m => 
                                    m.id !== sortedByAvg[0].id && 
                                    Math.abs(metricAverages[m.id] - sortedByAvg[0].avg) > 4
                                  );
                                }
                              }
                              
                              // Calculate Y-axis domains
                              const leftValues = [];
                              const rightValues = [];
                              chartData.forEach(dataPoint => {
                                leftAxisMetrics.forEach(m => {
                                  if (dataPoint[m.id] != null) leftValues.push(dataPoint[m.id]);
                                });
                                rightAxisMetrics.forEach(m => {
                                  if (dataPoint[m.id] != null) rightValues.push(dataPoint[m.id]);
                                });
                              });
                              
                              const calcDomain = (values) => {
                                if (values.length === 0) return [0, 10];
                                const minVal = Math.min(...values);
                                const maxVal = Math.max(...values);
                                const range = maxVal - minVal;
                                const yMin = Math.floor((minVal - range * 0.1) * 10) / 10;
                                const yMax = Math.ceil((maxVal + range * 0.1) * 10) / 10;
                                return [yMin, yMax];
                              };
                              
                              const leftDomain = calcDomain(leftValues);
                              const rightDomain = calcDomain(rightValues);
                              
                              return (
                                <>
                                  <YAxis 
                                    yAxisId="left" 
                                    stroke="#9CA3AF"
                                    domain={leftDomain}
                                    label={{ 
                                      value: leftAxisMetrics[0]?.unit || '', 
                                      angle: -90, 
                                      position: 'insideLeft', 
                                      fill: '#9CA3AF' 
                                    }}
                                  />
                                  {needsDualAxis && rightAxisMetrics.length > 0 && (
                                    <YAxis 
                                      yAxisId="right" 
                                      orientation="right" 
                                      stroke="#9CA3AF"
                                      domain={rightDomain}
                                      label={{ 
                                        value: rightAxisMetrics[0]?.unit || '', 
                                        angle: 90, 
                                        position: 'insideRight', 
                                        fill: '#9CA3AF' 
                                      }}
                                    />
                                  )}
                                </>
                              );
                            })()}
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                              labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                              formatter={(value, name) => {
                                const metric = metrics.find(m => m.name === name || m.id === name);
                                return [value?.toFixed(metric?.decimal_places ?? 2), `${name} (${metric?.unit || ''})`];
                              }}
                            />
                            <Legend />
                            {(() => {
                              const selectedMetrics = element.metricIds.map(id => metrics.find(m => m.id === id)).filter(Boolean);
                              const chartData = getChartData(element.metricIds, element);
                              const uniqueUnits = [...new Set(selectedMetrics.map(m => m.unit))];
                              
                              // Calculate metric averages
                              const metricAverages = {};
                              element.metricIds.forEach(metricId => {
                                const values = chartData.map(d => d[metricId]).filter(v => v != null);
                                if (values.length > 0) {
                                  metricAverages[metricId] = values.reduce((sum, v) => sum + v, 0) / values.length;
                                }
                              });
                              
                              const avgValues = Object.values(metricAverages);
                              const needsDualAxisForScale = avgValues.length >= 2 && 
                                Math.abs(Math.max(...avgValues) - Math.min(...avgValues)) > 4;
                              
                              const hasMultipleUnits = uniqueUnits.length > 1;
                              const needsDualAxis = hasMultipleUnits || needsDualAxisForScale;
                              
                              const bars = [];
                              
                              // Main metric bars
                              element.metricIds.forEach((metricId, idx) => {
                                const metric = metrics.find(m => m.id === metricId);
                                
                                let yAxisId = 'left';
                                if (needsDualAxis) {
                                  if (hasMultipleUnits) {
                                    yAxisId = metric?.unit === uniqueUnits[0] ? 'left' : 'right';
                                  } else if (needsDualAxisForScale) {
                                    const sortedByAvg = element.metricIds
                                      .map(id => ({ id, avg: metricAverages[id] || 0 }))
                                      .sort((a, b) => b.avg - a.avg);
                                    const firstMetricId = sortedByAvg[0].id;
                                    const firstAvg = sortedByAvg[0].avg;
                                    
                                    if (metricId !== firstMetricId && Math.abs(metricAverages[metricId] - firstAvg) > 4) {
                                      yAxisId = 'right';
                                    }
                                  }
                                }
                                
                                bars.push(
                                  <Bar
                                    key={metricId}
                                    dataKey={metricId}
                                    name={metric?.name || metricId}
                                    fill={colors[idx % colors.length]}
                                    yAxisId={yAxisId}
                                    label={{ 
                                      position: 'top', 
                                      fill: colors[idx % colors.length],
                                      fontSize: 11,
                                      formatter: (value) => value != null ? Number(value).toFixed(metric?.decimal_places ?? 2) : ''
                                    }}
                                  />
                                );

                                // Add average bars
                                if (element.compareMode === 'averages') {
                                  bars.push(
                                    <Bar
                                      key={`${metricId}_avg`}
                                      dataKey={`${metricId}_avg`}
                                      name={`${metric?.name || metricId} (Avg)`}
                                      fill={colors[idx % colors.length]}
                                      fillOpacity={0.5}
                                      yAxisId={yAxisId}
                                      label={{ 
                                        position: 'top', 
                                        fill: colors[idx % colors.length],
                                        fontSize: 11,
                                        formatter: (value) => value != null ? Number(value).toFixed(metric?.decimal_places ?? 2) : ''
                                      }}
                                    />
                                  );
                                }

                                // Add comparison athlete bars
                                if (element.compareMode === 'athletes' && element.compareAthletes?.length > 0) {
                                  element.compareAthletes.forEach((compareAthleteId, aIdx) => {
                                    const compareAthlete = athletes.find(a => a.id === compareAthleteId);
                                    const displayName = athleteRenames[compareAthleteId] || 
                                      `${compareAthlete?.first_name || ''} ${compareAthlete?.last_name || ''}`.trim();
                                    
                                    bars.push(
                                      <Bar
                                        key={`${metricId}_${compareAthleteId}`}
                                        dataKey={`${metricId}_${compareAthleteId}`}
                                        name={`${metric?.name || metricId} (${displayName})`}
                                        fill={colors[(idx + aIdx + 1) % colors.length]}
                                        fillOpacity={0.7}
                                        yAxisId={yAxisId}
                                        label={{ 
                                          position: 'top', 
                                          fill: colors[(idx + aIdx + 1) % colors.length],
                                          fontSize: 11,
                                          formatter: (value) => value != null ? Number(value).toFixed(metric?.decimal_places ?? 2) : ''
                                        }}
                                      />
                                    );
                                  });
                                }
                              });
                              
                              return bars;
                            })()}
                          </BarChart>
                        ) : (
                          <LineChart data={getChartData(element.metricIds, element)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#9CA3AF"
                              tickFormatter={(date) => format(new Date(date), "MMM d")}
                            />
                            {(() => {
                              const selectedMetrics = element.metricIds.map(id => metrics.find(m => m.id === id)).filter(Boolean);
                              const chartData = getChartData(element.metricIds);
                              const uniqueUnits = [...new Set(selectedMetrics.map(m => m.unit))];
                              
                              // Calculate averages for each metric to check scale differences
                              const metricAverages = {};
                              element.metricIds.forEach(metricId => {
                                const values = chartData.map(d => d[metricId]).filter(v => v != null);
                                if (values.length > 0) {
                                  metricAverages[metricId] = values.reduce((sum, v) => sum + v, 0) / values.length;
                                }
                              });
                              
                              // Check if metrics have very different scales (>4 units apart)
                              const avgValues = Object.values(metricAverages);
                              const needsDualAxisForScale = avgValues.length >= 2 && 
                                Math.abs(Math.max(...avgValues) - Math.min(...avgValues)) > 4;
                              
                              const hasMultipleUnits = uniqueUnits.length > 1;
                              const needsDualAxis = hasMultipleUnits || needsDualAxisForScale;
                              
                              // Split metrics into two groups for dual axis
                              let leftAxisMetrics = selectedMetrics;
                              let rightAxisMetrics = [];
                              
                              if (needsDualAxis) {
                                if (hasMultipleUnits) {
                                  leftAxisMetrics = selectedMetrics.filter(m => m.unit === uniqueUnits[0]);
                                  rightAxisMetrics = selectedMetrics.filter(m => m.unit !== uniqueUnits[0]);
                                } else {
                                  // Split by scale - first metric on left, others with different scale on right
                                  const sortedByAvg = element.metricIds
                                    .map(id => ({ id, avg: metricAverages[id] || 0 }))
                                    .sort((a, b) => b.avg - a.avg);
                                  
                                  leftAxisMetrics = selectedMetrics.filter(m => m.id === sortedByAvg[0].id);
                                  rightAxisMetrics = selectedMetrics.filter(m => 
                                    m.id !== sortedByAvg[0].id && 
                                    Math.abs(metricAverages[m.id] - sortedByAvg[0].avg) > 4
                                  );
                                }
                              }
                              
                              // Calculate Y-axis domains separately for each axis
                              const leftValues = [];
                              const rightValues = [];
                              chartData.forEach(dataPoint => {
                                leftAxisMetrics.forEach(m => {
                                  if (dataPoint[m.id] != null) leftValues.push(dataPoint[m.id]);
                                });
                                rightAxisMetrics.forEach(m => {
                                  if (dataPoint[m.id] != null) rightValues.push(dataPoint[m.id]);
                                });
                              });
                              
                              const calcDomain = (values) => {
                                if (values.length === 0) return [0, 10];
                                const minVal = Math.min(...values);
                                const maxVal = Math.max(...values);
                                const range = maxVal - minVal;
                                const yMin = Math.floor((minVal - range * 0.1) * 10) / 10;
                                const yMax = Math.ceil((maxVal + range * 0.1) * 10) / 10;
                                return [yMin, yMax];
                              };
                              
                              const leftDomain = calcDomain(leftValues);
                              const rightDomain = calcDomain(rightValues);
                              
                              return (
                                <>
                                  <YAxis 
                                    yAxisId="left" 
                                    stroke="#9CA3AF"
                                    domain={leftDomain}
                                    label={{ 
                                      value: leftAxisMetrics[0]?.unit || '', 
                                      angle: -90, 
                                      position: 'insideLeft', 
                                      fill: '#9CA3AF' 
                                    }}
                                  />
                                  {needsDualAxis && rightAxisMetrics.length > 0 && (
                                    <YAxis 
                                      yAxisId="right" 
                                      orientation="right" 
                                      stroke="#9CA3AF"
                                      domain={rightDomain}
                                      label={{ 
                                        value: rightAxisMetrics[0]?.unit || '', 
                                        angle: 90, 
                                        position: 'insideRight', 
                                        fill: '#9CA3AF' 
                                      }}
                                    />
                                  )}
                                </>
                              );
                            })()}
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                              labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                              formatter={(value, name) => {
                                const metric = metrics.find(m => m.name === name || m.id === name);
                                return [value?.toFixed(metric?.decimal_places ?? 2), `${name} (${metric?.unit || ''})`];
                              }}
                            />
                            <Legend />
                            {(() => {
                              const selectedMetrics = element.metricIds.map(id => metrics.find(m => m.id === id)).filter(Boolean);
                              const chartData = getChartData(element.metricIds, element);
                              const uniqueUnits = [...new Set(selectedMetrics.map(m => m.unit))];
                              
                              // Calculate metric averages
                              const metricAverages = {};
                              element.metricIds.forEach(metricId => {
                                const values = chartData.map(d => d[metricId]).filter(v => v != null);
                                if (values.length > 0) {
                                  metricAverages[metricId] = values.reduce((sum, v) => sum + v, 0) / values.length;
                                }
                              });
                              
                              const avgValues = Object.values(metricAverages);
                              const needsDualAxisForScale = avgValues.length >= 2 && 
                                Math.abs(Math.max(...avgValues) - Math.min(...avgValues)) > 4;
                              
                              const hasMultipleUnits = uniqueUnits.length > 1;
                              const needsDualAxis = hasMultipleUnits || needsDualAxisForScale;
                              
                              const lines = [];
                              
                              // Main metric lines
                              element.metricIds.forEach((metricId, idx) => {
                                const metric = metrics.find(m => m.id === metricId);
                                
                                let yAxisId = 'left';
                                if (needsDualAxis) {
                                  if (hasMultipleUnits) {
                                    yAxisId = metric?.unit === uniqueUnits[0] ? 'left' : 'right';
                                  } else if (needsDualAxisForScale) {
                                    const sortedByAvg = element.metricIds
                                      .map(id => ({ id, avg: metricAverages[id] || 0 }))
                                      .sort((a, b) => b.avg - a.avg);
                                    const firstMetricId = sortedByAvg[0].id;
                                    const firstAvg = sortedByAvg[0].avg;
                                    
                                    if (metricId !== firstMetricId && Math.abs(metricAverages[metricId] - firstAvg) > 4) {
                                      yAxisId = 'right';
                                    }
                                  }
                                }
                                
                                lines.push(
                                  <Line
                                    key={metricId}
                                    type="monotone"
                                    dataKey={metricId}
                                    name={metric?.name || metricId}
                                    stroke={colors[idx % colors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    connectNulls={true}
                                    yAxisId={yAxisId}
                                  />
                                );

                                // Add average lines
                                if (element.compareMode === 'averages') {
                                  lines.push(
                                    <Line
                                      key={`${metricId}_avg`}
                                      type="monotone"
                                      dataKey={`${metricId}_avg`}
                                      name={`${metric?.name || metricId} (Avg)`}
                                      stroke={colors[idx % colors.length]}
                                      strokeWidth={2}
                                      strokeDasharray="5 5"
                                      dot={{ r: 3 }}
                                      connectNulls={true}
                                      yAxisId={yAxisId}
                                    />
                                  );
                                }

                                // Add comparison athlete lines
                                if (element.compareMode === 'athletes' && element.compareAthletes?.length > 0) {
                                  element.compareAthletes.forEach((compareAthleteId, aIdx) => {
                                    const compareAthlete = athletes.find(a => a.id === compareAthleteId);
                                    const displayName = athleteRenames[compareAthleteId] || 
                                      `${compareAthlete?.first_name || ''} ${compareAthlete?.last_name || ''}`.trim();
                                    
                                    lines.push(
                                      <Line
                                        key={`${metricId}_${compareAthleteId}`}
                                        type="monotone"
                                        dataKey={`${metricId}_${compareAthleteId}`}
                                        name={`${metric?.name || metricId} (${displayName})`}
                                        stroke={colors[(idx + aIdx + 1) % colors.length]}
                                        strokeWidth={2}
                                        strokeDasharray="3 3"
                                        dot={{ r: 3 }}
                                        connectNulls={true}
                                        yAxisId={yAxisId}
                                      />
                                    );
                                  });
                                }
                              });
                              
                              return lines;
                            })()}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Select metrics from the panel to display chart
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {element.type === 'summary' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardContent className="p-4">
                  {element.metricIds.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-800">
                          <th className="text-left p-3 text-gray-300">Metric</th>
                          <th className="text-left p-3 text-gray-300">First</th>
                          <th className="text-left p-3 text-gray-300">Last</th>
                          <th className="text-left p-3 text-gray-300">Peak/PR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSummaryData(element.metricIds).map((row, idx) => (
                          <tr key={row.metric.id} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                            <td className="p-3 text-white font-medium">{row.metric.name}</td>
                            <td className="p-3 text-gray-300">{row.first?.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</td>
                            <td className="p-3 text-gray-300">{row.last?.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</td>
                            <td className="p-3 text-amber-400 font-bold">{row.peak?.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {element.linkedGraphId ? 'Add metrics to the graph above' : 'Select metrics from the panel to display summary'}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Element Controls */}
            {isSelected && !isLocked && (
              <div className="absolute -right-2 top-2 flex flex-col gap-1 no-print">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); toggleElementLock(element.id); }}
                  className="h-8 w-8 bg-gray-800 hover:bg-gray-700"
                >
                  {element.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-gray-400" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
                  className="h-8 w-8 bg-gray-800 hover:bg-red-900"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  // Get other athletes for comparison (exclude main athlete if individual report)
  const compareableAthletes = reportType === 'individual' 
    ? athletes.filter(a => a.id !== athlete?.id)
    : [];

  return (
    <>
      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="bg-gray-950 border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Compare Options</DialogTitle>
            <DialogDescription className="text-gray-400">
              {compareMode === 'athletes' 
                ? 'Select up to 2 athletes to compare (click legend to rename/remove)' 
                : 'Choose a comparison type'}
            </DialogDescription>
          </DialogHeader>

          {!compareMode ? (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                onClick={() => handleCompareSelection('averages')}
                className="w-full h-20 border-gray-700 text-white hover:bg-gray-800 flex flex-col items-center justify-center gap-2"
              >
                <Users className="w-6 h-6" />
                <span className="font-bold">Compare to Averages</span>
                <span className="text-xs text-gray-400">Show team/class average</span>
              </Button>
              
              {reportType === 'individual' && (
                <Button
                  variant="outline"
                  onClick={() => setCompareMode('athletes')}
                  className="w-full h-20 border-gray-700 text-white hover:bg-gray-800 flex flex-col items-center justify-center gap-2"
                >
                  <Users className="w-6 h-6" />
                  <span className="font-bold">Compare to Another Athlete</span>
                  <span className="text-xs text-gray-400">Select up to 2 athletes</span>
                </Button>
              )}
            </div>
          ) : compareMode === 'athletes' ? (
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {compareableAthletes.map(a => {
                const isSelected = selectedEl?.compareAthletes?.includes(a.id);
                const canSelect = !isSelected && (selectedEl?.compareAthletes?.length || 0) < 2;
                
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-500/20 border-blue-400' 
                        : canSelect
                          ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canSelect || isSelected ? toggleCompareAthlete(a.id) : null}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{a.first_name} {a.last_name}</p>
                        <p className="text-gray-400 text-xs">{a.class_grade} • {a.class_period}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompareDialog(false);
                setCompareMode(null);
              }}
              className="border-gray-700 text-gray-300"
            >
              {compareMode === 'athletes' ? 'Done' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-screen">
      {/* Left Sidebar - Element Controls */}
      <div className="w-80 bg-gray-950 border-r border-gray-800 p-4 overflow-y-auto no-print">
        <div className="space-y-6">
          {/* Add Elements */}
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Elements
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={addTextElement}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex flex-col h-16"
                disabled={isLocked}
              >
                <Type className="w-5 h-5 mb-1" />
                <span className="text-xs">Text</span>
              </Button>
              <Button
                variant="outline"
                onClick={addGraphElement}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex flex-col h-16"
                disabled={isLocked}
              >
                <TrendingUp className="w-5 h-5 mb-1" />
                <span className="text-xs">Line Graph</span>
              </Button>
              <Button
                variant="outline"
                onClick={addBarGraphElement}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex flex-col h-16"
                disabled={isLocked}
              >
                <BarChart2 className="w-5 h-5 mb-1" />
                <span className="text-xs">Bar Graph</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedEl?.type === 'graph') {
                    setShowCompareDialog(true);
                    setCompareMode(null);
                  }
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex flex-col h-16 col-span-2"
                disabled={isLocked || !selectedEl || selectedEl.type !== 'graph'}
              >
                <Users className="w-5 h-5 mb-1" />
                <span className="text-xs">Compare</span>
              </Button>
              <Button
                variant="outline"
                onClick={addSummaryElement}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex flex-col h-16 col-span-2"
                disabled={isLocked}
              >
                <Settings className="w-5 h-5 mb-1" />
                <span className="text-xs">Summary Table</span>
              </Button>
            </div>
          </div>

          {/* Element Settings */}
          {selectedEl && !isLocked && (
            <div>
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Element Settings
              </h3>
              
              {selectedEl.type === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Font Size</label>
                    <Slider
                      value={[selectedEl.fontSize]}
                      onValueChange={([val]) => updateElement(selectedEl.id, { fontSize: val })}
                      min={12}
                      max={48}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{selectedEl.fontSize}px</span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Font Weight</label>
                    <Select 
                      value={selectedEl.fontWeight} 
                      onValueChange={(val) => updateElement(selectedEl.id, { fontWeight: val })}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="normal" className="text-white">Normal</SelectItem>
                        <SelectItem value="bold" className="text-white">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedEl.type === 'graph' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Chart Height</label>
                    <Slider
                      value={[selectedEl.height]}
                      onValueChange={([val]) => updateElement(selectedEl.id, { height: val })}
                      min={150}
                      max={500}
                      step={10}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-500">{selectedEl.height}px</span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Select Metrics</label>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {getMetricsGroupedByCategory().map(group => (
                        <div key={group.category} className="mb-2">
                          <div className="text-xs font-bold text-amber-400 uppercase tracking-wide px-2 py-1 bg-gray-800/50 rounded">
                            {group.category}
                          </div>
                          {group.metrics.map(metric => (
                            <label key={metric.id} className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer ml-2">
                              <input
                                type="checkbox"
                                checked={selectedEl.metricIds?.includes(metric.id)}
                                onChange={() => toggleMetricInElement(selectedEl.id, metric.id)}
                                className="rounded border-gray-600"
                              />
                              <span className="text-sm text-gray-300">{metric.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedEl.type === 'summary' && !selectedEl.linkedGraphId && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Select Metrics</label>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {getMetricsGroupedByCategory().map(group => (
                      <div key={group.category} className="mb-2">
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-wide px-2 py-1 bg-gray-800/50 rounded">
                          {group.category}
                        </div>
                        {group.metrics.map(metric => (
                          <label key={metric.id} className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer ml-2">
                            <input
                              type="checkbox"
                              checked={selectedEl.metricIds?.includes(metric.id)}
                              onChange={() => toggleMetricInElement(selectedEl.id, metric.id)}
                              className="rounded border-gray-600"
                            />
                            <span className="text-sm text-gray-300">{metric.name}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEl.type === 'summary' && selectedEl.linkedGraphId && (
                <div className="text-sm text-gray-400 p-3 bg-gray-800/50 rounded">
                  This summary table is linked to the graph above. Select metrics in the graph to update both.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-gray-800">
            <Button
              onClick={() => setIsLocked(!isLocked)}
              variant="outline"
              className={`w-full ${isLocked ? 'border-amber-400 text-amber-400' : 'border-gray-700 text-gray-300'}`}
            >
              {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              {isLocked ? 'Unlock Layout' : 'Lock Layout'}
            </Button>
            <Button
              onClick={handleSaveTemplate}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            <Button
              onClick={handleExportPDF}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Report Preview */}
      <div className="flex-1 bg-gray-900 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center z-10 no-print">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-gray-700 text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-gray-400 text-sm">
            {isLocked ? (
              <span className="flex items-center gap-2 text-amber-400">
                <Lock className="w-4 h-4" /> Layout Locked - Ready for Export
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Move className="w-4 h-4" /> Drag elements to reorder • Click to edit
              </span>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="p-8 max-w-4xl mx-auto" ref={reportRef}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="report-elements">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {elements.map((element, index) => renderElement(element, index))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {elements.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Add elements from the left panel to build your report</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}