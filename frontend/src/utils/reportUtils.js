// ─── Report and Dashboard Calculations

/**
 * Calculate percentage rate rounded to 2 decimal places.
 */
export const calcRate = (num, den) => {
  if (!den || den === 0) return 0
  return Number(((num / den) * 100).toFixed(2))
}

/**
 * Accumulate counts and calculate derived rates for performance tables (Major, Region, etc.).
 */
export const calcPerformanceTotals = (rows = []) => {
  let totalProcessed = 0
  let interacted = 0
  let nb = 0
  let notInteracted = 0
  let wrongNumber = 0
  let notInterested = 0
  let unprocessed = 0

  for (const r of rows) {
    totalProcessed += r.totalProcessed || 0
    interacted += r.interacted || 0
    nb += r.nb || 0
    notInteracted += r.notInteracted || 0
    wrongNumber += r.wrongNumber || 0
    notInterested += r.notInterested || 0
    unprocessed += r.unprocessed || 0
  }

  return {
    totalProcessed,
    interacted,
    interactionRate: calcRate(interacted, totalProcessed),
    nb,
    nbRate: calcRate(nb, interacted),
    notInteracted,
    notInteractedRate: calcRate(notInteracted, totalProcessed),
    wrongNumberRate: calcRate(wrongNumber, totalProcessed),
    notInterestedRate: calcRate(notInterested, totalProcessed),
    unprocessed
  }
}
