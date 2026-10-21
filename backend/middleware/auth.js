const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { defineAbilityFor } = require('../config/ability');

// ─── Verify JWT from cookie (or Bearer header) and load user with dynamic permissions & CASL ability
const authenticate = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers?.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await prisma.account.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                scope: true,
                permission: {
                  select: { id: true, code: true, action: true, resource: true }
                }
              }
            }
          }
        },
        teamMemberships: {
          select: {
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    scope: true,
                    permission: {
                      select: { id: true, code: true, action: true, resource: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!account || !account.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    const rolePermissions = (account.role?.permissions || []).map(rp => ({
      code: rp.permission.code,
      action: rp.permission.action,
      resource: rp.permission.resource,
      scope: rp.scope
    }));

    const teamIds = (account.teamMemberships || []).map(tm => tm.teamId);
    const teamPermissions = [];
    for (const tm of account.teamMemberships || []) {
      if (tm.team?.permissions) {
        for (const tp of tm.team.permissions) {
          teamPermissions.push({
            code: tp.permission.code,
            action: tp.permission.action,
            resource: tp.permission.resource,
            scope: tp.scope
          });
        }
      }
    }

    const ability = defineAbilityFor({
      accountId: account.id,
      roleId: account.roleId,
      roleName: account.role?.name || null,
      teamIds,
      rolePermissions,
      teamPermissions
    });

    req.ability = ability;
    req.user = {
      accountId: account.id,
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      roleId: account.roleId,
      roleName: account.role?.name || null,
      teamIds,
      rolePermissions,
      teamPermissions,
      permissions: new Set([
        ...rolePermissions.map(p => p.code),
        ...teamPermissions.map(p => p.code)
      ])
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