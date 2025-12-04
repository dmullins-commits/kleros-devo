import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowLeft, Trash2, Save } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import GraphBuilder from "./GraphBuilder";
import SaveTemplateModal from "./SaveTemplateModal";

export default function NewIndividualReport({ athlete, team, metrics, records, athletes, organization, onBack, initialGraphs, dateRangeType, startDate }) {
  const [graphs, setGraphs] = useState(initialGraphs || []);
  const [showGraphBuilder, setShowGraphBuilder] = useState(true);
  const [currentGraphMetrics, setCurrentGraphMetrics] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    loadInjuries();
  }, [athlete?.id]);

  const loadInjuries = async () => {
    if (!athlete?.id) return;
    try {
      const injuriesData = await base44.entities.Injury.filter({ athlete_id: athlete.id });
      setInjuries(injuriesData);
    } catch (error) {
      console.error('Error loading injuries:', error);
    }
  };

  const toggleMetric = (metricId) => {
    setCurrentGraphMetrics(prev =>
      prev.includes(metricId) ? prev.filter(id => id !== metricId) : [...prev, metricId]
    );
  };

  const addGraph = () => {
    if (currentGraphMetrics.length > 0 && graphs.length < 5) {
      setGraphs([...graphs, { id: Date.now(), metricIds: currentGraphMetrics, title: `Graph ${graphs.length + 1}` }]);
      setCurrentGraphMetrics([]);
    }
  };

  const updateGraphTitle = (graphId, newTitle) => {
    setGraphs(graphs.map(g => g.id === graphId ? { ...g, title: newTitle } : g));
  };

  const removeGraph = (graphId) => {
    setGraphs(graphs.filter(g => g.id !== graphId));
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveTemplate = async (templateName) => {
    try {
      await base44.entities.ReportTemplate.create({
        name: templateName,
        report_type: "individual",
        graphs: graphs,
        organization_id: organization?.id
      });
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  // Get all unique metrics from all graphs
  const allSelectedMetricIds = [...new Set(graphs.flatMap(g => g.metricIds))];
  const allSelectedMetrics = metrics.filter(m => allSelectedMetricIds.includes(m.id));

  // Get athlete records
  const athleteRecords = records.filter(r => r.athlete_id === athlete.id);

  // Calculate summary data for each metric
  const summaryData = allSelectedMetrics.map(metric => {
    const metricRecords = athleteRecords
      .filter(r => r.metric_id === metric.id)
      .sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date));

    if (metricRecords.length === 0) return null;

    const latestValue = metricRecords[metricRecords.length - 1].value;
    const pr = metric.target_higher
      ? Math.max(...metricRecords.map(r => r.value))
      : Math.min(...metricRecords.map(r => r.value));

    return { metric, latestValue, pr };
  }).filter(Boolean);

  const colors = [
    "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#6366f1"
  ];

  // Generate all dates for the selected range
  const generateDateRange = () => {
    const dates = [];
    const today = new Date();
    
    if (dateRangeType === "last30") {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(format(date, "yyyy-MM-dd"));
      }
    } else if (dateRangeType === "custom" && startDate) {
      const start = new Date(startDate);
      const current = new Date(start);
      while (current <= today) {
        dates.push(format(current, "yyyy-MM-dd"));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return dates;
  };

  const renderGraph = (graph, index) => {
    const graphMetrics = metrics.filter(m => graph.metricIds.includes(m.id));
    
    // Prepare chart data - use full date range for last30 or custom, otherwise just dates with data
    let sortedDates;
    if (dateRangeType === "last30" || (dateRangeType === "custom" && startDate)) {
      sortedDates = generateDateRange();
    } else {
      const dateSet = new Set(athleteRecords.filter(r => graph.metricIds.includes(r.metric_id)).map(r => r.recorded_date));
      sortedDates = Array.from(dateSet).sort();
    }

    const chartData = sortedDates.map(date => {
      const dataPoint = { date };
      graphMetrics.forEach(metric => {
        const record = athleteRecords.find(r => r.recorded_date === date && r.metric_id === metric.id);
        if (record) {
          dataPoint[metric.id] = record.value;
        }
      });
      return dataPoint;
    });

    const units = [...new Set(graphMetrics.map(m => m.unit))];
    const needsDualAxis = units.length > 1;
    const leftAxisMetrics = graphMetrics.filter(m => m.unit === units[0]);
    const rightAxisMetrics = needsDualAxis ? graphMetrics.filter(m => m.unit !== units[0]) : [];

    return (
      <div key={graph.id} className="avoid-break">
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800 flex flex-row items-center justify-between">
            <input
              type="text"
              value={graph.title || `Graph ${index + 1}`}
              onChange={(e) => updateGraphTitle(graph.id, e.target.value)}
              className="text-white font-bold text-xl bg-transparent border-none outline-none focus:ring-2 focus:ring-purple-400 rounded px-2 py-1 print-hide"
              placeholder={`Graph ${index + 1}`}
            />
            <div className="text-white font-bold text-xl hidden print:block">{graph.title || `Graph ${index + 1}`}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeGraph(graph.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 print-hide"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 print-chart">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(value) => {
                      try {
                        const [year, month, day] = value.split('-');
                        return format(new Date(year, month - 1, day), "MMM dd");
                      } catch {
                        return value;
                      }
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    label={{ value: units[0], angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  {needsDualAxis && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                      label={{ value: units[1], angle: 90, position: 'insideRight', fill: '#9ca3af' }}
                    />
                  )}
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    labelFormatter={(value) => {
                      try {
                        const [year, month, day] = value.split('-');
                        return format(new Date(year, month - 1, day), "MMM dd, yyyy");
                      } catch {
                        return value;
                      }
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#fff' }} />

                  {/* Injury markers */}
                  {injuries.map((injury, idx) => {
                    const injuryDataPoint = chartData.find(d => d.date === injury.date_of_injury);
                    if (!injuryDataPoint) return null;

                    return leftAxisMetrics.map(metric => {
                      if (injuryDataPoint[metric.id] != null) {
                        return (
                          <ReferenceDot
                            key={`injury-${idx}-${metric.id}`}
                            x={injury.date_of_injury}
                            y={injuryDataPoint[metric.id]}
                            yAxisId="left"
                            r={8}
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth={2}
                            shape={(props) => {
                              const { cx, cy } = props;
                              return (
                                <g>
                                  <circle cx={cx} cy={cy} r={8} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                                  <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">★</text>
                                </g>
                              );
                            }}
                          />
                        );
                      }
                      return null;
                    });
                  })}

                  {leftAxisMetrics.map((metric, metricIndex) => {
                    const shapes = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross', 'wye'];
                    const shapeType = shapes[metricIndex % shapes.length];
                    return (
                      <Line
                        key={metric.id}
                        yAxisId="left"
                        type="monotone"
                        dataKey={metric.id}
                        name={metric.name}
                        stroke={colors[metricIndex % colors.length]}
                        strokeWidth={3}
                        dot={{ fill: colors[metricIndex % colors.length], r: 6, strokeWidth: 2, stroke: '#000' }}
                        shape={shapeType}
                        connectNulls={true}
                      />
                    );
                  })}

                  {rightAxisMetrics.map((metric, metricIndex) => {
                    const shapes = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross', 'wye'];
                    const shapeType = shapes[(leftAxisMetrics.length + metricIndex) % shapes.length];
                    return (
                      <Line
                        key={metric.id}
                        yAxisId="right"
                        type="monotone"
                        dataKey={metric.id}
                        name={metric.name}
                        stroke={colors[(leftAxisMetrics.length + metricIndex) % colors.length]}
                        strokeWidth={3}
                        dot={{ fill: colors[(leftAxisMetrics.length + metricIndex) % colors.length], r: 6, strokeWidth: 2, stroke: '#000' }}
                        shape={shapeType}
                        connectNulls={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page { size: 8.5in 11in; margin: 0.5in; }
            body { background: white !important; font-family: Calibri, Arial, sans-serif !important; }
            .print-hide { display: none !important; }
            body::before {
              content: "";
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 400px;
              height: 400px;
              background-image: ${organization?.logo ? `url(${organization.logo})` : 'none'};
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.08;
              z-index: -1;
            }
            .avoid-break { page-break-inside: avoid; }
            .print-chart { height: 280px !important; }
            p, span, div, td, th { font-size: 12pt !important; }
            h1 { font-size: 20px !important; }
            h2 { font-size: 18px !important; }
            .print-compact table { border-collapse: collapse !important; }
            .print-compact th, .print-compact td { padding: 6px 8px !important; border: 1px solid #000 !important; }
          }
        `}
      </style>

      <div id="report-content" className="space-y-6">
        {/* Header with Athlete Info */}
        <Card className="bg-gray-950 border border-gray-800 avoid-break">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white text-2xl">
              Individual Performance Report: {athlete.first_name} {athlete.last_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Athlete</p>
                <p className="text-white font-bold">{athlete.first_name} {athlete.last_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Grade</p>
                <p className="text-white font-bold">{athlete.class_grade || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Class Period</p>
                <p className="text-white font-bold">{athlete.class_period || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Team</p>
                <p className="text-white font-bold">{team?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Table */}
        {summaryData.length > 0 && (
          <Card className="bg-gray-950 border border-gray-800 avoid-break">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Selected Metrics Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto print-compact">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="text-left p-4 text-gray-300 font-bold">Metric</th>
                      <th className="text-left p-4 text-gray-300 font-bold">Unit</th>
                      <th className="text-left p-4 text-gray-300 font-bold">All-Time PR</th>
                      <th className="text-left p-4 text-gray-300 font-bold">Most Recent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((row, index) => (
                      <tr key={row.metric.id} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                        <td className="p-4 text-white font-semibold">{row.metric.name}</td>
                        <td className="p-4 text-gray-300">{row.metric.unit}</td>
                        <td className="p-4 text-gray-300">
                          {row.pr.toFixed(row.metric.decimal_places ?? 2)}
                        </td>
                        <td className="p-4 text-gray-300">
                          {row.latestValue.toFixed(row.metric.decimal_places ?? 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Graphs */}
        <div className="space-y-6">
          {graphs.map((graph, index) => renderGraph(graph, index))}
        </div>

        {/* Graph Builder */}
        {showGraphBuilder && graphs.length < 5 && (
          <div className="print-hide">
            <GraphBuilder
              metrics={metrics}
              selectedMetricIds={currentGraphMetrics}
              onToggleMetric={toggleMetric}
              onAddGraph={addGraph}
              canAddMore={graphs.length < 5}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-6 print-hide">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-gray-700 text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {graphs.length > 0 && (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSaveModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
              <Button
                onClick={handleExportPDF}
                className="bg-white hover:bg-gray-100 text-black font-bold"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      <SaveTemplateModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveTemplate}
        reportType="individual"
      />
    </>
  );
}