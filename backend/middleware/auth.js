const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { defineAbilityFor } = require('../config/ability');
const { getDescendantSubtreeTeamIds, getAuthorizedAccountIds } = require('../api/utils/teamHierarchy');

// ─── Helpers ───

function extractToken(req) {
  let token = req.cookies?.token;
  if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  return token;
}

async function fetchAccountWithRoles(accountId) {
  return prisma.account.findUnique({
    where: { id: accountId },
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
              permission: { select: { id: true, code: true, action: true, resource: true } }
            }
          }
        }
      },
      teamMemberships: {
        take: 1,
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
                  permission: { select: { id: true, code: true, action: true, resource: true } }
                }
              }
            }
          }
        }
      },
      teamsLed: {
        select: { id: true, name: true }
      }
    }
  });
}

function getEffectivePermissions(account) {
  const primary = (account.role?.permissions || []).map(rp => ({
    id: rp.permission.id,
    code: rp.permission.code,
    action: rp.permission.action,
    resource: rp.permission.resource,
    scope: rp.scope
  }));

  const membership = account.teamMemberships?.[0];
  const contextual = (membership?.role?.permissions || []).map(rp => ({
    id: rp.permission.id,
    code: rp.permission.code,
    action: rp.permission.action,
    resource: rp.permission.resource,
    scope: rp.scope
  }));

  const map = new Map();
  [...primary, ...contextual].forEach(p => map.set(`${p.resource}:${p.action}:${p.scope}`, p));
  return Array.from(map.values());
}

async function resolveTeamScopes(account) {
  const ledTeamIds = (account.teamsLed || []).map(t => t.id);
  const ledSubtreeTeamIds = await getDescendantSubtreeTeamIds(ledTeamIds);

  const memberTeamId = account.teamMemberships?.[0]?.teamId || null;
  const authorizedTeamIdsSet = new Set(ledSubtreeTeamIds);
  if (memberTeamId) {
    authorizedTeamIdsSet.add(memberTeamId);
  }

  const authorizedTeamIds = Array.from(authorizedTeamIdsSet);
  const authorizedAccountIds = await getAuthorizedAccountIds(authorizedTeamIds);

  return { memberTeamId, ledTeamIds, authorizedTeamIds, authorizedAccountIds };
}

function buildUserContext(account, effectivePermissions, teamScopes) {
  return {
    accountId: account.id,
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    roleId: account.roleId,
    roleName: account.role?.name || null,
    memberTeamId: teamScopes.memberTeamId,
    ledTeamIds: teamScopes.ledTeamIds,
    teamIds: teamScopes.authorizedTeamIds,
    authorizedTeamIds: teamScopes.authorizedTeamIds,
    authorizedAccountIds: teamScopes.authorizedAccountIds,
    permissions: new Set(effectivePermissions.map(p => p.code)),
    rolePermissions: effectivePermissions
  };
}

// ─── Middleware: Verify JWT and attach user context & CASL ability ───
const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const account = await fetchAccountWithRoles(decoded.sub);

    if (!account || !account.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    const effectivePermissions = getEffectivePermissions(account);
    const teamScopes = await resolveTeamScopes(account);

    req.ability = defineAbilityFor({
      accountId: account.id,
      roleId: account.roleId,
      roleName: account.role?.name || null,
      permissions: effectivePermissions,
      ...teamScopes
    });

    req.user = buildUserContext(account, effectivePermissions, teamScopes);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Middleware: Check role authorization ───
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
  checkRole,
  getEffectivePermissions,
  resolveTeamScopes,
  buildUserContext
};