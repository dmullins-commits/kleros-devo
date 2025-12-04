import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { Athlete } from "@/entities/all";

export default function QuickAddAthleteModal({ 
  open, 
  onClose, 
  onAthleteAdded,
  prefilledTeamId,
  prefilledClassPeriod
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const athleteData = {
        first_name: firstName,
        last_name: lastName,
        gender: gender,
        team_ids: prefilledTeamId ? [prefilledTeamId] : [],
        class_period: prefilledClassPeriod !== 'all' ? prefilledClassPeriod : undefined,
        status: 'active'
      };

      const newAthlete = await Athlete.create(athleteData);
      
      setFirstName('');
      setLastName('');
      setGender('Male');
      
      onAthleteAdded(newAthlete);
      onClose();
    } catch (error) {
      console.error('Error creating athlete:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-400">
            <UserPlus className="w-5 h-5" />
            Quick Add Athlete
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="text-gray-300">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="Male" className="text-white">Male</SelectItem>
                <SelectItem value="Female" className="text-white">Female</SelectItem>
                <SelectItem value="Other" className="text-white">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prefilledTeamId && (
            <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                Team will be automatically assigned to the testing group
              </p>
            </div>
          )}

          {prefilledClassPeriod && prefilledClassPeriod !== 'all' && (
            <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                Class Period: <span className="font-bold">{prefilledClassPeriod}</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Athlete
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}