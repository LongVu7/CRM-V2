const { PROCESSED_INTERACTIONS, INTERACTED_INTERACTIONS, NB_GENERAL } = require('../../../constants/statusConstants');

const STATUS_BUCKETS = {
  payment_completed_nb: { field: 'paymentCompletedNb', level: 'general' },
  application_submitted: { field: 'applicationSubmitted', level: 'general' },
  considering: { field: 'considering', level: 'general' },
  interested: { field: 'interested', level: 'general' },
  scheduled_callback: { field: 'scheduledCallback', level: 'general' },
  no_answer: { field: 'noAnswer', level: 'general' },
  unreachable: { field: 'unreachable', level: 'general' },
  not_interested: { field: 'notInterested', level: 'interaction' },
  wrong_number: { field: 'wrongNumber', level: 'interaction' }
};

module.exports = {
  PROCESSED_INTERACTIONS,
  INTERACTED_INTERACTIONS,
  NB_GENERAL,
  STATUS_BUCKETS
};
