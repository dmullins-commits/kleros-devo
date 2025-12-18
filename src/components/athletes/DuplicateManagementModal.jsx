import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, GitMerge, CheckCircle, AlertTriangle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Athlete, MetricRecord } from "@/entities/all";

export default function DuplicateManagementModal({ open, onOpenChange, athletes, onDuplicatesDeleted }) {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedForMerge, setSelectedForMerge] = useState(new Set());
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (open && athletes && Array.isArray(athletes)) {
      findDuplicates();
      setSelectedForMerge(new Set());
      setMergeSuccess(false);
      setErrorMessage(null);
    }
  }, [open, athletes]);

  const findDuplicates = () => {
    if (!athletes || !Array.isArray(athletes)) {
      setDuplicateGroups([]);
      return;
    }

    const groups = [];
    const processed = new Set();

    athletes.forEach((athlete, index) => {
      if (!athlete || processed.has(athlete.id)) return;

      const duplicates = athletes.filter((other, otherIndex) => {
        if (!other || otherIndex <= index || processed.has(other.id)) return false;
        
        const nameMatch = 
          athlete.first_name?.toLowerCase() === other.first_name?.toLowerCase() &&
          athlete.last_name?.toLowerCase() === other.last_name?.toLowerCase();
        
        const emailMatch = 
          athlete.email && other.email && 
          athlete.email.toLowerCase() === other.email.toLowerCase();
        
        const pinMatch = 
          athlete.pin && other.pin && 
          athlete.pin === other.pin;

        return nameMatch || emailMatch || pinMatch;
      });

      if (duplicates.length > 0) {
        const group = [athlete, ...duplicates];
        groups.push(group);
        group.forEach(a => a && processed.add(a.id));
      }
    });

    setDuplicateGroups(groups);
  };

  const toggleSelection = (athleteId) => {
    setSelectedForMerge(prev => {
      const newSet = new Set(prev);
      if (newSet.has(athleteId)) {
        newSet.delete(athleteId);
      } else {
        newSet.add(athleteId);
      }
      return newSet;
    });
  };

  const selectAllInGroup = (group) => {
    setSelectedForMerge(prev => {
      const newSet = new Set(prev);
      group.slice(1).forEach(athlete => athlete && newSet.add(athlete.id));
      return newSet;
    });
  };

  const handleMerge = async () => {
    if (selectedForMerge.size === 0) return;

    setIsMerging(true);
    setMergeSuccess(false);
    setErrorMessage(null);

    try {
      // Group selected athletes by their duplicate group
      const mergeOperations = [];
      
      for (const group of duplicateGroups) {
        const primaryAthlete = group[0];
        const duplicatesToMerge = group.slice(1).filter(a => selectedForMerge.has(a.id));
        
        if (duplicatesToMerge.length > 0) {
          mergeOperations.push({ primary: primaryAthlete, duplicates: duplicatesToMerge });
        }
      }

      let mergedCount = 0;
      
      for (const { primary, duplicates } of mergeOperations) {
        try {
          // Merge data from duplicates into primary
          const mergedData = { ...primary };
          
          // Merge non-null fields from duplicates
          for (const duplicate of duplicates) {
            Object.keys(duplicate).forEach(key => {
              if (duplicate[key] && !mergedData[key] && key !== 'id' && key !== 'created_date') {
                mergedData[key] = duplicate[key];
              }
            });
            
            // Merge team_ids
            if (duplicate.team_ids && Array.isArray(duplicate.team_ids)) {
              const existingTeams = new Set(mergedData.team_ids || []);
              duplicate.team_ids.forEach(teamId => existingTeams.add(teamId));
              mergedData.team_ids = Array.from(existingTeams);
            }
          }
          
          // Update primary athlete with merged data
          await Athlete.update(primary.id, mergedData);
          
          // Transfer metric records from duplicates to primary
          for (const duplicate of duplicates) {
            const records = await MetricRecord.filter({ athlete_id: duplicate.id });
            
            for (const record of records) {
              await MetricRecord.update(record.id, { athlete_id: primary.id });
            }
            
            // Delete the duplicate athlete
            await Athlete.delete(duplicate.id);
            mergedCount++;
          }
        } catch (error) {
          console.error(`Error merging athlete group:`, error);
          setErrorMessage(`Failed to merge some athletes. Please try again.`);
        }
      }

      if (mergedCount > 0) {
        setMergeSuccess(true);
        setSelectedForMerge(new Set());
        
        if (onDuplicatesDeleted) {
          await onDuplicatesDeleted(Array.from(selectedForMerge));
        }
        
        setTimeout(() => {
          findDuplicates();
          setMergeSuccess(false);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error merging duplicates:', error);
      setErrorMessage('An unexpected error occurred while merging athletes.');
    } finally {
      setIsMerging(false);
    }
  };

  const getDuplicateReason = (group) => {
    if (!group || group.length < 2) return '';
    
    const reasons = [];
    const first = group[0];
    const second = group[1];

    if (!first || !second) return '';

    if (first.first_name?.toLowerCase() === second.first_name?.toLowerCase() &&
        first.last_name?.toLowerCase() === second.last_name?.toLowerCase()) {
      reasons.push('Same Name');
    }
    
    if (first.email && second.email && 
        first.email.toLowerCase() === second.email.toLowerCase()) {
      reasons.push('Same Email');
    }
    
    if (first.pin && second.pin && first.pin === second.pin) {
      reasons.push('Same PIN');
    }

    return reasons.join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-amber-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-amber-200 flex items-center gap-3">
            <Users className="w-6 h-6 text-amber-400" />
            POTENTIAL DUPLICATE ATHLETES
          </DialogTitle>
        </DialogHeader>

        {mergeSuccess && (
          <Alert className="bg-green-950/20 border-green-800 mb-4">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">
              Successfully merged selected athletes!
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="bg-red-950/20 border-red-800 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 font-semibold">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {duplicateGroups.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">No Duplicates Found!</h3>
            <p className="text-gray-400 font-medium">Your athlete roster is clean.</p>
          </div>
        ) : (
          <>
            <Alert className="bg-amber-950/20 border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-300 font-semibold">
                Found {duplicateGroups.length} potential duplicate group{duplicateGroups.length !== 1 ? 's' : ''}.
                Select duplicates to merge into the primary (first) athlete. Data and records from all selected profiles will be combined.
              </AlertDescription>
            </Alert>

            <div className="space-y-6 mt-6">
              {duplicateGroups.map((group, groupIndex) => (
                <Card key={groupIndex} className="bg-black/50 border-2 border-amber-400/30">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4 border-b border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-yellow-500/10">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-400/50 font-bold">
                          Duplicate Group #{groupIndex + 1}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-300 font-semibold">
                          {getDuplicateReason(group)}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-300 font-semibold">
                          {group.length} Athletes
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => selectAllInGroup(group)}
                        className="bg-gray-800 hover:bg-gray-700 text-white font-semibold"
                      >
                        Select All Duplicates
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900/50 border-b border-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Merge</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Athlete</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">PIN</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Grade</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Period</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Created Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.map((athlete, index) => {
                            if (!athlete) return null;
                            
                            return (
                              <tr 
                                key={athlete.id}
                                className={`border-b border-gray-800 transition-colors ${
                                 index === 0 
                                   ? 'bg-green-950/20' 
                                   : selectedForMerge.has(athlete.id)
                                   ? 'bg-blue-950/20'
                                   : 'hover:bg-gray-900/50'
                                }`}
                              >
                                <td className="px-4 py-3">
                                  {index === 0 ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-green-500/20 border-2 border-green-500 rounded flex items-center justify-center">
                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                      </div>
                                    </div>
                                  ) : (
                                   <Checkbox
                                     checked={selectedForMerge.has(athlete.id)}
                                     onCheckedChange={() => toggleSelection(athlete.id)}
                                     className="border-2 border-amber-400/50 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                   />
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border-2 border-amber-500/50">
                                      <AvatarImage src={athlete.profile_image} />
                                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-black font-bold text-sm">
                                        {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="text-white font-bold flex items-center gap-2">
                                        {athlete.first_name} {athlete.last_name}
                                        {index === 0 && (
                                          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 font-bold text-xs">
                                            PRIMARY
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        ID: {athlete.id?.slice(-8)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {athlete.pin ? (
                                    <span className="font-mono font-semibold text-white">{athlete.pin}</span>
                                  ) : (
                                    <span className="text-gray-500 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {athlete.email ? (
                                    <span className="text-white text-sm">{athlete.email}</span>
                                  ) : (
                                    <span className="text-gray-500 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {athlete.class_grade ? (
                                    <Badge variant="outline" className="border-gray-600 text-gray-300 font-semibold">
                                      {athlete.class_grade}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-500 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {athlete.class_period ? (
                                    <Badge variant="outline" className="border-gray-600 text-gray-300 font-semibold">
                                      {athlete.class_period}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-500 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-white text-sm">
                                    {athlete.created_date ? new Date(athlete.created_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    }) : '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {athlete.status === 'active' && (
                                    <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 font-bold text-xs">
                                      ACTIVE
                                    </Badge>
                                  )}
                                  {athlete.status === 'injured' && (
                                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/50 font-bold text-xs">
                                      INJURED
                                    </Badge>
                                  )}
                                  {athlete.status === 'inactive' && (
                                    <Badge className="bg-gray-700 text-gray-400 border border-gray-600 font-bold text-xs">
                                      INACTIVE
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t-2 border-amber-400/30 mt-6">
              <div className="text-gray-300 font-semibold">
                {selectedForMerge.size} athlete{selectedForMerge.size !== 1 ? 's' : ''} selected for merging
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-2 border-amber-400/30 text-amber-300 hover:bg-amber-400/10 font-bold"
                >
                  Close
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={selectedForMerge.size === 0 || isMerging}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black"
                >
                  {isMerging ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge className="w-4 h-4 mr-2" />
                      Merge Selected ({selectedForMerge.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}