const { PROCESSED_INTERACTIONS, INTERACTED_INTERACTIONS, NB_GENERAL } = require('./statusConstants');

const STATUS_BUCKETS = {
  payment_completed_nb: 'paymentCompletedNb',
  application_submitted: 'applicationSubmitted',
  considering: 'considering',
  interested: 'interested',
  scheduled_callback: 'scheduledCallback',
  no_answer: 'noAnswer',
  unreachable: 'unreachable',
  not_interested: 'notInterested',
  wrong_number: 'wrongNumber'
};

const METRIC_BUCKETS = {
  interacted: [
    'paymentCompletedNb',
    'applicationSubmitted',
    'considering',
    'interested',
    'scheduledCallback',
    'notInterested'
  ],
  notInteracted: [
    'noAnswer',
    'unreachable'
  ]
};

module.exports = {
  PROCESSED_INTERACTIONS,
  INTERACTED_INTERACTIONS,
  NB_GENERAL,
  STATUS_BUCKETS,
  METRIC_BUCKETS
};
