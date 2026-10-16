/**
 * Read-Gated Mutation Policy
 *
 * Enforces that mutation permissions require corresponding read capability.
 * A mutation permission (e.g. update_all, delete_all) cannot be assigned unless
 * the account or group has at least one of its required read permissions.
 * Support the situtation that account has update_all or delete_all but do not have read_all
 */

const readGatedMutations = {
  'inquiry.update_all':      ['inquiry.read_all'],
  'inquiry.delete_all':      ['inquiry.read_all'],
  'inquiry.update_group':    ['inquiry.read_group', 'inquiry.read_all'],
  'inquiry.update_assigned': ['inquiry.read_assigned', 'inquiry.read_group', 'inquiry.read_all'],
  'inquiry.delete_assigned': ['inquiry.read_assigned', 'inquiry.read_group', 'inquiry.read_all']
};

// Validates that all mutation permissions in a given list satisfy their read-gate requirements.
function validateReadGatedMutations(permissionCodes) {
  const codes = new Set(permissionCodes || []);

  for (const [mutation, requiredReads] of Object.entries(readGatedMutations)) {
    if (codes.has(mutation)) {
      const hasReadAccess = requiredReads.some(readPerm => codes.has(readPerm));
      if (!hasReadAccess) {
        return {
          valid: false,
          error: `Permission '${mutation}' requires at least one of: ${requiredReads.join(', ')}`
        };
      }
    }
  }

  return { valid: true, error: null };
}

module.exports = {
  readGatedMutations,
  validateReadGatedMutations,
  validateScopeConsistency: validateReadGatedMutations
};
