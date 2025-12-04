import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  FileDown, ArrowLeft, Plus, Trash2, Save, Lock, Unlock, 
  Type, BarChart3, Move, GripVertical, Settings
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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

  // Add graph element with auto-inserted summary table
  const addGraphElement = () => {
    const timestamp = Date.now();
    const graphElement = {
      id: `graph-${timestamp}`,
      type: 'graph',
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
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    const currentMetrics = element.metricIds || [];
    const newMetrics = currentMetrics.includes(metricId)
      ? currentMetrics.filter(id => id !== metricId)
      : [...currentMetrics, metricId];
    
    updateElement(elementId, { metricIds: newMetrics });
    
    // If this is a graph with a linked summary, update the summary too
    if (element.type === 'graph' && element.linkedSummaryId) {
      updateElement(element.linkedSummaryId, { metricIds: newMetrics });
    }
    // If this is a summary with a linked graph, update the graph too
    if (element.type === 'summary' && element.linkedGraphId) {
      updateElement(element.linkedGraphId, { metricIds: newMetrics });
    }
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

  // Get chart data for a graph element
  const getChartData = (metricIds) => {
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

    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      const dataPoint = { date };
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
            dataPoint[metricId] = dayRecords.reduce((sum, r) => sum + (r.value ?? r.data?.value ?? 0), 0) / dayRecords.length;
          }
        }
      });
      return dataPoint;
    });
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
                  {element.metricIds.length > 0 ? (
                    <div style={{ height: element.height }} className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData(element.metricIds)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#9CA3AF"
                            tickFormatter={(date) => format(new Date(date), "MMM d")}
                          />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                            labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                          />
                          <Legend />
                          {element.metricIds.map((metricId, idx) => {
                            const metric = metrics.find(m => m.id === metricId);
                            return (
                              <Line
                                key={metricId}
                                type="monotone"
                                dataKey={metricId}
                                name={metric?.name || metricId}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                              />
                            );
                          })}
                        </LineChart>
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

  return (
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
                <BarChart3 className="w-5 h-5 mb-1" />
                <span className="text-xs">Graph</span>
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
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-bold"
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
  );
}