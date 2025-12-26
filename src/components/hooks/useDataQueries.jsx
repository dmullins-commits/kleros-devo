import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Athlete, Team, Metric, MetricRecord, MetricCategory, ClassPeriod, Workout, ReportTemplate } from "@/entities/all";

// Query key factory for consistent key management
export const queryKeys = {
  athletes: (orgId) => ['athletes', orgId],
  teams: (orgId) => ['teams', orgId],
  metrics: (orgId) => ['metrics', orgId],
  metricRecords: (orgId) => ['metricRecords', orgId],
  metricCategories: () => ['metricCategories'],
  classPeriods: (orgId) => ['classPeriods', orgId],
  workouts: () => ['workouts'],
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
export function useAthletes(organizationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.athletes(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      const data = await Athlete.filter({ organization_id: organizationId });
      return data.map(a => normalizeEntity(a, [
        'first_name', 'last_name', 'email', 'position', 'jersey_number',
        'team_ids', 'class_period', 'class_grade', 'gender', 'rack_assignment',
        'height', 'weight', 'date_of_birth', 'status', 'profile_image', 'calculated_metrics', 'pin'
      ]));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
}

// Teams query hook
export function useTeams(organizationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.teams(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      const data = await Team.filter({ organization_id: organizationId });
      return data.map(t => normalizeEntity(t, [
        'name', 'sport', 'logo', 'season', 'coach_name', 'coach_email',
        'max_athletes', 'description', 'organization_id'
      ]));
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    ...options,
  });
}

// Metrics query hook
export function useMetrics(organizationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.metrics(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      const data = await Metric.filter({ organization_id: organizationId });
      return data.map(m => normalizeEntity(m, [
        'name', 'unit', 'category', 'description', 'target_higher',
        'decimal_places', 'is_active', 'is_hidden', 'is_mandatory', 'is_auto_calculated', 'organization_id'
      ]));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
}

// Metric Records query hook - server-side filtered by organization
export function useMetricRecords(organizationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.metricRecords(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        console.warn('useMetricRecords: No organizationId provided');
        return [];
      }

      console.log(`useMetricRecords: Fetching ALL records for org "${organizationId}"...`);

      // Fetch ALL records using list() with 1M limit
      const allRecords = await MetricRecord.list('-recorded_date', 1000000);
      console.log(`useMetricRecords: Fetched ${allRecords.length} total records`);

      // Sample first few records to see structure
      if (allRecords.length > 0) {
        console.log('Sample records:', allRecords.slice(0, 3).map(r => ({
          id: r.id,
          athlete_id: r.athlete_id || r.data?.athlete_id,
          organization_id: r.organization_id || r.data?.organization_id,
          hasOrgId: !!(r.organization_id || r.data?.organization_id),
          hasData: !!r.data
        })));
      }

      // If no records have organization_id, we need to infer from athletes
      const hasOrgIds = allRecords.some(r => r.organization_id || r.data?.organization_id);

      if (!hasOrgIds && allRecords.length > 0) {
        console.warn('⚠️ NO RECORDS HAVE organization_id - need to infer from athletes');

        // Fetch athletes to map athlete_id -> organization_id
        const athletes = await Athlete.list('-created_date', 100000);
        const athleteOrgMap = new Map();
        athletes.forEach(a => {
          const aOrgId = a.organization_id || a.data?.organization_id;
          if (aOrgId) {
            athleteOrgMap.set(a.id, aOrgId);
          }
        });

        console.log(`Built athlete map with ${athleteOrgMap.size} athletes`);

        // Filter by inferring org from athlete
        const orgRecords = allRecords.filter(r => {
          const athleteId = r.athlete_id || r.data?.athlete_id;
          const inferredOrgId = athleteOrgMap.get(athleteId);
          return inferredOrgId === organizationId;
        });

        console.log(`useMetricRecords FINAL (inferred): ${orgRecords.length} records for org "${organizationId}"`);

        return orgRecords.map(r => normalizeEntity(r, [
          'athlete_id', 'metric_id', 'value', 'recorded_date', 'notes', 'workout_id', 'organization_id'
        ]));
      }

      // Normal filtering when records have organization_id
      const orgRecords = allRecords.filter(r => {
        const recOrgId = r.organization_id || r.data?.organization_id;
        return recOrgId === organizationId;
      });

      console.log(`useMetricRecords FINAL: ${orgRecords.length} records for org "${organizationId}"`);

      return orgRecords.map(r => normalizeEntity(r, [
        'athlete_id', 'metric_id', 'value', 'recorded_date', 'notes', 'workout_id', 'organization_id'
      ]));
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
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
export function useMetricCategories(orgId = null, options = {}) {
  return useQuery({
    queryKey: queryKeys.metricCategories(),
    queryFn: async () => {
      const data = await MetricCategory.list();
      const normalized = data.map(c => normalizeEntity(c, [
        'name', 'description', 'color', 'icon', 'order', 'is_mandatory', 'is_hidden', 'organization_id'
      ]));
      
      // Show system categories (no org_id or is_mandatory) + org-specific categories
      let filtered = normalized;
      if (orgId && orgId !== 'all') {
        filtered = normalized.filter(c => !c.organization_id || c.is_mandatory || c.organization_id === orgId);
      }
      
      return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Class Periods query hook
export function useClassPeriods(organizationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.classPeriods(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      const data = await ClassPeriod.filter({ organization_id: organizationId });
      return data.map(cp => normalizeEntity(cp, ['name', 'order', 'is_active', 'organization_id']))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
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
        'category', 'assigned_teams', 'assigned_athletes'
      ]));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    invalidateAthletes: (orgId) => queryClient.invalidateQueries({ queryKey: queryKeys.athletes(orgId) }),
    invalidateTeams: (orgId) => queryClient.invalidateQueries({ queryKey: queryKeys.teams(orgId) }),
    invalidateMetrics: () => queryClient.invalidateQueries({ queryKey: ['metrics'] }),
    invalidateMetricRecords: () => queryClient.invalidateQueries({ queryKey: ['metricRecords'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}