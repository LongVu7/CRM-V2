const reportRepository = require('./reportRepository');
const { getIctDateBoundaries, getMonthsArray, BUSINESS_TZ } = require('../../utils/dateUtils');
const { STATUS_BUCKETS, METRIC_BUCKETS } = require('../../../constants/reportConstants');
const { getEffectiveScope, isAdmin } = require('../../../config/ability');

const MAJOR_ORDER = [
  'right_major_interest',
  'related_major_interest',
  'different_major_interest'
];

const REGION_ORDER = [
  'HO_CHI_MINH',
  'CORE_PROVINCE',
  'OTHER_PROVINCE',
  'FOREIGN'
];

const STATUS_FIELDS = Object.values(STATUS_BUCKETS);

/**
 * Builds an SQL-compatible scope object for reportRepository raw queries
 * based on dynamic CASL role and team scopes.
 */
function buildSqlReportScope(user) {
  if (!user) return { mode: 'none' };

  if (isAdmin(user)) {
    return { mode: 'all' };
  }

  const effectiveScope = getEffectiveScope(user, 'read', 'report');
  if (effectiveScope === 'ALL') {
    return { mode: 'all' };
  }

  const hasTeamOnly = effectiveScope === 'TEAM_ONLY';
  const hasOwnerOnly = effectiveScope === 'OWNER_ONLY';
  const authorizedAccountIds = user.authorizedAccountIds || [];
  const accountId = user.accountId ?? user.id;

  return {
    mode: 'scoped',
    authorizedAccountIds: (hasTeamOnly && authorizedAccountIds.length > 0) ? authorizedAccountIds : [],
    assignedToIds: (hasOwnerOnly && accountId) ? [accountId] : []
  };
}

