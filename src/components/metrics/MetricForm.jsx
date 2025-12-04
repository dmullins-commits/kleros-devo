import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Target } from "lucide-react";
import { Team } from "@/entities/all";

export default function MetricForm({ metric, categories, onSubmit, onCancel }) {
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState(metric || {
    name: '',
    unit: '',
    category: '',
    description: '',
    target_higher: true,
    decimal_places: 2,
    is_active: true,
    is_hidden: false,
    team_ids: []
  });

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    // Set default category if not set and categories are available
    if (!formData.category && categories && categories.length > 0) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, formData.category]);

  const loadTeams = async () => {
    const teamsData = await Team.list();
    setTeams(teamsData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamToggle = (teamId) => {
    setFormData(prev => ({
      ...prev,
      team_ids: prev.team_ids?.includes(teamId)
        ? prev.team_ids.filter(id => id !== teamId)
        : [...(prev.team_ids || []), teamId]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="bg-gray-950 border border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-yellow-400" />
              {metric ? 'Edit Metric' : 'Create New Metric'}
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Metric Name *</Label>
                <Input
                  placeholder="40 Yard Dash"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Unit *</Label>
                <Input
                  placeholder="seconds"
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  required
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                  required
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {categories && categories.length > 0 ? (
                      categories.sort((a, b) => a.order - b.order).map(category => (
                        <SelectItem key={category.id} value={category.name} className="text-white">
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-gray-500">
                        No categories available - create one first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Decimal Places</Label>
                <Select
                  value={String(formData.decimal_places ?? 2)}
                  onValueChange={(value) => handleChange('decimal_places', parseInt(value))}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="0" className="text-white">0 (whole numbers)</SelectItem>
                    <SelectItem value="1" className="text-white">1 (e.g., 12.3)</SelectItem>
                    <SelectItem value="2" className="text-white">2 (e.g., 12.34)</SelectItem>
                    <SelectItem value="3" className="text-white">3 (e.g., 12.345)</SelectItem>
                    <SelectItem value="4" className="text-white">4 (e.g., 12.3456)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Controls precision for data entry and display</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Target Direction</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <Switch
                    checked={formData.target_higher}
                    onCheckedChange={(checked) => handleChange('target_higher', checked)}
                  />
                  <span className="text-white text-sm">
                    {formData.target_higher ? 'Higher is Better' : 'Lower is Better'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                placeholder="Describe what this metric measures..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white h-24"
              />
            </div>

            {/* Visibility Section */}
            <div className="space-y-2">
              <Label className="text-gray-300">Visibility</Label>
              <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                <Switch
                  checked={formData.is_hidden}
                  onCheckedChange={(checked) => handleChange('is_hidden', checked)}
                />
                <div className="flex-1">
                  <span className="text-white text-sm font-semibold">
                    {formData.is_hidden ? 'Hidden (Bottom of List)' : 'Visible (Normal Display)'}
                  </span>
                  <p className="text-gray-400 text-xs mt-1">
                    Hidden metrics appear at the bottom of lists but are still tracked
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">Apply to Teams (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={formData.team_ids?.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                      className="border-gray-600 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                    />
                    <label
                      htmlFor={`team-${team.id}`}
                      className="text-sm text-white cursor-pointer"
                    >
                      {team.name}
                    </label>
                  </div>
                ))}
                {teams.length === 0 && (
                  <p className="text-gray-500 text-sm">No teams available</p>
                )}
              </div>
              <p className="text-xs text-gray-500">Leave empty to apply to all teams</p>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!categories || categories.length === 0}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              >
                <Save className="w-4 h-4 mr-2" />
                {metric ? 'Update' : 'Create'} Metric
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}