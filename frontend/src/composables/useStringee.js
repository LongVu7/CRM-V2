import { ref } from 'vue';
import { getStringeeToken, createCall, updateCall } from '@/services/voipService';

// Singleton client and connection state across views
let clientInstance = null;
let connectPromise = null;
let authenResolve = null;
let authenReject = null;
const isConnected = ref(false);
const isConnecting = ref(false);
const currentUserId = ref('');
const connectionError = ref(null);

// Shared singleton active call and telephony state across views and dialogs
const activeCall = ref(null);
const callState = ref('idle'); // idle, calling, ringing, connected, busy, ended, failed
const callError = ref(null);
const isMuted = ref(false);
const callDuration = ref(0);
const currentCallRecord = ref(null);
let durationInterval = null;
let callStartTime = null;

export function useStringee() {

  /**
   * Helper to ensure the hidden remote audio element exists in DOM
   */
  const getOrCreateAudioElement = () => {
    let audio = document.getElementById('stringee-remote-audio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'stringee-remote-audio';
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
    return audio;
  };

  /**
   * Initialize StringeeClient with token from backend and wait for authentication
   */
  const initClient = async () => {
    if (isConnected.value && clientInstance) {
      return clientInstance;
    }
    if (connectPromise) {
      return connectPromise;
    }

    if (typeof window === 'undefined') return null;

    if (!window.StringeeClient) {
      connectionError.value = 'Stringee Web SDK not loaded';
      console.warn('Stringee Web SDK script is not available on window');
      return null;
    }

    isConnecting.value = true;
    connectionError.value = null;

    try {
      const { token, userId } = await getStringeeToken();
      currentUserId.value = userId;

      connectPromise = new Promise((resolve, reject) => {
        if (!clientInstance) {
          clientInstance = new window.StringeeClient();

          clientInstance.on('connect', () => {
            isConnected.value = true;
          });

          clientInstance.on('authen', (res) => {
            isConnecting.value = false;
            if (res && res.r === 0) {
              isConnected.value = true;
              connectionError.value = null;
              if (authenResolve) authenResolve(clientInstance);
            } else {
              isConnected.value = false;
              const msg = res?.message || 'Stringee authentication failed';
              connectionError.value = msg;
              if (authenReject) authenReject(new Error(msg));
            }
            authenResolve = null;
            authenReject = null;
          });

          clientInstance.on('disconnect', () => {
            isConnected.value = false;
            isConnecting.value = false;
          });

          clientInstance.on('requestAccessToken', async () => {
            try {
              const fresh = await getStringeeToken();
              clientInstance.connect(fresh.token);
            } catch (err) {
              console.error('Failed to refresh Stringee token:', err);
            }
          });
        }

        authenResolve = resolve;
        authenReject = reject;

        setTimeout(() => {
          if (authenReject) {
            isConnecting.value = false;
            connectionError.value = 'Stringee connection timed out';
            authenReject(new Error(connectionError.value));
            authenResolve = null;
            authenReject = null;
          }
        }, 12000);

        clientInstance.connect(token);
      }).finally(() => {
        connectPromise = null;
      });

      return await connectPromise;
    } catch (err) {
      isConnecting.value = false;
      connectionError.value = err.message || 'Failed to initialize Stringee client';
      console.error('initClient error:', err);
      return null;
    }
  };

  const startTimer = () => {
    callStartTime = Date.now();
    callDuration.value = 0;
    if (durationInterval) clearInterval(durationInterval);
    durationInterval = setInterval(() => {
      callDuration.value = Math.floor((Date.now() - callStartTime) / 1000);
    }, 1000);
  };

  const stopTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  };

  /**
   * Initiate an outbound App-to-App call to a student
   */
  const makeCall = async ({ inquiryId, studentId, calleeId, destinationNumber }) => {
    // Check microphone availability and permission
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        callState.value = 'failed';
        throw new Error('Microphone permission denied or microphone not detected. Please allow audio access in your browser settings.');
      }
    }

    const client = await initClient();
    if (!client) {
      callState.value = 'failed';
      throw new Error(connectionError.value || 'Could not connect to Stringee');
    }

    callState.value = 'calling';
    isMuted.value = false;
    callDuration.value = 0;

    // 1. Log initial Call record in CRM database
    try {
      const record = await createCall({
        callerId: currentUserId.value,
        calleeId: String(calleeId),
        destinationNumber: destinationNumber || String(calleeId),
        direction: 'OUTBOUND',
        inquiryId: inquiryId ? Number(inquiryId) : undefined,
        studentId: studentId ? Number(studentId) : undefined
      });
      currentCallRecord.value = record;
    } catch (dbErr) {
      console.warn('Could not pre-save call record:', dbErr);
    }

    // 2. Initialize Call object using StringeeCall (standard App-to-App WebRTC voice)
    const CallConstructor = window.StringeeCall || window.StringeeCall2;
    if (!CallConstructor) {
      callState.value = 'failed';
      throw new Error('StringeeCall constructor not available in SDK');
    }

    const call = new CallConstructor(client, currentUserId.value, String(calleeId), false);
    activeCall.value = call;

    // 3. Attach remote audio stream handlers (StringeeCall uses addremotestream, StringeeCall2 uses addremotetrack)
    call.on('addremotestream', (stream) => {
      const audioEl = getOrCreateAudioElement();
      audioEl.srcObject = stream;
      audioEl.play?.().catch(() => {});
    });

    call.on('addremotetrack', (track) => {
      const audioEl = getOrCreateAudioElement();
      if (track?.attach) {
        const el = track.attach();
        document.body.appendChild(el);
      } else if (track?.stream) {
        audioEl.srcObject = track.stream;
        audioEl.play?.().catch(() => {});
      }
    });

    call.on('signalingstate', (state) => {
      console.log('Stringee signalingstate:', state);
      const code = Number(state?.code);
      const reason = (state?.reason || '').toLowerCase();
      // 1: Calling, 2: Ringing, 3: Starting, 4: Answered, 5: Busy, 6: Ended
      if (code === 1) {
        callState.value = 'calling';
      } else if (code === 2) {
        callState.value = 'ringing';
      } else if (code === 4 || code === 3) {
        callState.value = 'connected';
        startTimer();
      } else if (code === 5 || reason.includes('busy')) {
        callState.value = 'busy';
        stopTimer();
        finalizeCall('BUSY');
      } else if (code === 6 || reason.includes('ended') || reason.includes('bye')) {
        callState.value = 'ended';
        stopTimer();
        finalizeCall(callDuration.value > 0 ? 'COMPLETED' : 'NO_ANSWER');
      }
    });

    call.on('disconnect', () => {
      console.log('Stringee call disconnect event');
      if (callState.value !== 'ended' && callState.value !== 'failed' && callState.value !== 'busy') {
        callState.value = 'ended';
        stopTimer();
        finalizeCall(callDuration.value > 0 ? 'COMPLETED' : 'NO_ANSWER');
      }
    });

    call.on('mediastate', (state) => {
      if (state?.code === 1 && callState.value !== 'connected') {
        callState.value = 'connected';
        startTimer();
      }
    });

    call.on('error', (err) => {
      console.error('Stringee call error:', err);
      callError.value = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      callState.value = 'failed';
      stopTimer();
      finalizeCall('FAILED');
    });

    // 4. Trigger WebRTC outbound call signaling
    call.makeCall(async (res) => {
      console.log('Stringee makeCall callback:', res);
      if (res && res.r === 0) {
        if (currentCallRecord.value && res.callId) {
          try {
            await updateCall(currentCallRecord.value.id, { stringeeCallId: res.callId });
          } catch {
            // Ignore background update failure
          }
        }
      } else {
        const msg = res?.message || `Stringee rejected call (Code: ${res?.r ?? 'unknown'})`;
        console.error('Stringee makeCall rejected:', res);
        callError.value = msg;
        callState.value = 'failed';
        stopTimer();
        if (currentCallRecord.value) {
          await updateCall(currentCallRecord.value.id, { 
            status: 'FAILED',
            note: msg
          }).catch(() => {});
        }
      }
    });

    return call;
  };

  /**
   * Finalize call record duration and state
   */
  const finalizeCall = async (status) => {
    stopTimer();
    const finalDuration = callDuration.value;
    if (currentCallRecord.value?.id) {
      try {
        const updated = await updateCall(currentCallRecord.value.id, {
          status: status || (finalDuration > 0 ? 'COMPLETED' : 'NO_ANSWER'),
          durationSeconds: finalDuration,
          endedAt: new Date().toISOString()
        });
        currentCallRecord.value = updated;
      } catch (err) {
        console.warn('Failed to update finalized call record:', err);
      }
    }
  };

  /**
   * Hang up active call
   */
  const hangupCall = () => {
    if (activeCall.value) {
      try {
        activeCall.value.hangup(() => {});
      } catch (err) {
        console.warn('Error during hangup:', err);
      }
    }
    stopTimer();
    callState.value = 'ended';
    finalizeCall(callDuration.value > 0 ? 'COMPLETED' : 'NO_ANSWER');
  };

  /**
   * Toggle mute status (fulfilling hold/resume behavior)
   */
  const toggleMute = () => {
    if (!activeCall.value) return;
    const nextMute = !isMuted.value;
    try {
      if (typeof activeCall.value.mute === 'function') {
        activeCall.value.mute(nextMute);
        isMuted.value = nextMute;
      }
    } catch (err) {
      console.warn('Error toggling mute:', err);
    }
  };

  /**
   * Reset call state back to idle
   */
  const resetCall = () => {
    stopTimer();
    activeCall.value = null;
    callState.value = 'idle';
    callError.value = null;
    isMuted.value = false;
    callDuration.value = 0;
  };

  return {
    isConnected,
    isConnecting,
    currentUserId,
    connectionError,
    activeCall,
    callState,
    callError,
    isMuted,
    callDuration,
    currentCallRecord,
    initClient,
    makeCall,
    hangupCall,
    toggleMute,
    resetCall
  };
}
