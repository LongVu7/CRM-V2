import { ref } from 'vue';
import { useCallSessionStore } from '@/stores/callSessionStore';
// import { sipClient } from '@/utils/sipClient';
import * as api from '@/services/voipExtensionService';

export function useVoip() {
  const store = useCallSessionStore();
  const loading = ref(false);
  const error = ref(null);

  const initializeVoip = async () => {
    loading.value = true;
    error.value = null;
    try {
      // 1. Fetch ephemeral SIP credentials
      const response = await api.getMyExtension();
      
      const config = {
        wssUrl: response.data.wssUrl,
        sipToken: response.data.sipToken,
        extensionNumber: response.data.extensionNumber,
      };

      // 2. Save to ephemeral store
      store.setVoipConfig(config);

      // 3. Initialize SIP client
      await sipClient.init({
        wsUrl: config.wssUrl,
        extension: config.extensionNumber,
        password: config.sipToken
      });

    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message;
      store.clearVoipConfig();
    } finally {
      loading.value = false;
    }
  };

  const disconnectVoip = () => {
    sipClient.disconnect();
    store.clearVoipConfig();
  };

  return {
    initializeVoip,
    disconnectVoip,
    loading,
    error,
    isRegistered: store.isRegistered
  };
}
