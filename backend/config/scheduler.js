const cron = require('node-cron');
const { syncGoogleSheetsToInquiries } = require('../api/modules/inquiry/inquiryGoogleSheetService');

if (process.env.ENABLE_SHEETS_CRON !== 'false') {
  const schedule = '22 16 * * *';
  cron.schedule(schedule, () => {
    syncGoogleSheetsToInquiries();
  });
  console.log(JSON.stringify({
    severity: 'INFO',
    message: 'Google Sheets cron scheduled',
    schedule
  }));
  // syncGoogleSheetsToInquiries();
}
