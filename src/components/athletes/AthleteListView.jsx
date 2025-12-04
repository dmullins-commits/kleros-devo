import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Image as ImageIcon, CheckCircle } from "lucide-react";
import { Athlete } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function AthleteListView({ athletes, teams, classPeriods, onDataUpdated }) {
  const [editedAthletes, setEditedAthletes] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleFieldChange = (athleteId, field, value) => {
    setEditedAthletes(prev => ({
      ...prev,
      [athleteId]: {
        ...athletes.find(a => a.id === athleteId),
        ...prev[athleteId],
        [field]: value
      }
    }));
  };

  const handleTeamChange = (athleteId, teamId) => {
    const athlete = athletes.find(a => a.id === athleteId) || {};
    const currentTeams = athlete.team_ids || [];
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter(id => id !== teamId)
      : [...currentTeams, teamId];
    
    handleFieldChange(athleteId, 'team_ids', newTeams);
  };

  const handleImageUpload = async (athleteId, file) => {
    if (!file) return;
    
    setUploadingImages(prev => ({ ...prev, [athleteId]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleFieldChange(athleteId, 'profile_image', file_url);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImages(prev => ({ ...prev, [athleteId]: false }));
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updates = Object.entries(editedAthletes).map(([athleteId, data]) => 
        Athlete.update(athleteId, data)
      );
      await Promise.all(updates);
      setSaveSuccess(true);
      setEditedAthletes({});
      onDataUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving athletes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAthleteData = (athlete) => {
    return editedAthletes[athlete.id] || athlete;
  };

  const hasChanges = Object.keys(editedAthletes).length > 0;

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert className="bg-green-950/20 border border-green-800">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <AlertDescription className="text-green-300 font-semibold">
            Changes saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800 shadow-xl">
        <CardHeader className="border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-950">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-white">
              Roster Management
            </CardTitle>
            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges || isSaving}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg px-8 shadow-lg"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Photo</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Athlete</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Grade</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Gender</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Teams</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Period</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Height</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Weight</span>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-gray-400 font-bold text-sm tracking-wide">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((athlete, index) => {
                  const athleteData = getAthleteData(athlete);
                  const isEdited = !!editedAthletes[athlete.id];
                  
                  return (
                    <tr 
                      key={athlete.id} 
                      className={`border-b border-gray-800 transition-all ${
                        isEdited ? 'bg-amber-500/10' : index % 2 === 0 ? 'bg-black/50' : 'bg-gray-950/50'
                      } hover:bg-gray-900/50`}
                    >
                      <td className="p-4">
                        <div className="relative group">
                          <Avatar className="w-12 h-12 border-2 border-amber-500/50">
                            <AvatarImage src={athleteData.profile_image} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-black font-bold">
                              {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <label className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                            {uploadingImages[athlete.id] ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-400" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-amber-400" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(athlete.id, e.target.files[0])}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">
                          {athlete.first_name} {athlete.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{athlete.email}</div>
                      </td>
                      <td className="p-4">
                        <Select
                          value={athleteData.class_grade || ''}
                          onValueChange={(value) => handleFieldChange(athlete.id, 'class_grade', value)}
                        >
                          <SelectTrigger className="w-32 bg-black/50 border-gray-700 text-white focus:border-amber-500">
                            <SelectValue placeholder="Grade..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            <SelectItem value="Freshman" className="text-white hover:bg-gray-800">Freshman</SelectItem>
                            <SelectItem value="Sophomore" className="text-white hover:bg-gray-800">Sophomore</SelectItem>
                            <SelectItem value="Junior" className="text-white hover:bg-gray-800">Junior</SelectItem>
                            <SelectItem value="Senior" className="text-white hover:bg-gray-800">Senior</SelectItem>
                            <SelectItem value="Graduate" className="text-white hover:bg-gray-800">Graduate</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Select
                          value={athleteData.gender || ''}
                          onValueChange={(value) => handleFieldChange(athlete.id, 'gender', value)}
                        >
                          <SelectTrigger className="w-28 bg-black/50 border-gray-700 text-white focus:border-amber-500">
                            <SelectValue placeholder="Gender..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            <SelectItem value="Male" className="text-white hover:bg-gray-800">Male</SelectItem>
                            <SelectItem value="Female" className="text-white hover:bg-gray-800">Female</SelectItem>
                            <SelectItem value="Other" className="text-white hover:bg-gray-800">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Select
                          value={athleteData.team_ids?.[0] || ''}
                          onValueChange={(value) => handleTeamChange(athlete.id, value)}
                        >
                          <SelectTrigger className="w-40 bg-black/50 border-gray-700 text-white focus:border-amber-500">
                            <SelectValue placeholder="Select teams..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            {teams.map(team => (
                              <SelectItem 
                                key={team.id} 
                                value={team.id} 
                                className="text-white hover:bg-gray-800"
                              >
                                {athleteData.team_ids?.includes(team.id) ? '✓ ' : ''}{team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Select
                          value={athleteData.class_period || ''}
                          onValueChange={(value) => handleFieldChange(athlete.id, 'class_period', value)}
                        >
                          <SelectTrigger className="w-32 bg-black/50 border-gray-700 text-white focus:border-amber-500">
                            <SelectValue placeholder="Period..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            {classPeriods.map(period => (
                              <SelectItem 
                                key={period.id} 
                                value={period.name} 
                                className="text-white hover:bg-gray-800"
                              >
                                {period.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={athleteData.height || ''}
                          onChange={(e) => handleFieldChange(athlete.id, 'height', e.target.value)}
                          className="w-20 bg-black/50 border-gray-700 text-white focus:border-amber-500"
                          placeholder="in"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={athleteData.weight || ''}
                          onChange={(e) => handleFieldChange(athlete.id, 'weight', e.target.value)}
                          className="w-20 bg-black/50 border-gray-700 text-white focus:border-amber-500"
                          placeholder="lbs"
                        />
                      </td>
                      <td className="p-4">
                        <Select
                          value={athleteData.status || 'active'}
                          onValueChange={(value) => handleFieldChange(athlete.id, 'status', value)}
                        >
                          <SelectTrigger className="w-28 bg-black/50 border-gray-700 text-white focus:border-amber-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            <SelectItem value="active" className="text-green-400 hover:bg-gray-800">Active</SelectItem>
                            <SelectItem value="injured" className="text-red-400 hover:bg-gray-800">Injured</SelectItem>
                            <SelectItem value="inactive" className="text-gray-400 hover:bg-gray-800">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}