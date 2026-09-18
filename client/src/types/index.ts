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
  updatedAt: number;
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

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type?: 'success' | 'error' | 'info';
  actionText?: string;
  onAction?: () => void;
}

export interface SocketCallbackResponse {
  success: boolean;
  error?: string;
  room?: RoomData;
  userRole?: Role;
  userId?: string;
  requestId?: string;
}

export interface ClientToServerEvents {
  join_room: (data: { roomId: string; username: string; userId?: string }, callback?: (response: SocketCallbackResponse) => void) => void;
  leave_room: (data: { roomId: string }) => void;
  play: (data: Record<string, never>, callback?: (response: SocketCallbackResponse) => void) => void;
  pause: (data: Record<string, never>, callback?: (response: SocketCallbackResponse) => void) => void;
  seek: (data: { time: number }, callback?: (response: SocketCallbackResponse) => void) => void;
  change_video: (data: { videoId: string; title?: string; duration?: number }, callback?: (response: SocketCallbackResponse) => void) => void;
  assign_role: (data: { userId: string; role: Role }, callback?: (response: SocketCallbackResponse) => void) => void;
  remove_participant: (data: { userId: string }, callback?: (response: SocketCallbackResponse) => void) => void;
  permission_request: (data: { action: 'play' | 'pause' | 'seek' | 'change_video'; payload?: any }, callback?: (response: SocketCallbackResponse) => void) => void;
  resolve_permission: (data: { requestId: string; approved: boolean }, callback?: (response: SocketCallbackResponse) => void) => void;
  sync_report: (data: { isSynced: boolean }) => void;
}

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
