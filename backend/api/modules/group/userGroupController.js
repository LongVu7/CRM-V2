const userGroupService = require('./userGroupService');

// Helper: translate service errors to HTTP responses
const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message, ...(status === 500 && { details: error.message }) });
};

// ─── List all groups
const getAllGroups = async (req, res) => {
  try {
    const groups = await userGroupService.getAllGroups(req.user);
    res.status(200).json({
      message: 'Get all groups successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      totalGroups: groups.length,
      groups
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get single group by ID
const getGroupById = async (req, res) => {
  try {
    const data = await userGroupService.getGroupById(req.params.id);
    // Flatten permission IDs for frontend render
    const permissionIds = (data.permissions || []).map(gp => gp.permissionId);
    res.status(200).json({
      message: 'Get group by ID successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: { ...data, permissionIds }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Create group
const createGroup = async (req, res) => {
  try {
    const { name, groupLeaderId, permissionIds } = req.body;
    const data = await userGroupService.createGroup(name, groupLeaderId, req.user, permissionIds);
    res.status(201).json({
      message: 'Group created successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Update group
const updateGroup = async (req, res) => {
  try {
    const { name, groupLeaderId, permissionIds } = req.body;
    const data = await userGroupService.updateGroup(req.params.id, { name, groupLeaderId, permissionIds });
    res.status(200).json({
      message: 'Group updated successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Delete group
const deleteGroup = async (req, res) => {
  try {
    await userGroupService.deleteGroup(req.params.id);
    res.status(200).json({
      message: 'Group deleted successfully. Member accounts were preserved.',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Add member to group
const addMemberToGroup = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required in the request body' });
    }

    const data = await userGroupService.addMemberToGroup(req.params.id, accountId);
    res.status(200).json({
      message: 'Member added to group successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Remove member from group
const removeMemberFromGroup = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required in the request body' });
    }

    const memberDeleted = await userGroupService.removeMemberFromGroup(req.params.id, accountId);
    res.status(200).json({
      message: 'Member removed from group successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      memberDeleted
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup
};