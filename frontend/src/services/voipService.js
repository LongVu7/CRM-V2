import api from '@/services/apiClient';

export const getStringeeToken = async () => {
  const response = await api.get('/voip/token');
  return response.data;
};

export const checkCallReadiness = async (inquiryId) => {
  const response = await api.get(`/inquiries/${inquiryId}/call-readiness`);
  return response.data;
};

export const createCall = async (payload) => {
  const response = await api.post('/calls', payload);
  return response.data;
};

export const updateCall = async (callId, payload) => {
  const response = await api.patch(`/calls/${callId}`, payload);
  return response.data;
};

export const getInquiryCalls = async (inquiryId) => {
  const response = await api.get(`/inquiries/${inquiryId}/calls`);
  return response.data.data;
};

export const getAllCalls = async (params = {}) => {
  const response = await api.get('/calls', { params });
  return response.data;
};

export default {
  getStringeeToken,
  checkCallReadiness,
  createCall,
  updateCall,
  getInquiryCalls,
  getAllCalls
};
