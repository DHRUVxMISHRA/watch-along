import { Server, Socket } from 'socket.io';
import {
  roomManager,
  canControlPlayback,
  canManageParticipants,
  canAssignRole
} from '../models/RoomManager';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // JOIN ROOM
    socket.on('join_room', ({ roomId, username, userId }, callback) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found. Check the room code and try again.' });
        return;
      }

      // Consistent user identity: use provided userId (from localStorage) or generate one
      const actualUserId = userId && userId.trim() ? userId : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isCreator = !room.hostId || room.hostId === actualUserId;

      const participant = room.addParticipant(actualUserId, socket.id, username, isCreator);
      roomManager.registerSocketToRoom(socket.id, room.roomId);

      // Join socket.io room channel
      socket.join(`room:${room.roomId}`);

      const roomData = room.toData();

      if (callback) {
        callback({
          success: true,
          room: roomData,
          userRole: participant.role,
          userId: actualUserId
        });
      }

      // Notify others in room
      socket.to(`room:${room.roomId}`).emit('user_joined', {
        username: participant.username,
        userId: participant.userId,
        role: participant.role,
        participants: roomData.participants
      });

      // Send current state to newly connected client
      socket.emit('sync_state', roomData.playbackState);
    });

    // PLAY
    socket.on('play', (_data, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'User session not found in room.' });
        return;
      }

      const { room, participant } = session;
      if (!canControlPlayback(participant.role)) {
        if (callback) callback({ success: false, error: 'Only Host or Moderator can control playback.' });
        socket.emit('error_message', { message: 'Unauthorized: Only Host or Moderator can play.' });
        return;
      }

      const updatedState = room.setPlayback(true);
      io.to(`room:${room.roomId}`).emit('sync_state', updatedState);
      if (callback) callback({ success: true });
    });

    // PAUSE
    socket.on('pause', (_data, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'User session not found in room.' });
        return;
      }

      const { room, participant } = session;
      if (!canControlPlayback(participant.role)) {
        if (callback) callback({ success: false, error: 'Only Host or Moderator can control playback.' });
        socket.emit('error_message', { message: 'Unauthorized: Only Host or Moderator can pause.' });
        return;
      }

      const updatedState = room.setPlayback(false);
      io.to(`room:${room.roomId}`).emit('sync_state', updatedState);
      if (callback) callback({ success: true });
    });

    // SEEK
    socket.on('seek', ({ time }, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'User session not found in room.' });
        return;
      }

      const { room, participant } = session;
      if (!canControlPlayback(participant.role)) {
        if (callback) callback({ success: false, error: 'Only Host or Moderator can seek.' });
        socket.emit('error_message', { message: 'Unauthorized: Only Host or Moderator can seek.' });
        return;
      }

      if (typeof time !== 'number' || isNaN(time) || time < 0) {
        if (callback) callback({ success: false, error: 'Invalid seek time provided.' });
        return;
      }

      const updatedState = room.seek(time);
      io.to(`room:${room.roomId}`).emit('sync_state', updatedState);
      if (callback) callback({ success: true });
    });

    // CHANGE VIDEO
    socket.on('change_video', ({ videoId, title, duration }, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'User session not found in room.' });
        return;
      }

      const { room, participant } = session;
      if (!canControlPlayback(participant.role)) {
        if (callback) callback({ success: false, error: 'Only Host or Moderator can change the video.' });
        socket.emit('error_message', { message: 'Unauthorized: Only Host or Moderator can change video.' });
        return;
      }

      if (!videoId || typeof videoId !== 'string' || videoId.trim().length === 0) {
        if (callback) callback({ success: false, error: 'Invalid video ID provided.' });
        return;
      }

      const cleanVideoId = videoId.trim();
      const updatedState = room.changeVideo(cleanVideoId, title, duration);
      io.to(`room:${room.roomId}`).emit('sync_state', updatedState);
      if (callback) callback({ success: true });
    });

    // ASSIGN ROLE (Host Only)
    socket.on('assign_role', ({ userId, role }, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'Session not found.' });
        return;
      }

      const { room, participant } = session;
      if (!canAssignRole(participant.role)) {
        if (callback) callback({ success: false, error: 'Only the Host can assign roles.' });
        socket.emit('error_message', { message: 'Unauthorized: Only the Host can assign roles.' });
        return;
      }

      if (!['HOST', 'MODERATOR', 'PARTICIPANT'].includes(role)) {
        if (callback) callback({ success: false, error: 'Invalid role specified.' });
        return;
      }

      const target = room.getParticipantByUserId(userId);
      if (!target) {
        if (callback) callback({ success: false, error: 'Target participant not found in room.' });
        return;
      }

      room.assignRole(userId, role);
      const roomData = room.toData();

      io.to(`room:${room.roomId}`).emit('role_assigned', {
        userId: target.userId,
        username: target.username,
        role,
        participants: roomData.participants
      });

      if (callback) callback({ success: true });
    });

    // REMOVE PARTICIPANT (Host Only)
    socket.on('remove_participant', ({ userId }, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'Session not found.' });
        return;
      }

      const { room, participant } = session;
      if (!canManageParticipants(participant.role)) {
        if (callback) callback({ success: false, error: 'Only the Host can remove participants.' });
        socket.emit('error_message', { message: 'Unauthorized: Only the Host can remove participants.' });
        return;
      }

      if (userId === participant.userId) {
        if (callback) callback({ success: false, error: 'Host cannot remove themselves.' });
        return;
      }

      const target = room.getParticipantByUserId(userId);
      if (!target) {
        if (callback) callback({ success: false, error: 'Participant not found in room.' });
        return;
      }

      const targetSocketId = target.socketId;
      room.removeParticipantByUserId(userId);

      // Notify the removed socket
      io.to(targetSocketId).emit('kicked', { reason: 'You have been removed from this watch party by the Host.' });
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(`room:${room.roomId}`);
      }

      const roomData = room.toData();

      // Broadcast update to all remaining participants
      io.to(`room:${room.roomId}`).emit('participant_removed', {
        userId,
        participants: roomData.participants
      });

      if (callback) callback({ success: true });
    });

    // PERMISSION REQUEST (From Participant)
    socket.on('permission_request', ({ action, payload }, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'Session not found.' });
        return;
      }

      const { room, participant } = session;
      const request = room.createPermissionRequest(participant.userId, participant.username, action, payload);

      // Send request notification to Host and Moderators
      for (const p of room.participants.values()) {
        if (p.role === 'HOST' || p.role === 'MODERATOR') {
          io.to(p.socketId).emit('permission_received', request);
        }
      }

      if (callback) callback({ success: true, requestId: request.requestId });
    });

    // RESOLVE PERMISSION (Host / Moderator approval)
    socket.on('resolve_permission', ({ requestId, approved }, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) {
        if (callback) callback({ success: false, error: 'Session not found.' });
        return;
      }

      const { room, participant } = session;
      if (!canControlPlayback(participant.role)) {
        if (callback) callback({ success: false, error: 'Only Host or Moderator can approve requests.' });
        return;
      }

      const request = room.resolvePermissionRequest(requestId, approved);
      if (!request) {
        if (callback) callback({ success: false, error: 'Permission request not found or already handled.' });
        return;
      }

      if (approved) {
        // Execute the requested action on behalf of the approved participant
        if (request.action === 'play') {
          const updated = room.setPlayback(true);
          io.to(`room:${room.roomId}`).emit('sync_state', updated);
        } else if (request.action === 'pause') {
          const updated = room.setPlayback(false);
          io.to(`room:${room.roomId}`).emit('sync_state', updated);
        } else if (request.action === 'seek' && request.payload && typeof request.payload.time === 'number') {
          const updated = room.seek(request.payload.time);
          io.to(`room:${room.roomId}`).emit('sync_state', updated);
        } else if (request.action === 'change_video' && request.payload && request.payload.videoId) {
          const updated = room.changeVideo(request.payload.videoId, request.payload.title, request.payload.duration);
          io.to(`room:${room.roomId}`).emit('sync_state', updated);
        }
      }

      io.to(`room:${room.roomId}`).emit('permission_resolved', {
        requestId,
        approved,
        action: request.action,
        message: approved
          ? `Permission approved by ${participant.username} for ${request.username} to ${request.action}.`
          : `Permission request from ${request.username} was declined.`
      });

      if (callback) callback({ success: true });
    });

    // SYNC REPORT (from client indicating whether they are synced)
    socket.on('sync_report', ({ isSynced }) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (session) {
        session.participant.isSynced = isSynced;
      }
    });

    // LEAVE ROOM
    socket.on('leave_room', ({ roomId }) => {
      const { room, participant } = roomManager.unregisterSocket(socket.id);
      socket.leave(`room:${roomId}`);
      if (room && participant) {
        const roomData = room.toData();
        io.to(`room:${room.roomId}`).emit('user_left', {
          username: participant.username,
          userId: participant.userId,
          participants: roomData.participants
        });
      }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      const { room, participant } = roomManager.unregisterSocket(socket.id);
      if (room && participant) {
        const roomData = room.toData();
        io.to(`room:${room.roomId}`).emit('user_left', {
          username: participant.username,
          userId: participant.userId,
          participants: roomData.participants
        });
      }
    });
  });
}
