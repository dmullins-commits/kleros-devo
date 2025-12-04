import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts";
import { base44 } from "@/api/base44Client";

export default function IndividualReportView({ athlete, team, metrics, categories, records, athletes, organization, onBack }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showPageBreakConfig, setShowPageBreakConfig] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [injuries, setInjuries] = useState([]);
  const [pageBreakAfterCategory, setPageBreakAfterCategory] = useState({});

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

  const handleExportPDF = () => {
    window.print();
  };

  const toggleCategory = (categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const togglePageBreak = (categoryName) => {
    setPageBreakAfterCategory(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  if (!showReport && !showPageBreakConfig) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-3">
            Select Metric Category
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold text-lg mb-2">
              {athlete.first_name} {athlete.last_name}
            </h3>
            <p className="text-gray-400">
              {athlete.class_grade} • {athlete.class_period}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Select Categories to Report (select multiple)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from(new Map(categories.map(cat => [cat.name, cat])).values()).map(category => (
                <div key={category.id} className="flex items-center space-x-3 p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.name)}
                    onCheckedChange={() => toggleCategory(category.name)}
                    className="border-gray-600 data-[state=checked]:bg-purple-400 data-[state=checked]:border-purple-400"
                  />
                  <label htmlFor={category.id} className="text-white font-semibold cursor-pointer flex-1">
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-gray-700 text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setShowPageBreakConfig(true)}
              disabled={selectedCategories.length === 0}
              className="bg-white hover:bg-gray-100 text-black font-bold border-2 border-gray-800 disabled:opacity-50"
            >
              Next: Configure Page Breaks
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPageBreakConfig && !showReport) {
    const uniqueCategories = [...new Set(selectedCategories)];
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-3">
            Configure Page Breaks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              By default, charts are displayed 2 per page. Check the boxes below to force a page break after specific categories.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Page Break After Category</label>
            <div className="space-y-2">
              {uniqueCategories.map((categoryName, index) => (
                <div key={categoryName} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{categoryName}</p>
                    <p className="text-gray-400 text-xs">Chart {index + 1} of {uniqueCategories.length}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`pagebreak-${categoryName}`}
                      checked={pageBreakAfterCategory[categoryName] || false}
                      onCheckedChange={() => togglePageBreak(categoryName)}
                      className="border-gray-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <label htmlFor={`pagebreak-${categoryName}`} className="text-gray-300 text-sm cursor-pointer">
                      Page break after this category
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPageBreakConfig(false)}
              className="border-gray-700 text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Categories
            </Button>
            <Button
              onClick={() => setShowReport(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-2 border-amber-600"
            >
              Confirm & Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get team/class athletes for comparison
  const comparisonAthletes = athletes.filter(a => {
    if (team && a.team_ids?.includes(team.id)) return true;
    if (athlete.class_period && a.class_period === athlete.class_period) return true;
    return false;
  });

  // Get organization-wide gender comparison
  const genderAthletes = athletes.filter(a => a.gender === athlete.gender);

  // Get all athlete records
  const athleteRecords = records.filter(r => r.athlete_id === athlete.id);

  // Generate colors for each metric
  const colors = [
    "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", 
    "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#6366f1"
  ];

  // Get latest metrics data grouped by category
  const latestMetricsData = categories.map(category => {
    const categoryMetrics = metrics.filter(m => m.category === category.name);
    const metricsWithData = categoryMetrics.map(metric => {
      const metricRecords = athleteRecords
        .filter(r => r.metric_id === metric.id)
        .sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
      
      if (metricRecords.length === 0) return null;
      
      const latestValue = metricRecords[0].value;
      
      // Calculate class average for this metric
      const classRecords = records.filter(r => 
        r.metric_id === metric.id && 
        comparisonAthletes.some(a => a.id === r.athlete_id)
      );
      
      const classAvg = classRecords.length > 0 
        ? classRecords.reduce((sum, r) => sum + r.value, 0) / classRecords.length 
        : null;
      
      return {
        metric,
        latestValue,
        classAvg
      };
    }).filter(Boolean);
    
    return {
      categoryName: category.name,
      metrics: metricsWithData
    };
  }).filter(cat => cat.metrics.length > 0);

  // Process data for each category separately (remove duplicates)
  const uniqueCategories = [...new Set(selectedCategories)];
  const categoryData = uniqueCategories.map(categoryName => {
    const categoryMetrics = metrics.filter(m => m.category === categoryName);
    const categoryAthleteRecords = athleteRecords.filter(r => categoryMetrics.some(m => m.id === r.metric_id));

    // Prepare chart data
    const dateSet = new Set(records.filter(r => categoryMetrics.some(m => m.id === r.metric_id)).map(r => r.recorded_date));
    const sortedDates = Array.from(dateSet).sort();

    const chartData = sortedDates.map(date => {
      const dataPoint = { date };
      
      categoryMetrics.forEach(metric => {
        const athleteRecord = categoryAthleteRecords.find(r => r.recorded_date === date && r.metric_id === metric.id);
        if (athleteRecord) {
          dataPoint[metric.id] = athleteRecord.value;
        }

        const teamRecords = records.filter(r => 
          r.recorded_date === date && 
          r.metric_id === metric.id && 
          comparisonAthletes.some(a => a.id === r.athlete_id)
        );
        if (teamRecords.length > 0) {
          const teamAvg = teamRecords.reduce((sum, r) => sum + r.value, 0) / teamRecords.length;
          dataPoint[`${metric.id}_team_avg`] = teamAvg;
        }

        const genderRecords = records.filter(r => 
          r.recorded_date === date && 
          r.metric_id === metric.id && 
          genderAthletes.some(a => a.id === r.athlete_id)
        );
        if (genderRecords.length > 0) {
          const genderAvg = genderRecords.reduce((sum, r) => sum + r.value, 0) / genderRecords.length;
          dataPoint[`${metric.id}_gender_avg`] = genderAvg;
        }
      });
      
      return dataPoint;
    });

    // Filter metrics that have data in chartData
    const metricsWithData = categoryMetrics.filter(m => 
      chartData.some(dataPoint => dataPoint[m.id] != null)
    );
    
    const units = [...new Set(metricsWithData.map(m => m.unit))];
    const needsDualAxis = units.length > 1;
    const leftAxisMetrics = metricsWithData.filter(m => m.unit === units[0]);
    const rightAxisMetrics = needsDualAxis ? metricsWithData.filter(m => m.unit !== units[0]) : [];

    const tableData = categoryMetrics.map(metric => {
      const metricRecords = categoryAthleteRecords
        .filter(r => r.metric_id === metric.id)
        .sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date));

      if (metricRecords.length === 0) return null;

      const firstRecord = metricRecords[0];
      const latestRecord = metricRecords[metricRecords.length - 1];

      // Check for injuries
      const injuryDates = injuries.map(i => i.date_of_injury);
      const hasInjury = injuryDates.length > 0;

      let preInjuryPr = null;
      let postInjuryPr = null;
      let allTimePr = metric.target_higher
        ? Math.max(...metricRecords.map(r => r.value))
        : Math.min(...metricRecords.map(r => r.value));

      if (hasInjury) {
        const latestInjuryDate = injuryDates.sort().reverse()[0];
        const preInjuryRecords = metricRecords.filter(r => new Date(r.recorded_date) < new Date(latestInjuryDate));
        const postInjuryRecords = metricRecords.filter(r => new Date(r.recorded_date) >= new Date(latestInjuryDate));

        if (preInjuryRecords.length > 0) {
          preInjuryPr = metric.target_higher
            ? Math.max(...preInjuryRecords.map(r => r.value))
            : Math.min(...preInjuryRecords.map(r => r.value));
        }

        if (postInjuryRecords.length > 0) {
          postInjuryPr = metric.target_higher
            ? Math.max(...postInjuryRecords.map(r => r.value))
            : Math.min(...postInjuryRecords.map(r => r.value));
        }
      }

      // Check if new all-time PR has been achieved post-injury
      const hasNewAllTimePr = hasInjury && postInjuryPr !== null && (
        (metric.target_higher && postInjuryPr >= allTimePr) ||
        (!metric.target_higher && postInjuryPr <= allTimePr)
      );

      const percentChange = ((latestRecord.value - firstRecord.value) / firstRecord.value) * 100;
      const isImprovement = metric.target_higher 
        ? latestRecord.value > firstRecord.value 
        : latestRecord.value < firstRecord.value;

      return { 
        metric, 
        firstValue: firstRecord.value, 
        latestValue: latestRecord.value, 
        pr: allTimePr, 
        preInjuryPr,
        postInjuryPr,
        hasNewAllTimePr,
        percentChange, 
        isImprovement 
      };
    }).filter(Boolean);

    return { categoryName, categoryMetrics, chartData, units, needsDualAxis, leftAxisMetrics, rightAxisMetrics, tableData };
  });

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 8.5in 11in;
              margin: 0.5in;
            }
            
            /* Hide all non-report elements */
            body > *:not(#root) {
              display: none !important;
            }
            
            aside, nav, header, footer, 
            [role="navigation"], 
            button:not(.recharts-legend-item),
            .sidebar, .print-hide {
              display: none !important;
            }
            
            html, body, #root {
              width: 100%;
              height: auto;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Calibri, Arial, sans-serif !important;
            }
            
            #report-content {
              background: white !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              position: relative;
            }
            
            /* School logo watermark on ALL pages */
            @page {
              background-image: ${organization?.logo ? `url(${organization.logo})` : 'none'};
              background-size: 400px 400px;
              background-repeat: no-repeat;
              background-position: center;
              background-opacity: 0.08;
            }
            
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
              pointer-events: none;
            }
            
            /* Typography - Calibri 12pt for body */
            * {
              font-family: Calibri, Arial, sans-serif !important;
            }
            
            h1, h2, h3, h4, h5, h6 {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            }
            
            h1 { font-size: 20px !important; margin-bottom: 10px !important; }
            h2 { font-size: 18px !important; margin-bottom: 8px !important; margin-top: 14px !important; }
            h3 { font-size: 16px !important; margin-bottom: 6px !important; }
            h4 { font-size: 14px !important; margin-bottom: 4px !important; }
            p, span, div, td, th { font-size: 12pt !important; }
            
            /* Compact spacing */
            .space-y-8 > * + * { margin-top: 16px !important; }
            .space-y-6 > * + * { margin-top: 12px !important; }
            .space-y-4 > * + * { margin-top: 8px !important; }
            .gap-4 { gap: 8px !important; }
            .mb-4 { margin-bottom: 8px !important; }
            .mb-6 { margin-bottom: 12px !important; }
            .mb-8 { margin-bottom: 16px !important; }
            .pb-6 { padding-bottom: 12px !important; }
            .p-4 { padding: 8px !important; }
            .p-6 { padding: 10px !important; }
            .p-8 { padding: 0 !important; }
            
            /* Chart sizing */
            .print-chart {
              height: 280px !important;
              padding: 8px !important;
            }
            
            .print-chart .recharts-wrapper {
              height: 280px !important;
            }
            
            /* Table styling - black borders */
            .print-compact table {
              font-size: 12pt !important;
              border-collapse: collapse !important;
            }
            
            .print-compact th,
            .print-compact td {
              padding: 6px 8px !important;
              line-height: 1.4 !important;
              border: 1px solid #000 !important;
            }
            
            .print-compact th {
              font-size: 12pt !important;
              font-weight: 700 !important;
              background: #f5f5f5 !important;
            }
            
            .print-compact tbody tr:nth-child(even) {
              background: #fafafa !important;
            }
            
            /* Page breaks */
            .page-break {
              page-break-before: always;
              break-before: page;
            }
            
            .page-break-after {
              page-break-after: always;
              break-after: page;
            }
            
            .avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Latest metrics grid */
            .latest-metrics-grid > div {
              padding: 6px !important;
              border: 1px solid #000 !important;
            }
            
            /* Black borders for everything */
            .border, .border-gray-800, .border-gray-700 {
              border-color: #000 !important;
            }
            
            .bg-gray-900, .bg-gray-950, .bg-gray-800 {
              background: white !important;
            }
            
            /* Chart lines and elements - black */
            .recharts-cartesian-grid-horizontal line,
            .recharts-cartesian-grid-vertical line {
              stroke: #000 !important;
              stroke-opacity: 0.2 !important;
            }
            
            .recharts-line {
              stroke: #000 !important;
              stroke-width: 2 !important;
            }
            
            .recharts-xAxis .recharts-cartesian-axis-line,
            .recharts-yAxis .recharts-cartesian-axis-line {
              stroke: #000 !important;
            }
            
            .recharts-text {
              fill: #000 !important;
              font-size: 10pt !important;
            }
            
            /* Remove colored text */
            .text-purple-400, .text-blue-400, .text-green-400, 
            .text-red-400, .text-gray-300, .text-gray-400,
            .text-white {
              color: #000 !important;
            }
          }
        `}
      </style>
      <div id="report-content" className="bg-gray-950 border border-gray-800 rounded-lg p-8 space-y-8">
        {/* Athlete Info Header */}
        <div className="border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-black text-white mb-4">
            Performance Report: {uniqueCategories.join(', ')}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Athlete</p>
              <p className="text-white font-bold">
                {athlete.first_name} {athlete.last_name}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Grade</p>
              <p className="text-white font-bold">{athlete.class_grade}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Class Period</p>
              <p className="text-white font-bold">{athlete.class_period}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Team</p>
              <p className="text-white font-bold">{team?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Height</p>
              <p className="text-white font-bold">{athlete.height ? `${athlete.height}"` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Weight</p>
              <p className="text-white font-bold">{athlete.weight ? `${athlete.weight} lbs` : 'N/A'}</p>
            </div>
          </div>

          {/* Latest Metrics Data by Category */}
          {latestMetricsData.length > 0 && (
            <div className="space-y-4 avoid-break">
              <h3 className="text-xl font-black text-white">Latest Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 latest-metrics-grid">
                {latestMetricsData.map(category => (
                  <div key={category.categoryName} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <h4 className="text-purple-400 font-bold mb-3 text-sm uppercase tracking-wide">{category.categoryName}</h4>
                    <div className="space-y-2">
                      {category.metrics.map(m => (
                        <div key={m.metric.id} className="flex justify-between items-baseline">
                          <span className="text-gray-300 text-sm">{m.metric.name}:</span>
                          <span className="text-white font-semibold">
                            {m.latestValue.toFixed(m.metric.decimal_places ?? 2)} {m.metric.unit}
                            {m.classAvg !== null && (
                              <span className="text-gray-400 text-xs ml-1">
                                ({m.classAvg.toFixed(m.metric.decimal_places ?? 2)})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Performance Summary Tables - ALL ON PAGE 1 */}
        <div className="space-y-6 page-break-after">
          <h2 className="text-3xl font-black text-white mb-6">Performance Summary</h2>
          {categoryData.map((category) => (
            category.tableData.length > 0 && (
              <div key={`table-${category.categoryName}`} className="space-y-4 avoid-break">
                <h3 className="text-2xl font-black text-purple-400">{category.categoryName}</h3>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden print-compact">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="text-left p-4 text-gray-300 font-bold">Metric</th>
                        <th className="text-left p-4 text-gray-300 font-bold">First Value</th>
                        <th className="text-left p-4 text-gray-300 font-bold">Most Recent</th>
                        <th className="text-left p-4 text-gray-300 font-bold">PR</th>
                        <th className="text-left p-4 text-gray-300 font-bold">% Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.tableData.map((row, index) => (
                        <tr key={row.metric.id} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                          <td className="p-4 text-white font-semibold">{row.metric.name}</td>
                          <td className="p-4 text-gray-300">
                            {row.firstValue.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}
                          </td>
                          <td className="p-4 text-gray-300">
                            {row.latestValue.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}
                          </td>
                          <td className="p-4 text-gray-300">
                            {row.hasNewAllTimePr ? (
                              <div>{row.pr.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</div>
                            ) : row.preInjuryPr !== null && row.postInjuryPr !== null ? (
                              <div>
                                <div className="text-xs text-gray-500">Pre-injury: {row.preInjuryPr.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</div>
                                <div className="text-xs text-gray-500">Post-injury: {row.postInjuryPr.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</div>
                              </div>
                            ) : (
                              <div>{row.pr.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className={`flex items-center gap-2 font-bold ${
                              row.isImprovement ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {row.isImprovement ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {Math.abs(row.percentChange).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Performance Trends Charts - 2 PER PAGE OR CUSTOM */}
        {categoryData.map((category, catIndex) => {
          const hasCustomPageBreak = pageBreakAfterCategory[category.categoryName];
          const shouldPageBreak = hasCustomPageBreak || (catIndex % 2 === 0 && catIndex > 0);
          return category.chartData.length > 0 ? (
            <div key={`chart-${category.categoryName}`} className={shouldPageBreak ? "page-break avoid-break" : "avoid-break"}>
              <h2 className="text-3xl font-black text-purple-400 mb-6">{category.categoryName}</h2>
              <div className="space-y-4 mb-8 print-section">
                <h3 className="text-2xl font-black text-white">Performance Trends</h3>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 print-chart">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={category.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        label={{ value: category.units[0], angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                      />
                      {category.needsDualAxis && (
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                          label={{ value: category.units[1], angle: 90, position: 'insideRight', fill: '#9ca3af' }}
                        />
                      )}
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        content={(props) => {
                          if (!props.active || !props.payload) return null;
                          
                          const { label, payload: data } = props;
                          const injuryAtThisDate = injuries.find(i => i.date_of_injury === label);
                          
                          return (
                            <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}>
                              <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
                              {data.map((entry, index) => {
                                if (entry.value != null && !entry.dataKey.includes('_avg')) {
                                  const metric = category.categoryMetrics.find(m => m.id === entry.dataKey);
                                  return (
                                    <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
                                      {entry.name}: {Number(entry.value).toFixed(metric?.decimal_places ?? 2)} {metric?.unit}
                                    </p>
                                  );
                                }
                                return null;
                              })}
                              {injuryAtThisDate && (
                                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #374151' }}>
                                  <p style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>★</span> INJURY
                                  </p>
                                  <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                                    {injuryAtThisDate.injury_name}
                                  </p>
                                  <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                                    Expected: {injuryAtThisDate.expected_time_missed}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#fff' }} />
                      
                      {/* Injury markers */}
                      {injuries.map((injury, idx) => {
                        const injuryDataPoint = category.chartData.find(d => d.date === injury.date_of_injury);
                        if (!injuryDataPoint) return null;
                        
                        return category.leftAxisMetrics.map(metric => {
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
                      
                      {category.leftAxisMetrics.map((metric, index) => {
                        const shapes = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross', 'wye'];
                        const shapeType = shapes[index % shapes.length];
                        return (
                          <Line
                            key={metric.id}
                            yAxisId="left"
                            type="monotone"
                            dataKey={metric.id}
                            name={`${metric.name}`}
                            stroke={colors[index % colors.length]}
                            strokeWidth={3}
                            dot={{ fill: colors[index % colors.length], r: 6, strokeWidth: 2, stroke: '#000' }}
                            shape={shapeType}
                            connectNulls={true}
                            label={{
                              position: 'top',
                              fill: colors[index % colors.length],
                              fontSize: 11,
                              formatter: (value) => value != null ? Number(value).toFixed(metric.decimal_places ?? 2) : ''
                            }}
                          />
                        );
                      })}
                      
                      {category.rightAxisMetrics.map((metric, index) => {
                        const shapes = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross', 'wye'];
                        const shapeType = shapes[(category.leftAxisMetrics.length + index) % shapes.length];
                        return (
                          <Line
                            key={metric.id}
                            yAxisId="right"
                            type="monotone"
                            dataKey={metric.id}
                            name={`${metric.name}`}
                            stroke={colors[(category.leftAxisMetrics.length + index) % colors.length]}
                            strokeWidth={3}
                            dot={{ fill: colors[(category.leftAxisMetrics.length + index) % colors.length], r: 6, strokeWidth: 2, stroke: '#000' }}
                            shape={shapeType}
                            connectNulls={true}
                            label={{
                              position: 'top',
                              fill: colors[(category.leftAxisMetrics.length + index) % colors.length],
                              fontSize: 11,
                              formatter: (value) => value != null ? Number(value).toFixed(metric.decimal_places ?? 2) : ''
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null;
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-6 print-hide">
        <Button
          variant="outline"
          onClick={() => {
            setShowReport(false);
            setShowPageBreakConfig(true);
          }}
          className="border-gray-700 text-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Page Breaks
        </Button>
        <Button
          onClick={handleExportPDF}
          className="bg-white hover:bg-gray-100 text-black font-bold border-2 border-gray-800"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export as PDF
        </Button>
      </div>
    </>
  );
}