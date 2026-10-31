const cron = require('node-cron');
const { syncGoogleSheetsToLeads } = require('../api/modules/lead/leadGoogleSheetService');

if (process.env.ENABLE_SHEETS_CRON !== 'false') {
  const schedule = '48 18 * * *';
  cron.schedule(schedule, () => {
    syncGoogleSheetsToLeads();
  });
  console.log(JSON.stringify({
    severity: 'INFO',
    message: 'Google Sheets cron scheduled',
    schedule
  }));
  // syncGoogleSheetsToInquiries();
}
