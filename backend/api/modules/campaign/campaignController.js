const campaignService = require('./campaignService');

// ─── Campaign CRUD ───

const createCampaign = async (req, res) => {
  try {
    const createdById = req.user ? req.user.id : null;
    const campaign = await campaignService.createCampaign(req.body, createdById);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error creating campaign' });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await campaignService.updateCampaign(req.params.id, req.body);
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error updating campaign' });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error fetching campaign' });
  }
};

const listCampaigns = async (req, res) => {
  try {
    const campaigns = await campaignService.listCampaigns();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error fetching campaigns' });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    await campaignService.deleteCampaign(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error deleting campaign' });
  }
};

// ─── Activity CRUD ───

const createActivity = async (req, res) => {
  try {
    const activity = await campaignService.createActivity(req.params.id, req.body);
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error creating activity' });
  }
};

const updateActivity = async (req, res) => {
  try {
    const activity = await campaignService.updateActivity(req.params.activityId, req.body);
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error updating activity' });
  }
};

const deleteActivity = async (req, res) => {
  try {
    await campaignService.deleteActivity(req.params.activityId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error deleting activity' });
  }
};

// ─── Activity Recipients ───

const addRecipients = async (req, res) => {
  try {
    const { inquiryIds } = req.body;
    const result = await campaignService.addRecipients(req.params.activityId, inquiryIds);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error adding recipients' });
  }
};

// ─── Send Email ───

const sendActivity = async (req, res) => {
  try {
    const result = await campaignService.sendEmailActivity(req.params.activityId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error sending activity' });
  }
};

module.exports = {
  createCampaign,
  updateCampaign,
  getCampaignById,
  listCampaigns,
  deleteCampaign,
  createActivity,
  updateActivity,
  deleteActivity,
  addRecipients,
  sendActivity
};
