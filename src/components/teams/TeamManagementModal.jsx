import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Edit, Trash2, Users, Clock, GripVertical } from "lucide-react";
import { Team, Athlete, ClassPeriod } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { useTeam } from "@/components/TeamContext";

export default function TeamManagementModal({ open, onOpenChange, onTeamsUpdated }) {
  const { selectedOrganization } = useTeam();
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [classPeriods, setClassPeriods] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    sport: '',
    season: '',
    coach_name: '',
    coach_email: '',
    description: ''
  });
  const [periodFormData, setPeriodFormData] = useState({
    name: '',
    order: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    if (!selectedOrganization) return;
    
    setIsLoading(true);
    try {
      const [teamsData, athletesData, periodsData] = await Promise.all([
        Team.list(),
        Athlete.list(),
        ClassPeriod.list()
      ]);
      
      // Filter by selected organization - CRITICAL for data isolation
      const filteredTeams = teamsData.filter(t => t.organization_id === selectedOrganization.id);
      
      // Get team IDs to filter athletes
      const teamIds = filteredTeams.map(t => t.id);
      const filteredAthletes = athletesData.filter(a => 
        a.team_ids?.some(tid => teamIds.includes(tid))
      );
      
      // Filter class periods by selected organization
      const filteredPeriods = periodsData.filter(p => p.organization_id === selectedOrganization.id);
      
      setTeams(filteredTeams);
      setAthletes(filteredAthletes);
      setClassPeriods(filteredPeriods.sort((a, b) => a.order - b.order));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrganization) return;
    
    setIsSaving(true);
    try {
      const dataWithOrg = {
        ...teamFormData,
        organization_id: selectedOrganization.id
      };
      
      if (editingTeam) {
        await Team.update(editingTeam.id, dataWithOrg);
      } else {
        await Team.create(dataWithOrg);
        
        if (teamFormData.coach_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: teamFormData.coach_email,
              subject: `You've been invited as a coach for ${teamFormData.name}`,
              body: `Hello ${teamFormData.coach_name || 'Coach'},\n\nYou have been added as the coach for ${teamFormData.name}. Please create an account to access your team's performance data and analytics.\n\nBest regards,\nCentral High Athletics`
            });
          } catch (error) {
            console.error('Error sending coach invitation email:', error);
          }
        }
      }
      
      setShowTeamForm(false);
      setEditingTeam(null);
      setTeamFormData({
        name: '',
        sport: '',
        season: '',
        coach_name: '',
        coach_email: '',
        description: ''
      });
      loadData();
      onTeamsUpdated();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeriodSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrganization) return;
    
    setIsSaving(true);
    try {
      const dataWithOrg = {
        ...periodFormData,
        organization_id: selectedOrganization.id
      };
      
      if (editingPeriod) {
        await ClassPeriod.update(editingPeriod.id, dataWithOrg);
      } else {
        await ClassPeriod.create(dataWithOrg);
      }
      
      setShowPeriodForm(false);
      setEditingPeriod(null);
      setPeriodFormData({
        name: '',
        order: classPeriods.length + 1
      });
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name || '',
      sport: team.sport || '',
      season: team.season || '',
      coach_name: team.coach_name || '',
      coach_email: team.coach_email || '',
      description: team.description || ''
    });
    setShowTeamForm(true);
  };

  const handleEditPeriod = (period) => {
    setEditingPeriod(period);
    setPeriodFormData({
      name: period.name || '',
      order: period.order || 1
    });
    setShowPeriodForm(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!selectedOrganization) return;
    
    // Verify team belongs to current organization before deleting
    const team = teams.find(t => t.id === teamId);
    if (!team || team.organization_id !== selectedOrganization.id) {
      alert('Cannot delete team: It does not belong to this organization.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        await Team.delete(teamId);
        loadData();
        onTeamsUpdated();
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const handleDeletePeriod = async (periodId) => {
    if (!selectedOrganization) return;
    
    // Verify period belongs to current organization before deleting
    const period = classPeriods.find(p => p.id === periodId);
    if (!period || period.organization_id !== selectedOrganization.id) {
      alert('Cannot delete class period: It does not belong to this organization.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this class period? Athletes assigned to this period will need to be reassigned.')) {
      try {
        await ClassPeriod.delete(periodId);
        loadData();
      } catch (error) {
        console.error('Error deleting class period:', error);
      }
    }
  };

  const handleCancelTeam = () => {
    setShowTeamForm(false);
    setEditingTeam(null);
    setTeamFormData({
      name: '',
      sport: '',
      season: '',
      coach_name: '',
      coach_email: '',
      description: ''
    });
  };

  const handleCancelPeriod = () => {
    setShowPeriodForm(false);
    setEditingPeriod(null);
    setPeriodFormData({
      name: '',
      order: classPeriods.length + 1
    });
  };

  const getRosterByClassPeriod = () => {
    const rosterMap = {};
    
    classPeriods.forEach(period => {
      rosterMap[period.name] = athletes.filter(a => a.class_period === period.name);
    });
    
    // Add athletes without a period
    const athletesWithoutPeriod = athletes.filter(a => !a.class_period);
    if (athletesWithoutPeriod.length > 0) {
      rosterMap['Unassigned'] = athletesWithoutPeriod;
    }
    
    return rosterMap;
  };

  const rosterByPeriod = getRosterByClassPeriod();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-950 border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-yellow-400" />
            Team & Class Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="teams" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="teams" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              <Users className="w-4 h-4 mr-2" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="periods" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              <Clock className="w-4 h-4 mr-2" />
              Class Periods
            </TabsTrigger>
            <TabsTrigger value="roster" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              <Users className="w-4 h-4 mr-2" />
              Roster by Period
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6 mt-6">
            {!showTeamForm && (
              <Button
                onClick={() => setShowTeamForm(true)}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Team
              </Button>
            )}

            {showTeamForm && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">
                    {editingTeam ? 'Edit Team' : 'Create New Team'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTeamSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Team Name *</Label>
                        <Input
                          required
                          value={teamFormData.name}
                          onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="Varsity Basketball"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Sport *</Label>
                        <Input
                          required
                          value={teamFormData.sport}
                          onChange={(e) => setTeamFormData({ ...teamFormData, sport: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="Basketball"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Season</Label>
                        <Input
                          value={teamFormData.season}
                          onChange={(e) => setTeamFormData({ ...teamFormData, season: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="2024-2025"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Coach Name</Label>
                        <Input
                          value={teamFormData.coach_name}
                          onChange={(e) => setTeamFormData({ ...teamFormData, coach_name: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="John Smith"
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label className="text-gray-300">Coach Email</Label>
                        <Input
                          type="email"
                          value={teamFormData.coach_email}
                          onChange={(e) => setTeamFormData({ ...teamFormData, coach_email: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="coach@email.com"
                        />
                        <p className="text-xs text-gray-500">
                          Coach will receive an invitation email to create an account
                        </p>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label className="text-gray-300">Description</Label>
                        <Input
                          value={teamFormData.description}
                          onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="Team description..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelTeam}
                        className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                      >
                        {isSaving ? 'Saving...' : (editingTeam ? 'Update Team' : 'Create Team')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Current Teams</h3>
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No teams yet. Create your first team!</div>
              ) : (
                teams.map(team => (
                  <Card key={team.id} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg">{team.name}</h4>
                          <div className="flex gap-2 mt-2">
                            <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                              {team.sport}
                            </Badge>
                            {team.season && (
                              <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {team.season}
                              </Badge>
                            )}
                          </div>
                          {team.coach_name && (
                            <p className="text-gray-400 text-sm mt-2">
                              Coach: {team.coach_name}
                              {team.coach_email && ` (${team.coach_email})`}
                            </p>
                          )}
                          {team.description && (
                            <p className="text-gray-500 text-sm mt-1">{team.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTeam(team)}
                            className="text-gray-400 hover:text-yellow-400"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Class Periods Tab */}
          <TabsContent value="periods" className="space-y-6 mt-6">
            {!showPeriodForm && (
              <Button
                onClick={() => {
                  setPeriodFormData({ name: '', order: classPeriods.length + 1 });
                  setShowPeriodForm(true);
                }}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Class Period
              </Button>
            )}

            {showPeriodForm && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">
                    {editingPeriod ? 'Edit Class Period' : 'Create New Class Period'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePeriodSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Period Name *</Label>
                        <Input
                          required
                          value={periodFormData.name}
                          onChange={(e) => setPeriodFormData({ ...periodFormData, name: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="1st Period"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Display Order *</Label>
                        <Input
                          type="number"
                          required
                          value={periodFormData.order}
                          onChange={(e) => setPeriodFormData({ ...periodFormData, order: parseInt(e.target.value) })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelPeriod}
                        className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                      >
                        {isSaving ? 'Saving...' : (editingPeriod ? 'Update Period' : 'Create Period')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Class Periods</h3>
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">Loading periods...</div>
              ) : classPeriods.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No class periods yet. Create your first period!</div>
              ) : (
                classPeriods.map(period => {
                  const periodAthletes = athletes.filter(a => a.class_period === period.name);
                  return (
                    <Card key={period.id} className="bg-gray-900 border-gray-800">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-500" />
                            <div>
                              <h4 className="text-white font-bold">{period.name}</h4>
                              <p className="text-gray-400 text-sm">Order: {period.order} • {periodAthletes.length} athletes</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPeriod(period)}
                              className="text-gray-400 hover:text-yellow-400"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePeriod(period.id)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Roster by Period Tab */}
          <TabsContent value="roster" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Athletes by Class Period</h3>
              {Object.entries(rosterByPeriod).map(([periodName, periodAthletes]) => (
                <Card key={periodName} className="bg-gray-900 border-gray-800">
                  <CardHeader className="border-b border-gray-800">
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-400" />
                        {periodName}
                      </div>
                      <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                        {periodAthletes.length} athletes
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {periodAthletes.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No athletes in this period</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {periodAthletes.sort((a, b) => a.last_name.localeCompare(b.last_name)).map(athlete => (
                          <div key={athlete.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                            <div>
                              <p className="text-white font-medium">
                                {athlete.first_name} {athlete.last_name}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                                  PIN: {athlete.pin}
                                </Badge>
                                {athlete.jersey_number && (
                                  <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                                    #{athlete.jersey_number}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {athlete.team_ids?.map(teamId => {
                                const team = teams.find(t => t.id === teamId);
                                return team ? (
                                  <Badge key={teamId} className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs">
                                    {team.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}