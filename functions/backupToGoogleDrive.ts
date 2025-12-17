import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get Google Sheets access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    
    // Fetch all data using service role
    const [athletes, metrics, metricRecords, organizations] = await Promise.all([
      base44.asServiceRole.entities.Athlete.list('-created_date', 50000),
      base44.asServiceRole.entities.Metric.list('-created_date', 10000),
      base44.asServiceRole.entities.MetricRecord.list('-recorded_date', 500000),
      base44.asServiceRole.entities.Organization.list('-created_date', 1000),
    ]);

    // Create lookup maps for faster access
    const athleteMap = new Map(athletes.map(a => [a.id, a]));
    const metricMap = new Map(metrics.map(m => [m.id, m]));

    // Build rows: Organization ID, Athlete First Name, Athlete Last Name, Date, Metric Name, Value
    const rows = [
      ['Organization ID', 'Athlete First Name', 'Athlete Last Name', 'Date', 'Metric Name', 'Value']
    ];

    metricRecords.forEach(record => {
      const athlete = athleteMap.get(record.athlete_id);
      const metric = metricMap.get(record.metric_id);
      
      if (!athlete || !metric) return;

      const athleteOrgId = athlete.organization_id || athlete.data?.organization_id || '';
      const firstName = athlete.first_name || athlete.data?.first_name || '';
      const lastName = athlete.last_name || athlete.data?.last_name || '';
      const date = record.recorded_date || record.data?.recorded_date || '';
      const metricName = metric.name || metric.data?.name || '';
      const value = record.value !== undefined ? record.value : (record.data?.value || '');

      rows.push([
        athleteOrgId,
        firstName,
        lastName,
        date,
        metricName,
        value
      ]);
    });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const sheetTitle = `Performance Backup ${timestamp}`;

    // Create a new spreadsheet
    const createResponse = await fetch(
      'https://sheets.googleapis.com/v4/spreadsheets',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: sheetTitle
          },
          sheets: [{
            properties: {
              title: 'Performance Data'
            }
          }]
        })
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create spreadsheet: ${errorText}`);
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Write data to the spreadsheet
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Performance Data!A1:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to write data: ${errorText}`);
    }

    return Response.json({
      success: true,
      message: 'Backup completed successfully',
      spreadsheet: {
        id: spreadsheetId,
        url: spreadsheet.spreadsheetUrl,
        title: sheetTitle
      },
      stats: {
        total_rows: rows.length - 1,
        total_records: metricRecords.length
      }
    });

  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});