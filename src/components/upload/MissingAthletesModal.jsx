import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, AlertTriangle } from "lucide-react";
import { Team, ClassPeriod, Athlete } from "@/entities/all";

const CLASS_GRADES = [
  "2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034"
];

export default function MissingAthletesModal({ 
  open, 
  onOpenChange, 
  missingAthletes, 
  onCreateAthletes, 
  onSkip 
}) {
  const [teams, setTeams] = useState([]);
  const [classPeriods, setClassPeriods] = useState([]);
  const [athleteData, setAthleteData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      initializeAthleteData();
    }
  }, [open, missingAthletes]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamsData, classPeriodsData] = await Promise.all([
        Team.list(),
        ClassPeriod.list()
      ]);
      
      const normalizedTeams = teamsData.map(t => ({
        id: t.id,
        ...t.data
      }));
      
      const normalizedClassPeriods = classPeriodsData.map(cp => ({
        id: cp.id,
        ...cp.data
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setTeams(normalizedTeams);
      setClassPeriods(normalizedClassPeriods);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAthleteData = () => {
    const initialData = {};
    missingAthletes.forEach((athlete, index) => {
      initialData[index] = {
        first_name: athlete.firstName,
        last_name: athlete.lastName,
        team_id: "",
        class_grade: "",
        class_period: ""
      };
    });
    setAthleteData(initialData);
  };

  const updateAthleteField = (index, field, value) => {
    setAthleteData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const allFieldsFilled = () => {
    return Object.values(athleteData).every(
      data => data.team_id && data.class_grade && data.class_period
    );
  };

  const handleSave = async () => {
    if (!allFieldsFilled()) return;
    
    setIsSaving(true);
    try {
      const newAthletes = [];
      
      for (const [index, data] of Object.entries(athleteData)) {
        const newAthlete = await Athlete.create({
          first_name: data.first_name,
          last_name: data.last_name,
          team_ids: [data.team_id],
          class_grade: data.class_grade,
          class_period: data.class_period,
          status: "active"
        });
        
        newAthletes.push({
          ...newAthlete,
          originalIndex: parseInt(index)
        });
      }
      
      onCreateAthletes(newAthletes);
    } catch (error) {
      console.error("Error creating athletes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 border border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Athletes Not Found in Roster
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-amber-950/20 border-amber-800">
          <UserPlus className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-300">
            The following {missingAthletes.length} athlete(s) were not found in your roster. 
            Would you like to create new roster spots for them?
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {missingAthletes.map((athlete, index) => (
              <div 
                key={index} 
                className="p-4 bg-gray-900 rounded-lg border border-gray-800 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-black font-black">
                      {athlete.firstName?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">
                      {athlete.firstName} {athlete.lastName}
                    </p>
                    <p className="text-gray-400 text-sm">New athlete</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Team *</Label>
                    <Select 
                      value={athleteData[index]?.team_id || ""} 
                      onValueChange={(value) => updateAthleteField(index, "team_id", value)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select team..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id} className="text-white">
                            {team.name} - {team.sport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Class/Grade *</Label>
                    <Select 
                      value={athleteData[index]?.class_grade || ""} 
                      onValueChange={(value) => updateAthleteField(index, "class_grade", value)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select grade..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {CLASS_GRADES.map(grade => (
                          <SelectItem key={grade} value={grade} className="text-white">
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Class Period *</Label>
                    <Select 
                      value={athleteData[index]?.class_period || ""} 
                      onValueChange={(value) => updateAthleteField(index, "class_period", value)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select period..." />
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
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSkip}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Skip - Import Without These Athletes
          </Button>
          <Button
            onClick={handleSave}
            disabled={!allFieldsFilled() || isSaving || isLoading}
            className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-bold"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                Creating Athletes...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create {missingAthletes.length} Athlete(s) & Import Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}