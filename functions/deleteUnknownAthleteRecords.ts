import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return Response.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    console.log(`Fetching data for organization: ${organizationId}`);

    // Fetch all athletes for this organization
    const athletes = await base44.asServiceRole.entities.Athlete.filter({ 
      organization_id: organizationId 
    });
    const athleteIds = new Set(athletes.map(a => a.id));
    console.log(`Found ${athletes.length} athletes in organization`);

    // Fetch all records for this organization
    let allRecords = [];
    let skip = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.MetricRecord.list('-recorded_date', limit, skip);
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }
      
      // Filter for this org
      const orgBatch = batch.filter(r => {
        const orgId = r.data?.organization_id || r.organization_id;
        return orgId === organizationId;
      });
      
      allRecords = allRecords.concat(orgBatch);
      
      if (batch.length < limit) {
        hasMore = false;
      } else {
        skip += limit;
      }
    }

    console.log(`Found ${allRecords.length} total records for organization`);

    // Find records with unknown/missing athletes
    const unknownRecords = allRecords.filter(r => {
      const athleteId = r.data?.athlete_id || r.athlete_id;
      return !athleteIds.has(athleteId);
    });

    console.log(`Found ${unknownRecords.length} records with unknown athletes`);

    if (unknownRecords.length === 0) {
      return Response.json({
        success: true,
        message: 'No unknown athlete records found',
        deleted: 0
      });
    }

    // Delete unknown records
    let deleted = 0;
    const errors = [];

    for (const record of unknownRecords) {
      try {
        await base44.asServiceRole.entities.MetricRecord.delete(record.id);
        deleted++;
        
        if (deleted % 100 === 0) {
          console.log(`Deleted ${deleted} records so far...`);
        }
      } catch (error) {
        console.error(`Failed to delete record ${record.id}:`, error);
        errors.push({
          record_id: record.id,
          error: error.message
        });
      }
    }

    console.log(`Deletion complete. Deleted: ${deleted}, Errors: ${errors.length}`);

    return Response.json({
      success: true,
      message: 'Unknown athlete records deleted',
      total_unknown: unknownRecords.length,
      deleted,
      errors: errors.slice(0, 10)
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});