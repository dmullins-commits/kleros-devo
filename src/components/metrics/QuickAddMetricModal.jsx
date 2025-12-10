import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Metric, MetricCategory } from "@/entities/all";
import { Save, Plus } from "lucide-react";
import { useTeam } from "@/components/TeamContext";

export default function QuickAddMetricModal({ open, onClose, onMetricAdded, categories }) {
  const { selectedOrganization } = useTeam();
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    category: '',
    decimal_places: 2,
    target_higher: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const newMetric = await Metric.create({
        ...formData,
        organization_id: selectedOrganization?.id
      });

      // Normalize the response
      const normalized = {
        id: newMetric.id,
        name: newMetric.data?.name || newMetric.name,
        unit: newMetric.data?.unit || newMetric.unit,
        category: newMetric.data?.category || newMetric.category,
        target_higher: newMetric.data?.target_higher ?? newMetric.target_higher ?? true,
        decimal_places: newMetric.data?.decimal_places ?? newMetric.decimal_places ?? 2,
        is_auto_calculated: false,
        is_hidden: false
      };

      if (onMetricAdded) {
        onMetricAdded(normalized);
      }

      // Reset form
      setFormData({
        name: '',
        unit: '',
        category: '',
        decimal_places: 2,
        target_higher: true
      });

      onClose();
    } catch (error) {
      console.error('Error creating metric:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-2 border-amber-400/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400 font-black text-xl">
            <Plus className="w-6 h-6" />
            Quick Add Metric
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Metric Name *</Label>
            <Input
              placeholder="e.g., Squat"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="bg-black/50 border-amber-400/30 text-white focus:border-amber-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Unit *</Label>
            <Input
              placeholder="e.g., lbs, seconds, reps"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              required
              className="bg-black/50 border-amber-400/30 text-white focus:border-amber-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              required
            >
              <SelectTrigger className="bg-black/50 border-amber-400/30 text-white focus:border-amber-400">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-amber-400/30">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name} className="text-white hover:bg-amber-400/20">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Decimal Places</Label>
            <Select 
              value={String(formData.decimal_places)} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, decimal_places: parseInt(value) }))}
            >
              <SelectTrigger className="bg-black/50 border-amber-400/30 text-white focus:border-amber-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-amber-400/30">
                <SelectItem value="0" className="text-white hover:bg-amber-400/20">0 (Whole numbers)</SelectItem>
                <SelectItem value="1" className="text-white hover:bg-amber-400/20">1 (0.0)</SelectItem>
                <SelectItem value="2" className="text-white hover:bg-amber-400/20">2 (0.00)</SelectItem>
                <SelectItem value="3" className="text-white hover:bg-amber-400/20">3 (0.000)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-amber-300 font-bold">Better Performance</Label>
            <Select 
              value={String(formData.target_higher)} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_higher: value === 'true' }))}
            >
              <SelectTrigger className="bg-black/50 border-amber-400/30 text-white focus:border-amber-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-amber-400/30">
                <SelectItem value="true" className="text-white hover:bg-amber-400/20">Higher is Better</SelectItem>
                <SelectItem value="false" className="text-white hover:bg-amber-400/20">Lower is Better</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-black"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Metric
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}