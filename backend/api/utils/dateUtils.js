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

function resolveDateRange(timePreset, fromStr, toStr, tz = BUSINESS_TZ) {
  const getDateStr = (d) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${day}`;
  };

  const now = new Date();

  if (timePreset === 'today') {
    const today = getDateStr(now);
    return { from: today, to: today };
  }
  if (timePreset === 'yesterday') {
    const yest = getDateStr(new Date(now.getTime() - 86400000));
    return { from: yest, to: yest };
  }
  if (timePreset === 'last_7_days') {
    const from = getDateStr(new Date(now.getTime() - 6 * 86400000));
    const to = getDateStr(now);
    return { from, to };
  }
  if (timePreset === 'last_month') {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(now);
    const curYear = parseInt(parts.find(p => p.type === 'year').value, 10);
    const curMonth = parseInt(parts.find(p => p.type === 'month').value, 10);
    const prevMonthDate = new Date(Date.UTC(curYear, curMonth - 2, 1));
    const prevMonthLastDay = new Date(Date.UTC(curYear, curMonth - 1, 0));
    return { from: getDateStr(prevMonthDate), to: getDateStr(prevMonthLastDay) };
  }
  if (timePreset === 'last_3_months') {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(now);
    const curYear = parseInt(parts.find(p => p.type === 'year').value, 10);
    const curMonth = parseInt(parts.find(p => p.type === 'month').value, 10);
    const threeMonthsAgo = new Date(Date.UTC(curYear, curMonth - 4, 1));
    return { from: getDateStr(threeMonthsAgo), to: getDateStr(now) };
  }
  if (timePreset === 'custom') {
    return { from: fromStr, to: toStr };
  }
  const today = getDateStr(now);
  return { from: today, to: today };
}

module.exports = {
  BUSINESS_TZ,
  getTimezoneOffset,
  getIctDateBoundaries,
  getMonthsArray,
  resolveDateRange
};

