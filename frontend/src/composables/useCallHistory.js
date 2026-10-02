import { ref } from 'vue';
import * as api from '@/services/callService';

export function useCallHistory() {
  const calls = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const totalCount = ref(0);

  const fetchCalls = async (params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.getAllCalls(params);
      calls.value = response.data || [];
      totalCount.value = response.totalCount || 0;
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    calls,
    totalCount,
    loading,
    error,
    fetchCalls
  };
}
