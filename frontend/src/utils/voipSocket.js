import { io } from 'socket.io-client';
import { useCallSessionStore } from '@/stores/callSessionStore';
import { useAuthStore } from '@/stores/auth';

let socket = null;

export const initVoipSocket = () => {
  const authStore = useAuthStore();
  
  if (!authStore.user) return;

  socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
    auth: {
      accountId: authStore.user.accountId
    }
  });

  socket.on('connect', () => {
    console.log('Connected to VoIP WebSocket');
  });

  socket.on('inboundCall', (payload) => {
    const store = useCallSessionStore();
    store.setIncomingCall(payload);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from VoIP WebSocket');
  });
};

export const disconnectVoipSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
