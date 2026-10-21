const teamService = require('./teamService');

const getAllTeams = async (req, res) => {
  try {
    const result = await teamService.getAllTeams(req.query, req.permissionScope);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await teamService.getTeamById(id, req.permissionScope);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const createTeam = async (req, res) => {
  try {
    const creatorId = req.user?.accountId;
    const data = await teamService.createTeam(req.body, creatorId);
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await teamService.updateTeam(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    await teamService.deleteTeam(id);
    res.status(200).json({
      success: true,
      message: 'Team decommissioned successfully'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId } = req.body;
    const data = await teamService.addMember(id, accountId);
    res.status(200).json({
      success: true,
      message: 'Member added to team successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { id, accountId } = req.params;
    await teamService.removeMember(id, accountId);
    res.status(200).json({
      success: true,
      message: 'Member removed from team successfully'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const updateTeamPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const data = await teamService.updateTeamPermissions(id, permissions, req.user);
    res.status(200).json({
      success: true,
      message: 'Team permissions updated successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateTeamPermissions
};
