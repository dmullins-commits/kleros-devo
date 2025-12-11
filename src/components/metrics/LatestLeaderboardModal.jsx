import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Check, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MetricRecord } from "@/entities/all";

export default function LatestLeaderboardModal({ onClose, metrics, athletes }) {
  const [records, setRecords] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMetricId, setSelectedMetricId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState({ male: [], female: [] });
  const [groupByClassPeriod, setGroupByClassPeriod] = useState(false);
  const [groupByClassGrade, setGroupByClassGrade] = useState(false);
  const [splitByGender, setSplitByGender] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const recordsData = await MetricRecord.list('-recorded_date');
      setRecords(recordsData);
      
      const dates = [...new Set(recordsData.map(r => r.recorded_date))].sort((a, b) => 
        new Date(b) - new Date(a)
      );
      
      setAvailableDates(dates);
      
      const selectableMetrics = metrics.filter(m => !m.is_auto_calculated);
      
      if (dates.length > 0 && selectableMetrics.length > 0) {
        setSelectedDate(dates[0]);
        setSelectedMetricId(selectableMetrics[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedMetricId && records.length > 0 && metrics.length > 0 && athletes.length > 0) {
      // Check if selected metric has data on selected date
      const hasData = records.some(r => r.recorded_date === selectedDate && r.metric_id === selectedMetricId);
      if (!hasData) {
        // Reset to first available metric for this date
        const firstMetricWithData = metrics.find(m => 
          !m.is_auto_calculated && 
          records.some(r => r.recorded_date === selectedDate && r.metric_id === m.id)
        );
        if (firstMetricWithData) {
          setSelectedMetricId(firstMetricWithData.id);
        }
      } else {
        generateLeaderboard();
      }
    }
  }, [selectedDate, selectedMetricId, records, metrics, athletes, groupByClassPeriod, groupByClassGrade]);

  const generateLeaderboard = () => {
    const metric = metrics.find(m => m.id === selectedMetricId);
    if (!metric) return;

    const dateRecords = records.filter(r => r.recorded_date === selectedDate && r.metric_id === selectedMetricId);
    
    const athleteData = dateRecords.map(record => {
      const athlete = athletes.find(a => a.id === record.athlete_id);
      if (!athlete) return null;

      const allAthleteRecords = records.filter(r => 
        r.athlete_id === record.athlete_id && 
        r.metric_id === selectedMetricId
      );

      const pr = metric.target_higher
        ? Math.max(...allAthleteRecords.map(r => r.value))
        : Math.min(...allAthleteRecords.map(r => r.value));

      const isNewPR = metric.target_higher 
        ? record.value >= pr 
        : record.value <= pr;

      return {
        athlete_id: athlete.id,
        athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        gender: athlete.gender,
        class_period: athlete.class_period,
        class_grade: athlete.class_grade,
        current_value: record.value,
        pr: pr,
        is_new_pr: isNewPR
      };
    }).filter(Boolean);

    const sortedData = athleteData.sort((a, b) => {
      if (metric.target_higher) {
        return b.current_value - a.current_value;
      } else {
        return a.current_value - b.current_value;
      }
    });

    setLeaderboardData({
      male: sortedData.filter(a => a.gender === 'Male'),
      female: sortedData.filter(a => a.gender === 'Female')
    });
  };

  const handleExportCSV = () => {
    const metric = metrics.find(m => m.id === selectedMetricId);
    if (!metric) return;

    // If grouping by class period or grade, export as multi-sheet Excel file
    if (groupByClassPeriod || groupByClassGrade) {
      const groupField = groupByClassPeriod ? 'class_period' : 'class_grade';
      const allData = [...leaderboardData.male, ...leaderboardData.female];
      const groups = [...new Set(allData.map(a => a[groupField]).filter(Boolean))].sort();

      // Create separate CSV content for each group as tabs in a single file
      let fullContent = '';
      
      groups.forEach((group, groupIndex) => {
        const maleData = leaderboardData.male
          .filter(a => a[groupField] === group)
          .sort((a, b) => metric.target_higher ? b.current_value - a.current_value : a.current_value - b.current_value);
        
        const femaleData = leaderboardData.female
          .filter(a => a[groupField] === group)
          .sort((a, b) => metric.target_higher ? b.current_value - a.current_value : a.current_value - b.current_value);

        if (groupIndex > 0) {
          fullContent += '\n\n';
        }
        fullContent += `"${group}"\n`;

        if (splitByGender) {
          const headers = ['Rank', 'Name', metric.name, 'New PR?', '', '', 'Rank', 'Name', metric.name, 'New PR?'];
          fullContent += headers.map(h => `"${h}"`).join(',') + '\n';
          
          const maxRows = Math.max(maleData.length, femaleData.length);
          for (let i = 0; i < maxRows; i++) {
            const male = maleData[i];
            const female = femaleData[i];
            const row = [
              male ? i + 1 : '',
              male ? male.athlete_name : '',
              male ? male.current_value.toFixed(metric.decimal_places ?? 2) : '',
              male ? (male.is_new_pr ? 'PR' : '') : '',
              '',
              '',
              female ? i + 1 : '',
              female ? female.athlete_name : '',
              female ? female.current_value.toFixed(metric.decimal_places ?? 2) : '',
              female ? (female.is_new_pr ? 'PR' : '') : ''
            ];
            fullContent += row.map(cell => `"${cell}"`).join(',') + '\n';
          }
        } else {
          const combinedData = [...maleData, ...femaleData].sort((a, b) => 
            metric.target_higher ? b.current_value - a.current_value : a.current_value - b.current_value
          );
          const headers = ['Rank', 'Name', metric.name, 'New PR?'];
          fullContent += headers.map(h => `"${h}"`).join(',') + '\n';
          combinedData.forEach((item, index) => {
            const row = [index + 1, item.athlete_name, item.current_value.toFixed(metric.decimal_places ?? 2), item.is_new_pr ? 'PR' : ''];
            fullContent += row.map(cell => `"${cell}"`).join(',') + '\n';
          });
        }
      });

      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${metric.name}_Leaderboard_${selectedDate}_by_${groupField}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    let csvData;
    if (splitByGender) {
      // Create side-by-side male/female CSV with 2 column gap
      const maxRows = Math.max(leaderboardData.male.length, leaderboardData.female.length);
      const headers = ['Rank', 'Name', metric.name, 'New PR?', '', '', 'Rank', 'Name', metric.name, 'New PR?'];
      const rows = [headers];
      
      for (let i = 0; i < maxRows; i++) {
        const male = leaderboardData.male[i];
        const female = leaderboardData.female[i];
        rows.push([
          male ? i + 1 : '',
          male ? male.athlete_name : '',
          male ? male.current_value.toFixed(metric.decimal_places ?? 2) : '',
          male ? (male.is_new_pr ? 'PR' : '') : '',
          '',
          '',
          female ? i + 1 : '',
          female ? female.athlete_name : '',
          female ? female.current_value.toFixed(metric.decimal_places ?? 2) : '',
          female ? (female.is_new_pr ? 'PR' : '') : ''
        ]);
      }
      csvData = rows;
    } else {
      // Combined leaderboard
      const allAthletes = [...leaderboardData.male, ...leaderboardData.female].sort((a, b) => {
        return metric.target_higher ? b.current_value - a.current_value : a.current_value - b.current_value;
      });
      const headers = ['Rank', 'Name', metric.name, 'New PR?'];
      const rows = [headers];
      allAthletes.forEach((item, index) => {
        rows.push([
          index + 1,
          item.athlete_name,
          item.current_value.toFixed(metric.decimal_places ?? 2),
          item.is_new_pr ? 'PR' : ''
        ]);
      });
      csvData = rows;
    }

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metric.name}_Leaderboard_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDateDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderLeaderboard = (data, title) => {
    const metric = metrics.find(m => m.id === selectedMetricId);
    if (!metric) return null;

    return (
      <div className="mb-4 print:mb-1">
        <h3 className="text-2xl font-black text-amber-400 mb-3 print:text-sm print:mb-1">{title}</h3>
        {data.length === 0 ? (
          <p className="text-gray-500 text-center py-8 print:py-1 print:text-[0.5rem]">No data available</p>
        ) : (
          <div className="space-y-2 print:space-y-0.5">
            {data.map((item, index) => {
              const Icon = index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Award : null;
              const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-500';
              const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-2 border-yellow-400/50' : 
                              index === 1 ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/10 border-2 border-gray-400/50' : 
                              index === 2 ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-2 border-amber-500/50' : 
                              'bg-gray-900/50 border border-gray-700';

              return (
                <div key={item.athlete_id} className={`p-4 rounded-lg ${bgColor} print:p-1 print:rounded-sm print:border`}>
                  <div className="flex items-center gap-3 print:gap-1">
                    <div className="flex items-center justify-center w-10 h-10 print:w-4 print:h-4 print:min-w-4">
                      {Icon ? (
                        <Icon className={`w-7 h-7 ${rankColor} print:w-2.5 print:h-2.5`} />
                      ) : (
                        <span className={`text-xl font-black ${rankColor} print:text-[0.5rem]`}>#{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 print:gap-0.5">
                        <p className="text-white font-bold text-lg print:text-[0.55rem] print:truncate">{item.athlete_name}</p>
                        {item.is_new_pr && (
                          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 print:text-[0.4rem] print:px-0.5 print:py-0 print:hidden sm:print:inline">
                            PR!
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 print:text-[0.45rem] print:hidden">
                        PR: {item.pr.toFixed(metric.decimal_places ?? 2)} {metric.unit}
                      </p>
                    </div>
                    <div className="text-right print:min-w-8">
                      <p className={`text-2xl font-black ${index < 3 ? rankColor : 'text-white'} print:text-[0.6rem]`}>
                        {item.current_value.toFixed(metric.decimal_places ?? 2)}
                      </p>
                      <p className="text-sm text-gray-400 print:text-[0.4rem]">{metric.unit}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGroupedLeaderboards = () => {
    const metric = metrics.find(m => m.id === selectedMetricId);
    if (!metric) return null;

    const groupField = groupByClassPeriod ? 'class_period' : 'class_grade';

    // Get all unique groups
    const allData = [...leaderboardData.male, ...leaderboardData.female];
    const groups = [...new Set(allData.map(a => a[groupField]).filter(Boolean))].sort();

    return groups.map(group => {
      const maleData = leaderboardData.male
        .filter(a => a[groupField] === group)
        .sort((a, b) => metric.target_higher ? b.current_value - a.current_value : a.current_value - b.current_value);
      
      const femaleData = leaderboardData.female
        .filter(a => a[groupField] === group)
        .sort((a, b) => metric.target_higher ? b.current_value - a.current_value : a.current_value - b.current_value);

      return (
        <div key={group} className="print:break-after-page">
          <h2 className="text-3xl font-black text-white mb-4 print:text-xl print:mb-2 print:mt-2">{group}</h2>
          {maleData.length > 0 && renderLeaderboard(maleData, "MALE ATHLETES")}
          {femaleData.length > 0 && renderLeaderboard(femaleData, "FEMALE ATHLETES")}
        </div>
      );
    });
  };

  // Filter metrics to only show those with data on the selected date
  const selectableMetrics = metrics.filter(m => {
    if (m.is_auto_calculated) return false;
    if (!selectedDate) return true;
    return records.some(r => r.recorded_date === selectedDate && r.metric_id === m.id);
  });
  const selectedMetric = metrics.find(m => m.id === selectedMetricId);

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 8.5in 11in portrait;
              margin: 0.3in;
            }
            html, body {
              width: 8.5in;
              height: 11in;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              overflow: hidden !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-content, #printable-content * {
              visibility: visible;
            }
            #printable-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              overflow: hidden !important;
              page-break-inside: avoid;
            }
            .print-fit-page {
              max-height: 10in !important;
              overflow: hidden !important;
            }
            .print-row {
              display: flex !important;
              flex-direction: row !important;
              gap: 0.5rem !important;
            }
            .print-col {
              flex: 1 !important;
              min-width: 0 !important;
            }
            .print\\:break-after-page {
              page-break-after: always;
              break-after: page;
            }
          }
        `}
      </style>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl text-yellow-400">
              <Trophy className="w-7 h-7" />
              Latest Leaderboard
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 print:hidden">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Select Date</label>
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {availableDates.map(date => (
                        <SelectItem key={date} value={date} className="text-white">
                          {formatDateDisplay(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Select Metric</label>
                  <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
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
              </div>

              <div className="space-y-3 print:hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <Checkbox
                    id="split-by-gender"
                    checked={splitByGender}
                    onCheckedChange={setSplitByGender}
                    className="border-gray-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                  />
                  <label htmlFor="split-by-gender" className="text-white font-semibold cursor-pointer">
                    Split by Gender (Male on left, Female on right)
                  </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <Checkbox
                    id="group-by-period"
                    checked={groupByClassPeriod}
                    onCheckedChange={(checked) => {
                      setGroupByClassPeriod(checked);
                      if (checked) setGroupByClassGrade(false);
                    }}
                    className="border-gray-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                  />
                  <label htmlFor="group-by-period" className="text-white font-semibold cursor-pointer">
                    Group by Class Period (separate leaderboards per period)
                  </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <Checkbox
                    id="group-by-grade"
                    checked={groupByClassGrade}
                    onCheckedChange={(checked) => {
                      setGroupByClassGrade(checked);
                      if (checked) setGroupByClassPeriod(false);
                    }}
                    className="border-gray-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                  />
                  <label htmlFor="group-by-grade" className="text-white font-semibold cursor-pointer">
                    Group by Class/Grade (separate leaderboards per grade)
                  </label>
                </div>
              </div>

              {selectedDate && selectedMetric && (
                <>
                  <div id="printable-content" className="print:block">
                    <div className="text-center mb-6 print:mb-2">
                      <h2 className="text-3xl font-black text-white mb-2 print:text-base print:mb-0.5">
                        {selectedMetric.name} Leaderboard
                      </h2>
                      <p className="text-gray-400 print:text-[0.6rem]">
                        {formatDateDisplay(selectedDate)}
                      </p>
                    </div>

                    {groupByClassPeriod || groupByClassGrade ? (
                      renderGroupedLeaderboards()
                    ) : splitByGender ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {renderLeaderboard(leaderboardData.male, "MALE ATHLETES")}
                        </div>
                        <div>
                          {renderLeaderboard(leaderboardData.female, "FEMALE ATHLETES")}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {renderLeaderboard(
                          [...leaderboardData.male, ...leaderboardData.female].sort((a, b) => {
                            const metric = metrics.find(m => m.id === selectedMetricId);
                            return metric?.target_higher 
                              ? b.current_value - a.current_value 
                              : a.current_value - b.current_value;
                          }),
                          "LEADERBOARD"
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 print:hidden">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="border-gray-700 text-gray-300"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={handleExportCSV}
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}