import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Organization } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, Plus, Shield, Building2, Pencil, Search, 
  Crown, UserCog, Briefcase, User as UserIcon, Database 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = [
  { value: "Admin", label: "Admin", icon: Crown, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "Partner", label: "Partner", icon: Briefcase, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "Coach", label: "Coach", icon: UserCog, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "User", label: "User", icon: UserIcon, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, orgsData, me] = await Promise.all([
        base44.entities.User.list(),
        Organization.list(),
        base44.auth.me()
      ]);
      
      const normalizedUsers = usersData.map(u => ({
        id: u.id,
        ...u.data,
        ...u
      }));
      
      const normalizedOrgs = orgsData.map(o => ({
        id: o.id,
        ...o.data,
        ...o,
        name: o.data?.name || o.name
      }));
      
      setUsers(normalizedUsers);
      setOrganizations(normalizedOrgs);
      setCurrentUser(me);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      user_role: user.user_role || "User",
      organization_ids: user.organization_ids || (user.organization_id ? [user.organization_id] : [])
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      await base44.entities.User.update(editingUser.id, {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        user_role: editingUser.user_role,
        organization_id: editingUser.organization_ids?.[0] || editingUser.organization_id,
        organization_ids: editingUser.organization_ids
      });
      
      setShowEditModal(false);
      setEditingUser(null);
      
      // If updating current user's organizations or role, reload page to refresh context
      if (editingUser.id === currentUser?.id) {
        window.location.reload();
      } else {
        loadData();
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const toggleOrganization = (orgId) => {
    if (!editingUser) return;
    
    const currentOrgs = editingUser.organization_ids || [];
    const newOrgs = currentOrgs.includes(orgId)
      ? currentOrgs.filter(id => id !== orgId)
      : [...currentOrgs, orgId];
    
    setEditingUser({ ...editingUser, organization_ids: newOrgs });
  };

  const handleBackupToGoogleSheets = async () => {
    setIsBackingUp(true);
    try {
      const response = await base44.functions.invoke('backupToGoogleDrive');
      if (response.success) {
        alert(`Backup completed successfully!\n\nTotal Records: ${response.stats.total_records}\nSpreadsheet: ${response.spreadsheet.title}\n\nURL: ${response.spreadsheet.url}`);
      } else {
        alert(`Backup failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Backup error:', error);
      alert(`Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadge = (role) => {
    const roleConfig = ROLES.find(r => r.value === role) || ROLES[3];
    const RoleIcon = roleConfig.icon;
    return (
      <Badge className={`${roleConfig.color} border font-semibold`}>
        <RoleIcon className="w-3 h-3 mr-1" />
        {roleConfig.label}
      </Badge>
    );
  };

  const getOrgNames = (user) => {
    const orgIds = user.organization_ids || (user.organization_id ? [user.organization_id] : []);
    if (orgIds.length === 0) return "No organizations";
    
    const names = orgIds
      .map(id => organizations.find(o => o.id === id)?.name)
      .filter(Boolean);
    
    return names.length > 0 ? names.join(", ") : "No organizations";
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-gray-950 to-gray-900 border border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-yellow-600/5" />
          <div className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  Manage Users
                </h1>
                <p className="text-gray-400 font-medium">
                  Manage user access, roles, and organization assignments
                </p>
                <Badge className="mt-2 bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  {users.length} users
                </Badge>
              </div>
              <Button
                onClick={handleBackupToGoogleSheets}
                disabled={isBackingUp}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg"
              >
                <Database className="w-4 h-4 mr-2" />
                {isBackingUp ? 'Backing up...' : 'Backup to Google Sheets'}
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-950 border-gray-800 text-white"
            />
          </div>
        </div>

        {/* Users List */}
        <Card className="bg-gray-950 border border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-400" />
              All Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-gray-800" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-black font-black text-lg">
                          {user.first_name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                        <p className="text-white font-bold">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim() 
                            : "Unnamed User"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                      <div className="flex flex-col items-start md:items-end gap-1">
                        {getRoleBadge(user.user_role)}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getOrgNames(user)}
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-gray-950 border border-gray-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Edit User Access
              </DialogTitle>
            </DialogHeader>
            
            {editingUser && (
              <div className="space-y-6 py-4">
                <div>
                  <p className="text-gray-400 text-sm">{editingUser.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">First Name</Label>
                    <Input
                      value={editingUser.first_name || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                      placeholder="First name"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Last Name</Label>
                    <Input
                      value={editingUser.last_name || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                      placeholder="Last name"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Role</Label>
                  <Select 
                    value={editingUser.user_role} 
                    onValueChange={(value) => setEditingUser({ ...editingUser, user_role: value })}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="text-white">
                          <div className="flex items-center gap-2">
                            <role.icon className="w-4 h-4" />
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Organization Access</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {organizations.length === 0 ? (
                      <p className="text-gray-500 text-sm">No organizations available</p>
                    ) : (
                      organizations.map((org) => (
                        <label 
                          key={org.id} 
                          className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                        >
                          <Checkbox
                            checked={editingUser.organization_ids?.includes(org.id)}
                            onCheckedChange={() => toggleOrganization(org.id)}
                            className="border-gray-600"
                          />
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-400" />
                            <span className="text-white">{org.name}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="border-gray-700 text-black bg-white hover:bg-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-bold"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}