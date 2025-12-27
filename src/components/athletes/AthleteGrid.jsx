import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Crown, AlertCircle, Activity, Trash2, GraduationCap, User2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AthleteGrid({ athletes, teams, isLoading, onEdit, onDelete }) {
  const [athleteToDelete, setAthleteToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getTeamNames = (teamIds) => {
    if (!teamIds || teamIds.length === 0) return [];
    return teamIds
      .map(id => {
        const team = teams.find(t => t.id === id);
        return team?.name;
      })
      .filter(Boolean); // Remove undefined/null values
  };

  const handleDeleteClick = (athlete, e) => {
    e.stopPropagation();
    setAthleteToDelete(athlete);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (athleteToDelete && onDelete) {
      await onDelete(athleteToDelete.id);
      setShowDeleteDialog(false);
      setAthleteToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="bg-gray-950 border-gray-800">
            <CardHeader>
              <Skeleton className="h-24 w-24 rounded-full mx-auto bg-gray-800" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-32 mx-auto bg-gray-800" />
              <Skeleton className="h-4 w-24 mx-auto bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800">
        <CardContent className="py-16 text-center">
          <Crown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">No Athletes Found</h3>
          <p className="text-gray-500 font-medium">Add your first athlete to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {athletes.map((athlete) => (
            <motion.div
              key={athlete.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group"
            >
              <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800 hover:border-amber-500/50 transition-all duration-300 h-full shadow-xl">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 flex items-start gap-3">
                      <Avatar className="w-16 h-16 border-2 border-amber-500 shadow-lg">
                        <AvatarImage src={athlete.profile_image} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-black font-bold text-xl">
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-white text-xl mb-1 font-bold tracking-tight">
                          {athlete.first_name} {athlete.last_name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getTeamNames(athlete.team_ids).map((teamName, idx) => (
                            <Badge key={idx} className="bg-gray-800 text-white border border-gray-700 font-semibold">
                              {teamName}
                            </Badge>
                          ))}
                          {athlete.class_period && (
                            <Badge variant="outline" className="border-gray-700 text-gray-300 font-semibold">
                              {athlete.class_period}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(athlete)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-amber-400 hover:bg-gray-800"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteClick(athlete, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-gray-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {athlete.class_grade && (
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400 font-semibold">Grade:</span>
                        <span className="text-white font-semibold">{athlete.class_grade}</span>
                      </div>
                    )}
                    
                    {athlete.gender && (
                      <div className="flex items-center gap-2 text-sm">
                        <User2 className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400 font-semibold">Gender:</span>
                        <span className="text-white font-semibold">{athlete.gender}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      {athlete.status === 'active' && (
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 font-bold">
                          <Activity className="w-3 h-3 mr-1" />
                          ACTIVE
                        </Badge>
                      )}
                      {athlete.status === 'injured' && (
                        <Badge className="bg-red-500/20 text-red-400 border border-red-500/50 font-bold">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          INJURED
                        </Badge>
                      )}
                      {athlete.status === 'inactive' && (
                        <Badge className="bg-gray-700 text-gray-400 border border-gray-600 font-bold">
                          INACTIVE
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-950 to-gray-900 border border-red-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Athlete: {athleteToDelete?.first_name} {athleteToDelete?.last_name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-3">
              <p className="font-semibold">
                Are you sure you want to delete this athlete?
              </p>
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4">
                <p className="text-red-300 font-bold mb-2">⚠️ Warning:</p>
                <p className="text-red-300">
                  This will permanently delete the athlete profile and ALL associated data including:
                </p>
                <ul className="text-red-300 mt-2 ml-4 list-disc space-y-1">
                  <li>All performance metric records</li>
                  <li>All VBT session data</li>
                  <li>Workout assignments</li>
                  <li>Progress tracking history</li>
                </ul>
              </div>
              <p className="text-gray-400 text-sm font-bold">
                This action cannot be undone. Consider marking the athlete as "inactive" instead if you want to preserve their data.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-white hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete Athlete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}