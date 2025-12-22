import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return Response.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Fetch all records in batches and delete those matching the organization
    let deletedCount = 0;
    let skip = 0;
    const limit = 5000;
    let hasMore = true;

    console.log(`Starting deletion for organization: ${organizationId}`);

    while (hasMore) {
      const records = await base44.asServiceRole.entities.MetricRecord.list('-created_date', limit, skip);
      
      if (records.length === 0) {
        hasMore = false;
        break;
      }

      // Filter records for this organization
      const orgRecords = records.filter(r => {
        const orgId = r.data?.organization_id || r.organization_id;
        return orgId === organizationId;
      });

      console.log(`Batch: Found ${orgRecords.length} records to delete out of ${records.length} fetched`);

      // Delete matching records
      for (const record of orgRecords) {
        await base44.asServiceRole.entities.MetricRecord.delete(record.id);
        deletedCount++;
      }

      // If we got fewer than limit, we've reached the end
      if (records.length < limit) {
        hasMore = false;
      } else {
        skip += limit;
      }
    }

    console.log(`Deletion complete. Total deleted: ${deletedCount}`);

    return Response.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} metric records for organization ${organizationId}`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});