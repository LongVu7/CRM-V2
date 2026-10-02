import apiClient from './apiClient';

export const getAllDispositions = async () => {
  const response = await apiClient.get('/call-dispositions');
  return response.data;
};

// CRUD for admin UI can be added here
