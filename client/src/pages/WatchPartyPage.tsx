import React, { useState, useEffect, useRef } from 'react';
import { Participant, Role, PlaybackState, PermissionRequest, ToastMessage } from '../types';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { formatTime, extractYouTubeVideoId } from '../utils/youtube';
import { socket } from '../services/socket';

interface WatchPartyPageProps {
  roomId: string;
  initialRoomName: string;
  userId: string;
  username: string;
  initialRole: Role;
  initialPlayback: PlaybackState;
  initialParticipants: Participant[];
  pendingRequests: PermissionRequest[];
  onLeaveRoom: () => void;
  onShowToast: (title: string, description: string, type?: 'success' | 'error' | 'info') => void;
}

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({
  roomId,
  initialRoomName,
  userId,
  username,
  initialRole,
  initialPlayback,
  initialParticipants,
  pendingRequests: initialPendingRequests,
  onLeaveRoom,
  onShowToast
}) => {
  // Room metadata
  const [roomName] = useState(initialRoomName);
  const [currentUserRole, setCurrentUserRole] = useState<Role>(initialRole);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [activeRequests, setActiveRequests] = useState<PermissionRequest[]>(initialPendingRequests || []);
  const [isKicked, setIsKicked] = useState(false);

  // Search filter for participants
  const [searchQuery, setSearchQuery] = useState('');

  // Three-dot menu toggle for Host participant management
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

  // Modals
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [requestedAction, setRequestedAction] = useState<'play' | 'pause' | 'seek' | 'change_video'>('play');
  const [proposedVideoUrl, setProposedVideoUrl] = useState('');

  // Change video input for Host/Mod
  const [changeVideoInput, setChangeVideoInput] = useState('');
  const [isChangingVideo, setIsChangingVideo] = useState(false);

  // Video Reactions (fun real-time local counters)
  const [reactions, setReactions] = useState<{ popcorn: number; rocket: number; fire: number }>({
    popcorn: 12,
    rocket: 9,
    fire: 24
  });

  // Timeline scrubber drag state
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number>(0);

  // Volume state
  const [volume, setLocalVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Check if current user has control privileges
  const canControl = currentUserRole === 'HOST' || currentUserRole === 'MODERATOR';
  const isHost = currentUserRole === 'HOST';

  // YouTube Player hook
  const {
    isReady,
    currentVideoId,
    playerState,
    duration,
    currentTime,
    applyRemoteSync,
    localPlay,
    localPause,
    localSeek,
    localChangeVideo,
    setVolume
  } = useYouTubePlayer({
    elementId: 'youtube-player-frame',
    initialVideoId: initialPlayback.videoId || 'zSWdZVtXT7E',
    onLocalPlay: () => {
      if (canControl) {
        socket.emit('play', {}, (res) => {
          if (!res.success && res.error) {
            onShowToast('Playback Error', res.error, 'error');
          }
        });
      }
    },
    onLocalPause: () => {
      if (canControl) {
        socket.emit('pause', {}, (res) => {
          if (!res.success && res.error) {
            onShowToast('Playback Error', res.error, 'error');
          }
        });
      }
    },
    onLocalSeek: (time) => {
      if (canControl) {
        socket.emit('seek', { time }, (res) => {
          if (!res.success && res.error) {
            onShowToast('Seek Error', res.error, 'error');
          }
        });
      }
    }
  });

  // Initialize playback state from server
  useEffect(() => {
    if (isReady && initialPlayback) {
      applyRemoteSync(
        initialPlayback.videoId,
        initialPlayback.isPlaying,
        initialPlayback.currentTime
      );
    }
  }, [isReady]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    // Sync state
    const handleSyncState = (state: PlaybackState) => {
      applyRemoteSync(state.videoId, state.isPlaying, state.currentTime);
    };

    // User joined
    const handleUserJoined = (data: { username: string; userId: string; role: Role; participants: Participant[] }) => {
      setParticipants(data.participants);
      onShowToast('Participant Joined', `${data.username} joined the room`, 'info');
    };

    // User left
    const handleUserLeft = (data: { username: string; userId: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      onShowToast('Participant Left', `${data.username} left the room`, 'info');
    };

    // Role assigned
    const handleRoleAssigned = (data: { userId: string; username: string; role: Role; participants: Participant[] }) => {
      setParticipants(data.participants);
      if (data.userId === userId) {
        setCurrentUserRole(data.role);
        onShowToast(
          'Role Updated',
          `You have been granted the ${data.role} role!`,
          'success'
        );
      } else {
        onShowToast(
          'Role Updated',
          `${data.username} is now a ${data.role}`,
          'info'
        );
      }
    };

    // Participant removed
    const handleParticipantRemoved = (data: { userId: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      onShowToast('Participant Removed', 'A participant was removed from the party', 'info');
    };

    // Current user was kicked
    const handleKicked = (data: { reason: string }) => {
      setIsKicked(true);
      onShowToast('Removed from Room', data.reason, 'error');
    };

    // Permission request received (for Host/Mod)
    const handlePermissionReceived = (request: PermissionRequest) => {
      setActiveRequests((prev) => [...prev.filter((r) => r.requestId !== request.requestId), request]);
      onShowToast(
        'Permission Request',
        `${request.username} requested to ${request.action.replace('_', ' ')}`,
        'info'
      );
    };

    // Permission resolved
    const handlePermissionResolved = (data: { requestId: string; approved: boolean; action: string; message: string }) => {
      setActiveRequests((prev) => prev.filter((r) => r.requestId !== data.requestId));
      onShowToast(
        data.approved ? 'Permission Approved' : 'Permission Declined',
        data.message,
        data.approved ? 'success' : 'error'
      );
    };

    const handleErrorMsg = (data: { message: string }) => {
      onShowToast('Action Blocked', data.message, 'error');
    };

    socket.on('sync_state', handleSyncState);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('role_assigned', handleRoleAssigned);
    socket.on('participant_removed', handleParticipantRemoved);
    socket.on('kicked', handleKicked);
    socket.on('permission_received', handlePermissionReceived);
    socket.on('permission_resolved', handlePermissionResolved);
    socket.on('error_message', handleErrorMsg);

    return () => {
      socket.off('sync_state', handleSyncState);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('role_assigned', handleRoleAssigned);
      socket.off('participant_removed', handleParticipantRemoved);
      socket.off('kicked', handleKicked);
      socket.off('permission_received', handlePermissionReceived);
      socket.off('permission_resolved', handlePermissionResolved);
      socket.off('error_message', handleErrorMsg);
    };
  }, [userId, applyRemoteSync, onShowToast]);

  // Host Action: Change Role
  const handleAssignRole = (targetUserId: string, newRole: Role) => {
    socket.emit('assign_role', { userId: targetUserId, role: newRole }, (res) => {
      if (res.success) {
        onShowToast('Role Updated', `Participant role updated to ${newRole}`, 'success');
      } else {
        onShowToast('Failed to Update Role', res.error || 'Permission denied', 'error');
      }
    });
    setOpenMenuUserId(null);
  };

  // Host Action: Kick Participant
  const handleKickParticipant = (targetUserId: string) => {
    socket.emit('remove_participant', { userId: targetUserId }, (res) => {
      if (res.success) {
        onShowToast('Participant Removed', 'User has been removed from this room', 'success');
      } else {
        onShowToast('Failed to Remove', res.error || 'Action failed', 'error');
      }
    });
    setOpenMenuUserId(null);
  };

  // Change Video (Host/Mod)
  const handleChangeVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeVideoInput.trim()) return;

    const extractedId = extractYouTubeVideoId(changeVideoInput);
    if (!extractedId) {
      onShowToast('Invalid Video URL', 'Please enter a valid YouTube video link or ID.', 'error');
      return;
    }

    setIsChangingVideo(true);
    socket.emit('change_video', { videoId: extractedId }, (res) => {
      setIsChangingVideo(false);
      if (res.success) {
        onShowToast('Video Changed', 'Room media updated successfully', 'success');
        setChangeVideoInput('');
      } else {
        onShowToast('Failed to Change Video', res.error || 'Permission denied', 'error');
      }
    });
  };

  // Permission Request Submission (Participant)
  const handleSendPermissionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    let payload: any = undefined;

    if (requestedAction === 'change_video') {
      if (!proposedVideoUrl.trim()) {
        onShowToast('URL Required', 'Please enter the YouTube URL you wish to play.', 'error');
        return;
      }
      const extractedId = extractYouTubeVideoId(proposedVideoUrl);
      if (!extractedId) {
        onShowToast('Invalid URL', 'Please enter a valid YouTube video link.', 'error');
        return;
      }
      payload = { videoId: extractedId };
    }

    socket.emit('permission_request', { action: requestedAction, payload }, (res) => {
      if (res.success) {
        onShowToast('Request Sent', 'Host & Moderators have been notified for approval.', 'info');
        setShowPermissionModal(false);
        setProposedVideoUrl('');
      } else {
        onShowToast('Request Failed', res.error || 'Could not send request', 'error');
      }
    });
  };

  // Host/Mod Approves or Rejects Permission
  const handleResolvePermission = (requestId: string, approved: boolean) => {
    socket.emit('resolve_permission', { requestId, approved }, (res) => {
      if (res.success) {
        setActiveRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      } else {
        onShowToast('Error', res.error || 'Could not process permission', 'error');
      }
    });
  };

  // Playback Control Triggers
  const handleTogglePlay = () => {
    if (!canControl) {
      setShowPermissionModal(true);
      return;
    }
    if (playerState === 1) {
      localPause();
      socket.emit('pause', {});
    } else {
      localPlay();
      socket.emit('play', {});
    }
  };

  const handleSkip = (seconds: number) => {
    if (!canControl) {
      setShowPermissionModal(true);
      return;
    }
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    localSeek(newTime);
    socket.emit('seek', { time: newTime });
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl) {
      setShowPermissionModal(true);
      return;
    }
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * duration;
    localSeek(targetTime);
    socket.emit('seek', { time: targetTime });
  };

  const handleVolumeChange = (newVol: number) => {
    setLocalVolume(newVol);
    setVolume(newVol);
    if (newVol === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(volume || 50);
    } else {
      setIsMuted(true);
      setVolume(0);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId).catch(() => {});
    onShowToast('Room Code Copied!', `Code ${roomId} copied to clipboard`, 'success');
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
    onShowToast('Invite Link Copied!', 'Direct room URL copied to clipboard', 'success');
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If user was kicked from room
  if (isKicked) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
        <div className="max-w-md w-full bg-surface-container-low border border-error-container/40 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-error-container/20 text-error flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">person_remove</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">You've been removed</h2>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            You were removed from this watch party by the Host. You can create a new party or join another room.
          </p>
          <button
            onClick={onLeaveRoom}
            className="w-full py-3 px-6 rounded-xl bg-primary-container hover:bg-inverse-primary text-white font-semibold shadow-lg transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Progress percentage
  const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full px-4 md:px-6 py-4 max-w-[1720px] mx-auto flex flex-col gap-4">
      {/* TOP ROOM BAR / MASTER META HEADER (Matching Stitch Screenshot 3 & 4) */}
      <div className="w-full bg-surface-container-low rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md border border-surface-container-high/50">
        <div className="flex items-center flex-wrap gap-3 sm:gap-4">
          {/* Room Title & Live Pulse */}
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold text-on-surface tracking-tight truncate max-w-[240px]">
              {roomName}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span className="text-[11px] font-semibold tracking-wider uppercase">
                Live Room
              </span>
            </div>
          </div>

          {/* Room Code & Quick Action Pills */}
          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-lg border border-surface-container-high/60">
            <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
              Room Code
            </span>
            <span className="font-mono text-xs text-on-surface font-bold px-1.5 py-0.5 rounded bg-surface-container-highest tracking-widest">
              {roomId}
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 ml-1 px-2 py-1 rounded bg-surface-variant hover:bg-surface-bright text-on-surface transition-all active:scale-95 text-xs"
              title="Copy Room Code"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              <span className="hidden sm:inline">Copy Code</span>
            </button>
            <button
              onClick={handleCopyInviteLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 text-xs font-semibold"
              title="Copy Invite Link"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">link</span>
              <span>Copy Invite Link</span>
            </button>
          </div>
        </div>

        {/* Sync Latency & Room Health Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-surface-container-high text-tertiary border border-surface-container-highest">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="text-xs font-medium text-on-surface">
              {participants.length} in Room • All Synced
            </span>
          </div>
        </div>
      </div>

      {/* MAIN DUAL-COLUMN GRID: 70% Left Video Player, 30% Right Participants / Host Hub */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 70% (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* PLAYER ENCLOSURE */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-lowest shadow-2xl group flex flex-col border border-surface-container-high/60">
            {/* Master Cinematic 16:9 Video Canvas */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              {/* YouTube Mount Element */}
              <div id="youtube-player-frame" className="w-full h-full pointer-events-none" />

              {/* Floating Top-Left Host / Role Banner */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-md text-on-surface shadow-md border border-surface-container-high/60">
                {isHost ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-[#F59E0B] fill">
                      workspace_premium
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      Host Playback Active
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    <span className="text-xs text-on-surface-variant hidden sm:inline">
                      You are controlling the room timeline
                    </span>
                  </>
                ) : currentUserRole === 'MODERATOR' ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-indigo-400">
                      shield
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      Moderator Active
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    <span className="text-xs text-on-surface-variant hidden sm:inline">
                      You have playback controls
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    <span className="text-xs font-semibold text-on-surface">Participant View</span>
                    <span className="text-on-surface-variant">•</span>
                    <span className="text-xs text-on-surface-variant">Synced with Host</span>
                  </>
                )}
              </div>

              {/* Floating Top-Right Resolution Indicator */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest/85 backdrop-blur-md text-on-surface font-mono text-xs border border-surface-container-high/60">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>SYNCED 1080p</span>
              </div>

              {/* Scrim Gradient Overlay for Bottom HUD Readability */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/70 to-transparent pointer-events-none z-10" />

              {/* BOTTOM HUD CONTROLS BAR */}
              <div className="absolute inset-x-0 bottom-0 z-30 p-3 sm:p-4 flex flex-col gap-1.5 bg-surface-container-lowest/70 backdrop-blur-sm">
                {/* If Participant, show Locked Controls Banner matching Screenshot 4 */}
                {!canControl && (
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 p-2 px-3 rounded-lg bg-surface-container-lowest/90 border border-surface-variant/60 backdrop-blur-md mb-1">
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-[#F59E0B]">
                        lock
                      </span>
                      <span className="text-xs font-medium">
                        Only Host or Moderator can control playback.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPermissionModal(true)}
                      className="px-3 py-1 rounded-md bg-surface-container hover:bg-surface-bright text-primary border border-primary/30 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                    >
                      Request Permission
                    </button>
                  </div>
                )}

                {/* Timeline Scrubber Bar */}
                <div
                  ref={scrubberRef}
                  onClick={handleScrubberClick}
                  className={`relative w-full group/scrubber py-1.5 ${
                    canControl ? 'cursor-pointer' : 'opacity-60 pointer-events-none'
                  }`}
                  id="timelineBar"
                >
                  <div className="relative w-full h-1.5 rounded-full bg-surface-variant overflow-hidden group-hover/scrubber:h-2.5 transition-all">
                    {/* Active Played Segment */}
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-primary-container rounded-full"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  {/* Scrubber Handle Knob */}
                  <div
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-md transform scale-0 group-hover/scrubber:scale-100 transition-transform"
                    style={{ left: `${currentProgress}%` }}
                  />
                </div>

                {/* Controls Line */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  {/* Left Hand Control Cluster */}
                  <div className={`flex items-center gap-2 ${!canControl ? 'opacity-60 pointer-events-none' : ''}`}>
                    {/* Play / Pause */}
                    <button
                      onClick={handleTogglePlay}
                      className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all shadow-md cursor-pointer"
                      title={playerState === 1 ? 'Pause' : 'Play'}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px] fill">
                        {playerState === 1 ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    {/* Skip 10s back */}
                    <button
                      onClick={() => handleSkip(-10)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      title="Rewind 10 seconds"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">replay_10</span>
                    </button>

                    {/* Skip 10s forward */}
                    <button
                      onClick={() => handleSkip(10)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      title="Forward 10 seconds"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">forward_10</span>
                    </button>

                    {/* Volume Controls (Always interactive) */}
                    <div className="flex items-center gap-1.5 group/vol ml-1 pointer-events-auto">
                      <button
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                        type="button"
                        title="Volume"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                        </span>
                      </button>
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const fraction = Math.max(0, Math.min(1, clickX / rect.width));
                          handleVolumeChange(Math.round(fraction * 100));
                        }}
                        className="w-16 h-1.5 bg-surface-variant rounded-full cursor-pointer relative overflow-hidden"
                      >
                        <div
                          className="absolute top-0 left-0 bottom-0 bg-on-surface rounded-full"
                          style={{ width: `${isMuted ? 0 : volume}%` }}
                        />
                      </div>
                    </div>

                    {/* Time indicator */}
                    <div className="flex items-center gap-1 ml-2 font-mono text-xs text-on-surface">
                      <span className="font-semibold text-primary">{formatTime(currentTime)}</span>
                      <span className="text-on-surface-variant">/</span>
                      <span className="text-on-surface-variant">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Right Hand Control Cluster */}
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container text-tertiary">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                      <span className="text-[11px] font-semibold uppercase">Broadcasting</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-xs">
                      1080p60
                    </span>
                    <button
                      onClick={() => {
                        const el = document.getElementById('youtube-player-frame');
                        if (el) {
                          if (document.fullscreenElement) {
                            document.exitFullscreen().catch(() => {});
                          } else {
                            el.parentElement?.requestFullscreen().catch(() => {});
                          }
                        }
                      }}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      title="Fullscreen"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">fullscreen</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VIDEO METADATA & LIVE SYNC STATUS DECK */}
          <div className="w-full bg-surface-container rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-surface-container-high/60 shadow-md">
            <div className="flex flex-col gap-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-on-surface truncate">
                {initialPlayback.videoTitle || 'YouTube Synchronized Video'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span>
                  Room Host: <strong className="text-on-surface font-semibold">{participants.find(p => p.role === 'HOST')?.username || 'Host'}</strong>
                </span>
                <span>•</span>
                <span>Duration: {formatTime(duration)}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-tertiary font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>In Sync ({participants.length} viewers)</span>
                </span>
              </div>
            </div>

            {/* Video Reaction Micro-Dock (Interactive) */}
            <div className="flex items-center gap-1.5 self-start md:self-auto bg-surface-container-low px-2 py-1.5 rounded-xl border border-surface-container-high/60">
              <button
                onClick={() => setReactions(r => ({ ...r, popcorn: r.popcorn + 1 }))}
                className="px-2.5 py-1 rounded-lg hover:bg-surface-container transition-colors text-xs flex items-center gap-1 cursor-pointer"
                type="button"
                title="React Popcorn"
              >
                <span>🍿</span>
                <span className="font-mono text-on-surface-variant font-semibold">{reactions.popcorn}</span>
              </button>
              <button
                onClick={() => setReactions(r => ({ ...r, rocket: r.rocket + 1 }))}
                className="px-2.5 py-1 rounded-lg hover:bg-surface-container transition-colors text-xs flex items-center gap-1 cursor-pointer"
                type="button"
                title="React Rocket"
              >
                <span>🚀</span>
                <span className="font-mono text-on-surface-variant font-semibold">{reactions.rocket}</span>
              </button>
              <button
                onClick={() => setReactions(r => ({ ...r, fire: r.fire + 1 }))}
                className="px-2.5 py-1 rounded-lg hover:bg-surface-container transition-colors text-xs flex items-center gap-1 cursor-pointer"
                type="button"
                title="React Fire"
              >
                <span>🔥</span>
                <span className="font-mono text-on-surface-variant font-semibold">{reactions.fire}</span>
              </button>
            </div>
          </div>

          {/* CHANGE VIDEO CONTROL PANEL */}
          <div className="w-full bg-surface-container-low rounded-xl p-4 flex flex-col gap-2 shadow-sm border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">play_circle</span>
                <span className="text-sm font-semibold text-on-surface">Change Video Source</span>
                {canControl ? (
                  <span className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary uppercase font-bold tracking-wider">
                    {isHost ? 'Host Exclusive' : 'Host / Mod'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] bg-surface-variant text-on-surface-variant uppercase font-bold tracking-wider">
                    Host / Mod Only
                  </span>
                )}
              </div>
              <span className="text-xs text-on-surface-variant hidden sm:inline">
                Supports YouTube URLs, Playlists & Livestreams
              </span>
            </div>

            {/* Input Row */}
            <form onSubmit={handleChangeVideoSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">
                  link
                </span>
                <input
                  disabled={!canControl}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary-container transition-colors border border-surface-container-high ${
                    canControl
                      ? 'text-on-surface placeholder:text-on-surface-variant/60'
                      : 'text-on-surface-variant/50 cursor-not-allowed'
                  }`}
                  placeholder={canControl ? "Paste YouTube video URL (e.g. https://www.youtube.com/watch?v=...)" : "Locked for participants"}
                  type="text"
                  value={changeVideoInput}
                  onChange={(e) => setChangeVideoInput(e.target.value)}
                />
              </div>

              {canControl ? (
                <button
                  type="submit"
                  disabled={isChangingVideo || !changeVideoInput.trim()}
                  className="px-5 py-2.5 rounded-lg bg-primary-container text-white font-semibold hover:bg-inverse-primary transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  <span>{isChangingVideo ? 'Changing...' : 'Change Video'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRequestedAction('change_video');
                    setShowPermissionModal(true);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-bright transition-colors flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                  <span>Request Permission</span>
                </button>
              )}
            </form>

            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              {canControl ? (
                <>
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  <span>Host & designated Moderators can update room media instantly for all viewers.</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px] text-[#F59E0B]">lock</span>
                  <span>Only Host or Moderator can change the video directly. Click Request Permission to propose one.</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 30% PARTICIPANTS & HOST CONTROLS PANEL (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* INCOMING PERMISSION REQUEST BANNER (For Host / Moderator) - Matches Screenshot 3 */}
          {canControl && activeRequests.length > 0 && (
            <div className="flex flex-col gap-2">
              {activeRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="w-full bg-surface-container rounded-xl p-3 sm:p-4 border border-secondary/30 shadow-lg flex flex-col gap-2 relative animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">pan_tool</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-on-surface leading-tight">
                          Playback Permission Request
                        </span>
                        <span className="text-xs text-on-surface-variant leading-snug mt-0.5">
                          <strong className="text-on-surface font-semibold">{req.username}</strong> wants to{' '}
                          {req.action === 'change_video' ? 'change video source' : req.action}.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleResolvePermission(req.requestId, false)}
                      className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-xs cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolvePermission(req.requestId, true)}
                      className="px-3.5 py-1.5 rounded-lg bg-tertiary text-on-tertiary hover:bg-tertiary-fixed transition-colors text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PARTICIPANTS CARD */}
          <div className="w-full bg-surface-container-low rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl border border-surface-container-high/60">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-on-surface">Participants</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-mono text-xs font-semibold">
                  {participants.length}
                </span>
              </div>

              {isHost && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-medium">
                  <span className="material-symbols-outlined text-[14px] text-primary fill">
                    shield_person
                  </span>
                  <span>Host Controls Active</span>
                </div>
              )}
            </div>

            {/* Search filter */}
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-secondary transition-colors border border-surface-container-high"
                placeholder="Search participants by name or ID..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Participant List */}
            <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-0.5">
              {filteredParticipants.map((p) => {
                const isSelf = p.userId === userId;
                const isItemHost = p.role === 'HOST';
                const isItemMod = p.role === 'MODERATOR';

                return (
                  <div
                    key={p.userId}
                    className={`relative w-full rounded-xl p-2.5 flex flex-col gap-1 transition-colors border ${
                      isSelf
                        ? 'bg-surface-container-high/70 border-primary/20'
                        : 'bg-surface-container hover:bg-surface-container-high border-surface-container-high/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow ${
                            isItemHost
                              ? 'bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/30'
                              : isItemMod
                              ? 'bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/30'
                              : 'bg-surface-container-high text-on-surface ring-1 ring-surface-variant'
                          }`}>
                            {p.username.charAt(0).toUpperCase()}
                          </div>
                          {/* Online green indicator */}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container" />
                        </div>

                        {/* Name & Role info */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-on-surface truncate">
                              {p.username}
                            </span>
                            {isSelf && (
                              <span className="text-[11px] text-primary font-medium">(You)</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isItemHost ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-semibold">
                                <span className="material-symbols-outlined text-[11px] fill">workspace_premium</span>
                                <span>Host</span>
                              </span>
                            ) : isItemMod ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container text-[10px] font-semibold">
                                <span className="material-symbols-outlined text-[11px]">shield</span>
                                <span>Moderator</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface-variant text-on-surface-variant text-[10px]">
                                <span className="material-symbols-outlined text-[11px]">person</span>
                                <span>Participant</span>
                              </span>
                            )}

                            <span className="text-tertiary text-[10px] flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">sync</span>
                              <span>Synced</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Tag or Host Three-Dot Action Menu */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isItemHost && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant">
                            Owner
                          </span>
                        )}

                        {/* Host controls for other users */}
                        {isHost && !isItemHost && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuUserId(openMenuUserId === p.userId ? null : p.userId)}
                              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
                              title="Manage Participant"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>

                            {/* Dropdown Menu (Screenshot 3) */}
                            {openMenuUserId === p.userId && (
                              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-surface-container-highest shadow-2xl p-1 z-30 border border-surface-container-high flex flex-col gap-0.5 animate-in fade-in duration-150">
                                {isItemMod ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAssignRole(p.userId, 'PARTICIPANT')}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-bright flex items-center gap-2 text-on-surface text-xs transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px] text-secondary">
                                      check_indeterminate_small
                                    </span>
                                    <span>Remove Moderator Privileges</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAssignRole(p.userId, 'MODERATOR')}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-bright flex items-center gap-2 text-on-surface text-xs transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px] text-indigo-400">
                                      shield
                                    </span>
                                    <span>Assign Moderator</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleKickParticipant(p.userId)}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-error-container hover:text-on-error-container flex items-center gap-2 text-error text-xs transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">person_remove</span>
                                  <span>Kick Participant</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Panel Status */}
            <div className="pt-2 border-t border-surface-container-high/40 flex items-center justify-between text-on-surface-variant text-xs">
              <div className="flex items-center gap-1.5 text-tertiary">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span className="text-on-surface-variant">Playback controlled by Host/Mod</span>
              </div>
              <span className="text-tertiary font-medium">All Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* REQUEST PERMISSION MODAL (Screenshot 4 & Stitch HTML page 44) */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-low border border-surface-variant/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">vpn_key</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Request Permission</h3>
                  <p className="text-xs text-on-surface-variant">Send playback & media request</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              You need Host or Moderator approval to control playback or change the video.
            </p>

            {/* Request Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface">Action requested:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestedAction('play')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    requestedAction === 'play'
                      ? 'bg-primary-container text-white border-primary-container'
                      : 'bg-surface-container text-on-surface-variant border-surface-container-high hover:bg-surface-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Play / Pause</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestedAction('change_video')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    requestedAction === 'change_video'
                      ? 'bg-primary-container text-white border-primary-container'
                      : 'bg-surface-container text-on-surface-variant border-surface-container-high hover:bg-surface-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                  <span>Change Video</span>
                </button>
              </div>
            </div>

            {/* If change_video is selected, input proposed URL */}
            {requestedAction === 'change_video' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Proposed YouTube Video URL:</label>
                <input
                  type="text"
                  value={proposedVideoUrl}
                  onChange={(e) => setProposedVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-container font-mono text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-high/40">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-bright text-xs font-medium transition-colors cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPermissionRequest}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                type="button"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
