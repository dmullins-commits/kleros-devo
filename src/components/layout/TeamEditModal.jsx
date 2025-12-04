import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, School, Image as ImageIcon, CheckCircle } from "lucide-react";
import { Team } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { useTeam } from "@/components/TeamContext";

export default function TeamEditModal({ open, onOpenChange, team }) {
  const { refreshTeams, organizations, selectedOrgId } = useTeam();
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    logo: '',
    organization_id: ''
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        sport: team.sport || '',
        logo: team.logo || '',
        organization_id: team.organization_id || ''
      });
    } else {
      setFormData({
        name: '',
        sport: '',
        logo: '',
        organization_id: selectedOrgId !== 'all' ? selectedOrgId : ''
      });
    }
    setSuccess(false);
  }, [team, open, selectedOrgId]);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo: file_url }));
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (team) {
        await Team.update(team.id, formData);
      } else {
        await Team.create(formData);
      }
      
      setSuccess(true);
      await refreshTeams();
      
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving team:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <School className="w-6 h-6 text-amber-500" />
            {team ? 'Edit Team' : 'Create New Team'}
          </DialogTitle>
        </DialogHeader>

        {success && (
          <Alert className="bg-green-950/20 border-green-800">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">
              Team {team ? 'updated' : 'created'} successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Logo Upload */}
          <div className="flex justify-center">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-amber-500 shadow-lg">
                <AvatarImage src={formData.logo} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600">
                  <School className="w-12 h-12 text-black" />
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                {uploadingLogo ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-amber-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          {/* Organization Select */}
          <div className="space-y-2">
            <Label className="text-white font-bold">Organization *</Label>
            <Select
              value={formData.organization_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
              required
            >
              <SelectTrigger className="bg-black/50 border-gray-700 text-white focus:border-amber-500">
                <SelectValue placeholder="Select organization..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-700">
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id} className="text-white">
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Choose which organization this team belongs to</p>
          </div>

          {/* Team Name */}
          <div className="space-y-2">
            <Label className="text-white font-bold">Team Name *</Label>
            <Input
              placeholder="e.g., Varsity Basketball"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="bg-black/50 border-gray-700 text-white focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || uploadingLogo}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {team ? 'Update' : 'Create'} Team
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}