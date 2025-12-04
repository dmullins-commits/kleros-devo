import React, { createContext, useContext, useState, useEffect } from 'react';
import { Team, Organization } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import OnboardingModal from "@/components/onboarding/OnboardingModal";

const TeamContext = createContext();

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      setIsLoading(true);
      const user = await base44.auth.me();
      setCurrentUser(user);

      // If user has an organization_id assigned, they can only access that org
      if (user.organization_id) {
        const userOrgData = await Organization.filter({ id: user.organization_id });
        const normalizedUserOrgs = userOrgData.map(o => {
          if (o.data && typeof o.data === 'object') {
            return { id: o.id, ...o.data };
          }
          return { id: o.id, name: o.name, ...o };
        });
        setOrganizations(normalizedUserOrgs);
        setSelectedOrgId(user.organization_id);
        localStorage.setItem('selectedOrgId', user.organization_id);

        // Load only teams for this organization
        const teamsData = await Team.filter({ organization_id: user.organization_id });
        const normalizedTeams = teamsData.map(t => {
          if (t.data && typeof t.data === 'object') {
            return { id: t.id, ...t.data };
          }
          return { id: t.id, name: t.name, ...t };
        });
        setTeams(normalizedTeams);
        
        const savedTeamId = localStorage.getItem('selectedTeamId');
        if (savedTeamId && normalizedTeams.find(t => t.id === savedTeamId)) {
          setSelectedTeamId(savedTeamId);
        } else if (normalizedTeams.length > 0) {
          setSelectedTeamId('all');
        }
      } else {
        // For all users (admin or not without org_id), load all data
        const orgsData = await Organization.list();
        const normalizedOrgs = orgsData.map(o => {
          // Handle both flat and nested data structures
          if (o.data && typeof o.data === 'object') {
            return { id: o.id, ...o.data };
          }
          return { id: o.id, name: o.name, ...o };
        });
        setOrganizations(normalizedOrgs);

        if (normalizedOrgs.length === 0 && user.role === 'admin') {
          setShowOnboarding(true);
          setIsLoading(false);
          return;
        }

        const teamsData = await Team.list();
        const normalizedTeams = teamsData.map(t => {
          // Handle both flat and nested data structures
          if (t.data && typeof t.data === 'object') {
            return { id: t.id, ...t.data };
          }
          return { id: t.id, name: t.name, ...t };
        });
        setTeams(normalizedTeams);
        
        const savedTeamId = localStorage.getItem('selectedTeamId');
        const savedOrgId = localStorage.getItem('selectedOrgId');
        
        if (savedOrgId && normalizedOrgs.find(o => o.id === savedOrgId)) {
          setSelectedOrgId(savedOrgId);
        } else if (normalizedOrgs.length > 0) {
          setSelectedOrgId('all');
        }
        
        if (savedTeamId && normalizedTeams.find(t => t.id === savedTeamId)) {
          setSelectedTeamId(savedTeamId);
        } else if (normalizedTeams.length > 0) {
          setSelectedTeamId('all');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (newOrg) => {
    setShowOnboarding(false);
    setOrganizations([newOrg]);
    setSelectedOrgId(newOrg.id);
    localStorage.setItem('selectedOrgId', newOrg.id);
    
    // Update user with organization_id
    await base44.auth.updateMe({ organization_id: newOrg.id });
    
    // Reload teams after organization is created
    const teamsData = await Team.filter({ organization_id: newOrg.id });
    const normalizedTeams = teamsData.map(t => ({ id: t.id, ...t.data }));
    setTeams(normalizedTeams);
  };

  const selectTeam = (teamId) => {
    setSelectedTeamId(teamId);
    localStorage.setItem('selectedTeamId', teamId);
    
    // If a specific team is selected, also set the org
    if (teamId !== 'all') {
      const team = teams.find(t => t.id === teamId);
      if (team?.organization_id) {
        setSelectedOrgId(team.organization_id);
        localStorage.setItem('selectedOrgId', team.organization_id);
      }
    }
  };

  const selectOrganization = (orgId) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('selectedOrgId', orgId);
    
    // Reset team selection when org changes
    setSelectedTeamId('all');
    localStorage.setItem('selectedTeamId', 'all');
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedOrganization = organizations.find(o => o.id === selectedOrgId);
  
  // Get teams filtered by selected organization
  const filteredTeams = selectedOrgId === 'all' 
    ? teams 
    : teams.filter(t => (t.organization_id || t.data?.organization_id) === selectedOrgId);

  const value = {
    teams,
    organizations,
    selectedTeamId,
    selectedOrgId,
    selectedTeam,
    selectedOrganization,
    filteredTeams,
    selectTeam,
    selectOrganization,
    isLoading,
    currentUser,
    refreshTeams: checkUserAndLoadData
  };

  if (showOnboarding) {
    return (
      <TeamContext.Provider value={value}>
        <OnboardingModal 
          open={showOnboarding} 
          onComplete={handleOnboardingComplete}
        />
      </TeamContext.Provider>
    );
  }

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};