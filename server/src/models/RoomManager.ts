import { Role, Participant, PlaybackState, PermissionRequest, RoomData } from '../types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
    code += CODE_CHARS.charAt(randomIndex);
  }
  return code;
}

export class Room {
  public roomId: string;
  public roomName: string;
  public hostId: string;
  public playbackState: PlaybackState;
  public participants: Map<string, Participant> = new Map(); // userId -> Participant
  public socketToUser: Map<string, string> = new Map(); // socketId -> userId
  public permissionRequests: Map<string, PermissionRequest> = new Map(); // requestId -> PermissionRequest
  public createdAt: number;

  constructor(
    roomId: string,
    roomName?: string,
    initialVideoId?: string,
    initialTitle?: string,
    initialHostId?: string
  ) {
    this.roomId = roomId.toUpperCase();
    this.roomName = (roomName && roomName.trim()) || 'Watch Party';
    this.hostId = initialHostId || '';
    this.createdAt = Date.now();
    this.playbackState = {
      videoId: initialVideoId || '',
      videoTitle: initialVideoId ? (initialTitle || 'YouTube Video') : 'No video selected',
      duration: 0,
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
      version: 0
    };
  }

  public getEffectiveCurrentTime(): number {
    if (!this.playbackState.isPlaying) {
      return this.playbackState.currentTime;
    }
    const elapsedSeconds = (Date.now() - this.playbackState.updatedAt) / 1000;
    const computedTime = this.playbackState.currentTime + elapsedSeconds;
    if (this.playbackState.duration > 0 && computedTime > this.playbackState.duration) {
      return this.playbackState.duration;
    }
    return Math.max(0, computedTime);
  }

  public addParticipant(userId: string, socketId: string, username: string, isCreator = false): Participant {
    const existing = this.participants.get(userId);
    let role: Role = 'PARTICIPANT';

    // Host assignment logic: creator, or matches hostId, or first user in empty room
    if (isCreator || !this.hostId || this.hostId === userId) {
      role = 'HOST';
      this.hostId = userId;
    } else if (existing) {
      role = existing.role;
    }

    const participant: Participant = {
      userId,
      socketId,
      username: username.trim() || 'Guest',
      role,
      isSynced: true,
      joinedAt: existing ? existing.joinedAt : Date.now()
    };

    this.participants.set(userId, participant);
    this.socketToUser.set(socketId, userId);
    return participant;
  }

