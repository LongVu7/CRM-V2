import { defineStore } from 'pinia';
import * as api from '@/services/callDispositionService';

export const useCallDispositionStore = defineStore('callDisposition', {
  state: () => ({
    dispositions: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchDispositions() {
      if (this.dispositions.length > 0) return; // Cache locally
      this.loading = true;
      this.error = null;
      try {
        const response = await api.getAllDispositions();
        this.dispositions = response.data || [];
      } catch (err) {
        this.error = err.response?.data?.error || err.message;
      } finally {
        this.loading = false;
      }
    }
  }
});
