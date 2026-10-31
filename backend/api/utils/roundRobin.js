/**
 * Distributes an array of lead IDs sequentially across an ordered array of staff IDs.
 */
function calculateRoundRobin(leadIds = [], staffIds = []) {
  if (!Array.isArray(leadIds) || !Array.isArray(staffIds) || leadIds.length === 0 || staffIds.length === 0) {
    return [];
  }

  const staffCount = staffIds.length;
  return leadIds.map((id, index) => {
    const staffIndex = index % staffCount;
    return {
      leadId: id,
      assignedToId: staffIds[staffIndex],
      orderRank: staffIndex + 1
    };
  });
}

/**
 * Summarizes Round-Robin allocations per recipient staff member.
 * Useful for distribution preview endpoints and confirmation payloads.
 */
function summarizeAllocations(leadIds = [], staffList = []) {
  const total = Array.isArray(leadIds) ? leadIds.length : 0;
  const staff = Array.isArray(staffList) ? staffList : [];
  const staffCount = staff.length;

  if (total === 0 || staffCount === 0) {
    return {
      totalRequested: total,
      recipientCount: staffCount,
      averagePerStaff: 0,
      allocations: []
    };
  }

  const baseCount = Math.floor(total / staffCount);
  const remainder = total % staffCount;
  const averagePerStaff = Math.round((total / staffCount) * 100) / 100;

  const allocations = staff.map((member, index) => {
    const staffId = typeof member === 'object' && member !== null ? member.id : member;
    const fullName = typeof member === 'object' && member !== null ? (member.fullName || '') : '';
    const isPriorityTurn = index < remainder;
    const allocatedCount = baseCount + (isPriorityTurn ? 1 : 0);

    const assignedLeadIds = [];
    for (let i = index; i < total; i += staffCount) {
      assignedLeadIds.push(leadIds[i]);
    }

    return {
      staffId,
      fullName,
      orderRank: index + 1,
      allocatedCount,
      isPriorityTurn: isPriorityTurn && remainder > 0,
      leadIds: assignedLeadIds,
    };
  });

  return {
    totalRequested: total,
    recipientCount: staffCount,
    averagePerStaff,
    allocations
  };
}

module.exports = {
  calculateRoundRobin,
  summarizeAllocations
};
