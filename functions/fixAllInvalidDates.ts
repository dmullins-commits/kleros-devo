import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isValidDate = (dateStr) => {
      if (!dateStr || dateStr === 'undefined' || dateStr === 'null' || dateStr.toString().trim() === '') {
        return false;
      }
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    };

    // Fetch all MetricRecord entities
    console.log('Fetching all records...');
    let allRecords = [];
    let skip = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.MetricRecord.list('-recorded_date', limit, skip);
      console.log(`Batch: skip=${skip}, got ${batch.length} records`);
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }
      
      allRecords = allRecords.concat(batch);
      
      if (batch.length < limit) {
        hasMore = false;
      } else {
        skip += limit;
      }
    }

    console.log(`Total records fetched: ${allRecords.length}`);

    // Find invalid records
    const invalidRecords = [];
    
    allRecords.forEach(record => {
      const date = record.recorded_date || record.data?.recorded_date;
      
      if (!isValidDate(date)) {
        invalidRecords.push(record);
      }
    });

    console.log(`Found ${invalidRecords.length} invalid records`);

    if (invalidRecords.length === 0) {
      return Response.json({
        success: true,
        message: 'No invalid date records found',
        fixed: 0,
        errors: []
      });
    }

    // Delete invalid records
    const errors = [];
    let deleted = 0;

    for (const record of invalidRecords) {
      try {
        await base44.asServiceRole.entities.MetricRecord.delete(record.id);
        deleted++;
        
        if (deleted % 100 === 0) {
          console.log(`Deleted ${deleted} records so far...`);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
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
      message: 'Invalid date records deleted',
      total_invalid: invalidRecords.length,
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