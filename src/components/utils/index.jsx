// Utility functions
export { withRetry, staggeredApiCalls } from './apiHelpers';

export const calculateAllAutoMetrics = async (athleteId, allRecords, metrics, autoCalcSettings) => {
  if (!autoCalcSettings) return {};

  const athleteRecords = allRecords.filter(r => r.athlete_id === athleteId);
  const calculatedMetrics = {};

  const findMetric = (name) => metrics.find(m => m.name === name);
  
  const getLatestValue = (metricName) => {
    const metric = findMetric(metricName);
    if (!metric) return null;
    
    const records = athleteRecords.filter(r => r.metric_id === metric.id);
    if (records.length === 0) return null;
    
    const sorted = records.sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
    return sorted[0].value;
  };

  const getMaxValue = (metricName) => {
    const metric = findMetric(metricName);
    if (!metric) return null;
    
    const records = athleteRecords.filter(r => r.metric_id === metric.id);
    if (records.length === 0) return null;
    
    return Math.max(...records.map(r => r.value));
  };

  if (autoCalcSettings.enable_mph) {
    const fly10 = getLatestValue('Fly 10');
    if (fly10) {
      calculatedMetrics.mph = (10 / fly10) * 2.23694;
    }
  }

  if (autoCalcSettings.enable_truck_stick) {
    const broad = getLatestValue('Broad Jump');
    const vertical = getLatestValue('Vertical Jump');
    if (broad && vertical) {
      calculatedMetrics.truck_stick = (broad * vertical) / 1000;
    }
  }

  if (autoCalcSettings.enable_max_truck_stick) {
    const maxBroad = getMaxValue('Broad Jump');
    const maxVertical = getMaxValue('Vertical Jump');
    if (maxBroad && maxVertical) {
      calculatedMetrics.max_truck_stick = (maxBroad * maxVertical) / 1000;
    }
  }

  if (autoCalcSettings.enable_max_speed) {
    const maxFly10 = getMaxValue('Fly 10');
    if (maxFly10) {
      calculatedMetrics.max_speed = (10 / maxFly10) * 2.23694;
    }
  }

  if (autoCalcSettings.enable_strength_deficit) {
    const vertical = getLatestValue('Vertical Jump');
    const seated = getLatestValue('Seated Vertical Jump');
    if (vertical && seated) {
      calculatedMetrics.strength_deficit = ((vertical - seated) / vertical) * 100;
    }
  }

  if (autoCalcSettings.enable_strength_total) {
    const bench = getLatestValue('Bench Press');
    const squat = getLatestValue('Squat');
    
    let thirdLift;
    if (autoCalcSettings.strength_total_uses_deadlift) {
      thirdLift = getLatestValue('Deadlift');
    } else {
      thirdLift = getLatestValue('Clean');
    }
    
    if (bench && squat && thirdLift) {
      calculatedMetrics.strength_total = bench + squat + thirdLift;
    }
  }

  return calculatedMetrics;
};