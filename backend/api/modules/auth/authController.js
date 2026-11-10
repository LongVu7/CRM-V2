const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../../../config/db');
const { getEffectivePermissions, resolveTeamScopes, buildUserContext } = require('../../../middleware/auth');
const { defineAbilityFor } = require('../../../config/ability');

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
    const ability = defineAbilityFor({
      accountId: account.id,
      roleId: account.roleId,
      roleName: account.role?.name || null,
      permissions: effectivePermissions,
      ...teamScopes
    });
    const user = buildUserContext(account, effectivePermissions, teamScopes, ability);

    res.status(200).json({
      message: 'Login successful',
      user
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
    user: req.user
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
    user: req.user
  });
};

// ─── Change Password ───
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const account = await prisma.account.findUnique({
      where: { id: req.user.accountId },
      select: { id: true, password: true }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, account.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password', details: error.message });
  }
};

// ─── Update Profile ───
const updateProfile = async (req, res) => {
  try {
    const { fullName } = req.body;

    if (fullName !== undefined && (typeof fullName !== 'string' || !fullName.trim())) {
      return res.status(400).json({ error: 'Full name cannot be empty' });
    }

    const updated = await prisma.account.update({
      where: { id: req.user.accountId },
      data: {
        ...(fullName !== undefined && { fullName: fullName.trim() })
      },
      select: { id: true, fullName: true, email: true }
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        ...req.user,
        fullName: updated.fullName
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
};

module.exports = {
  login,
  logout,
  getMe,
  refreshToken,
  changePassword,
  updateProfile
};
