const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';
const ICT_OFFSET = '+07:00';

function getIctDateBoundaries(fromStr, toStr) {
  const fromInstant = new Date(fromStr + 'T00:00:00' + ICT_OFFSET).toISOString();
  
  const toDate = new Date(toStr + 'T00:00:00' + ICT_OFFSET);
  const toExclusiveInstant = new Date(toDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return { fromInstant, toExclusiveInstant };
}

module.exports = {
  BUSINESS_TZ,
  getIctDateBoundaries
};
