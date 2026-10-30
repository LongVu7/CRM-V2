/**
 * Calucate based on daily inquiry distribution time (unassigned time):
 * - NORMAL:   < 1 day (< 24 hours, < 1440 minutes)
 * - ATTENTION: 1 - 2 days (24 - 48 hours, 1440 - 2879 minutes)
 * - WARNING:   2 - 3 days (48 - 72 hours, 2880 - 4319 minutes)
 * - OVERDUE:  > 3 days (> 72 hours, >= 4320 minutes)
 */

const SLA_TIERS = {
  NORMAL: 'NORMAL',
  ATTENTION: 'ATTENTION',
  WARNING: 'WARNING',
  OVERDUE: 'OVERDUE'
};

const SLA_MINUTE_THRESHOLDS = {
  ONE_DAY: 24 * 60,      // 1440 min
  TWO_DAYS: 48 * 60,     // 2880 min
  THREE_DAYS: 72 * 60    // 4320 min
};

/**
 * Calculates elapsed whole minutes between a creation record and reference time
 */
function calculateElapsedMinutes(createdAt, now = new Date()) {
  if (!createdAt) return 0;
  const createdMs = new Date(createdAt).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (isNaN(createdMs) || isNaN(nowMs)) return 0;
  return Math.max(0, Math.floor((nowMs - createdMs) / 60000));
}

/**
 * Categorize an elapsed minute count into an SLA urgency tier
 */
function classifySlaTier(elapsedMinutes) {
  if (typeof elapsedMinutes !== 'number' || elapsedMinutes < 0) {
    return SLA_TIERS.NORMAL;
  }
  if (elapsedMinutes < SLA_MINUTE_THRESHOLDS.ONE_DAY) {
    return SLA_TIERS.NORMAL;
  }
  if (elapsedMinutes < SLA_MINUTE_THRESHOLDS.TWO_DAYS) {
    return SLA_TIERS.ATTENTION;
  }
  if (elapsedMinutes < SLA_MINUTE_THRESHOLDS.THREE_DAYS) {
    return SLA_TIERS.WARNING;
  }
  return SLA_TIERS.OVERDUE;
}

/**
 * Generates a Prisma DateTime filter for `createdAt` corresponding to an SLA tier
 */
function tierToCreatedAtRange(tier, now = new Date()) {
  const refTime = now instanceof Date ? now : new Date(now);
  const oneDayAgo = new Date(refTime.getTime() - SLA_MINUTE_THRESHOLDS.ONE_DAY * 60000);
  const twoDaysAgo = new Date(refTime.getTime() - SLA_MINUTE_THRESHOLDS.TWO_DAYS * 60000);
  const threeDaysAgo = new Date(refTime.getTime() - SLA_MINUTE_THRESHOLDS.THREE_DAYS * 60000);

  switch (tier?.toUpperCase()) {
    case SLA_TIERS.NORMAL:
      return { gte: oneDayAgo };
    case SLA_TIERS.ATTENTION:
      return { lt: oneDayAgo, gte: twoDaysAgo };
    case SLA_TIERS.WARNING:
      return { lt: twoDaysAgo, gte: threeDaysAgo };
    case SLA_TIERS.OVERDUE:
      return { lt: threeDaysAgo };
    default:
      return null;
  }
}

module.exports = {
  SLA_TIERS,
  SLA_MINUTE_THRESHOLDS,
  calculateElapsedMinutes,
  classifySlaTier,
  tierToCreatedAtRange
};
