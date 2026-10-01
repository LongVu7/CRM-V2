const prisma = require('../../../config/db');

// ─── List all available system permissions (grouped by resource)
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }]
    });

    const uniqueActions = [...new Set(permissions.map(p => p.action))].sort();

    res.status(200).json({
      message: 'Permissions retrieved successfully',
      actions: uniqueActions,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions', details: error.message });
  }
};

module.exports = { getAllPermissions };
