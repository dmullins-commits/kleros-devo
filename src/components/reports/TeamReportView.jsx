import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function TeamReportView({ filterType, teamId, team, classPeriod, metrics, categories, records, athletes, onBack }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const reportElement = document.getElementById('report-content');
      if (!reportElement) return;

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = filterType === "team" 
        ? `${team?.name || 'Team'}_Performance_Report.pdf`
        : `${classPeriod}_Performance_Report.pdf`;
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
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

  if (!showReport) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white flex items-center gap-3">
            Select Metric Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold text-lg mb-2">
              {filterType === "team" ? team?.name : classPeriod}
            </h3>
            <p className="text-gray-400">
              {filterType === "team" ? team?.sport : "Class Period Report"}
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
                    className="border-gray-600 data-[state=checked]:bg-blue-400 data-[state=checked]:border-blue-400"
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
              onClick={() => setShowReport(true)}
              disabled={selectedCategories.length === 0}
              className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-black font-bold disabled:opacity-50"
            >
              Generate Report ({selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'})
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get team/class athletes
  const filteredAthletes = athletes.filter(athlete => {
    if (filterType === "team" && teamId) {
      return athlete.team_ids?.includes(teamId);
    }
    if (filterType === "class" && classPeriod) {
      return athlete.class_period === classPeriod;
    }
    return false;
  });

  const maleAthletes = filteredAthletes.filter(a => a.gender === "Male");
  const femaleAthletes = filteredAthletes.filter(a => a.gender === "Female");
  const athleteIds = filteredAthletes.map(a => a.id);

  const colors = [
    "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", 
    "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#6366f1"
  ];

  // Process data for each category separately (remove duplicates)
  const uniqueCategories = [...new Set(selectedCategories)];
  const categoryData = uniqueCategories.map(categoryName => {
    const categoryMetrics = metrics.filter(m => m.category === categoryName);
    const teamRecords = records.filter(r => 
      athleteIds.includes(r.athlete_id) && 
      categoryMetrics.some(m => m.id === r.metric_id)
    );

    const dateSet = new Set(teamRecords.map(r => r.recorded_date));
    const sortedDates = Array.from(dateSet).sort();

    const maleChartData = sortedDates.map(date => {
      const dataPoint = { date };
      categoryMetrics.forEach(metric => {
        const maleRecords = teamRecords.filter(r => 
          r.recorded_date === date && 
          r.metric_id === metric.id &&
          maleAthletes.some(a => a.id === r.athlete_id)
        );
        if (maleRecords.length > 0) {
          const avg = maleRecords.reduce((sum, r) => sum + r.value, 0) / maleRecords.length;
          dataPoint[metric.id] = avg;
        }
      });
      return dataPoint;
    });

    const femaleChartData = sortedDates.map(date => {
      const dataPoint = { date };
      categoryMetrics.forEach(metric => {
        const femaleRecords = teamRecords.filter(r => 
          r.recorded_date === date && 
          r.metric_id === metric.id &&
          femaleAthletes.some(a => a.id === r.athlete_id)
        );
        if (femaleRecords.length > 0) {
          const avg = femaleRecords.reduce((sum, r) => sum + r.value, 0) / femaleRecords.length;
          dataPoint[metric.id] = avg;
        }
      });
      return dataPoint;
    });

    // Filter metrics that have data in chartData
    const metricsWithMaleData = categoryMetrics.filter(m => 
      maleChartData.some(dataPoint => dataPoint[m.id] != null)
    );
    const metricsWithFemaleData = categoryMetrics.filter(m => 
      femaleChartData.some(dataPoint => dataPoint[m.id] != null)
    );
    const metricsWithData = [...new Set([...metricsWithMaleData, ...metricsWithFemaleData])];

    const units = [...new Set(metricsWithData.map(m => m.unit))];
    const needsDualAxis = units.length > 1;
    const leftAxisMetrics = metricsWithData.filter(m => m.unit === units[0]);
    const rightAxisMetrics = needsDualAxis ? metricsWithData.filter(m => m.unit !== units[0]) : [];

    const calculateTableData = (genderAthletes) => {
      return categoryMetrics.map(metric => {
        const genderIds = genderAthletes.map(a => a.id);
        const metricRecords = teamRecords
          .filter(r => r.metric_id === metric.id && genderIds.includes(r.athlete_id))
          .sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date));

        if (metricRecords.length === 0) return null;

        const dateGroups = metricRecords.reduce((acc, r) => {
          if (!acc[r.recorded_date]) acc[r.recorded_date] = [];
          acc[r.recorded_date].push(r.value);
          return acc;
        }, {});

        const dates = Object.keys(dateGroups).sort();
        const firstAvg = dateGroups[dates[0]].reduce((sum, v) => sum + v, 0) / dateGroups[dates[0]].length;
        const lastAvg = dateGroups[dates[dates.length - 1]].reduce((sum, v) => sum + v, 0) / dateGroups[dates[dates.length - 1]].length;
        const percentChange = ((lastAvg - firstAvg) / firstAvg) * 100;
        const isImprovement = metric.target_higher ? lastAvg > firstAvg : lastAvg < firstAvg;

        return { metric, firstAvg, lastAvg, percentChange, isImprovement };
      }).filter(Boolean);
    };

    const maleTableData = calculateTableData(maleAthletes);
    const femaleTableData = calculateTableData(femaleAthletes);

    return { categoryName, maleChartData, femaleChartData, units, needsDualAxis, leftAxisMetrics, rightAxisMetrics, maleTableData, femaleTableData };
  });

  const renderChart = (chartData, title, genderColor, categoryUnits, needsDual, leftMetrics, rightMetrics) => (
    <div className="space-y-4">
      <h3 className="text-xl font-black" style={{ color: genderColor }}>{title}</h3>
      {chartData.some(d => Object.keys(d).length > 1) ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 print-chart">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(date) => {
                  const [year, month, day] = date.split('-');
                  return format(new Date(year, month - 1, day), "MMM d");
                }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                label={{ value: categoryUnits[0], angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
              />
              {needsDual && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                  label={{ value: categoryUnits[1], angle: 90, position: 'insideRight', fill: '#9ca3af' }}
                />
              )}
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              
              {leftMetrics.map((metric, index) => (
                <Line
                  key={metric.id}
                  yAxisId="left"
                  type="monotone"
                  dataKey={metric.id}
                  name={`${metric.name} (${metric.unit})`}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ fill: colors[index % colors.length], r: 5 }}
                  connectNulls={true}
                  label={{
                    position: 'top',
                    fill: colors[index % colors.length],
                    fontSize: 12,
                    formatter: (value) => value != null ? Number(value).toFixed(metric.decimal_places ?? 2) : ''
                  }}
                />
              ))}
              
              {rightMetrics.map((metric, index) => (
                <Line
                  key={metric.id}
                  yAxisId="right"
                  type="monotone"
                  dataKey={metric.id}
                  name={`${metric.name} (${metric.unit})`}
                  stroke={colors[(leftMetrics.length + index) % colors.length]}
                  strokeWidth={3}
                  dot={{ fill: colors[(leftMetrics.length + index) % colors.length], r: 5 }}
                  connectNulls={true}
                  label={{
                    position: 'top',
                    fill: colors[(leftMetrics.length + index) % colors.length],
                    fontSize: 12,
                    formatter: (value) => value != null ? Number(value).toFixed(metric.decimal_places ?? 2) : ''
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">No data available for {title.toLowerCase()}</p>
        </div>
      )}
    </div>
  );

  const renderTable = (tableData, title) => (
    tableData.length > 0 && (
      <div className="space-y-4">
        <h4 className="text-lg font-black text-white">{title}</h4>
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden print-compact">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-4 text-gray-300 font-bold">Metric</th>
                <th className="text-left p-4 text-gray-300 font-bold">First Average</th>
                <th className="text-left p-4 text-gray-300 font-bold">Most Recent Average</th>
                <th className="text-left p-4 text-gray-300 font-bold">% Change</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={row.metric.id} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                  <td className="p-4 text-white font-semibold">{row.metric.name}</td>
                  <td className="p-4 text-gray-300">
                    {row.firstAvg.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}
                  </td>
                  <td className="p-4 text-gray-300">
                    {row.lastAvg.toFixed(row.metric.decimal_places ?? 2)} {row.metric.unit}
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
  );

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 8.5in 11in;
              margin: 0.4in;
            }
            
            /* Hide EVERYTHING except report content */
            body * {
              visibility: hidden !important;
            }
            
            #report-content,
            #report-content * {
              visibility: visible !important;
            }
            
            #report-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
            
            html, body {
              width: 100%;
              height: auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white !important;
            }
            
            /* Hide specific elements */
            aside, nav, header, footer,
            [role="navigation"],
            .sidebar, .print-hide,
            button:not(.recharts-legend-item) {
              display: none !important;
              visibility: hidden !important;
            }
            .print-chart {
              height: 250px !important;
            }
            .print-compact table {
              font-size: 10px;
            }
            .print-compact th,
            .print-compact td {
              padding: 6px !important;
            }
            .print-section {
              margin-bottom: 20px;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
            }
          }
        `}
      </style>
      <div id="report-content" className="bg-gray-950 border border-gray-800 rounded-lg p-8 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-black text-white mb-4">
            {filterType === "team" ? "Team" : "Class"} Performance Report: {uniqueCategories.join(', ')}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-sm">{filterType === "team" ? "Team" : "Class Period"}</p>
              <p className="text-white font-bold">
                {filterType === "team" ? team?.name : classPeriod}
              </p>
            </div>
            {filterType === "team" && (
              <div>
                <p className="text-gray-400 text-sm">Sport</p>
                <p className="text-white font-bold">{team?.sport}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 text-sm">Total Athletes</p>
              <p className="text-white font-bold">{filteredAthletes.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Male Athletes</p>
              <p className="text-white font-bold">{maleAthletes.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Female Athletes</p>
              <p className="text-white font-bold">{femaleAthletes.length}</p>
            </div>
          </div>
        </div>

        {/* Performance Summary Tables - All Categories */}
        <div className="space-y-6 print-section">
          <h2 className="text-3xl font-black text-white mb-6">Performance Summary</h2>
          {categoryData.map((category, catIndex) => (
            <div key={`table-${category.categoryName}`} className={catIndex > 0 ? "pt-6 border-t border-gray-700 mt-6" : ""}>
              <h3 className="text-2xl font-black text-blue-400 mb-4">{category.categoryName}</h3>
              {renderTable(category.maleTableData, "Male Athletes")}
              {renderTable(category.femaleTableData, "Female Athletes")}
            </div>
          ))}
        </div>

        {/* Performance Trends Charts - Start on next page */}
        <div className="page-break print:pt-0">
          <h2 className="text-3xl font-black text-white mb-8">Performance Trends</h2>
          {categoryData.map((category, catIndex) => (
            <div key={`chart-${category.categoryName}`} className={catIndex > 0 ? "pt-8 border-t border-gray-800 mt-8" : ""}>
              <h3 className="text-3xl font-black text-blue-400 mb-6">{category.categoryName}</h3>
              
              {/* Male Chart */}
              {maleAthletes.length > 0 && renderChart(
                category.maleChartData, 
                "Male Athletes Performance Trends", 
                "#3b82f6",
                category.units,
                category.needsDualAxis,
                category.leftAxisMetrics,
                category.rightAxisMetrics
              )}

              {/* Female Chart */}
              {femaleAthletes.length > 0 && renderChart(
                category.femaleChartData, 
                "Female Athletes Performance Trends", 
                "#ec4899",
                category.units,
                category.needsDualAxis,
                category.leftAxisMetrics,
                category.rightAxisMetrics
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-6 print-hide">
        <Button
          variant="outline"
          onClick={() => setShowReport(false)}
          className="border-gray-700 text-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Category Selection
        </Button>
        <Button
          onClick={handleExportPDF}
          disabled={isGeneratingPDF}
          className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-black font-bold disabled:opacity-50"
        >
          <FileDown className="w-4 h-4 mr-2" />
          {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>
    </>
  );
}