import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, Upload, Loader2 } from "lucide-react";
import { Organization } from "@/entities/all";
import { base44 } from "@/api/base44Client";

export default function OnboardingModal({ open, onComplete }) {
  const [organizationName, setOrganizationName] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organizationName.trim()) return;

    setIsCreating(true);
    try {
      let logoUrl = null;
      
      if (logo) {
        setIsUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logo });
        logoUrl = file_url;
        setIsUploading(false);
      }

      const newOrg = await Organization.create({
        name: organizationName,
        logo: logoUrl,
        subscription_status: 'active',
        enabled_features: {
          dashboard: true,
          athletes: true,
          metrics: true,
          progress: true,
          workouts: false,
          schedule: false,
          upload: true,
          migration: false
        }
      });

      onComplete(newOrg);
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization. Please try again.');
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-amber-400/30 text-white" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-amber-200 flex items-center gap-3">
            <School className="w-6 h-6 text-amber-400" />
            Welcome! Setup Your Organization
          </DialogTitle>
          <DialogDescription className="text-gray-400 font-semibold">
            Let's get started by creating your organization profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Organization Name *</Label>
            <Input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g., Central High School"
              className="bg-gray-900 border-amber-400/30 text-white placeholder:text-gray-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Organization Logo (Optional)</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="w-20 h-20 rounded-lg border-2 border-amber-400/30 overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-amber-400/30 flex items-center justify-center bg-gray-900/50">
                  <School className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-amber-400/30 rounded-lg transition-colors">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">Upload Logo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!organizationName.trim() || isCreating || isUploading}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-black py-6 text-lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading Logo...
              </>
            ) : isCreating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Organization...
              </>
            ) : (
              'Create Organization & Get Started'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}