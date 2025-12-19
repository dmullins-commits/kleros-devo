import React, { useState, useEffect, useRef } from 'react';
import { useTeam } from "@/components/TeamContext";
import { useAthletes, useMetrics, useMetricRecords, useTeams, useClassPeriods } from "@/components/hooks/useDataQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  LayoutGrid, 
  Save, 
  Download, 
  Calendar as CalendarIcon, 
  Settings,
  Trophy,
  GripVertical,
  Columns,
  SeparatorHorizontal,
  Crown
} from "lucide-react";
import { format } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { base44 } from "@/api/base44Client";

export default function LeaderboardBuilder() {
  const { selectedOrgId } = useTeam();
  const { data: athletes = [], isLoading: loadingAthletes } = useAthletes(selectedOrgId);
  const { data: metrics = [], isLoading: loadingMetrics } = useMetrics(selectedOrgId);
  const { data: records = [], isLoading: loadingRecords } = useMetricRecords(selectedOrgId);
  const { data: teams = [] } = useTeams(selectedOrgId);
  const { data: classPeriods = [] } = useClassPeriods(selectedOrgId);

  const previewRef = useRef(null);

  // Layout configuration state
  const [title, setTitle] = useState("Performance Leaderboard");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, team, class_period
  const [filterId, setFilterId] = useState(null);
  const [useAllTimePR, setUseAllTimePR] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Visual configuration
  const [boxPadding, setBoxPadding] = useState("0.1rem 0.25rem");
  const [fontSize, setFontSize] = useState("10px");
  const [columns, setColumns] = useState(2);
  const [genderSeparation, setGenderSeparation] = useState("separate"); // separate or grouped
  const [boxesPerPage, setBoxesPerPage] = useState(30);
  const [pageBreaks, setPageBreaks] = useState([]);

  // Leaderboard data
  const [leaderboardData, setLeaderboardData] = useState({ male: [], female: [] });
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageBreakMode, setPageBreakMode] = useState(false);
  const [pageBreakPositions, setPageBreakPositions] = useState([]);

  useEffect(() => {
    loadTemplates();
  }, [selectedOrgId]);

  useEffect(() => {
    if (selectedMetric && athletes.length > 0 && records.length > 0) {
      generateLeaderboard();
    }
  }, [selectedMetric, selectedDate, filterType, filterId, useAllTimePR, athletes, records]);

  const loadTemplates = async () => {
    if (!selectedOrgId) return;
    try {
      const { LeaderboardTemplate } = await import("@/entities/all");
      const templates = await LeaderboardTemplate.filter({ organization_id: selectedOrgId });
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generateLeaderboard = () => {
    if (!selectedMetric) return;

    const metric = metrics.find(m => m.id === selectedMetric);
    if (!metric) return;

    // Filter athletes
    let filteredAthletes = athletes.filter(a => a.status === 'active');
    
    if (filterType === 'team' && filterId) {
      filteredAthletes = filteredAthletes.filter(a => a.team_ids?.includes(filterId));
    } else if (filterType === 'class_period' && filterId) {
      filteredAthletes = filteredAthletes.filter(a => a.class_period === filterId);
    }

    // Get records for each athlete
    const athleteData = filteredAthletes.map(athlete => {
      let athleteRecords = records.filter(r => 
        (r.athlete_id || r.data?.athlete_id) === athlete.id &&
        (r.metric_id || r.data?.metric_id) === selectedMetric
      );

      if (!useAllTimePR && selectedDate) {
        athleteRecords = athleteRecords.filter(r => {
          const recordDate = r.recorded_date || r.data?.recorded_date;
          return recordDate === selectedDate;
        });
      }

      if (athleteRecords.length === 0) return null;

      const values = athleteRecords.map(r => r.value ?? r.data?.value);
      const targetHigher = metric.target_higher !== false;
      const bestValue = targetHigher ? Math.max(...values) : Math.min(...values);

      return {
        athlete_id: athlete.id,
        athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        gender: athlete.gender,
        value: bestValue
      };
    }).filter(Boolean);

    // Sort by value
    const targetHigher = metric.target_higher !== false;
    athleteData.sort((a, b) => targetHigher ? b.value - a.value : a.value - b.value);

    // Split by gender
    const maleData = athleteData.filter(a => a.gender === 'Male');
    const femaleData = athleteData.filter(a => a.gender === 'Female');

    setLeaderboardData({ male: maleData, female: femaleData });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceList = result.source.droppableId === 'male' ? 'male' : 'female';
    const destList = result.destination.droppableId === 'male' ? 'male' : 'female';

    if (sourceList === destList) {
      const items = Array.from(leaderboardData[sourceList]);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      setLeaderboardData(prev => ({
        ...prev,
        [sourceList]: items
      }));
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const { LeaderboardTemplate } = await import("@/entities/all");
      await LeaderboardTemplate.create({
        name: templateName,
        organization_id: selectedOrgId,
        layout_config: {
          title,
          box_padding: boxPadding,
          font_size: fontSize,
          columns,
          gender_separation: genderSeparation,
          boxes_per_page: boxesPerPage,
          page_breaks: pageBreaks
        }
      });
      
      await loadTemplates();
      setTemplateName("");
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = (template) => {
    const config = template.layout_config || template.data?.layout_config;
    if (!config) return;

    setTitle(config.title || "Performance Leaderboard");
    setBoxPadding(config.box_padding || "0.1rem 0.25rem");
    setFontSize(config.font_size || "10px");
    setColumns(config.columns || 2);
    setGenderSeparation(config.gender_separation || "separate");
    setBoxesPerPage(config.boxes_per_page || 30);
    setPageBreaks(config.page_breaks || []);
  };

  const exportToPDF = async () => {
    if (!previewRef.current || !selectedMetric) return;

    const metric = metrics.find(m => m.id === selectedMetric);
    if (!metric) return;

    const element = previewRef.current;
    
    try {
      // Hide page break indicators before export
      const indicators = element.querySelectorAll('.page-break-indicator');
      indicators.forEach(ind => ind.style.display = 'none');

      // Add PDF export class for special styling
      element.classList.add('pdf-exporting');

      // If there are page breaks, handle them
      if (pageBreakPositions.length > 0) {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Get all page sections
        const pageSections = element.querySelectorAll('.page-section');
        
        if (pageSections.length === 0) {
          throw new Error('No page sections found');
        }

        for (let i = 0; i < pageSections.length; i++) {
          if (i > 0) pdf.addPage();
          
          const section = pageSections[i];
          const canvas = await html2canvas(section, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;

          // Fit to page height if needed
          if (imgHeight > pdfHeight) {
            const ratio = pdfHeight / imgHeight;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, pdfHeight);
          } else {
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          }
        }

        pdf.save(`${title}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } else {
        // Standard export without page breaks
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
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

        pdf.save(`${title}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      }
      
      // Remove PDF export class
      element.classList.remove('pdf-exporting');
      
      // Show page break indicators again
      indicators.forEach(ind => ind.style.display = 'flex');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to export PDF: ' + error.message);
      
      // Remove PDF export class
      element.classList.remove('pdf-exporting');
      
      // Show page break indicators again
      const indicators = element.querySelectorAll('.page-break-indicator');
      indicators.forEach(ind => ind.style.display = 'flex');
    }
  };

  const handleLeaderboardClick = (e, athleteIndex) => {
    if (pageBreakMode) {
      e.stopPropagation();
      setPageBreakPositions(prev => {
        if (prev.includes(athleteIndex)) {
          return prev.filter(i => i !== athleteIndex);
        }
        return [...prev, athleteIndex].sort((a, b) => a - b);
      });
    }
  };

  const renderAthleteBox = (item, index, provided, globalIndex) => {
    const metric = metrics.find(m => m.id === selectedMetric);
    if (!metric) return null;

    const rankIcons = [Trophy, Trophy, Trophy];
    const Icon = index < 3 ? rankIcons[index] : null;
    const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
    const rankColor = index < 3 ? rankColors[index] : 'text-black';

    const hasPageBreakBefore = pageBreakPositions.includes(globalIndex);

    return (
      <>
        {hasPageBreakBefore && (
          <div className="page-break-indicator" style={{ 
            width: '100%', 
            height: '2px', 
            background: 'linear-gradient(to right, #ef4444, #f97316, #ef4444)',
            margin: '1rem 0',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ 
              background: 'white', 
              padding: '0.25rem 0.5rem', 
              fontSize: '10px', 
              fontWeight: 'bold',
              color: '#ef4444',
              border: '2px solid #ef4444',
              borderRadius: '4px'
            }}>
              PAGE BREAK
            </span>
          </div>
        )}
        <div
          ref={provided?.innerRef}
          {...(provided?.draggableProps || {})}
          {...(provided?.dragHandleProps || {})}
          onClick={(e) => handleLeaderboardClick(e, globalIndex)}
          className="athlete-box"
          style={{
            padding: boxPadding,
            marginBottom: '0.05rem',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: fontSize,
            color: 'black',
            cursor: pageBreakMode ? 'crosshair' : 'default',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            ...(provided?.draggableProps?.style || {})
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', flexShrink: 0 }}>
              {Icon ? (
                <Icon style={{ width: '12px', height: '12px', display: 'block' }} className={rankColor} />
              ) : (
                <span style={{ fontWeight: 'bold', fontSize: fontSize, display: 'block' }} className={rankColor}>#{index + 1}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: fontSize, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.athlete_name}
              </span>
            </div>
            <div style={{ textAlign: 'right', width: '60px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: fontSize }}>
                {item.value.toFixed(metric.decimal_places ?? 2)}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderLeaderboard = () => {
    if (!selectedMetric) {
      return (
        <div className="text-center py-16 text-gray-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-semibold">Select a metric to view leaderboard</p>
        </div>
      );
    }

    if (leaderboardData.male.length === 0 && leaderboardData.female.length === 0) {
      return (
        <div className="text-center py-16 text-gray-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-semibold">No data available for selected filters</p>
        </div>
      );
    }

    // Get all athletes in display order
    const getAllAthletes = () => {
      if (genderSeparation === 'separate') {
        return { male: leaderboardData.male, female: leaderboardData.female };
      } else {
        return { all: [...leaderboardData.male, ...leaderboardData.female] };
      }
    };

    const athletesByGender = getAllAthletes();

    // Split athletes by page breaks
    const splitByPageBreaks = (athletes) => {
      if (pageBreakPositions.length === 0) {
        return [athletes];
      }

      const sections = [];
      let lastIndex = 0;
      
      const sortedBreaks = [...pageBreakPositions].sort((a, b) => a - b);
      
      sortedBreaks.forEach(breakPoint => {
        if (breakPoint > lastIndex) {
          sections.push(athletes.slice(lastIndex, breakPoint));
          lastIndex = breakPoint;
        }
      });
      
      if (lastIndex < athletes.length) {
        sections.push(athletes.slice(lastIndex));
      }

      return sections.filter(s => s.length > 0);
    };

    // Create page sections
    const createPageSections = () => {
      if (genderSeparation === 'separate') {
        const maleSections = splitByPageBreaks(athletesByGender.male);
        const femaleSections = splitByPageBreaks(athletesByGender.female);
        const maxSections = Math.max(maleSections.length, femaleSections.length);
        
        const pageSections = [];
        for (let i = 0; i < maxSections; i++) {
          pageSections.push({
            male: maleSections[i] || [],
            female: femaleSections[i] || []
          });
        }
        return pageSections;
      } else {
        return splitByPageBreaks(athletesByGender.all).map(athletes => ({ all: athletes }));
      }
    };

    const pageSections = createPageSections();

    const renderPageContent = (section, sectionIndex, startIndex) => {
      if (genderSeparation === 'separate') {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem' }}>
            {/* Male Athletes */}
            {section.male && section.male.length > 0 && (
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'black' }}>
                  MALE ATHLETES
                </h2>
                <div>
                  {section.male.map((item, index) => {
                    const globalIndex = leaderboardData.male.indexOf(item);
                    return renderAthleteBox(item, globalIndex, null, globalIndex);
                  })}
                </div>
              </div>
            )}

            {/* Female Athletes */}
            {section.female && section.female.length > 0 && (
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'black' }}>
                  FEMALE ATHLETES
                </h2>
                <div>
                  {section.female.map((item, index) => {
                    const globalIndex = leaderboardData.male.length + leaderboardData.female.indexOf(item);
                    return renderAthleteBox(item, leaderboardData.female.indexOf(item), null, globalIndex);
                  })}
                </div>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div>
            {section.all.map((item, index) => {
              const globalIndex = [...leaderboardData.male, ...leaderboardData.female].indexOf(item);
              return renderAthleteBox(item, globalIndex, null, globalIndex);
            })}
          </div>
        );
      }
    };

    // For display with drag and drop (single view)
    if (pageBreakPositions.length === 0) {
      return (
        <div style={{ background: 'white', padding: '1rem', color: 'black', minHeight: '100vh' }}>
          <div style={{ position: 'relative', minHeight: '100vh' }}>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8df636a0ee4f52ceab427/982139d90_AppLogo1.png"
              alt="Watermark"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.08,
                width: '60%',
                height: 'auto',
                zIndex: 0,
                pointerEvents: 'none'
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #FCD34D' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'black' }}>
                  {title}
                </h1>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
                  {metrics.find(m => m.id === selectedMetric)?.name} ({metrics.find(m => m.id === selectedMetric)?.unit})
                </p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </p>
              </div>
              {genderSeparation === 'separate' ? (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem' }}>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    {leaderboardData.male.length > 0 && (
                      <div>
                        <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'black' }}>
                          MALE ATHLETES
                        </h2>
                        <Droppable droppableId="male">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                              {leaderboardData.male.map((item, index) => (
                                <Draggable key={item.athlete_id} draggableId={item.athlete_id} index={index}>
                                  {(provided) => renderAthleteBox(item, index, provided, index)}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                    {leaderboardData.female.length > 0 && (
                      <div>
                        <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'black' }}>
                          FEMALE ATHLETES
                        </h2>
                        <Droppable droppableId="female">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                              {leaderboardData.female.map((item, index) => (
                                <Draggable key={item.athlete_id} draggableId={item.athlete_id} index={index}>
                                  {(provided) => renderAthleteBox(item, index, provided, leaderboardData.male.length + index)}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </DragDropContext>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="all">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {[...leaderboardData.male, ...leaderboardData.female].map((item, index) => (
                          <Draggable key={item.athlete_id} draggableId={item.athlete_id} index={index}>
                            {(provided) => renderAthleteBox(item, index, provided, index)}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>
        </div>
      );
    }

    // With page breaks - render separate pages
    return (
      <div style={{ background: 'white', color: 'black' }}>
        {pageSections.map((section, sectionIndex) => (
          <div 
            key={sectionIndex} 
            className="page-section" 
            style={{ 
              position: 'relative',
              minHeight: '100vh',
              padding: '1rem',
              pageBreakAfter: sectionIndex < pageSections.length - 1 ? 'always' : 'auto'
            }}
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8df636a0ee4f52ceab427/982139d90_AppLogo1.png"
              alt="Watermark"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.08,
                width: '60%',
                height: 'auto',
                zIndex: 0,
                pointerEvents: 'none'
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #FCD34D' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem', color: 'black' }}>
                  {title}
                </h1>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
                  {metrics.find(m => m.id === selectedMetric)?.name} ({metrics.find(m => m.id === selectedMetric)?.unit})
                </p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  {format(new Date(selectedDate), "MMMM d, yyyy")} - Page {sectionIndex + 1}
                </p>
              </div>
              {renderPageContent(section, sectionIndex, 0)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loadingAthletes || loadingMetrics || loadingRecords) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .pdf-exporting .athlete-box {
            height: auto !important;
            min-height: 0 !important;
          }
          .pdf-exporting .athlete-box span {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
        `}
      </style>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 mb-2">
              LEADERBOARD BUILDER
            </h1>
            <p className="text-gray-400 font-semibold">Create custom performance leaderboards with drag-and-drop layout</p>
          </div>
          <Badge className="bg-gradient-to-r from-amber-400/30 to-yellow-500/30 text-amber-200 border border-amber-400/50 px-4 py-2 text-lg font-black">
            <Crown className="w-5 h-5 mr-2" />
            PREMIUM FEATURE
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {pageBreakMode && (
              <Alert className="bg-red-950/20 border-2 border-red-500 animate-pulse">
                <SeparatorHorizontal className="h-5 w-5 text-red-400" />
                <AlertDescription className="text-red-300 font-bold">
                  PAGE BREAK MODE ACTIVE - Click on any athlete box to insert a page break
                </AlertDescription>
              </Alert>
            )}
            
            {/* Data Selection */}
            <Card className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30">
              <CardHeader className="border-b border-amber-400/30">
                <CardTitle className="text-amber-200 font-black flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Data Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Metric</Label>
                  <Select value={selectedMetric || ""} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {metrics.filter(m => m.is_active).map(metric => (
                        <SelectItem key={metric.id} value={metric.id} className="text-white">
                          {metric.name} ({metric.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Date</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full bg-gray-900 border-gray-700 text-white justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(new Date(selectedDate), 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-950 border-gray-800">
                      <Calendar
                        mode="single"
                        selected={new Date(selectedDate)}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(format(date, 'yyyy-MM-dd'));
                            setShowCalendar(false);
                          }
                        }}
                        className="bg-gray-950 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="alltime" 
                    checked={useAllTimePR}
                    onCheckedChange={setUseAllTimePR}
                    className="border-amber-400/50"
                  />
                  <Label htmlFor="alltime" className="text-gray-300 font-semibold cursor-pointer">
                    Use All-Time PR
                  </Label>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Filter By</Label>
                  <Select value={filterType} onValueChange={(val) => { setFilterType(val); setFilterId(null); }}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="text-white">All Athletes</SelectItem>
                      <SelectItem value="team" className="text-white">Team</SelectItem>
                      <SelectItem value="class_period" className="text-white">Class Period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filterType === 'team' && (
                  <div>
                    <Label className="text-gray-300 font-semibold mb-2 block">Select Team</Label>
                    <Select value={filterId || ""} onValueChange={setFilterId}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Choose team" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id} className="text-white">
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {filterType === 'class_period' && (
                  <div>
                    <Label className="text-gray-300 font-semibold mb-2 block">Select Class Period</Label>
                    <Select value={filterId || ""} onValueChange={setFilterId}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Choose period" />
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
              </CardContent>
            </Card>

            {/* Layout Configuration */}
            <Card className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30">
              <CardHeader className="border-b border-amber-400/30">
                <CardTitle className="text-amber-200 font-black flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5" />
                  Layout Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Title</Label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Font Size</Label>
                  <Input 
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    placeholder="e.g., 10px"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Box Padding</Label>
                  <Input 
                    value={boxPadding}
                    onChange={(e) => setBoxPadding(e.target.value)}
                    placeholder="e.g., 0.1rem 0.25rem"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Columns</Label>
                  <Select value={columns.toString()} onValueChange={(val) => setColumns(parseInt(val))}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="1" className="text-white">1 Column</SelectItem>
                      <SelectItem value="2" className="text-white">2 Columns</SelectItem>
                      <SelectItem value="3" className="text-white">3 Columns</SelectItem>
                      <SelectItem value="4" className="text-white">4 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Gender Display</Label>
                  <Select value={genderSeparation} onValueChange={setGenderSeparation}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="separate" className="text-white">Separate Columns</SelectItem>
                      <SelectItem value="grouped" className="text-white">Grouped Together</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Athletes Per Page</Label>
                  <Input 
                    type="number"
                    value={boxesPerPage}
                    onChange={(e) => setBoxesPerPage(parseInt(e.target.value) || 30)}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Template Management */}
            <Card className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30">
              <CardHeader className="border-b border-amber-400/30">
                <CardTitle className="text-amber-200 font-black flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex gap-2">
                  <Input 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <Button 
                    onClick={saveTemplate}
                    disabled={saving || !templateName.trim()}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>

                {savedTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Saved Templates</Label>
                    {savedTemplates.map(template => (
                      <Button
                        key={template.id}
                        variant="outline"
                        onClick={() => loadTemplate(template)}
                        className="w-full justify-start bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                      >
                        {template.name || template.data?.name}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Page Break Controls */}
            <div className="space-y-3">
              <Button 
                onClick={() => setPageBreakMode(!pageBreakMode)}
                variant={pageBreakMode ? "default" : "outline"}
                className={`w-full font-bold ${pageBreakMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-900 border-gray-700 text-white hover:bg-gray-800'}`}
              >
                <SeparatorHorizontal className="w-5 h-5 mr-2" />
                {pageBreakMode ? 'Cancel Page Break Mode' : 'Insert Page Break'}
              </Button>
              
              {pageBreakPositions.length > 0 && (
                <Button 
                  onClick={() => setPageBreakPositions([])}
                  variant="outline"
                  className="w-full bg-gray-900 border-gray-700 text-white hover:bg-gray-800 font-semibold"
                >
                  Clear All Page Breaks ({pageBreakPositions.length})
                </Button>
              )}
            </div>

            {/* Export */}
            <Button 
              onClick={exportToPDF}
              disabled={!selectedMetric}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black text-lg py-6 shadow-lg shadow-amber-500/50"
            >
              <Download className="w-5 h-5 mr-2" />
              EXPORT TO PDF
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-2 border-amber-400/30 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-400/10 to-yellow-500/10 border-b border-amber-400/30">
                <CardTitle className="text-black font-black flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Live Preview (Drag to Reorder)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div ref={previewRef} className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {renderLeaderboard()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}