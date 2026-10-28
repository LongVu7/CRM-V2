const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { defineAbilityFor } = require('../config/ability');
const { getDescendantSubtreeTeamIds } = require('../api/utils/teamHierarchy');

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
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        teamsLed: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!account || !account.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    // 1. Primary account role permissions
    const primaryPermissions = (account.role?.permissions || []).map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      action: rp.permission.action,
      resource: rp.permission.resource,
      scope: rp.scope
    }));

    // 2. Contextual team role permissions (from single team membership)
    const membership = account.teamMemberships?.[0] || null;
    const memberTeamId = membership?.teamId || null;
    const contextualPermissions = (membership?.role?.permissions || []).map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      action: rp.permission.action,
      resource: rp.permission.resource,
      scope: rp.scope
    }));

    // Merge & deduplicate permissions
    const permissionsMap = new Map();
    [...primaryPermissions, ...contextualPermissions].forEach(p => {
      permissionsMap.set(`${p.resource}:${p.action}:${p.scope}`, p);
    });
    const effectivePermissions = Array.from(permissionsMap.values());

    // 3. Resolve team IDs & subtrees
    // Leaders supervise the teams they lead PLUS all subtrees
    const ledTeamIds = (account.teamsLed || []).map(t => t.id);
    const ledSubtreeTeamIds = await getDescendantSubtreeTeamIds(ledTeamIds);

    const authorizedTeamIdsSet = new Set(ledSubtreeTeamIds);
    // Regular members only access their immediate team, not descendant subtrees
    if (memberTeamId) {
      authorizedTeamIdsSet.add(memberTeamId);
    }
    const authorizedTeamIds = Array.from(authorizedTeamIdsSet);

    // 4. Construct CASL pure ability instance
    const ability = defineAbilityFor({
      accountId: account.id,
      roleId: account.roleId,
      roleName: account.role?.name || null,
      authorizedTeamIds,
      permissions: effectivePermissions
    });

    req.ability = ability;
    req.user = {
      accountId: account.id,
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      roleId: account.roleId,
      roleName: account.role?.name || null,
      memberTeamId,
      ledTeamIds,
      teamIds: authorizedTeamIds,
      authorizedTeamIds,
      permissions: new Set(effectivePermissions.map(p => p.code)),
      rolePermissions: effectivePermissions
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
        requiredRoles: allowedRoles,
        userRole: req.user?.roleName || null
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  checkRole
};