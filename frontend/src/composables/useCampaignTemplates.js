import { ref } from 'vue';
import { 
  getAllTemplates, 
  getTemplateById, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate, 
  getTemplateVariables 
} from '@/services/campaignTemplateService';

export const useCampaignTemplates = () => {
  const templates = ref([]);
  const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const loading = ref(false);
  const error = ref(null);
  const variables = ref([]);

  const fetchTemplates = async (params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await getAllTemplates(params);
      templates.value = response.data || [];
      if (response.pagination) {
        pagination.value = response.pagination;
      }
      return response;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch templates';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTemplateById = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await getTemplateById(id);
      return response;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch template';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const saveTemplate = async (data) => {
    loading.value = true;
    error.value = null;
    try {
      if (data.id) {
        const response = await updateTemplate(data.id, data);
        return response;
      } else {
        const response = await createTemplate(data);
        return response;
      }
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to save template';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeTemplate = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await deleteTemplate(id);
      return response;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to delete template';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchVariables = async () => {
    try {
      const response = await getTemplateVariables();
      variables.value = response || [];
      return variables.value;
    } catch (err) {
      console.error('Failed to fetch variables', err);
      return [];
    }
  };

  return {
    templates,
    pagination,
    loading,
    error,
    variables,
    fetchTemplates,
    fetchTemplateById,
    saveTemplate,
    removeTemplate,
    fetchVariables
  };
};
