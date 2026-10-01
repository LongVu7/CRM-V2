const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { resolveEffectivePermissions } = require('../utils/resolvePermissions');

// ─── Verify JWT from cookie and load user
const authenticate = async (req, res, next) => {
  let token = req.cookies.token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await prisma.account.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: { permission: { select: { code: true } } }
            }
          }
        },
        group: {
          select: {
            permissions: {
              select: { permission: { select: { code: true } } }
            }
          }
        }
      }
    });

    if (!account || !account.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    req.user = {
      accountId: account.id,
      email: account.email,
      fullName: account.fullName,
      roleName: account.role?.name || null,
      permissions: new Set(resolveEffectivePermissions(account))
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Check if user has one of the allowed roles
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({ 
        message: "Forbidden: You do not have the correct role to perform this action.",
        yourRole: req.user?.roleName || "None",
        allowedRoles: allowedRoles
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  checkRole
};