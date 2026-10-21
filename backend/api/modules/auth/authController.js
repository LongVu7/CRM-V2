const passport = require('passport');
const jwt = require('jsonwebtoken');

// ─── Login
const login = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, account, info) => {
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
      maxAge: 45 * 60 * 1000 // 45 minutes
    });

    const rolePermissions = (account.role?.permissions || []).map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      action: rp.permission.action,
      resource: rp.permission.resource,
      scope: rp.scope
    }));

    const teamMemberships = account.teamMemberships || [];
    const teamIds = teamMemberships.map(tm => tm.teamId);
    const teamPermissions = [];
    for (const tm of teamMemberships) {
      if (tm.team?.permissions) {
        for (const tp of tm.team.permissions) {
          teamPermissions.push({
            id: tp.permission.id,
            code: tp.permission.code,
            action: tp.permission.action,
            resource: tp.permission.resource,
            scope: tp.scope,
            teamId: tm.teamId
          });
        }
      }
    }

    const permissionCodes = Array.from(new Set([
      ...rolePermissions.map(p => p.code),
      ...teamPermissions.map(p => p.code)
    ]));

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        roleName: account.role?.name || null,
        teamIds,
        permissions: permissionCodes,
        rolePermissions,
        teamPermissions
      }
    });
  })(req, res, next);
};

// ─── Logout
const logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
};

// ─── Get current user
const getMe = (req, res) => {
  res.status(200).json({
    user: {
      id: req.user.accountId,
      email: req.user.email,
      fullName: req.user.fullName,
      roleName: req.user.roleName,
      teamIds: req.user.teamIds || [],
      permissions: Array.from(req.user.permissions || []),
      rolePermissions: req.user.rolePermissions || [],
      teamPermissions: req.user.teamPermissions || []
    }
  });
};

// ─── Refresh token (re-issue JWT with current role from DB)
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
    sameSite: 'none',
    maxAge: 45 * 60 * 1000
  });

  res.status(200).json({
    message: 'Token refreshed',
    user: {
      id: req.user.accountId,
      email: req.user.email,
      fullName: req.user.fullName,
      roleName: req.user.roleName,
      teamIds: req.user.teamIds || [],
      permissions: Array.from(req.user.permissions || []),
      rolePermissions: req.user.rolePermissions || [],
      teamPermissions: req.user.teamPermissions || []
    }
  });
};

module.exports = {
  login,
  logout,
  getMe,
  refreshToken
};
