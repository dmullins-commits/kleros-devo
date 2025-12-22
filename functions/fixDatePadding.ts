import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Fetch all records in batches
    let allRecords = [];
    let skip = 0;
    const limit = 5000;
    let hasMore = true;

    console.log('Starting to fetch all records...');
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.MetricRecord.list('-created_date', limit, skip);
      
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

    // Find records with improperly padded dates
    const recordsToFix = [];
    
    for (const record of allRecords) {
      const date = record.data?.recorded_date || record.recorded_date;
      
      if (!date || typeof date !== 'string') continue;
      
      // Check if date has single-digit month or day
      // Pattern: YYYY-M-DD or YYYY-MM-D or YYYY-M-D
      const parts = date.split('-');
      
      if (parts.length === 3) {
        const [year, month, day] = parts;
        
        // Check if month or day need padding
        const needsPadding = (month.length === 1) || (day.length === 1);
        
        if (needsPadding) {
          const paddedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          recordsToFix.push({
            id: record.id,
            oldDate: date,
            newDate: paddedDate
          });
        }
      }
    }

    console.log(`Found ${recordsToFix.length} records to fix`);

    if (recordsToFix.length === 0) {
      return Response.json({
        success: true,
        message: 'All dates are properly formatted!',
        fixed: 0,
        total: allRecords.length
      });
    }

    // Update records
    let fixed = 0;
    const errors = [];

    for (const record of recordsToFix) {
      try {
        await base44.asServiceRole.entities.MetricRecord.update(record.id, {
          recorded_date: record.newDate
        });
        fixed++;
        
        // Small delay to avoid rate limiting
        if (fixed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        errors.push({
          id: record.id,
          oldDate: record.oldDate,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Fixed ${fixed} of ${recordsToFix.length} records`,
      fixed,
      total: allRecords.length,
      needsFix: recordsToFix.length,
      errors: errors.length > 0 ? errors : undefined,
      samples: recordsToFix.slice(0, 10)
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});