import React, { useState, useEffect } from "react";
import { Athlete, Metric, MetricRecord, MetricCategory, Team, ClassPeriod, ReportTemplate } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Users, User, Calendar as CalendarIcon, Bookmark, Trash2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useTeam } from "@/components/TeamContext";
import ReportEditor from "@/components/reports/ReportEditor";

export default function Reports() {
  const { filteredTeams, selectedOrganization } = useTeam();
  const [step, setStep] = useState("type"); // "type", "date", "filter", "select", "editor"
  const [reportType, setReportType] = useState(""); // "team" or "individual"
  const [athletes, setAthletes] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [records, setRecords] = useState([]);
  const [classPeriods, setClassPeriods] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selection states
  const [filterType, setFilterType] = useState(""); // "team" or "class"
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedClassPeriod, setSelectedClassPeriod] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  
  // Date range states
  const [dateRangeType, setDateRangeType] = useState(""); // "all", "last30", "custom"
  const [startDate, setStartDate] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedOrganization]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [athletesData, metricsData, categoriesData, recordsData, classPeriodsData, templatesData, teamsData] = await Promise.all([
        Athlete.list('-created_date', 10000),
        Metric.list('-created_date', 1000),
        MetricCategory.list('-created_date', 100),
        MetricRecord.list('-recorded_date', 50000),
        ClassPeriod.list('-created_date', 100),
        ReportTemplate.list('-created_date', 100),
        Team.list('-created_date', 100)
      ]);
      
      // Normalize teams
      const normalizedTeams = teamsData.map(t => ({
        id: t.id,
        ...t.data,
        ...t,
        name: t.data?.name || t.name,
        sport: t.data?.sport || t.sport
      }));
      setTeams(normalizedTeams);
      
      // Normalize athletes - data may be nested or flat
      const normalizedAthletes = athletesData.map(a => ({
        id: a.id,
        ...a.data,
        ...a,
        first_name: a.data?.first_name || a.first_name,
        last_name: a.data?.last_name || a.last_name,
        team_ids: a.data?.team_ids || a.team_ids || [],
        class_period: a.data?.class_period || a.class_period
      }));
      setAthletes(normalizedAthletes);

      // Normalize metrics - data is in nested 'data' object  
      const normalizedMetrics = metricsData.map(m => ({
        id: m.id,
        ...m.data,
        ...m,
        name: m.data?.name || m.name,
        unit: m.data?.unit || m.unit,
        category: m.data?.category || m.category
      }));
      setMetrics(normalizedMetrics);
      
      // Normalize categories
      const normalizedCategories = categoriesData.map(c => ({
        id: c.id,
        ...c.data
      }));
      setCategories(normalizedCategories.sort((a, b) => (a.order || 0) - (b.order || 0)));
      
      // Normalize records - all imported records store data in nested 'data' object
      const normalizedRecords = recordsData.map(r => {
        // Extract values from nested data object if present, otherwise use flat properties
        const athleteId = r.data?.athlete_id || r.athlete_id;
        const metricId = r.data?.metric_id || r.metric_id;
        const value = r.data?.value ?? r.value;
        const recordedDate = r.data?.recorded_date || r.recorded_date;
        const notes = r.data?.notes || r.notes;
        const workoutId = r.data?.workout_id || r.workout_id;
        
        return {
          id: r.id,
          athlete_id: athleteId,
          metric_id: metricId,
          value: value,
          recorded_date: recordedDate,
          notes: notes,
          workout_id: workoutId
        };
      });
      console.log('Reports - Loaded records:', recordsData.length, 'Normalized:', normalizedRecords.length);
      console.log('Sample normalized record:', normalizedRecords[0]);
      setRecords(normalizedRecords);
      
      // Normalize class periods
      const normalizedClassPeriods = classPeriodsData.map(cp => ({
        id: cp.id,
        ...cp.data,
        ...cp,
        name: cp.data?.name || cp.name,
        order: cp.data?.order ?? cp.order ?? 0
      }));
      setClassPeriods(normalizedClassPeriods.sort((a, b) => (a.order || 0) - (b.order || 0)));
      
      const orgTemplates = templatesData.filter(t => 
        !t.organization_id || t.organization_id === selectedOrganization?.id
      );
      setTemplates(orgTemplates);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await ReportTemplate.delete(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setReportType(template.report_type);
    setStep("date");
  };

  const resetSelections = () => {
    setStep("type");
    setReportType("");
    setFilterType("");
    setSelectedTeamId("");
    setSelectedClassPeriod("");
    setSelectedAthleteId("");
    setDateRangeType("");
    setStartDate(null);
    setSelectedTemplate(null);
  };

  const filteredAthletes = athletes.filter(athlete => {
    if (filterType === "team" && selectedTeamId) {
      return athlete.team_ids?.includes(selectedTeamId);
    }
    if (filterType === "class" && selectedClassPeriod) {
      // Handle variations in class period naming (e.g., "6" vs "6th", "4th" vs "4")
      const athletePeriod = (athlete.class_period || "").toLowerCase().replace(/[^0-9a-z]/g, '');
      const selectedPeriod = selectedClassPeriod.toLowerCase().replace(/[^0-9a-z]/g, '');
      return athletePeriod === selectedPeriod || 
             athlete.class_period === selectedClassPeriod ||
             athletePeriod.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '') === 
             selectedPeriod.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '');
    }
    return false;
  });

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  
  // Use locally loaded teams as primary source
  const availableTeams = teams.length > 0 ? teams : filteredTeams;

  const availableDates = [...new Set(records.map(r => r.recorded_date))].sort();

  const filteredRecords = records.filter(record => {
    if (dateRangeType === "all") return true;
    
    if (dateRangeType === "last30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recordDate = new Date(record.recorded_date);
      return recordDate >= thirtyDaysAgo;
    }
    
    if (dateRangeType === "custom" && startDate) {
      const recordDate = new Date(record.recorded_date);
      return recordDate >= startDate;
    }
    
    return true;
  });

  // Show editor when ready
  if (step === "editor") {
    return (
      <div className="min-h-screen bg-black">
        <ReportEditor
          reportType={reportType}
          athlete={selectedAthlete}
          team={selectedTeam}
          classPeriod={selectedClassPeriod}
          filterType={filterType}
          metrics={metrics}
          records={filteredRecords}
          athletes={filteredAthletes.length > 0 ? filteredAthletes : athletes.filter(a => reportType === "team" ? (filterType === "team" ? a.team_ids?.includes(selectedTeamId) : a.class_period === selectedClassPeriod) : true)}
          organization={selectedOrganization}
          categories={categories}
          initialTemplate={selectedTemplate}
          onBack={resetSelections}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-gray-950 to-gray-900 border border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 to-blue-600/5" />
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  Reports
                </h1>
                <p className="text-gray-400 font-medium">
                  Build and customize performance reports with live preview
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Report Type Selection */}
        {step === "type" && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card
                className="bg-gray-950 border-2 border-gray-800 hover:border-purple-400 cursor-pointer transition-all group"
                onClick={() => {
                  setReportType("individual");
                  setStep("date");
                }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-400/30 transition-all">
                    <User className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Individual Report</h2>
                  <p className="text-gray-400">
                    Generate detailed performance report for a single athlete
                  </p>
                </CardContent>
              </Card>

              <Card
                className="bg-gray-950 border-2 border-gray-800 hover:border-blue-400 cursor-pointer transition-all group"
                onClick={() => {
                  setReportType("team");
                  setStep("date");
                }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-400/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-400/30 transition-all">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Team/Class Report</h2>
                  <p className="text-gray-400">
                    Generate aggregate performance report for team or class
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Saved Templates */}
            {templates.length > 0 && (
              <Card className="bg-gray-950 border border-gray-800">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white flex items-center gap-3">
                    <Bookmark className="w-5 h-5 text-yellow-400" />
                    Saved Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {templates.map(template => (
                      <Card
                        key={template.id}
                        className="bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer transition-all group"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-white font-bold mb-1">{template.name}</h3>
                              <p className="text-sm text-gray-400">
                                {template.report_type === "individual" ? "Individual" : "Team"} Report • {template.graphs?.length || 0} graphs
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 2: Date Range Selection */}
        {step === "date" && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-green-400" />
                Select Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateRangeType("all");
                    setStep(reportType === "individual" ? "filter" : "filter");
                  }}
                  className="h-20 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-green-400 text-left flex flex-col items-start justify-center"
                >
                  <span className="font-bold text-lg">Include All Sessions</span>
                  <span className="text-sm text-gray-400">Use all available data</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateRangeType("last30");
                    setStep("filter");
                  }}
                  className="h-20 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-green-400 text-left flex flex-col items-start justify-center"
                >
                  <span className="font-bold text-lg">Include Last 30 Days</span>
                  <span className="text-sm text-gray-400">Only data from the past 30 days</span>
                </Button>
                
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-20 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-green-400 text-left flex flex-col items-start justify-center"
                      >
                        {startDate ? (
                          <>
                            <span className="font-bold text-lg">Custom: {format(startDate, "PPP")}</span>
                            <span className="text-sm text-gray-400">Data from {format(startDate, "MMM dd, yyyy")} onwards</span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-lg">Custom Date Range</span>
                            <span className="text-sm text-gray-400">Choose a custom start date from calendar</span>
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          if (date) {
                            setDateRangeType("custom");
                            setStep("filter");
                          }
                        }}
                        modifiers={{
                          hasData: (date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            return availableDates.includes(dateStr);
                          }
                        }}
                        modifiersStyles={{
                          hasData: {
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontWeight: 'bold'
                          }
                        }}
                        className="bg-gray-900 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-400 text-center">
                    Dates highlighted in blue have recorded data
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("type");
                    setReportType("");
                  }}
                  className="border-gray-700 text-gray-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Filter Type Selection */}
        {step === "filter" && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-3">
                {reportType === "individual" ? (
                  <User className="w-5 h-5 text-purple-400" />
                ) : (
                  <Users className="w-5 h-5 text-blue-400" />
                )}
                Filter By
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterType("team");
                    setStep("select");
                  }}
                  className="h-24 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-blue-400 flex flex-col items-center justify-center"
                >
                  <Users className="w-8 h-8 mb-2 text-blue-400" />
                  <span className="font-bold text-lg">By Team</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterType("class");
                    setStep("select");
                  }}
                  className="h-24 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-purple-400 flex flex-col items-center justify-center"
                >
                  <FileText className="w-8 h-8 mb-2 text-purple-400" />
                  <span className="font-bold text-lg">By Class Period</span>
                </Button>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("date");
                    setDateRangeType("");
                    setStartDate(null);
                  }}
                  className="border-gray-700 text-gray-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Team/Class/Athlete */}
        {step === "select" && (
          <Card className="bg-gray-950 border border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white flex items-center gap-3">
                {reportType === "individual" ? (
                  <User className="w-5 h-5 text-purple-400" />
                ) : (
                  <Users className="w-5 h-5 text-blue-400" />
                )}
                {reportType === "individual" ? "Select Athlete" : `Select ${filterType === "team" ? "Team" : "Class Period"}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {filterType === "team" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Select Team</label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Choose a team..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.id} className="text-white">
                          {team.name} - {team.sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filterType === "class" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Select Class Period</label>
                  <Select value={selectedClassPeriod} onValueChange={setSelectedClassPeriod}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Choose a class period..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {classPeriods.map(period => (
                        <SelectItem key={period.id} value={period.name} className="text-white">
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* For individual reports, show athlete selection after team/class is selected */}
              {reportType === "individual" && (selectedTeamId || selectedClassPeriod) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Select Athlete</label>
                  <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Choose an athlete..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {filteredAthletes.map(athlete => (
                        <SelectItem key={athlete.id} value={athlete.id} className="text-white">
                          {athlete.first_name} {athlete.last_name} {athlete.jersey_number ? `- #${athlete.jersey_number}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("filter");
                    setFilterType("");
                    setSelectedTeamId("");
                    setSelectedClassPeriod("");
                    setSelectedAthleteId("");
                  }}
                  className="border-gray-700 text-gray-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                {/* Continue button */}
                {((reportType === "team" && (selectedTeamId || selectedClassPeriod)) ||
                  (reportType === "individual" && selectedAthleteId)) && (
                  <Button
                    onClick={() => setStep("editor")}
                    className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black"
                  >
                    Continue to Report Builder
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}