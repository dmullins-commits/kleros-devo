import React, { useState } from 'react';

import AthleteSelector from "./AthleteSelector";
import AthleteMetricsChart from "./AthleteMetricsChart";

export default function AthletePerformance({ athletes, metrics, records, isLoading }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAthletes = athletes.filter(athlete =>
    `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AthleteSelector
            athletes={filteredAthletes}
            selectedAthlete={selectedAthlete}
            onSelect={setSelectedAthlete}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isLoading={isLoading}
          />
        </div>
        
        <div className="lg:col-span-2">
          <AthleteMetricsChart
            athlete={selectedAthlete}
            metrics={metrics}
            records={records}
          />
        </div>
      </div>
    </div>
  );
}