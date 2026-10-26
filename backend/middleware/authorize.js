const { subject } = require('@casl/ability');
const prisma = require('../config/db');
const { buildPrismaScope } = require('../config/ability');

/**
 * Authorize if user satisfies ANY of the specified CASL permissions:
 * - permissions: Array of [action, resource] pairs, e.g. [['create', 'team'], ['read', 'team']]
 */
const authorizeAny = (permissions = []) => {
  return async (req, res, next) => {
    if (!req.ability || typeof req.ability.can !== 'function') {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'NO_PERMISSIONS',
        message: 'No authorization context found for this user'
      });
    }

    const canPerform = permissions.some(perm => {
      if (Array.isArray(perm) && perm.length >= 2) {
        return req.ability.can(perm[0].toLowerCase(), perm[1].toLowerCase());
      }
      return false;
    });

    if (!canPerform) {
      const formatted = permissions
        .map(p => Array.isArray(p) ? `${p[1]}.${p[0]}` : String(p))
        .join(' OR ');
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'MISSING_PERMISSION',
        requiredPermission: formatted,
        message: `You do not have any of the required permissions: ${formatted}`
      });
    }

    next();
  };
};

/**
 * Unified CASL authorization middleware
 * 1. Checks overall capability gate via req.ability.can(action, resource)
 * 2. Injects Prisma query scope filter into req.permissionScope
 * 3. Enforces single-record IDOR ownership check when targetParam (:id) and model/resolver exist
 */
const authorize = (action, resource, options = {}) => {
  if (Array.isArray(action)) {
    return authorizeAny(action);
  }

  const act = (action || '').toLowerCase();
  const resName = (resource || '').toLowerCase();
  const opts = options || {};

  return async (req, res, next) => {
    // 0. Ensure ability is present
    if (!req.ability || typeof req.ability.can !== 'function') {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'NO_PERMISSIONS',
        message: 'No authorization context found for this user'
      });
    }

    // 1. Gate 1: Overall capability check
    const canPerform = req.ability.can(act, resName);

    if (!canPerform) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'MISSING_PERMISSION',
        requiredPermission: `${resName}.${act}`,
        message: `You do not have the required permission: ${resName}.${act}`
      });
    }

    // 2. Query scope injection for list/filter queries
    req.permissionScope = buildPrismaScope(req.ability, act, resName);

    // 3. IDOR protection for single-record lookups and mutations
    const targetParam = opts.targetParam || 'id';
    const targetId = req.params?.[targetParam];
    const hasResolver = typeof opts.ownership?.resolver === 'function';
    const resourceModel = opts.resourceModel;

    if (targetId !== undefined && (hasResolver || resourceModel)) {
      try {
        let record = null;
        if (hasResolver) {
          record = await opts.ownership.resolver(req);
        } else if (resourceModel && prisma[resourceModel]) {
          const idNum = Number(targetId);
          if (!isNaN(idNum)) {
            record = await prisma[resourceModel].findUnique({ where: { id: idNum } });
          }
        }

        // If target record does not exist in DB
        if (!record) {
          return res.status(404).json({ error: 'Resource not found' });
        }

        // Evaluate target record directly against user's CASL ability
        if (!req.ability.can(act, subject(resName, record))) {
          return res.status(404).json({ error: 'Resource not found' });
        }

        req.resource = record;
      } catch (err) {
        return res.status(500).json({ error: 'Authorization verification failed', details: err.message });
      }
    }

    next();
  };
};

/**
 * Restricts route strictly to super-administrators
 */
const requireAdmin = (req, res, next) => {
  const roleName = (req.user?.roleName || '').toLowerCase();
  const isAdmin = roleName === 'admin' || roleName === 'administrator' || req.ability?.can('manage', 'all');

  if (!isAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      reason: 'ADMIN_ONLY',
      message: 'This operation is restricted to administrators only'
    });
  }

  next();
};

authorize.authorize = authorize;
authorize.authorizeAny = authorizeAny;
authorize.requireAdmin = requireAdmin;

module.exports = authorize;
