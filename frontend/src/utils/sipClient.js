// Mock SIP Client for MVP
export const sipClient = {
  init: async (config) => {
    console.log('SIP client initialized with config', config);
    return true;
  },
  makeCall: async (targetNumber) => {
    console.log('SIP client dialing', targetNumber);
    return true;
  },
  answer: async (sessionId) => {
    console.log('SIP client answered', sessionId);
    return true;
  },
  decline: async (sessionId) => {
    console.log('SIP client declined', sessionId);
    return true;
  },
  disconnect: () => {
    console.log('SIP client disconnected');
  }
};
