const BUSINESS_TZ = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

function getTimezoneOffset(tz = BUSINESS_TZ, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(date);
    const match = (parts.find(p => p.type === 'timeZoneName')?.value || '').match(/GMT([+-]\d{2}:\d{2})/);
    return match ? match[1] : '+07:00';
  } catch {
    return '+07:00';
  }
}

function getIctDateBoundaries(fromStr, toStr, tz = BUSINESS_TZ) {
  const offset = getTimezoneOffset(tz);
  const fromInstant = new Date(fromStr + 'T00:00:00' + offset).toISOString();
  
  const toDate = new Date(toStr + 'T00:00:00' + offset);
  const toExclusiveInstant = new Date(toDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return { fromInstant, toExclusiveInstant };
}

function getMonthsArray(from, to) {
  const months = [];
  let current = new Date(from);
  current.setUTCDate(1);
  const end = new Date(to);
  const endCompare = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (current <= endCompare) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

module.exports = {
  BUSINESS_TZ,
  getIctDateBoundaries,
  getMonthsArray
};
