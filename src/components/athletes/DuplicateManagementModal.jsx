import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Athlete } from "@/entities/all";

export default function DuplicateManagementModal({ open, onOpenChange, athletes, onDuplicatesDeleted }) {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (open && athletes && Array.isArray(athletes)) {
      findDuplicates();
      setSelectedForDeletion(new Set());
      setDeleteSuccess(false);
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
    setSelectedForDeletion(prev => {
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
    setSelectedForDeletion(prev => {
      const newSet = new Set(prev);
      group.slice(1).forEach(athlete => athlete && newSet.add(athlete.id));
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (selectedForDeletion.size === 0) return;

    setIsDeleting(true);
    setDeleteSuccess(false);
    setErrorMessage(null);

    try {
      const athleteIds = Array.from(selectedForDeletion);
      const results = { deleted: 0, alreadyDeleted: 0, errors: [] };

      for (const athleteId of athleteIds) {
        try {
          await Athlete.delete(athleteId);
          results.deleted++;
        } catch (error) {
          if (error.response?.status === 404 || error.message?.includes('not found')) {
            results.alreadyDeleted++;
          } else {
            results.errors.push(athleteId);
            console.error(`Error deleting athlete ${athleteId}:`, error);
          }
        }
      }

      if (results.deleted > 0 || results.alreadyDeleted > 0) {
        setDeleteSuccess(true);
        setSelectedForDeletion(new Set());
        
        if (onDuplicatesDeleted) {
          await onDuplicatesDeleted(Array.from(selectedForDeletion));
        }
        
        setTimeout(() => {
          findDuplicates();
          setDeleteSuccess(false);
        }, 2000);
      } else if (results.errors.length > 0) {
        setErrorMessage(`Failed to delete ${results.errors.length} athlete${results.errors.length !== 1 ? 's' : ''}. Please try again.`);
      }
      
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      setErrorMessage('An unexpected error occurred while deleting athletes.');
    } finally {
      setIsDeleting(false);
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

        {deleteSuccess && (
          <Alert className="bg-green-950/20 border-green-800 mb-4">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">
              Successfully deleted selected athletes!
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
                Review carefully and select which athletes to delete.
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
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Delete</th>
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
                                    : selectedForDeletion.has(athlete.id)
                                    ? 'bg-red-950/20'
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
                                      checked={selectedForDeletion.has(athlete.id)}
                                      onCheckedChange={() => toggleSelection(athlete.id)}
                                      className="border-2 border-amber-400/50 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
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
                                            ORIGINAL
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
                {selectedForDeletion.size} athlete{selectedForDeletion.size !== 1 ? 's' : ''} selected for deletion
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
                  onClick={handleDelete}
                  disabled={selectedForDeletion.size === 0 || isDeleting}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedForDeletion.size})
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