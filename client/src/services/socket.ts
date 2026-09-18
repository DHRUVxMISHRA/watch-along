import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

// Determine backend URL:
// In development, Vite proxies /socket.io, or points to localhost:3001
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || (
  window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin
);

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling']
});

export function getOrCreateUserId(): string {
  let userId = localStorage.getItem('wt_userId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('wt_userId', userId);
  }
  return userId;
}

export function getSavedUsername(): string {
  return localStorage.getItem('wt_username') || '';
}

export function saveUsername(name: string): void {
  if (name && name.trim()) {
    localStorage.setItem('wt_username', name.trim());
  }
}
