const ari = require('ari-client');
const callService = require('./callService');
const voipSocketServer = require('./voipSocketServer');

let clientInstance = null;
let isConnected = false;

const connect = async () => {
  const url = process.env.ASTERISK_ARI_URL || 'http://localhost:8088';
  const username = process.env.ASTERISK_ARI_USERNAME || 'asterisk';
  const password = process.env.ASTERISK_ARI_PASSWORD || 'asterisk';

  try {
    clientInstance = await ari.connect(url, username, password);
    isConnected = true;
    clientInstance.start('crm-voip-app');

    clientInstance.on('StasisStart', async (event, channel) => {
      // If it's an inbound call coming into the Stasis app
      if (channel.caller && channel.caller.number) {
        const callerNumber = channel.caller.number;
        const matches = await callService.matchCaller(callerNumber);
        
        // Find which extension/account is being dialed from dialplan variables
        // For MVP, assuming a known accountId or broadcast
        const targetAccountId = 1; // Placeholder for MVP

        voipSocketServer.emitInboundCall(targetAccountId, {
          callerNumber,
          matches,
          sessionId: channel.id,
          correlationId: channel.id
        });
      }
    });

    clientInstance.on('StasisEnd', (event, channel) => {
      // Handle StasisEnd
    });

  } catch (error) {
    isConnected = false;
  }
};

const getClient = () => clientInstance;
const checkHealth = async () => {
  if (!isConnected || !clientInstance) return { status: 'down', message: 'Not connected' };
  try {
    const info = await clientInstance.asterisk.getInfo();
    return { status: 'up', version: info.system.version };
  } catch (error) {
    return { status: 'down', message: error.message };
  }
};

module.exports = {
  connect,
  getClient,
  checkHealth
};
