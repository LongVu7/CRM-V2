const logger = require('../../../config/logger');

let ioInstance = null;

const initializeVoipSocket = (io) => {
  ioInstance = io;
  
  io.on('connection', (socket) => {
    // In a real implementation, authenticate the socket via middleware
    const accountId = socket.handshake.auth?.accountId;
    if (accountId) {
      socket.join(`account_${accountId}`);
      logger.info({ accountId, socketId: socket.id }, 'User connected to VoIP socket');
    }

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'User disconnected from VoIP socket');
    });
  });
};

/**
 * Emit an inbound call event to a specific user's socket room
 * @param {number} accountId 
 * @param {Object} payload 
 */
const emitInboundCall = (accountId, payload) => {
  if (ioInstance) {
    ioInstance.to(`account_${accountId}`).emit('inboundCall', payload);
  }
};

module.exports = {
  initializeVoipSocket,
  emitInboundCall
};
