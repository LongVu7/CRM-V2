const enumConstants = require('./enumConstants');
const statusConstants = require('./statusConstants');

module.exports = {
  ...enumConstants,
  ...statusConstants,
  enumConstants,
  statusConstants
};
