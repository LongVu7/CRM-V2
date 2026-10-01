const templateService = require('./templateService');
const templateRenderer = require('./templateRenderer');
const { parsePagination } = require('../../utils/pagination');

const createTemplate = async (req, res) => {
  try {
    const createdById = req.user ? req.user.id : null;
    const template = await templateService.createTemplate(req.body, createdById);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error creating template' });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error fetching template' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error updating template' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const result = await templateService.deleteTemplate(req.params.id);
    res.status(200).json({ message: 'Template successfully deleted/archived', result });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error deleting template' });
  }
};

const listTemplates = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search || '';
    const channel = req.query.channel || null;
    const status = req.query.status || null;

    const { templates, pagination } = await templateService.listTemplates({ page, limit, skip, search, channel, status });
    res.json({ data: templates, pagination });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error fetching templates' });
  }
};

const getVariables = (req, res) => {
  try {
    const variables = templateRenderer.getAvailableVariables();
    res.json(variables);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error fetching template variables' });
  }
};

module.exports = {
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  listTemplates,
  getVariables
};
