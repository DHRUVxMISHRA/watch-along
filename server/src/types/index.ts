export type Role = 'HOST' | 'MODERATOR' | 'PARTICIPANT';

export interface Participant {
  userId: string;
  socketId: string;
  username: string;
  role: Role;
  isSynced: boolean;
  joinedAt: number;
}

export interface PlaybackState {
  videoId: string;
  videoTitle: string;
  duration: number;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number; // UNIX timestamp in ms
  version: number;   // monotonically increasing — used by clients to discard stale events
}


export interface PermissionRequest {
  requestId: string;
  userId: string;
  username: string;
  roomId: string;
  action: 'play' | 'pause' | 'seek' | 'change_video';
  payload?: any;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface RoomData {
  roomId: string;
  roomName: string;
  hostId: string;
  playbackState: PlaybackState;
  participants: Participant[];
  pendingRequests: PermissionRequest[];
  createdAt: number;
}

// Client to Server Events
export interface ClientToServerEvents {
  join_room: (data: { roomId: string; username: string; userId?: string }, callback?: (response: { success: boolean; error?: string; room?: RoomData; userRole?: Role; userId?: string }) => void) => void;
  leave_room: (data: { roomId: string }) => void;
  play: (data: Record<string, never>, callback?: (response: { success: boolean; error?: string }) => void) => void;
  pause: (data: Record<string, never>, callback?: (response: { success: boolean; error?: string }) => void) => void;
  seek: (data: { time: number }, callback?: (response: { success: boolean; error?: string }) => void) => void;
  change_video: (data: { videoId: string; title?: string; duration?: number }, callback?: (response: { success: boolean; error?: string }) => void) => void;
  assign_role: (data: { userId: string; role: Role }, callback?: (response: { success: boolean; error?: string }) => void) => void;
  remove_participant: (data: { userId: string }, callback?: (response: { success: boolean; error?: string }) => void) => void;
  permission_request: (data: { action: 'play' | 'pause' | 'seek' | 'change_video'; payload?: any }, callback?: (response: { success: boolean; error?: string; requestId?: string }) => void) => void;
  resolve_permission: (data: { requestId: string; approved: boolean }, callback?: (response: { success: boolean; error?: string }) => void) => void;
  sync_report: (data: { isSynced: boolean }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  sync_state: (state: PlaybackState) => void;
  user_joined: (data: { username: string; userId: string; role: Role; participants: Participant[] }) => void;
  user_left: (data: { username: string; userId: string; participants: Participant[] }) => void;
  role_assigned: (data: { userId: string; username: string; role: Role; participants: Participant[] }) => void;
  participant_removed: (data: { userId: string; participants: Participant[] }) => void;
  kicked: (data: { reason: string }) => void;
  permission_received: (request: PermissionRequest) => void;
  permission_resolved: (data: { requestId: string; approved: boolean; action: string; message: string }) => void;
  error_message: (data: { message: string }) => void;
}
