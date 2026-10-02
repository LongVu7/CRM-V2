import apiClient from './apiClient';

export const createCall = async (payload) => {
  const response = await apiClient.post('/calls', payload);
  return response.data;
};

export const getAllCalls = async (params) => {
  const response = await apiClient.get('/calls', { params });
  return response.data;
};
