const passport = require('passport');
const jwt = require('jsonwebtoken');
const { getDescendantSubtreeTeamIds } = require('../../utils/teamHierarchy');

// ─── Login
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

    // 1. Primary role permissions
    const primaryPermissions = (account.role?.permissions || []).map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      action: rp.permission.action,
      resource: rp.permission.resource,
      scope: rp.scope
    }));

    // 2. Contextual team role permissions
    const membership = account.teamMemberships?.[0] || null;
    const memberTeamId = membership?.teamId || null;
    const contextualPermissions = (membership?.role?.permissions || []).map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      action: rp.permission.action,
      resource: rp.permission.resource,
      scope: rp.scope
    }));

    const permissionsMap = new Map();
    [...primaryPermissions, ...contextualPermissions].forEach(p => {
      permissionsMap.set(`${p.resource}:${p.action}:${p.scope}`, p);
    });
    const effectivePermissions = Array.from(permissionsMap.values());

    // 3. Subtree authorized team IDs
    const ledTeamIds = (account.teamsLed || []).map(t => t.id);
    const rootTeamIds = new Set();
    if (memberTeamId) rootTeamIds.add(memberTeamId);
    ledTeamIds.forEach(id => rootTeamIds.add(id));

    const authorizedTeamIds = await getDescendantSubtreeTeamIds(Array.from(rootTeamIds));
    const permissionCodes = Array.from(new Set(effectivePermissions.map(p => p.code)));

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        roleName: account.role?.name || null,
        memberTeamId,
        ledTeamIds,
        teamIds: authorizedTeamIds,
        authorizedTeamIds,
        permissions: permissionCodes,
        rolePermissions: effectivePermissions
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
      memberTeamId: req.user.memberTeamId,
      ledTeamIds: req.user.ledTeamIds || [],
      teamIds: req.user.authorizedTeamIds || [],
      authorizedTeamIds: req.user.authorizedTeamIds || [],
      permissions: Array.from(req.user.permissions || []),
      rolePermissions: req.user.rolePermissions || []
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
      memberTeamId: req.user.memberTeamId,
      ledTeamIds: req.user.ledTeamIds || [],
      teamIds: req.user.authorizedTeamIds || [],
      authorizedTeamIds: req.user.authorizedTeamIds || [],
      permissions: Array.from(req.user.permissions || []),
      rolePermissions: req.user.rolePermissions || []
    }
  });
};

module.exports = {
  login,
  logout,
  getMe,
  refreshToken
};
