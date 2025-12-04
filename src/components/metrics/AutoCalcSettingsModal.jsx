import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Calculator, CheckCircle, Info } from "lucide-react";
import { Organization } from "@/entities/all";
import { useTeam } from "@/components/TeamContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function AutoCalcSettingsModal({ open, onOpenChange }) {
  const { selectedOrganization, refreshTeams } = useTeam();
  const [settings, setSettings] = useState({
    enable_lbs_per_in: true,
    enable_mph: true,
    enable_truck_stick: true,
    enable_max_truck_stick: true,
    enable_max_speed: true,
    enable_strength_deficit: true,
    enable_strength_total: true,
    strength_total_uses_deadlift: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (selectedOrganization?.auto_calc_settings) {
      setSettings(selectedOrganization.auto_calc_settings);
    }
    setSuccess(false);
  }, [selectedOrganization, open]);

  const handleToggle = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrganization) return;

    setIsSaving(true);
    try {
      await Organization.update(selectedOrganization.id, {
        auto_calc_settings: settings
      });
      
      setSuccess(true);
      await refreshTeams();
      
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const metrics = [
    {
      key: 'enable_lbs_per_in',
      label: 'lbs/in',
      description: 'Bodyweight ÷ Height (displays in athlete profile)'
    },
    {
      key: 'enable_mph',
      label: 'MPH (Fly 10s)',
      description: 'Speed in MPH: 20.45 ÷ time (displays next to sprint times)'
    },
    {
      key: 'enable_truck_stick',
      label: 'Truck Stick',
      description: '((bodyweight ÷ 2.2) × (mph × 0.447)) for all fly 10s'
    },
    {
      key: 'enable_max_truck_stick',
      label: 'Max Truck Stick',
      description: 'All-time highest truck stick (displays in athlete profile)'
    },
    {
      key: 'enable_max_speed',
      label: 'Max Speed',
      description: 'All-time top speed from fly 10s (displays in athlete profile)'
    },
    {
      key: 'enable_strength_deficit',
      label: 'Strength Deficit',
      description: '100 × ((Seated Jump - Vertical Jump) ÷ Vertical Jump)'
    },
    {
      key: 'enable_strength_total',
      label: 'Strength Total',
      description: 'Squat + Bench + (Deadlift OR Clean)'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Calculator className="w-6 h-6 text-amber-500" />
            Auto-Calculated Metrics
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">
            Enable or disable automatic metric calculations for your organization
          </p>
        </DialogHeader>

        {success && (
          <Alert className="bg-green-950/20 border-green-800">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-green-300 font-semibold">
              Settings saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-950/20 border-blue-800/50 mt-4">
          <Info className="h-5 w-5 text-blue-400" />
          <AlertDescription className="text-blue-300 text-sm">
            These metrics are automatically calculated based on recorded performance data. They won't appear in the metric selection dropdown for manual data entry.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            {metrics.map(metric => (
              <div
                key={metric.key}
                className="flex items-start justify-between p-4 bg-black/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex-1 pr-4">
                  <Label className="text-white font-bold text-base cursor-pointer">
                    {metric.label}
                  </Label>
                  <p className="text-gray-400 text-sm mt-1">{metric.description}</p>
                </div>
                <Switch
                  checked={settings[metric.key]}
                  onCheckedChange={(checked) => handleToggle(metric.key, checked)}
                  className="mt-1"
                />
              </div>
            ))}
          </div>

          {/* Strength Total Configuration */}
          {settings.enable_strength_total && (
            <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded-lg">
              <Label className="text-white font-bold text-base mb-3 block">
                Strength Total Configuration
              </Label>
              <RadioGroup
                value={settings.strength_total_uses_deadlift ? "deadlift" : "clean"}
                onValueChange={(value) => handleToggle('strength_total_uses_deadlift', value === "deadlift")}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="deadlift" id="deadlift" />
                  <Label htmlFor="deadlift" className="text-white cursor-pointer">
                    Use Deadlift 1RM (Squat + Bench + Deadlift)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clean" id="clean" />
                  <Label htmlFor="clean" className="text-white cursor-pointer">
                    Use Clean 1RM (Squat + Bench + Clean)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !selectedOrganization}
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
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}