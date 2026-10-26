// ─── Status Classification Constants ─────────────────────────────────
// Defines interaction-level and general status group membership arrays.

const PROCESSED_INTERACTIONS = ['interacted', 'not_interested', 'not_interacted', 'wrong_number'];
const INTERACTED_INTERACTIONS = ['interacted', 'not_interested'];
const TIMELINE_INTERACTED_INTERACTIONS = ['interacted'];
const NB_GENERAL = 'payment_completed_nb';

module.exports = {
  PROCESSED_INTERACTIONS,
  INTERACTED_INTERACTIONS,
  TIMELINE_INTERACTED_INTERACTIONS,
  NB_GENERAL
};
