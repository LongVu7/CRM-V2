import { ref } from 'vue';
import { useCallSessionStore } from '@/stores/callSessionStore';
import { sipClient } from '@/utils/sipClient';
import * as api from '@/services/callService';

export function useCall() {
  const store = useCallSessionStore();
  const loading = ref(false);
  const error = ref(null);

  const makeOutboundCall = async (targetNumber, context = {}) => {
    if (!store.isRegistered) {
      throw new Error('VoIP not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      // 1. Create Call record in DB
      const response = await api.createCall({
        direction: 'OUTBOUND',
        callerNumber: store.extensionNumber,
        destinationNumber: targetNumber,
        studentId: context.studentId,
        inquiryId: context.inquiryId
      });

      // 2. Update local state
      store.setActiveCall({
        id: response.call.correlationId,
        status: 'INITIATING',
        remoteNumber: targetNumber,
        direction: 'OUTBOUND'
      });

      // 3. Command SIP.js to dial
      await sipClient.makeCall(targetNumber);
      
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message;
      store.clearActiveCall();
    } finally {
      loading.value = false;
    }
  };

  const endCall = () => {
    sipClient.disconnect(); // This will eventually be handled better for single calls
  };

  return {
    makeOutboundCall,
    endCall,
    loading,
    error,
    activeCallId: store.activeCallId,
    callStatus: store.callStatus,
    remoteNumber: store.remoteNumber
  };
}
