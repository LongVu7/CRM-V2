const { PROCESSED_INTERACTIONS, INTERACTED_INTERACTIONS, NB_GENERAL } = require('../../utils/statusGroups');

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

const MAJOR_ROOT_KEYS = ['right_major_interest', 'related_major_interest', 'different_major_interest'];

const REGION_LABELS = {
  HO_CHI_MINH: 'TP HCM',
  CORE_PROVINCE: 'Tỉnh ruột',
  OTHER_PROVINCE: 'Tỉnh ngoài',
  FOREIGN: 'Nước ngoài',
};

module.exports = {
  PROCESSED_INTERACTIONS,
  INTERACTED_INTERACTIONS,
  NB_GENERAL,
  STATUS_BUCKETS,
  MAJOR_ROOT_KEYS,
  REGION_LABELS
};