function calcRate(num, den) {
  if (!den || den === 0) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

function sumFields(row, fields) {
  let sum = 0;
  for (let i = 0; i < fields.length; i++) {
    sum += (row[fields[i]] || 0);
  }
  return sum;
}

function sortByOrder(items, key, order) {
  return items.sort((a, b) => {
    const aIndex = order.indexOf(a[key]);
    const bIndex = order.indexOf(b[key]);
    const aSort = aIndex === -1 ? 999 : aIndex;
    const bSort = bIndex === -1 ? 999 : bIndex;
    return aSort - bSort;
  });
}

function calculatePerformanceMetrics(row) {
  const interacted = sumFields(row, METRIC_BUCKETS.interacted);
  const notInteracted = sumFields(row, METRIC_BUCKETS.notInteracted);
  const wrongNumber = row.wrongNumber || 0;
  const nb = row.paymentCompletedNb || 0;
  const notInterested = row.notInterested || 0;
  const unprocessed = row.unprocessed || 0;

  const totalProcessed = row.totalProcessed !== undefined
    ? row.totalProcessed
    : (interacted + notInteracted + wrongNumber);

  return {
    totalProcessed,
    interacted,
    interactionRate: calcRate(interacted, totalProcessed),
    nb,
    nbRate: calcRate(nb, interacted),
    notInteracted,
    notInteractedRate: calcRate(notInteracted, totalProcessed),
    wrongNumber,
    wrongNumberRate: calcRate(wrongNumber, totalProcessed),
    notInterested,
    notInterestedRate: calcRate(notInterested, totalProcessed),
    unprocessed
  };
}

function formatBreakdownDataset(rawRows, keyField, orderList) {
  const chartRows = rawRows.filter(r => (r.total ?? 0) > 0 || (r.processed ?? 0) > 0);
  const chartData = chartRows.map(r => ({
    [keyField]: r[keyField],
    total: r.total,
    processed: r.processed,
    interacted: r.interacted,
    interactionRate: calcRate(r.interacted, r.processed),
    nb: r.nb,
    nbRate: calcRate(r.nb, r.interacted)
  }));

  const performanceData = sortByOrder(
    rawRows.map(row => ({
      [keyField]: row[keyField],
      ...calculatePerformanceMetrics(row)
    })),
    keyField,
    orderList
  );

  return { chartData, performanceData };
}

function buildMajorReports(majorCountsRaw) {
  return formatBreakdownDataset(majorCountsRaw, 'majorKey', MAJOR_ORDER);
}

function buildRegionReports(regionCountsRaw) {
  return formatBreakdownDataset(regionCountsRaw, 'regionGroup', REGION_ORDER);
}

function buildAccountReports(accountCountsRaw) {
  const statusByAccount = [];
  const ratesByAccount = [];

  accountCountsRaw.forEach(s => {
    const accountId = s.accountId ?? s.advisorId;
    const accountName = s.accountName ?? s.advisorName;

    statusByAccount.push({
      accountId,
      accountName,
      advisorId: accountId,
      advisorName: accountName,
      processed: s.processed,
      paymentCompletedNb: s.paymentCompletedNb,
      applicationSubmitted: s.applicationSubmitted,
      considering: s.considering,
      interested: s.interested,
      scheduledCallback: s.scheduledCallback,
      noAnswer: s.noAnswer,
      unreachable: s.unreachable,
      notInterested: s.notInterested,
      wrongNumber: s.wrongNumber
    });

    ratesByAccount.push({
      accountId,
      accountName,
      advisorId: accountId,
      advisorName: accountName,
      processed: s.processed,
      interacted: s.interacted,
      nb: s.nb,
      interactionRate: calcRate(s.interacted, s.processed),
      nbRate: calcRate(s.nb, s.interacted),
      wrongNumberRate: calcRate(s.wrongNumber, s.processed),
      notInterestedRate: calcRate(s.notInterested, s.processed)
    });
  });

  return { statusByAccount, ratesByAccount };
}

function buildTimelineReport(timelineRaw, from, to) {
  const allMonths = getMonthsArray(from, to);
  const timelineMap = new Map();
  timelineRaw.forEach(item => timelineMap.set(item.month_val, item));

  return allMonths.map(month => {
    const item = timelineMap.get(month);
    return {
      month,
      processed: item?.processed || 0,
      interacted: item?.interacted || 0,
      nb: item?.nb || 0
    };
  });
}

function buildSourceReports(sourceCountsRaw) {
  const sourceMap = new Map();

  sourceCountsRaw.forEach(row => {
    if (!sourceMap.has(row.sourceId)) {
      const init = {
        sourceId: row.sourceId,
        sourceKey: row.sourceKey,
        sourceLabel: row.sourceLabel || row.sourceKey,
        totalProcessed: 0,
        unprocessed: 0,
        details: []
      };
      STATUS_FIELDS.forEach(f => { init[f] = 0; });
      sourceMap.set(row.sourceId, init);
    }
    const src = sourceMap.get(row.sourceId);

    const rowProcessed = sumFields(row, STATUS_FIELDS);

    src.totalProcessed += rowProcessed;
    STATUS_FIELDS.forEach(f => { src[f] += (row[f] || 0); });
    src.unprocessed += (row.unprocessed || 0);

    const detail = {
      sourceDetailId: row.sourceDetailId,
      sourceDetailKey: row.sourceDetailKey || 'unspecified',
      sourceDetailLabel: row.sourceDetailLabel || (row.sourceDetailId ? row.sourceDetailKey : 'Khác (Không xác định)'),
      totalProcessed: rowProcessed,
      unprocessed: row.unprocessed || 0
    };
    STATUS_FIELDS.forEach(f => { detail[f] = row[f] || 0; });
    Object.assign(detail, calculatePerformanceMetrics(detail));

    src.details.push(detail);
  });

  const sourcePerformance = Array.from(sourceMap.values()).map(s =>
    Object.assign(s, calculatePerformanceMetrics(s))
  );

  const bySource = sourcePerformance
    .filter(s => s.totalProcessed > 0)
    .map(s => ({
      ...s,
      details: s.details.filter(d => d.totalProcessed > 0)
    }));

  return { bySource, sourcePerformance };
}


async function getDashboard(query, user) {
  const { from, to, oldProvinceIds } = query;
  const { fromInstant, toExclusiveInstant } = getIctDateBoundaries(from, to);

  const scope = buildSqlReportScope(user);
  const dateRange = { fromInstant, toExclusiveInstant };
  const filters = { oldProvinceIds };

  const [
    summaryRaw,
    timelineRaw,
    accountCountsRaw,
    majorCountsRaw,
    sourceCountsRaw,
    regionCountsRaw
  ] = await Promise.all([
    reportRepository.getSummaryCounts(scope, dateRange, filters),
    reportRepository.getTimelineCounts(scope, dateRange, filters),
    reportRepository.getAccountCounts(scope, dateRange, filters),
    reportRepository.getMajorCounts(scope, dateRange, filters),
    reportRepository.getSourceCounts(scope, dateRange, filters),
    reportRepository.getRegionCounts(scope, dateRange, filters),
  ]);

  const summary = {
    total: summaryRaw.total,
    processed: summaryRaw.processed,
    interacted: summaryRaw.interacted,
    interactionRate: calcRate(summaryRaw.interacted, summaryRaw.processed),
    nb: summaryRaw.nb,
    nbRate: calcRate(summaryRaw.nb, summaryRaw.interacted)
  };

  const { statusByAccount, ratesByAccount } = buildAccountReports(accountCountsRaw);
  const { chartData: byMajor, performanceData: majorPerformance } = buildMajorReports(majorCountsRaw);
  const { chartData: byRegion, performanceData: regionPerformance } = buildRegionReports(regionCountsRaw);
  const { bySource, sourcePerformance } = buildSourceReports(sourceCountsRaw);
  const timeline = buildTimelineReport(timelineRaw, from, to);

  return {
    summary,
    statusByAccount,
    ratesByAccount,
    statusByAdvisor: statusByAccount,
    ratesByAdvisor: ratesByAccount,
    byMajor,
    majorPerformance,
    bySource,
    sourcePerformance,
    byRegion,
    regionPerformance,
    timeline,
    meta: {
      from,
      to,
      timezone: BUSINESS_TZ
    }
  };
}

module.exports = {
  getDashboard,
  buildSqlReportScope,
  calculatePerformanceMetrics,
  calcRate,
  buildSourceReports,
  buildMajorReports,
  buildRegionReports,
  buildAccountReports,
  buildTimelineReport,
  formatBreakdownDataset
};
