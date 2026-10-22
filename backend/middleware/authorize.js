const { subject } = require('@casl/ability');
const prisma = require('../config/db');
const { buildPrismaScope } = require('../config/ability');

/**
 * Parses overloaded arguments for authorize middleware:
 * - authorize('inquiry.read', options) -> resource: 'inquiry', action: 'read'
 * - authorize('read', 'inquiry', options) -> resource: 'inquiry', action: 'read'
 * Normalizes resource and action to lowercase.
 */
function parseAuthorizeArgs(actionOrCode, resourceOrOptions, options = {}) {
  let action = '';
  let resource = '';
  let opts = {};

  if (typeof actionOrCode === 'string' && actionOrCode.includes('.')) {
    const parts = actionOrCode.split('.');
    resource = parts[0].toLowerCase();
    action = parts.slice(1).join('.').toLowerCase();
    opts = (typeof resourceOrOptions === 'object' && resourceOrOptions !== null) ? resourceOrOptions : options;
  } else {
    action = (actionOrCode || '').toLowerCase();
    resource = (typeof resourceOrOptions === 'string' ? resourceOrOptions : '').toLowerCase();
    opts = (typeof options === 'object' && options !== null) ? options : {};
  }

  return { action, resource, opts };
}

/**
 * Authorize if user satisfies ANY of the specified permissions.
 */
const authorizeAny = (permissions = [], options = {}) => {
  const permList = Array.isArray(permissions) ? permissions : [permissions];

  return async (req, res, next) => {
    if (!req.ability || typeof req.ability.can !== 'function') {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'NO_PERMISSIONS',
        message: 'No authorization context found for this user'
      });
    }

    const canPerform = permList.some(p => {
      const { action, resource } = parseAuthorizeArgs(p);
      return req.ability.can(action, resource);
    });

    if (!canPerform) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'MISSING_PERMISSION',
        requiredPermission: permList.join(' OR '),
        message: `You do not have any of the required permissions: ${permList.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Unified authorization middleware
 * 1. Checks overall capability gate via req.ability.can(action, resource)
 * 2. Injects Prisma query scope filter into req.permissionScope
 * 3. Enforces single-record IDOR ownership check when targetParam (:id) and model/resolver exist
 */
const authorize = (actionOrCode, resourceOrOptions, options = {}) => {
  if (Array.isArray(actionOrCode)) {
    return authorizeAny(actionOrCode, resourceOrOptions);
  }

  const { action, resource, opts } = parseAuthorizeArgs(actionOrCode, resourceOrOptions, options);

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
    const canPerform = req.ability.can(action, resource);

    if (!canPerform) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'MISSING_PERMISSION',
        requiredPermission: `${resource}.${action}`,
        message: `You do not have the required permission: ${resource}.${action}`
      });
    }

    // 2. Query scope injection for list/filter queries
    req.permissionScope = buildPrismaScope(req.ability, action, resource);

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
        if (!req.ability.can(action, subject(resource, record))) {
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

authorize.authorize = authorize;
authorize.authorizeAny = authorizeAny;
authorize.parseAuthorizeArgs = parseAuthorizeArgs;

module.exports = authorize;
