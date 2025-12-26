import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data using service role
    const [allRecords, allAthletes, allMetrics] = await Promise.all([
      base44.asServiceRole.entities.MetricRecord.list('-created_date', 1000000),
      base44.asServiceRole.entities.Athlete.list('-created_date', 100000),
      base44.asServiceRole.entities.Metric.list('-created_date', 100000)
    ]);

    // Build athlete -> organization map
    const athleteOrgMap = new Map();
    allAthletes.forEach(a => {
      const aOrgId = a.organization_id || a.data?.organization_id;
      if (aOrgId) {
        athleteOrgMap.set(a.id, aOrgId);
      }
    });

    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let metricsUpdated = 0;
    let metricsSkipped = 0;
    const errors = [];

    // Update MetricRecords without organization_id
    for (const record of allRecords) {
      const existingOrgId = record.organization_id || record.data?.organization_id;
      
      if (!existingOrgId) {
        const athleteId = record.athlete_id || record.data?.athlete_id;
        const orgId = athleteOrgMap.get(athleteId);
        
        if (orgId) {
          try {
            await base44.asServiceRole.entities.MetricRecord.update(record.id, {
              organization_id: orgId
            });
            recordsUpdated++;
          } catch (error) {
            errors.push(`Record ${record.id}: ${error.message}`);
          }
        } else {
          recordsSkipped++;
        }
      } else {
        recordsSkipped++;
      }
    }

    // Update Metrics without organization_id - assign to first org they appear in
    const metricOrgMap = new Map();
    allRecords.forEach(r => {
      const metricId = r.metric_id || r.data?.metric_id;
      const athleteId = r.athlete_id || r.data?.athlete_id;
      const orgId = athleteOrgMap.get(athleteId);
      
      if (metricId && orgId && !metricOrgMap.has(metricId)) {
        metricOrgMap.set(metricId, orgId);
      }
    });

    for (const metric of allMetrics) {
      const existingOrgId = metric.organization_id || metric.data?.organization_id;
      
      if (!existingOrgId) {
        const orgId = metricOrgMap.get(metric.id);
        
        if (orgId) {
          try {
            await base44.asServiceRole.entities.Metric.update(metric.id, {
              organization_id: orgId
            });
            metricsUpdated++;
          } catch (error) {
            errors.push(`Metric ${metric.id}: ${error.message}`);
          }
        } else {
          metricsSkipped++;
        }
      } else {
        metricsSkipped++;
      }
    }

    return Response.json({
      success: true,
      stats: {
        records: {
          updated: recordsUpdated,
          skipped: recordsSkipped,
          total: allRecords.length
        },
        metrics: {
          updated: metricsUpdated,
          skipped: metricsSkipped,
          total: allMetrics.length
        },
        errors: errors.length
      },
      errors: errors.slice(0, 10) // Return first 10 errors if any
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});