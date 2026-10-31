const jwt = require('jsonwebtoken');

/**
 * Generate a Stringee Client Access Token
 * Token TTL in seconds (default: 3600 = 1 hour) Sign JWT token
 */
function generateStringeeToken(userId, expireInSeconds = 3600) {
  const apiKeySid = process.env.STRINGEE_API_KEY_SID;
  const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET;

  if (!apiKeySid || !apiKeySecret) {
    throw new Error('STRINGEE_API_KEY_SID and STRINGEE_API_KEY_SECRET must be configured in environment');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + expireInSeconds;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    cty: 'stringee-api;v=1'
  };

  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    exp,
    userId: String(userId)
  };

  return {
    token: jwt.sign(payload, apiKeySecret, { algorithm: 'HS256', header, noTimestamp: true  }),
    userId: String(userId),
    expiresAt: exp
  };
}

module.exports = {
  generateStringeeToken
};
