import { defineStore } from 'pinia';

export const useCallSessionStore = defineStore('callSession', {
  state: () => ({
    // Ephemeral VoIP Configuration
    isRegistered: false,
    wssUrl: null,
    sipToken: null,
    extensionNumber: null,

    // Active Call State
    activeCallId: null,
    callStatus: null, 
    remoteNumber: null,
    direction: null, 
    duration: 0,

    // Inbound Call State
    incomingCall: null
  }),
  
  actions: {
    setVoipConfig(config) {
      this.wssUrl = config.wssUrl;
      this.sipToken = config.sipToken;
      this.extensionNumber = config.extensionNumber;
      this.isRegistered = true;
    },

    clearVoipConfig() {
      this.wssUrl = null;
      this.sipToken = null;
      this.extensionNumber = null;
      this.isRegistered = false;
    },

    setActiveCall(callInfo) {
      this.activeCallId = callInfo.id;
      this.callStatus = callInfo.status;
      this.remoteNumber = callInfo.remoteNumber;
      this.direction = callInfo.direction;
      this.duration = 0;
    },

    updateCallStatus(status) {
      this.callStatus = status;
    },

    clearActiveCall() {
      this.activeCallId = null;
      this.callStatus = null;
      this.remoteNumber = null;
      this.direction = null;
      this.duration = 0;
    },

    setIncomingCall(payload) {
      this.incomingCall = payload;
    },

    clearIncomingCall() {
      this.incomingCall = null;
    }
  }
});
