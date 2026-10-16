// ─── Unified authorization middleware
// Checks permission (from req.user.permissions) and optionally resolves resource ownership.

const authorize = (permission, options = {}) => {
  return async (req, res, next) => {
    //Permission check
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'NO_PERMISSIONS',
        message: 'No permissions found for this user'
      });
    }

    const perms = Array.isArray(permission) ? permission : [permission];
    const hasPermission = perms.some(p => req.user.permissions.has(p));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: 'MISSING_PERMISSION',
        requiredPermission: permission,
        message: `You do not have the required permission: ${Array.isArray(permission) ? permission.join(' or ') : permission}`
      });
    }

    //Ownership check (if resolver provided)
    if (options.ownership?.resolver) {
      const resource = await options.ownership.resolver(req);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      req.resource = resource;
    }

    next();
  };
};

module.exports = authorize;
