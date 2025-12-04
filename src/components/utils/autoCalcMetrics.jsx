// Auto-calculated metrics utility functions

export const calculateAllAutoMetrics = async (athleteId, allRecords, metrics, autoCalcSettings) => {
  const calculatedMetrics = {};
  
  // Get athlete's records
  const athleteRecords = allRecords.filter(r => {
    const aId = r.athlete_id || r.data?.athlete_id;
    return aId === athleteId;
  });
  
  // Helper to get latest value for a metric by name
  const getLatestValue = (metricName) => {
    const metric = metrics.find(m => {
      const name = m.name || m.data?.name;
      return name?.toLowerCase() === metricName.toLowerCase();
    });
    if (!metric) return null;
    
    const metricRecords = athleteRecords.filter(r => {
      const mId = r.metric_id || r.data?.metric_id;
      return mId === metric.id;
    }).sort((a, b) => {
      const dateA = a.recorded_date || a.data?.recorded_date;
      const dateB = b.recorded_date || b.data?.recorded_date;
      return new Date(dateB) - new Date(dateA);
    });
    
    if (metricRecords.length === 0) return null;
    return metricRecords[0].value ?? metricRecords[0].data?.value;
  };
  
  // Helper to get max value for a metric by name
  const getMaxValue = (metricName) => {
    const metric = metrics.find(m => {
      const name = m.name || m.data?.name;
      return name?.toLowerCase() === metricName.toLowerCase();
    });
    if (!metric) return null;
    
    const values = athleteRecords
      .filter(r => {
        const mId = r.metric_id || r.data?.metric_id;
        return mId === metric.id;
      })
      .map(r => r.value ?? r.data?.value)
      .filter(v => v != null);
    
    if (values.length === 0) return null;
    return Math.max(...values);
  };
  
  // Helper to get min value for a metric by name
  const getMinValue = (metricName) => {
    const metric = metrics.find(m => {
      const name = m.name || m.data?.name;
      return name?.toLowerCase() === metricName.toLowerCase();
    });
    if (!metric) return null;
    
    const values = athleteRecords
      .filter(r => {
        const mId = r.metric_id || r.data?.metric_id;
        return mId === metric.id;
      })
      .map(r => r.value ?? r.data?.value)
      .filter(v => v != null);
    
    if (values.length === 0) return null;
    return Math.min(...values);
  };

  // Calculate lbs_per_in (bodyweight / height)
  if (autoCalcSettings.enable_lbs_per_in) {
    const weight = getLatestValue('bodyweight') || getLatestValue('weight');
    const height = getLatestValue('height');
    if (weight && height && height > 0) {
      calculatedMetrics.lbs_per_in = parseFloat((weight / height).toFixed(2));
    }
  }
  
  // Calculate max_truck_stick
  if (autoCalcSettings.enable_max_truck_stick) {
    const maxTruckStick = getMaxValue('truck stick');
    if (maxTruckStick != null) {
      calculatedMetrics.max_truck_stick = maxTruckStick;
    }
  }
  
  // Calculate max_speed (from fly 10 times, lower is better for time)
  if (autoCalcSettings.enable_max_speed) {
    const minFly10 = getMinValue('fly 10');
    if (minFly10 != null && minFly10 > 0) {
      // Convert 10 yard time to mph: (10 yards * 3 feet/yard) / time in seconds * (3600 seconds/hour) / 5280 feet/mile
      const mph = (10 * 3 / minFly10) * (3600 / 5280);
      calculatedMetrics.max_speed = parseFloat(mph.toFixed(2));
    }
  }
  
  // Calculate strength_deficit (vertical - seated jump difference)
  if (autoCalcSettings.enable_strength_deficit) {
    const vertical = getLatestValue('vertical jump') || getLatestValue('vertical');
    const seated = getLatestValue('seated jump') || getLatestValue('seated vertical');
    if (vertical != null && seated != null) {
      calculatedMetrics.strength_deficit = parseFloat((vertical - seated).toFixed(2));
    }
  }
  
  // Calculate strength_total (sum of major lifts)
  if (autoCalcSettings.enable_strength_total) {
    const squat = getMaxValue('squat') || getMaxValue('back squat') || 0;
    const bench = getMaxValue('bench') || getMaxValue('bench press') || 0;
    const thirdLift = autoCalcSettings.strength_total_uses_deadlift
      ? (getMaxValue('deadlift') || 0)
      : (getMaxValue('clean') || getMaxValue('power clean') || 0);
    
    if (squat || bench || thirdLift) {
      calculatedMetrics.strength_total = squat + bench + thirdLift;
    }
  }
  
  return calculatedMetrics;
};