import apiClient from './apiClient';

export const getMyExtension = async () => {
  const response = await apiClient.get('/voip-extensions/me');
  return response.data;
};
