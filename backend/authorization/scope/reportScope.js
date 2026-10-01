const { getManagedGroupMemberIds } = require('./inquiryScope');

async function buildReportScope(user) {
  if (user.permissions.has('report.read_all')) {
    return { mode: 'all', assignedToIds: null };
  }

  const ids = [user.accountId];

  if (user.permissions.has('report.read_group')) {
    const memberIds = await getManagedGroupMemberIds(user.accountId);
    ids.push(...memberIds);
  }

  return { mode: 'assigned', assignedToIds: [...new Set(ids)] };
}

module.exports = {
  buildReportScope
};
