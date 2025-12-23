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

    // Analyze dates
    const invalidRecords = [];
    const validRecords = [];
    const dateFormats = {};

    allRecords.forEach(record => {
      const date = record.recorded_date || record.data?.recorded_date;
      
      if (!isValidDate(date)) {
        invalidRecords.push({
          id: record.id,
          athlete_id: record.athlete_id || record.data?.athlete_id,
          metric_id: record.metric_id || record.data?.metric_id,
          recorded_date: date,
          value: record.value || record.data?.value
        });
      } else {
        validRecords.push(record);
        
        // Track date format
        const dateStr = String(date);
        if (!dateFormats[dateStr]) {
          dateFormats[dateStr] = 0;
        }
        dateFormats[dateStr]++;
      }
    });

    // Get sample of each date format
    const sampleDateFormats = Object.entries(dateFormats)
      .slice(0, 20)
      .map(([date, count]) => ({ date, count, isValid: isValidDate(date) }));

    return Response.json({
      success: true,
      summary: {
        total_records: allRecords.length,
        valid_records: validRecords.length,
        invalid_records: invalidRecords.length,
        percentage_invalid: ((invalidRecords.length / allRecords.length) * 100).toFixed(2) + '%'
      },
      invalid_samples: invalidRecords.slice(0, 20),
      date_format_samples: sampleDateFormats,
      date_range: validRecords.length > 0 ? {
        earliest: validRecords[validRecords.length - 1]?.recorded_date || validRecords[validRecords.length - 1]?.data?.recorded_date,
        latest: validRecords[0]?.recorded_date || validRecords[0]?.data?.recorded_date
      } : null
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