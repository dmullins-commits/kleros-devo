import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    
    // Fetch all data using service role
    const [athletes, metrics, metricRecords, teams, metricCategories, classPeriods, organizations] = await Promise.all([
      base44.asServiceRole.entities.Athlete.list('-created_date', 50000),
      base44.asServiceRole.entities.Metric.list('-created_date', 10000),
      base44.asServiceRole.entities.MetricRecord.list('-recorded_date', 500000),
      base44.asServiceRole.entities.Team.list('-created_date', 5000),
      base44.asServiceRole.entities.MetricCategory.list('-created_date', 1000),
      base44.asServiceRole.entities.ClassPeriod.list('-created_date', 1000),
      base44.asServiceRole.entities.Organization.list('-created_date', 1000),
    ]);

    // Create backup data object
    const backupData = {
      backup_date: new Date().toISOString(),
      data: {
        athletes,
        metrics,
        metricRecords,
        teams,
        metricCategories,
        classPeriods,
        organizations
      },
      stats: {
        total_athletes: athletes.length,
        total_metrics: metrics.length,
        total_records: metricRecords.length,
        total_teams: teams.length,
        total_organizations: organizations.length
      }
    };

    // Convert to JSON string
    const jsonContent = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `performance_backup_${timestamp}.json`;

    // Create form data for Google Drive API
    const boundary = '-------314159265358979323846';
    const metadata = {
      name: filename,
      mimeType: 'application/json'
    };

    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      jsonContent,
      `--${boundary}--`
    ].join('\r\n');

    // Upload to Google Drive
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Google Drive upload failed: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    return Response.json({
      success: true,
      message: 'Backup completed successfully',
      file: {
        id: uploadResult.id,
        name: uploadResult.name
      },
      stats: backupData.stats
    });

  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});