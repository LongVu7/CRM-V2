const reportRepository = require('./reportRepository');
const { getIctDateBoundaries, getMonthsArray, BUSINESS_TZ } = require('../../utils/reportDateUtils');
const { STATUS_BUCKETS } = require('./reportConstants');

/**
 * Builds an SQL-compatible scope object for reportRepository raw queries
 * based on dynamic CASL role and team scopes.
 */
function buildSqlReportScope(user) {
  if (!user) return { mode: 'none' };

  // Super-administrator or ALL scope on report.read
  const roleName = (user.roleName || user.role?.name || '').toLowerCase();
  if (roleName === 'admin' || roleName === 'administrator') {
    return { mode: 'all' };
  }

  const rolePerms = user.rolePermissions || user.permissions || [];
  const reportPerms = Array.isArray(rolePerms)
    ? rolePerms.filter(
      p => (p.resource === 'report' || p.code === 'report.read') && (p.action === 'read' || p.action === 'manage' || !p.action)
    )
    : [];

  const hasAll = reportPerms.some(p => p.scope === 'ALL');
  if (hasAll) {
    return { mode: 'all' };
  }

  const hasTeamOnly = reportPerms.some(p => p.scope === 'TEAM_ONLY');
  const hasOwnerOnly = reportPerms.some(p => p.scope === 'OWNER_ONLY');
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

function calculatePerformanceMetrics(row) {
  const interacted =
    (row.paymentCompletedNb || 0) +
    (row.applicationSubmitted || 0) +
    (row.considering || 0) +
    (row.interested || 0) +
    (row.scheduledCallback || 0) +
    (row.notInterested || 0);

  const notInteracted =
    (row.noAnswer || 0) +
    (row.unreachable || 0);

  const totalProcessed = row.totalProcessed !== undefined
    ? row.totalProcessed
    : (interacted + notInteracted + (row.wrongNumber || 0));

  return {
    totalProcessed,
    interacted,
    interactionRate: calcRate(interacted, totalProcessed),
    nb: row.paymentCompletedNb || 0,
    nbRate: calcRate(row.paymentCompletedNb, interacted),
    notInteracted,
    notInteractedRate: calcRate(notInteracted, totalProcessed),
    wrongNumber: row.wrongNumber || 0,
    wrongNumberRate: calcRate(row.wrongNumber, totalProcessed),
    notInterested: row.notInterested || 0,
    notInterestedRate: calcRate(row.notInterested, totalProcessed),
    unprocessed: row.unprocessed || 0
  };
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

  const statusByAccount = accountCountsRaw.map(s => {
    const accountId = s.accountId ?? s.advisorId;
    const accountName = s.accountName ?? s.advisorName;
    return {
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
    };
  });

  const ratesByAccount = accountCountsRaw.map(s => {
    const accountId = s.accountId ?? s.advisorId;
    const accountName = s.accountName ?? s.advisorName;
    return {
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
    };
  });

  const majorChartRows = majorCountsRaw.filter(
    row => (row.total ?? 0) > 0 || (row.processed ?? 0) > 0
  );

  const byMajor = majorChartRows.map(m => ({
    majorKey: m.majorKey,
    total: m.total,
    processed: m.processed,
    interacted: m.interacted,
    interactionRate: calcRate(m.interacted, m.processed),
    nb: m.nb,
    nbRate: calcRate(m.nb, m.interacted)
  }));

  // ── New majorPerformance ──
  const MAJOR_ORDER = [
    'right_major_interest',
    'related_major_interest',
    'different_major_interest'
  ];

  const majorPerformance = majorCountsRaw
    .map(row => ({
      majorKey: row.majorKey,
      ...calculatePerformanceMetrics(row)
    }))
    .sort((a, b) => {
      const aIndex = MAJOR_ORDER.indexOf(a.majorKey);
      const bIndex = MAJOR_ORDER.indexOf(b.majorKey);
      const aSort = aIndex === -1 ? 999 : aIndex;
      const bSort = bIndex === -1 ? 999 : bIndex;
      return aSort - bSort;
    });

  const regionChartRows = regionCountsRaw.filter(
    row => (row.total ?? 0) > 0 || (row.processed ?? 0) > 0
  );

  const byRegion = regionChartRows.map(r => ({
    regionGroup: r.regionGroup,
    total: r.total,
    processed: r.processed,
    interacted: r.interacted,
    interactionRate: calcRate(r.interacted, r.processed),
    nb: r.nb,
    nbRate: calcRate(r.nb, r.interacted)
  }));

  // ── New regionPerformance ──
  const REGION_ORDER = [
    'HO_CHI_MINH',
    'CORE_PROVINCE',
    'OTHER_PROVINCE',
    'FOREIGN'
  ];

  const regionPerformance = regionCountsRaw
    .map(row => ({
      regionGroup: row.regionGroup,
      ...calculatePerformanceMetrics(row)
    }))
    .sort((a, b) => {
      const aIndex = REGION_ORDER.indexOf(a.regionGroup);
      const bIndex = REGION_ORDER.indexOf(b.regionGroup);
      const aSort = aIndex === -1 ? 999 : aIndex;
      const bSort = bIndex === -1 ? 999 : bIndex;
      return aSort - bSort;
    });

  const sourceMap = new Map();

  const STATUS_FIELDS = Object.values(STATUS_BUCKETS).map(b => b.field);

  // ── Split: prevent regression in existing bySource ──
  // Only rows belonging to the processed cohort feed the existing status table
  const sourceStatusRows = sourceCountsRaw.filter(
    row => (row.processedCohortCount ?? 0) > 0
  );

  // ── Existing bySource (unchanged behavior) ──
  sourceStatusRows.forEach(row => {
    if (!sourceMap.has(row.sourceId)) {
      const init = {
        sourceId: row.sourceId,
        sourceKey: row.sourceKey,
        sourceLabel: row.sourceLabel || row.sourceKey,
        totalProcessed: 0,
        details: []
      };
      STATUS_FIELDS.forEach(f => { init[f] = 0; });
      sourceMap.set(row.sourceId, init);
    }
    const src = sourceMap.get(row.sourceId);

    const rowProcessed = STATUS_FIELDS.reduce((sum, f) => sum + (row[f] || 0), 0);

    src.totalProcessed += rowProcessed;
    STATUS_FIELDS.forEach(f => { src[f] += (row[f] || 0); });

    const detail = {
      sourceDetailId: row.sourceDetailId,
      sourceDetailKey: row.sourceDetailKey || 'unspecified',
      sourceDetailLabel: row.sourceDetailLabel || (row.sourceDetailId ? row.sourceDetailKey : 'Khác (Không xác định)'),
      totalProcessed: rowProcessed
    };
    STATUS_FIELDS.forEach(f => { detail[f] = row[f] || 0; });

    src.details.push(detail);
  });

  const bySource = Array.from(sourceMap.values());

  const perfMap = new Map();
  sourceCountsRaw.forEach(row => {
    if (!perfMap.has(row.sourceId)) {
      const init = {
        sourceId: row.sourceId,
        sourceKey: row.sourceKey,
        sourceLabel: row.sourceLabel || row.sourceKey,
        totalProcessed: 0,
        unprocessed: 0,
        details: []
      };
      STATUS_FIELDS.forEach(f => { init[f] = 0; });
      perfMap.set(row.sourceId, init);
    }
    const src = perfMap.get(row.sourceId);

    const rowProcessed = STATUS_FIELDS.reduce((sum, f) => sum + (row[f] || 0), 0);

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

    src.details.push(Object.assign(detail, calculatePerformanceMetrics(detail)));
  });

  const sourcePerformance = Array.from(perfMap.values()).map(s =>
    Object.assign(s, calculatePerformanceMetrics(s))
  );

  const allMonths = getMonthsArray(from, to);

  const timelineMap = new Map();
  timelineRaw.forEach(item => timelineMap.set(item.month_val, item));

  const timeline = allMonths.map(month => {
    const item = timelineMap.get(month);
    return {
      month,
      processed: item?.processed || 0,
      interacted: item?.interacted || 0,
      nb: item?.nb || 0
    };
  });

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
  calcRate
};
