const reportRepository = require('./reportRepository');
const { getIctDateBoundaries, BUSINESS_TZ } = require('./reportDateUtils');
const { buildReportScope } = require('../../../authorization/scope/reportScope');
const { REGION_LABELS, STATUS_BUCKETS } = require('./reportConstants');

function calcRate(num, den) {
  if (!den || den === 0) return 0;
  return Number(((num / den) * 100).toFixed(2));
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

async function getDashboard(query, user) {
  const { from, to, sourceIds, sourceDetailIds, majorInterestTypes, regionGroups, oldProvinceIds } = query;
  const { fromInstant, toExclusiveInstant } = getIctDateBoundaries(from, to);

  const scope = await buildReportScope(user);
  const dateRange = { fromInstant, toExclusiveInstant };
  const filters = { sourceIds, sourceDetailIds, majorInterestTypes, regionGroups, oldProvinceIds };

  const [
    summaryRaw,
    timelineRaw,
    staffCountsRaw,
    majorCountsRaw,
    sourceCountsRaw,
    regionCountsRaw
  ] = await Promise.all([
    reportRepository.getSummaryCounts(scope, dateRange, filters),
    reportRepository.getTimelineCounts(scope, dateRange, filters),
    reportRepository.getStaffCounts(scope, dateRange, filters),
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

  const statusByAdvisor = staffCountsRaw.map(s => ({
    advisorId: s.advisorId,
    advisorName: s.advisorName,
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
  }));

  const ratesByAdvisor = staffCountsRaw.map(s => ({
    advisorId: s.advisorId,
    advisorName: s.advisorName,
    processed: s.processed,
    interacted: s.interacted,
    nb: s.nb,
    interactionRate: calcRate(s.interacted, s.processed),
    nbRate: calcRate(s.nb, s.interacted),
    wrongNumberRate: calcRate(s.wrongNumber, s.processed),
    notInterestedRate: calcRate(s.notInterested, s.processed)
  }));

  const majorChartRows = majorCountsRaw.filter(
    row => (row.total ?? 0) > 0 || (row.processed ?? 0) > 0
  );

  const byMajor = majorChartRows.map(m => ({
    majorKey: m.majorKey,
    majorLabel: m.majorLabel || m.majorKey,
    total: m.total,
    processed: m.processed,
    interacted: m.interacted,
    interactionRate: calcRate(m.interacted, m.processed),
    nb: m.nb,
    nbRate: calcRate(m.nb, m.interacted)
  }));

  // ── New majorPerformance ──
  function buildMajorPerformanceMetrics(row) {
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

    const totalProcessed = interacted + notInteracted + (row.wrongNumber || 0);

    return {
      majorKey: row.majorKey,
      majorLabel: row.majorLabel || row.majorKey,
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

  const MAJOR_ORDER = [
    'right_major_interest',
    'related_major_interest',
    'different_major_interest'
  ];

  const majorPerformance = majorCountsRaw
    .map(buildMajorPerformanceMetrics)
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
    regionLabel: REGION_LABELS[r.regionGroup] || r.regionGroup,
    total: r.total,
    processed: r.processed,
    interacted: r.interacted,
    interactionRate: calcRate(r.interacted, r.processed),
    nb: r.nb,
    nbRate: calcRate(r.nb, r.interacted)
  }));

  // ── New regionPerformance ──
  function buildRegionPerformanceMetrics(row) {
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

    const totalProcessed = interacted + notInteracted + (row.wrongNumber || 0);

    return {
      regionGroup: row.regionGroup,
      regionLabel: REGION_LABELS[row.regionGroup] || row.regionGroup,
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

  const REGION_ORDER = [
    'HO_CHI_MINH',
    'CORE_PROVINCE',
    'OTHER_PROVINCE',
    'FOREIGN'
  ];

  const regionPerformance = regionCountsRaw
    .map(buildRegionPerformanceMetrics)
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

  // ── New sourcePerformance (full dataset: processed OR pending) ──
  function buildSourcePerformanceMetrics(row) {
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

    return {
      totalProcessed: row.totalProcessed || 0,
      interacted,
      interactionRate: calcRate(interacted, row.totalProcessed),
      nb: row.paymentCompletedNb || 0,
      nbRate: calcRate(row.paymentCompletedNb, interacted),
      notInteracted,
      notInteractedRate: calcRate(notInteracted, row.totalProcessed),
      wrongNumberRate: calcRate(row.wrongNumber, row.totalProcessed),
      notInterestedRate: calcRate(row.notInterested, row.totalProcessed),
      unprocessed: row.unprocessed || 0
    };
  }

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

    src.details.push(Object.assign(detail, buildSourcePerformanceMetrics(detail)));
  });

  const sourcePerformance = Array.from(perfMap.values()).map(s =>
    Object.assign(s, buildSourcePerformanceMetrics(s))
  );

  const allMonths = getMonthsArray(from, to);

  const mapTimeline = (rawArr) => {
    const m = new Map();
    rawArr.forEach(item => m.set(item.month_val, item.count_val));
    return m;
  };

  const pMap = mapTimeline(timelineRaw.processedTimeline);
  const iMap = mapTimeline(timelineRaw.interactedTimeline);
  const nMap = mapTimeline(timelineRaw.nbTimeline);

  const timeline = allMonths.map(month => ({
    month,
    processed: pMap.get(month) || 0,
    interacted: iMap.get(month) || 0,
    nb: nMap.get(month) || 0
  }));

  return {
    summary,
    statusByAdvisor,
    ratesByAdvisor,
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
  getDashboard
};
