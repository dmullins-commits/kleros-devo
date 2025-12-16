import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, User, Crown, Image as ImageIcon, AlertCircle } from "lucide-react";
import { ClassPeriod } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import InjuryForm from "./InjuryForm";
import InjuryHistory from "./InjuryHistory";

export default function AthleteForm({ athlete, teams, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(athlete || {
    pin: '',
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    jersey_number: '',
    team_ids: [],
    class_period: '',
    class_grade: '',
    gender: '',
    rack_assignment: '',
    height: '',
    weight: '',
    date_of_birth: '',
    status: 'active',
    profile_image: ''
  });
  const [classPeriods, setClassPeriods] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInjuryForm, setShowInjuryForm] = useState(false);

  useEffect(() => {
    loadClassPeriods();
  }, []);

  const loadClassPeriods = async () => {
    try {
      const periodsData = await ClassPeriod.list();
      setClassPeriods(periodsData.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading class periods:', error);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_image: file_url }));
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    try {
      // Clean up data - convert empty strings to null for numeric fields
      const cleanedData = {
        ...formData,
        jersey_number: formData.jersey_number === '' ? null : formData.jersey_number,
        height: formData.height === '' ? null : formData.height,
        weight: formData.weight === '' ? null : formData.weight,
      };
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamToggle = (teamId) => {
    setFormData(prev => {
      const currentTeamIds = prev.team_ids || [];
      const isCurrentlySelected = currentTeamIds.includes(teamId);
      
      // Find the "Unassigned" team
      const unassignedTeam = teams.find(t => t.name === 'Unassigned');
      
      if (isCurrentlySelected) {
        // Removing a team
        return {
          ...prev,
          team_ids: currentTeamIds.filter(id => id !== teamId)
        };
      } else {
        // Adding a team - remove "Unassigned" if present
        let newTeamIds = [...currentTeamIds, teamId];
        if (unassignedTeam && newTeamIds.includes(unassignedTeam.id)) {
          newTeamIds = newTeamIds.filter(id => id !== unassignedTeam.id);
        }
        return {
          ...prev,
          team_ids: newTeamIds
        };
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="bg-gradient-to-br from-gray-950 via-black to-gray-950 border-2 border-amber-400/30 shadow-2xl">
        <CardHeader className="border-b-2 border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-yellow-500/10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-amber-400" />
              <span className="text-amber-200 font-black text-xl tracking-tight">
                {athlete ? 'EDIT ATHLETE' : 'CREATE NEW ATHLETE'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10">
              <X className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image Upload and Injury Button */}
            <div className="flex justify-center items-center gap-6 mb-6">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-amber-400/50 shadow-2xl shadow-amber-500/30">
                  <AvatarImage src={formData.profile_image} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black text-4xl">
                    {formData.first_name?.[0]}{formData.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-amber-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files[0])}
                  />
                </label>
              </div>

              {athlete && (
                <Button
                  type="button"
                  onClick={() => setShowInjuryForm(true)}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Input Injury
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Class Period</Label>
                <Select
                  value={formData.class_period}
                  onValueChange={(value) => handleChange('class_period', value)}
                >
                  <SelectTrigger className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold">
                    <SelectValue placeholder="Select period..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-2 border-amber-400/30 text-white">
                    {classPeriods.map(period => (
                      <SelectItem key={period.id} value={period.name} className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">First Name *</Label>
                <Input
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                  className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Last Name *</Label>
                <Input
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                  className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Class/Grade</Label>
                <Input
                  placeholder="Freshman, Junior, 2024, etc."
                  value={formData.class_grade}
                  onChange={(e) => handleChange('class_grade', e.target.value)}
                  className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold"
                />
                <p className="text-xs text-amber-400/60">Enter grade level or graduation year</p>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                >
                  <SelectTrigger className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold">
                    <SelectValue placeholder="Select gender..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-2 border-amber-400/30 text-white">
                    <SelectItem value="Male" className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">Male</SelectItem>
                    <SelectItem value="Female" className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">Female</SelectItem>
                    <SelectItem value="Other" className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Height (inches)</Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={formData.height}
                  disabled
                  className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold opacity-75 cursor-not-allowed"
                />
                <p className="text-xs text-amber-400/60">Auto-updated from Testing Center</p>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Weight (lbs)</Label>
                <Input
                  type="number"
                  placeholder="180"
                  value={formData.weight}
                  disabled
                  className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold opacity-75 cursor-not-allowed"
                />
                <p className="text-xs text-amber-400/60">Auto-updated from Testing Center (Bodyweight metric)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-300 font-bold">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger className="bg-black/50 border-2 border-amber-400/30 text-amber-200 focus:border-amber-400 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-2 border-amber-400/30 text-white">
                    <SelectItem value="active" className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">Active</SelectItem>
                    <SelectItem value="injured" className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">Injured</SelectItem>
                    <SelectItem value="inactive" className="text-white focus:bg-amber-400 focus:text-black hover:bg-amber-400/20 font-semibold">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-amber-300 font-bold">ASSIGNED TEAMS * (Select all that apply)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-black/50 border-2 border-amber-400/30 rounded-lg max-h-48 overflow-y-auto">
                {teams && teams.length > 0 ? (
                  teams.map(team => (
                    <div key={team.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`team-${team.id}`}
                        checked={formData.team_ids?.includes(team.id)}
                        onCheckedChange={() => handleTeamToggle(team.id)}
                        className="border-2 border-amber-400/50 data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400"
                      />
                      <label
                        htmlFor={`team-${team.id}`}
                        className="text-sm text-amber-200 cursor-pointer font-semibold"
                      >
                        {team.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4">
                    <p className="text-amber-400/60 font-semibold">No teams available. Please create a team first in Team Management.</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-amber-400/60 font-semibold">For multisport athletes, select all applicable teams</p>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t-2 border-amber-400/30">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="border-2 border-amber-400/30 text-amber-300 hover:bg-amber-400/10 font-bold"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 hover:from-amber-500 hover:via-yellow-600 hover:to-amber-500 text-black font-black shadow-lg shadow-amber-500/50 border-2 border-amber-300"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {athlete ? 'UPDATE' : 'CREATE'} ATHLETE
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {athlete && (
        <>
          <InjuryHistory athlete={athlete} />
          
          <InjuryForm
            athlete={athlete}
            open={showInjuryForm}
            onClose={() => setShowInjuryForm(false)}
            onSave={() => {
              window.location.reload();
            }}
          />
        </>
      )}
    </motion.div>
  );
}