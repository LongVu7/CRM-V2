/**
 * Distributes an array of inquiry IDs sequentially across an ordered array of staff IDs.
 */
function calculateRoundRobin(inquiryIds = [], staffIds = []) {
  if (!Array.isArray(inquiryIds) || !Array.isArray(staffIds) || inquiryIds.length === 0 || staffIds.length === 0) {
    return [];
  }

  const staffCount = staffIds.length;
  return inquiryIds.map((inquiryId, index) => {
    const staffIndex = index % staffCount;
    return {
      inquiryId,
      assignedToId: staffIds[staffIndex],
      orderRank: staffIndex + 1
    };
  });
}

/**
 * Summarizes Round-Robin allocations per recipient staff member.
 * Useful for distribution preview endpoints and confirmation payloads.
 */
function summarizeAllocations(inquiryIds = [], staffList = []) {
  const total = Array.isArray(inquiryIds) ? inquiryIds.length : 0;
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

    const assignedInquiryIds = [];
    for (let i = index; i < total; i += staffCount) {
      assignedInquiryIds.push(inquiryIds[i]);
    }

    return {
      staffId,
      fullName,
      orderRank: index + 1,
      allocatedCount,
      isPriorityTurn: isPriorityTurn && remainder > 0,
      inquiryIds: assignedInquiryIds
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
