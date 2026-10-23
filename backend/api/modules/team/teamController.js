const teamService = require('./teamService');

const getAllTeams = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const data = await teamService.getAllTeams({ page, limit, search }, req.permissionScope);
    res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const getTeamTree = async (req, res) => {
  try {
    const data = await teamService.getTeamTree(req.permissionScope);
    res.status(200).json({
      success: true,
      data
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
    const data = await teamService.createTeam(req.body, req.user?.accountId);
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
    const data = await teamService.deleteTeam(id);
    res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await teamService.addMember(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Member assigned to team successfully',
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
    const data = await teamService.removeMember(id, accountId);
    res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const getAvailableAccounts = async (req, res) => {
  try {
    const data = await teamService.getAvailableAccounts();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const getParentTeamOptions = async (req, res) => {
  try {
    const { excludeTeamId } = req.query;
    const data = await teamService.getParentTeamOptions(excludeTeamId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllTeams,
  getTeamTree,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  getAvailableAccounts,
  getParentTeamOptions
};
