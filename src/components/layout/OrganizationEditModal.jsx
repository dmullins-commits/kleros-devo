import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, X, Building2, Image as ImageIcon, CheckCircle, Settings } from "lucide-react";
import { Organization } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { useTeam } from "@/components/TeamContext";

export default function OrganizationEditModal({ open, onOpenChange, organization }) {
  const { refreshTeams } = useTeam();
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    address: '',
    subscription_status: 'active',
    notes: '',
    enabled_features: {
      dashboard: true,
      athletes: true,
      metrics: true,
      progress: true,
      workouts: true,
      schedule: true,
      upload: true,
      migration: true
    }
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        logo: organization.logo || '',
        contact_name: organization.contact_name || '',
        contact_email: organization.contact_email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        subscription_status: organization.subscription_status || 'active',
        notes: organization.notes || '',
        enabled_features: organization.enabled_features || {
          dashboard: true,
          athletes: true,
          metrics: true,
          progress: true,
          workouts: true,
          schedule: true,
          upload: true,
          migration: true
        }
      });
    } else {
      setFormData({
        name: '',
        logo: '',
        contact_name: '',
        contact_email: '',
        phone: '',
        address: '',
        subscription_status: 'active',
        notes: '',
        enabled_features: {
          dashboard: true,
          athletes: true,
          metrics: true,
          progress: true,
          workouts: true,
          schedule: true,
          upload: true,
          migration: true
        }
      });
    }
    setSuccess(false);
  }, [organization, open]);

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

  const handleFeatureToggle = (feature, value) => {
    setFormData(prev => ({
      ...prev,
      enabled_features: {
        ...prev.enabled_features,
        [feature]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (organization) {
        await Organization.update(organization.id, formData);
      } else {
        await Organization.create(formData);
      }
      
      setSuccess(true);
      await refreshTeams();
      
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving organization:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const features = [
    { key: 'dashboard', label: 'Command Center', description: 'Dashboard and overview' },
    { key: 'athletes', label: 'Manage Roster', description: 'Athlete management' },
    { key: 'metrics', label: 'Data Center', description: 'Metrics and performance data' },
    { key: 'progress', label: 'Progress Tracking', description: 'Performance trends and reports' },
    { key: 'workouts', label: 'Workout Builder', description: 'Workout programming' },
    { key: 'schedule', label: 'Schedule', description: 'Team scheduling' },
    { key: 'upload', label: 'Data Upload', description: 'CSV import functionality' },
    { key: 'migration', label: 'Data Migration', description: 'Move data between teams' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-6 h-6 text-amber-500" />
            {organization ? 'Edit Organization' : 'Add New Customer Organization'}
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">
            {organization ? 'Update organization details and features' : 'Create a new customer organization and configure their features'}
          </p>
        </DialogHeader>

        {success && (
          <Alert className="bg-green-950/20 border-green-800">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">
              Organization {organization ? 'updated' : 'created'} successfully!
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
                  <Building2 className="w-12 h-12 text-black" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization Name */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white font-bold">Organization Name *</Label>
              <Input
                placeholder="e.g., Central High School"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="bg-black/50 border-gray-700 text-white focus:border-amber-500"
              />
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label className="text-white font-bold">Contact Name</Label>
              <Input
                placeholder="Primary contact person"
                value={formData.contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                className="bg-black/50 border-gray-700 text-white focus:border-amber-500"
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label className="text-white font-bold">Contact Email</Label>
              <Input
                type="email"
                placeholder="contact@school.edu"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                className="bg-black/50 border-gray-700 text-white focus:border-amber-500"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-white font-bold">Phone</Label>
              <Input
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-black/50 border-gray-700 text-white focus:border-amber-500"
              />
            </div>

            {/* Subscription Status */}
            <div className="space-y-2">
              <Label className="text-white font-bold">Subscription Status</Label>
              <Select
                value={formData.subscription_status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_status: value }))}
              >
                <SelectTrigger className="bg-black/50 border-gray-700 text-white focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-gray-700">
                  <SelectItem value="active" className="text-green-400">Active</SelectItem>
                  <SelectItem value="trial" className="text-yellow-400">Trial</SelectItem>
                  <SelectItem value="inactive" className="text-gray-400">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white font-bold">Address</Label>
              <Input
                placeholder="Street address, City, State ZIP"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="bg-black/50 border-gray-700 text-white focus:border-amber-500"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white font-bold">Internal Notes</Label>
              <Textarea
                placeholder="Additional notes about this organization..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-black/50 border-gray-700 text-white focus:border-amber-500 min-h-[80px]"
              />
            </div>
          </div>

          {/* Feature Flags */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <Label className="text-white font-bold text-lg">Enabled Features</Label>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Control which sections of the platform are available for this organization
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map(feature => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-4 bg-black/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <Label className="text-white font-semibold cursor-pointer">
                      {feature.label}
                    </Label>
                    <p className="text-gray-400 text-xs mt-1">{feature.description}</p>
                  </div>
                  <Switch
                    checked={formData.enabled_features?.[feature.key]}
                    onCheckedChange={(checked) => handleFeatureToggle(feature.key, checked)}
                    className="ml-4"
                  />
                </div>
              ))}
            </div>
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
                  {organization ? 'Update' : 'Create'} Organization
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}