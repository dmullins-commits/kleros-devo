import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Users } from "lucide-react";

export default function AthleteFilters({ teams, filters, setFilters }) {
  const handleFilterChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <Select value={filters.team} onValueChange={(value) => handleFilterChange("team", value)}>
          <SelectTrigger className="bg-gray-950 border-gray-800 text-white focus:border-yellow-400">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            <SelectItem value="all" className="text-white hover:bg-gray-800">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id} className="text-white hover:bg-gray-800">
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500" />
        <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
          <SelectTrigger className="bg-gray-950 border-gray-800 text-white focus:border-yellow-400">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            <SelectItem value="all" className="text-white hover:bg-gray-800">All Status</SelectItem>
            <SelectItem value="active" className="text-white hover:bg-gray-800">Active</SelectItem>
            <SelectItem value="injured" className="text-white hover:bg-gray-800">Injured</SelectItem>
            <SelectItem value="inactive" className="text-white hover:bg-gray-800">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}