import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Check, Trash2 } from "lucide-react";
import { Injury } from "@/entities/all";
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

export default function InjuryHistory({ athlete }) {
  const [injuries, setInjuries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [injuryToReturn, setInjuryToReturn] = useState(null);
  const [injuryToDelete, setInjuryToDelete] = useState(null);

  useEffect(() => {
    loadInjuries();
  }, [athlete?.id]);

  const loadInjuries = async () => {
    if (!athlete?.id) return;
    
    setIsLoading(true);
    try {
      const injuriesData = await Injury.filter({ athlete_id: athlete.id }, '-date_of_injury');
      setInjuries(injuriesData);
    } catch (error) {
      console.error('Error loading injuries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToPlay = async () => {
    if (!injuryToReturn) return;
    
    try {
      await Injury.update(injuryToReturn.id, { is_active: false });
      loadInjuries();
      setShowReturnDialog(false);
      setInjuryToReturn(null);
    } catch (error) {
      console.error('Error updating injury:', error);
    }
  };

  const handleDeleteInjury = async () => {
    if (!injuryToDelete) return;
    
    try {
      await Injury.delete(injuryToDelete.id);
      loadInjuries();
      setShowDeleteDialog(false);
      setInjuryToDelete(null);
    } catch (error) {
      console.error('Error deleting injury:', error);
    }
  };

  const activeInjury = injuries.find(i => i.is_active);

  if (isLoading) {
    return (
      <Card className="bg-gray-950 border border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Injury Alert */}
      {activeInjury && (
        <Card className="bg-gradient-to-br from-red-950/50 to-red-900/30 border-2 border-red-400/50">
          <CardHeader className="border-b border-red-400/30 pb-3">
            <CardTitle className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Current Injury
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-white">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex-1">
                <p className="text-black font-bold text-lg mb-1">{activeInjury.injury_name}</p>
                <p className="text-sm text-gray-700">
                  {new Date(activeInjury.date_of_injury).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • 
                  {activeInjury.injury_location} • 
                  Expected return: {new Date(activeInjury.expected_return_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setInjuryToReturn(activeInjury);
                  setShowReturnDialog(true);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                <Check className="w-4 h-4 mr-2" />
                Return to Play
              </Button>
              <Button
                onClick={() => {
                  setInjuryToDelete(activeInjury);
                  setShowDeleteDialog(true);
                }}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Injuries */}
      {injuries.filter(i => !i.is_active).length > 0 && (
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800 pb-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <Clock className="w-5 h-5 text-amber-400" />
              Previous Injuries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {injuries.filter(i => !i.is_active).map((injury) => (
                <div key={injury.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{injury.injury_name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(injury.date_of_injury).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • 
                        {injury.injury_location}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setInjuryToDelete(injury);
                        setShowDeleteDialog(true);
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {injuries.length === 0 && (
        <Card className="bg-gray-950 border border-gray-800">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No injury history recorded</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent className="bg-gray-950 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Return to Play</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Mark {athlete?.first_name} {athlete?.last_name} as returned to play? This will move the injury to previous injuries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReturnToPlay}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-950 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Injury Record</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to permanently delete this injury record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInjury}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Injury
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}