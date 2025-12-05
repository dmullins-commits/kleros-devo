import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Athlete, Team, Metric, MetricRecord, MetricCategory, ClassPeriod, Workout, VBTSession, ReportTemplate } from "@/entities/all";

// Query key factory for consistent key management
export const queryKeys = {
  athletes: (filters) => ['athletes', filters],
  teams: (orgId) => ['teams', orgId],
  metrics: () => ['metrics'],
  metricRecords: (filters) => ['metricRecords', filters],
  metricCategories: () => ['metricCategories'],
  classPeriods: () => ['classPeriods'],
  workouts: () => ['workouts'],
  vbtSessions: (filters) => ['vbtSessions', filters],
  reportTemplates: (orgId) => ['reportTemplates', orgId],
};

// Normalize data helper - handles nested data structures
const normalizeEntity = (entity, fields) => {
  const result = { id: entity.id };
  fields.forEach(field => {
    result[field] = entity.data?.[field] ?? entity[field];
  });
  return result;
};

// Athletes query hook
export function useAthletes(teamIds = [], options = {}) {
  return useQuery({
    queryKey: queryKeys.athletes({ teamIds }),
    queryFn: async () => {
      const data = await Athlete.list('-created_date', 10000);
      const normalized = data.map(a => normalizeEntity(a, [
        'first_name', 'last_name', 'email', 'position', 'jersey_number',
        'team_ids', 'class_period', 'class_grade', 'gender', 'rack_assignment',
        'height', 'weight', 'date_of_birth', 'status', 'profile_image', 'calculated_metrics', 'pin'
      ]));
      
      // Filter by team IDs if provided
      if (teamIds.length > 0) {
        return normalized.filter(a => 
          a.team_ids?.some(tid => teamIds.includes(tid))
        );
      }
      return normalized;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Teams query hook
export function useTeams(orgId, options = {}) {
  return useQuery({
    queryKey: queryKeys.teams(orgId),
    queryFn: async () => {
      const data = await Team.list();
      const normalized = data.map(t => normalizeEntity(t, [
        'name', 'sport', 'logo', 'season', 'coach_name', 'coach_email',
        'max_athletes', 'description', 'organization_id'
      ]));
      
      if (orgId) {
        return normalized.filter(t => t.organization_id === orgId);
      }
      return normalized;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Metrics query hook
export function useMetrics(options = {}) {
  return useQuery({
    queryKey: queryKeys.metrics(),
    queryFn: async () => {
      const data = await Metric.list('-created_date', 1000);
      return data.map(m => normalizeEntity(m, [
        'name', 'unit', 'category', 'description', 'target_higher',
        'decimal_places', 'is_active', 'is_hidden', 'is_mandatory', 'is_auto_calculated'
      ]));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Metric Records query hook with pagination support
export function useMetricRecords(filters = {}, options = {}) {
  const { athleteIds, metricIds, startDate, endDate, limit = 10000 } = filters;
  
  return useQuery({
    queryKey: queryKeys.metricRecords(filters),
    queryFn: async () => {
      // Build query filter
      const query = {};
      
      if (athleteIds?.length === 1) {
        query.athlete_id = athleteIds[0];
      }
      
      if (metricIds?.length === 1) {
        query.metric_id = metricIds[0];
      }
      
      // Fetch records
      const data = Object.keys(query).length > 0 
        ? await MetricRecord.filter(query, '-recorded_date', limit)
        : await MetricRecord.list('-recorded_date', limit);
      
      let normalized = data.map(r => normalizeEntity(r, [
        'athlete_id', 'metric_id', 'value', 'recorded_date', 'notes', 'workout_id'
      ]));
      
      // Client-side filtering for complex queries
      if (athleteIds?.length > 1) {
        normalized = normalized.filter(r => athleteIds.includes(r.athlete_id));
      }
      
      if (metricIds?.length > 1) {
        normalized = normalized.filter(r => metricIds.includes(r.metric_id));
      }
      
      if (startDate) {
        normalized = normalized.filter(r => new Date(r.recorded_date) >= new Date(startDate));
      }
      
      if (endDate) {
        normalized = normalized.filter(r => new Date(r.recorded_date) <= new Date(endDate));
      }
      
      return normalized;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

// Recent metric records (for dashboard) - limited fetch
export function useRecentMetricRecords(limit = 100, options = {}) {
  return useQuery({
    queryKey: ['recentMetricRecords', limit],
    queryFn: async () => {
      const data = await MetricRecord.list('-recorded_date', limit);
      return data.map(r => normalizeEntity(r, [
        'athlete_id', 'metric_id', 'value', 'recorded_date', 'notes', 'workout_id'
      ]));
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

// Metric Categories query hook
export function useMetricCategories(options = {}) {
  return useQuery({
    queryKey: queryKeys.metricCategories(),
    queryFn: async () => {
      const data = await MetricCategory.list();
      const normalized = data.map(c => normalizeEntity(c, [
        'name', 'description', 'color', 'icon', 'order', 'is_mandatory', 'is_hidden'
      ]));
      return normalized.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Class Periods query hook
export function useClassPeriods(options = {}) {
  return useQuery({
    queryKey: queryKeys.classPeriods(),
    queryFn: async () => {
      const data = await ClassPeriod.list();
      const normalized = data.map(cp => normalizeEntity(cp, ['name', 'order', 'is_active']));
      return normalized.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Workouts query hook
export function useWorkouts(options = {}) {
  return useQuery({
    queryKey: queryKeys.workouts(),
    queryFn: async () => {
      const data = await Workout.list();
      return data.map(w => normalizeEntity(w, [
        'name', 'description', 'exercises', 'duration_minutes', 'difficulty',
        'category', 'assigned_teams', 'assigned_athletes', 'vbt_compatible',
        'pushed_to_device', 'device_workout_id'
      ]));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// VBT Sessions query hook
export function useVBTSessions(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.vbtSessions(filters),
    queryFn: async () => {
      const data = await VBTSession.list();
      return data.map(s => normalizeEntity(s, [
        'athlete_id', 'workout_id', 'exercise_name', 'programmed_sets',
        'completed_sets', 'programmed_reps', 'completed_reps', 'avg_velocity',
        'peak_velocity', 'avg_power', 'peak_power', 'load_used', 'session_date',
        'completion_percentage', 'device_id', 'raw_data'
      ]));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

// Report Templates query hook
export function useReportTemplates(orgId, options = {}) {
  return useQuery({
    queryKey: queryKeys.reportTemplates(orgId),
    queryFn: async () => {
      const data = await ReportTemplate.list('-created_date', 100);
      return data.filter(t => !t.organization_id || t.organization_id === orgId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Custom hook to invalidate queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAthletes: () => queryClient.invalidateQueries({ queryKey: ['athletes'] }),
    invalidateTeams: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
    invalidateMetrics: () => queryClient.invalidateQueries({ queryKey: ['metrics'] }),
    invalidateMetricRecords: () => queryClient.invalidateQueries({ queryKey: ['metricRecords'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}