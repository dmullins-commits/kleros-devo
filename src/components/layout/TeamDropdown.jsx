import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Edit, Plus, School, Building2, Trash2 } from "lucide-react";
import { useTeam } from "@/components/TeamContext";
import { base44 } from "@/api/base44Client";
import { Team, Organization } from "@/entities/all";
import TeamEditModal from "./TeamEditModal";
import OrganizationEditModal from "./OrganizationEditModal";

export default function TeamDropdown() {
  const { 
    organizations, 
    teams, 
    selectedTeamId, 
    selectedOrgId,
    selectedTeam, 
    selectedOrganization,
    selectTeam,
    selectOrganization,
    currentUser,
    refreshTeams
  } = useTeam();
  
  const [showTeamEditModal, setShowTeamEditModal] = useState(false);
  const [showOrgEditModal, setShowOrgEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  const handleEditTeam = (team, e) => {
    e.stopPropagation();
    setEditingTeam(team);
    setShowTeamEditModal(true);
  };

  const handleEditOrg = (org, e) => {
    e.stopPropagation();
    setEditingOrg(org);
    setShowOrgEditModal(true);
  };

  const handleAddTeam = () => {
    setEditingTeam(null);
    setShowTeamEditModal(true);
  };

  const handleAddOrg = () => {
    setEditingOrg(null);
    setShowOrgEditModal(true);
  };

  const handleDeleteTeam = async (team, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete team "${team.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await Team.delete(team.id);
      if (selectedTeamId === team.id) {
        selectTeam('all');
      }
      await refreshTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  const handleDeleteOrg = async (org, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete organization "${org.name}"? This will also affect all teams under it. This action cannot be undone.`)) {
      return;
    }
    try {
      await Organization.delete(org.id);
      if (selectedOrgId === org.id) {
        selectOrganization('all');
        selectTeam('all');
      }
      await refreshTeams();
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organization');
    }
  };

  const getDisplayText = () => {
    if (selectedOrgId !== 'all' && selectedOrganization) {
      return {
        title: selectedOrganization.name,
        subtitle: 'ORGANIZATION'
      };
    } else {
      return {
        title: 'ALL ORGANIZATIONS',
        subtitle: 'ELITE ATHLETICS'
      };
    }
  };

  const displayText = getDisplayText();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto p-0 hover:bg-transparent text-left flex items-center gap-2"
          >
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {displayText.title}
              </h2>
              <p className="text-xs text-amber-400 font-bold tracking-wide">
                {displayText.subtitle}
              </p>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-96 max-h-[600px] overflow-y-auto bg-gray-950 border-gray-800 shadow-2xl"
        >
          {/* All Organizations Option */}
          <DropdownMenuItem
            onClick={() => {
              selectOrganization('all');
              selectTeam('all');
            }}
            className={`cursor-pointer p-3 ${
              selectedOrgId === 'all' && selectedTeamId === 'all'
                ? 'bg-amber-500/10 text-amber-400' 
                : 'text-white hover:bg-gray-800'
            }`}
          >
            <Building2 className="w-4 h-4 mr-3 text-amber-400" />
            <div className="flex-1">
              <div className="font-bold">All Organizations</div>
              <div className="text-xs text-gray-500">View all teams & athletes</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-800" />

          {/* Organizations */}
          {organizations.map(org => {
            const orgTeams = teams.filter(t => t.organization_id === org.id);
            const isOrgSelected = selectedOrgId === org.id;
            
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => {
                  selectOrganization(org.id);
                  selectTeam('all');
                }}
                className={`cursor-pointer px-3 py-2 group ${
                  isOrgSelected ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-gray-800'
                }`}
              >
                <Building2 className={`w-4 h-4 mr-3 ${
                  isOrgSelected ? 'text-amber-400' : 'text-gray-500'
                }`} />
                <div className="flex-1">
                  <div className="font-bold">{org.name}</div>
                  <div className="text-xs text-gray-500">
                    {orgTeams.length} team{orgTeams.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleEditOrg(org, e)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-gray-700 h-7 w-7"
                  >
                    <Edit className="w-3 h-3 text-gray-400" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteOrg(org, e)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-red-600 h-7 w-7"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="bg-gray-800" />

          {/* Add Actions */}
          <div className="p-2">
            <Button
              onClick={handleAddOrg}
              className="w-full justify-start bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 font-bold border border-amber-600/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Organization
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <TeamEditModal
        open={showTeamEditModal}
        onOpenChange={setShowTeamEditModal}
        team={editingTeam}
      />

      <OrganizationEditModal
        open={showOrgEditModal}
        onOpenChange={setShowOrgEditModal}
        organization={editingOrg}
      />
    </>
  );
}