  public getParticipantBySocketId(socketId: string): Participant | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;
    return this.participants.get(userId);
  }

  public getParticipantByUserId(userId: string): Participant | undefined {
    return this.participants.get(userId);
  }

  public removeParticipantBySocketId(socketId: string): Participant | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;
    this.socketToUser.delete(socketId);
    const participant = this.participants.get(userId);
    if (participant) {
      this.participants.delete(userId);
      // If host left and there are other participants, promote first moderator or any participant
      if (this.hostId === userId && this.participants.size > 0) {
        let newHost: Participant | undefined;
        for (const p of this.participants.values()) {
          if (p.role === 'MODERATOR') {
            newHost = p;
            break;
          }
        }
        if (!newHost) {
          newHost = this.participants.values().next().value;
        }
        if (newHost) {
          newHost.role = 'HOST';
          this.hostId = newHost.userId;
        }
      }
    }
    return participant;
  }

  public removeParticipantByUserId(userId: string): Participant | undefined {
    const participant = this.participants.get(userId);
    if (!participant) return undefined;

    this.socketToUser.delete(participant.socketId);
    this.participants.delete(userId);

    if (this.hostId === userId && this.participants.size > 0) {
      const nextHost = this.participants.values().next().value;
      if (nextHost) {
        nextHost.role = 'HOST';
        this.hostId = nextHost.userId;
      }
    }
    return participant;
  }

  public setPlayback(isPlaying: boolean, time?: number): PlaybackState {
    const effective = time !== undefined ? Math.max(0, time) : this.getEffectiveCurrentTime();
    this.playbackState.currentTime = effective;
    this.playbackState.isPlaying = isPlaying;
    this.playbackState.updatedAt = Date.now();
    this.playbackState.version += 1;
    return { ...this.playbackState };
  }

  public seek(time: number): PlaybackState {
    this.playbackState.currentTime = Math.max(0, time);
    this.playbackState.updatedAt = Date.now();
    this.playbackState.version += 1;
    return { ...this.playbackState };
  }

  public changeVideo(videoId: string, title?: string, duration?: number): PlaybackState {
    this.playbackState.videoId = videoId;
    this.playbackState.videoTitle = title || 'YouTube Video';
    this.playbackState.duration = duration || 0;
    this.playbackState.currentTime = 0;
    this.playbackState.isPlaying = false;
    this.playbackState.updatedAt = Date.now();
    this.playbackState.version += 1;
    return { ...this.playbackState };
  }

  public assignRole(userId: string, newRole: Role): boolean {
    const participant = this.participants.get(userId);
    if (!participant) return false;
    if (newRole === 'HOST') {
      // Transfer host
      if (this.hostId && this.hostId !== userId) {
        const currentHost = this.participants.get(this.hostId);
        if (currentHost) currentHost.role = 'MODERATOR';
      }
      this.hostId = userId;
    }
    participant.role = newRole;
    return true;
  }

  public createPermissionRequest(
    userId: string,
    username: string,
    action: 'play' | 'pause' | 'seek' | 'change_video',
    payload?: any
  ): PermissionRequest {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const request: PermissionRequest = {
      requestId,
      userId,
      username,
      roomId: this.roomId,
      action,
      payload,
      status: 'pending',
      createdAt: Date.now()
    };
    this.permissionRequests.set(requestId, request);
    return request;
  }

  public resolvePermissionRequest(requestId: string, approved: boolean): PermissionRequest | undefined {
    const request = this.permissionRequests.get(requestId);
    if (!request) return undefined;
    request.status = approved ? 'approved' : 'rejected';
    this.permissionRequests.delete(requestId);
    return request;
  }

  public toData(): RoomData {
    return {
      roomId: this.roomId,
      roomName: this.roomName,
      hostId: this.hostId,
      playbackState: {
        ...this.playbackState,
        currentTime: this.getEffectiveCurrentTime()
      },
      participants: Array.from(this.participants.values()),
      pendingRequests: Array.from(this.permissionRequests.values()),
      createdAt: this.createdAt
    };
  }
}

// Centralized Role Permissions
export function canControlPlayback(role: Role): boolean {
  return role === 'HOST' || role === 'MODERATOR';
}

export function canManageParticipants(role: Role): boolean {
  return role === 'HOST';
}

export function canAssignRole(role: Role): boolean {
  return role === 'HOST';
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomId

  public createRoom(
    roomName?: string,
    initialVideoId?: string,
    initialTitle?: string,
    initialHostId?: string
  ): Room {
    let roomId = generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const room = new Room(roomId, roomName, initialVideoId, initialTitle, initialHostId);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId.toUpperCase());
  }

  public registerSocketToRoom(socketId: string, roomId: string): void {
    this.socketToRoom.set(socketId, roomId.toUpperCase());
  }

  public unregisterSocket(socketId: string): { room?: Room; participant?: Participant } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return {};
    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return {};

    const participant = room.removeParticipantBySocketId(socketId);
    if (room.participants.size === 0) {
      setTimeout(() => {
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
        }
      }, 1000 * 60 * 30); // 30-minute persistence for empty room
    }
    return { room, participant };
  }

  public getSessionBySocketId(socketId: string): { room: Room; participant: Participant } | undefined {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return undefined;
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const participant = room.getParticipantBySocketId(socketId);
    if (!participant) return undefined;
    return { room, participant };
  }

  public getAllRooms(): RoomData[] {
    return Array.from(this.rooms.values()).map(r => r.toData());
  }
}

export const roomManager = new RoomManager();
