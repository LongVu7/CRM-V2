const passport = require('passport');
const jwt = require('jsonwebtoken');
const { getEffectivePermissions, resolveTeamScopes, buildUserContext } = require('../../../middleware/auth');

// ─── Login ───
const login = (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, account, info) => {
    if (err) {
      return res.status(500).json({
        error: 'Authentication error',
        details: err.message
      });
    }

    if (!account) {
      return res.status(401).json({
        error: info?.message || 'Invalid credentials'
      });
    }

    const payload = {
      sub: account.id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '45m'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 1000 // 45 minutes
    });

    const effectivePermissions = getEffectivePermissions(account);
    const teamScopes = await resolveTeamScopes(account);
    const userPayload = buildUserContext(account, effectivePermissions, teamScopes);

    res.status(200).json({
      message: 'Login successful',
      user: {
        ...userPayload,
        permissions: Array.from(userPayload.permissions)
      }
    });
  })(req, res, next);
};

// ─── Logout ───
const logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
};

// ─── Get current user ───
const getMe = (req, res) => {
  res.status(200).json({
    user: {
      ...req.user,
      permissions: Array.from(req.user.permissions || [])
    }
  });
};

// ─── Refresh token (re-issue JWT with current role from DB) ───
const refreshToken = (req, res) => {
  const payload = {
    sub: req.user.accountId
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '45m'
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 45 * 60 * 1000
  });

  res.status(200).json({
    message: 'Token refreshed',
    user: {
      ...req.user,
      permissions: Array.from(req.user.permissions || [])
    }
  });
};

module.exports = {
  login,
  logout,
  getMe,
  refreshToken
};
