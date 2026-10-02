const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Normalizes a phone number to E.164 format.
 * Assumes VN region by default if no country code provided.
 * @param {string} phoneNumber 
 * @returns {string|null} Normalized E.164 number or null if invalid
 */
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  const parsed = parsePhoneNumberFromString(phoneNumber, 'VN');
  if (parsed && parsed.isValid()) {
    return parsed.format('E.164');
  }
  return null;
};

module.exports = {
  normalizePhoneNumber
};
