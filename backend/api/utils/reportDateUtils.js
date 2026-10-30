const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';
const ICT_OFFSET = '+07:00';

function getIctDateBoundaries(fromStr, toStr) {
  const fromInstant = new Date(fromStr + 'T00:00:00' + ICT_OFFSET).toISOString();
  
  const toDate = new Date(toStr + 'T00:00:00' + ICT_OFFSET);
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
