// !!-- Create an idempotent key for import process to prevent duplicate imports --!   Notes: Migrate Redis for cache data
// Map<token, { accountId, data, createdAt, expiresAt, status }>
const importTokens = new Map();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, value] of importTokens.entries()) {
    if (now > value.expiresAt) {
      importTokens.delete(token);
    }
  }
}, 60 * 1000);

module.exports = importTokens;
