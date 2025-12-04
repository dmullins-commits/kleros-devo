import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, AlertCircle } from "lucide-react";
import { Injury } from "@/entities/all";

export default function InjuryForm({ athlete, open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    athlete_id: athlete?.id || '',
    date_of_injury: '',
    injury_location: '',
    injury_name: '',
    expected_time_missed: '',
    notes: '',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const calculateReturnDate = (injuryDate, timeMissed) => {
    if (!injuryDate || !timeMissed) return null;

    const date = new Date(injuryDate);
    const weeksMap = {
      '1 week': 1,
      '2 weeks': 2,
      '3 weeks': 3,
      '4 weeks': 4,
      '6 weeks': 6,
      '8 weeks': 8,
      '3 months': 12,
      '6+ months': 24
    };

    const weeks = weeksMap[timeMissed];
    date.setDate(date.getDate() + (weeks * 7));
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const returnDate = calculateReturnDate(formData.date_of_injury, formData.expected_time_missed);
      const injuryData = {
        ...formData,
        expected_return_date: returnDate
      };
      
      await Injury.create(injuryData);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving injury:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-red-400/30 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl text-red-400">
            <AlertCircle className="w-7 h-7" />
            Input Injury - {athlete?.first_name} {athlete?.last_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label className="text-gray-300 font-bold">Date of Injury *</Label>
            <Input
              type="date"
              value={formData.date_of_injury}
              onChange={(e) => handleChange('date_of_injury', e.target.value)}
              required
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 font-bold">Injury Happened: *</Label>
            <Select
              value={formData.injury_location}
              onValueChange={(value) => handleChange('injury_location', value)}
              required
            >
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="at practice" className="text-white">at practice</SelectItem>
                <SelectItem value="in-game" className="text-white">in-game</SelectItem>
                <SelectItem value="during training" className="text-white">during training</SelectItem>
                <SelectItem value="other" className="text-white">other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 font-bold">Enter Injury Name: *</Label>
            <Input
              placeholder="e.g., Sprained Ankle, ACL Tear, etc."
              value={formData.injury_name}
              onChange={(e) => handleChange('injury_name', e.target.value)}
              required
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 font-bold">Expected Time Missed: *</Label>
            <Select
              value={formData.expected_time_missed}
              onValueChange={(value) => handleChange('expected_time_missed', value)}
              required
            >
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select duration..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="1 week" className="text-white">1 week</SelectItem>
                <SelectItem value="2 weeks" className="text-white">2 weeks</SelectItem>
                <SelectItem value="3 weeks" className="text-white">3 weeks</SelectItem>
                <SelectItem value="4 weeks" className="text-white">4 weeks</SelectItem>
                <SelectItem value="6 weeks" className="text-white">6 weeks</SelectItem>
                <SelectItem value="8 weeks" className="text-white">8 weeks</SelectItem>
                <SelectItem value="3 months" className="text-white">3 months</SelectItem>
                <SelectItem value="6+ months" className="text-white">6+ months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 font-bold">Notes:</Label>
            <Textarea
              placeholder="Additional details about the injury..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white min-h-24"
            />
          </div>

          {formData.date_of_injury && formData.expected_time_missed && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                <span className="font-bold text-red-400">Expected Return Date:</span>{' '}
                {new Date(calculateReturnDate(formData.date_of_injury, formData.expected_time_missed)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Injury
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}