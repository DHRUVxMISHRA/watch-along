import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';
import { LandingPage } from './pages/LandingPage';
import { CreateJoinPage } from './pages/CreateJoinPage';
import { WatchPartyPage } from './pages/WatchPartyPage';
import { ToastMessage, RoomData, Role } from './types';
import { socket, getOrCreateUserId } from './services/socket';
import { extractYouTubeVideoId } from './utils/youtube';

export const App: React.FC = () => {
  // Navigation state
  const [currentPath, setCurrentPath] = useState<'home' | 'create-join' | 'room' | 'how-it-works'>('home');
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  // Active room state
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const activeRoomRef = useRef<RoomData | null>(null);
  activeRoomRef.current = activeRoom;

  const [currentUserRole, setCurrentUserRole] = useState<Role>('PARTICIPANT');
  // A display name is entered for the current room; do not prefill it from a
  // previous room's local storage value.
  const [username, setUsername] = useState<string>('');
  const [userId] = useState<string>(getOrCreateUserId());

  // Connection state
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((title: string, description: string, type: 'success' | 'error' | 'info' = 'info', actionText?: string, onAction?: () => void) => {
    setToast({
      id: `${Date.now()}_${Math.random()}`,
      title,
      description,
      type,
      actionText,
      onAction
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Sync with browser URL /room/:code
  useEffect(() => {
    const handleLocation = async () => {
      const path = window.location.pathname;
      const roomMatch = path.match(/^\/room\/([a-zA-Z0-9_-]{4,8})$/i);

      if (roomMatch && roomMatch[1]) {
        const code = roomMatch[1].toUpperCase();

        // If user is already active in this room, maintain the room view!
        if (activeRoomRef.current && activeRoomRef.current.roomId === code) {
          setCurrentPath('room');
          return;
        }

        // Try to automatically join or verify room
        try {
          const res = await fetch(`/api/rooms/${code}`);
          const data = await res.json();
          if (data.success && data.room) {
            // A fresh page load must ask for a name instead of silently
            // impersonating the previous browser user's display name.
          }
        } catch {
          // Ignore network err on initial check
        }

        setUrlRoomCode(code);
        setCurrentPath('create-join');
      } else if (path === '/create-join') {
        setCurrentPath('create-join');
      } else {
        if (!activeRoomRef.current) {
          setCurrentPath('home');
        }
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, [userId]);

  // Socket connection monitor
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);

      // If user was in an active room, rejoin gracefully
      if (activeRoomRef.current) {
        socket.emit(
          'join_room',
          { roomId: activeRoomRef.current.roomId, username, userId },
          (res) => {
            if (res.success && res.room) {
              setActiveRoom(res.room);
              if (res.userRole) setCurrentUserRole(res.userRole);
            }
          }
        );
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setIsReconnecting(true);
      showToast('Connection Lost', 'Connection lost. Reconnecting to gateway...', 'error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [username, userId, showToast]);

  // Navigation helper
  const navigateTo = (path: 'home' | 'create-join' | 'how-it-works') => {
    setCurrentPath(path);
    if (path === 'home') {
      window.history.pushState({}, '', '/');
    } else if (path === 'create-join') {
      window.history.pushState({}, '', '/create-join');
    }
  };

  // Create Room handler - Real End-to-End Flow
  const handleCreateRoom = async (roomName: string, videoUrl: string, hostDisplayName?: string) => {
    const finalHostName = hostDisplayName?.trim();
    if (!finalHostName) {
      throw new Error('Please enter your display name before creating a room.');
    }
    setUsername(finalHostName);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomName || 'Watch Party',
          // Create and change-video both send a canonical YouTube video ID.
          videoUrl: videoUrl ? extractYouTubeVideoId(videoUrl) || undefined : undefined,
          userId,
          username: finalHostName
        })
      });

      const data = await res.json();
      if (!data.success || !data.room) {
        throw new Error(data.error || 'Failed to create room');
      }

      const createdRoom: RoomData = data.room;

      // 1. Instantly navigate to the Watch Party room screen
      setActiveRoom(createdRoom);
      setCurrentUserRole('HOST');
      setCurrentPath('room');
      window.history.pushState({}, '', `/room/${createdRoom.roomId}`);

      // 2. Connect socket as Host
      socket.emit(
        'join_room',
        { roomId: createdRoom.roomId, username: finalHostName, userId },
        (joinRes) => {
          if (joinRes.success && joinRes.room) {
            setActiveRoom(joinRes.room);
            setCurrentUserRole('HOST');
          }
        }
      );

      showToast('Room Created!', `Room #${createdRoom.roomId} is live. You are the Host!`, 'success');
    } catch (err: any) {
      showToast('Error Creating Room', err?.message || 'Server error', 'error');
      throw err;
    }
  };

  // Join Room handler
  const handleJoinRoom = async (roomId: string, inputUsername: string) => {
    const cleanName = inputUsername.trim();
    if (!cleanName) {
      return Promise.reject(new Error('Please enter your display name to join.'));
    }
    setUsername(cleanName);

    return new Promise<void>((resolve, reject) => {
      socket.emit('join_room', { roomId, username: cleanName, userId }, (res) => {
        if (res.success && res.room) {
          setActiveRoom(res.room);
          setCurrentUserRole(res.userRole || 'PARTICIPANT');
          setCurrentPath('room');
          window.history.pushState({}, '', `/room/${res.room.roomId}`);
          showToast('Connected', `Joined "${res.room.roomName}" as ${res.userRole}`, 'success');
          resolve();
        } else {
          reject(new Error(res.error || 'Room not found or could not join'));
        }
      });
    });
  };

  // Leave Room handler
  const handleLeaveRoom = () => {
    if (activeRoom) {
      socket.emit('leave_room', { roomId: activeRoom.roomId });
    }
    setActiveRoom(null);
    setCurrentPath('home');
    window.history.pushState({}, '', '/');
    showToast('Left Room', 'You have left the watch party.', 'info');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface">
      {/* Reconnection alert banner */}
      {isReconnecting && (
        <div className="w-full bg-error-container text-on-error-container text-xs font-semibold py-1.5 px-4 text-center z-50 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-error animate-ping" />
          <span>Connection lost. Reconnecting to real-time sync gateway...</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigateTo}
        roomInfo={
          activeRoom
            ? {
                username,
                role: currentUserRole,
                onLeaveRoom: handleLeaveRoom
              }
            : undefined
        }
      />

      {/* Main Content Areas */}
      <main className="flex-1 w-full pt-16">
        {currentPath === 'home' && (
          <LandingPage
            onCreateRoomClick={() => navigateTo('create-join')}
            onJoinRoomClick={() => navigateTo('create-join')}
            onQuickJoin={(code) => {
              setUrlRoomCode(code);
              navigateTo('create-join');
            }}
          />
        )}

        {currentPath === 'create-join' && (
          <CreateJoinPage
            initialCode={urlRoomCode}
            initialName={username}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onShowToast={showToast}
          />
        )}

        {currentPath === 'room' && activeRoom && (
          <WatchPartyPage
            roomId={activeRoom.roomId}
            initialRoomName={activeRoom.roomName}
            userId={userId}
            username={username}
            initialRole={currentUserRole}
            initialPlayback={activeRoom.playbackState}
            initialParticipants={activeRoom.participants}
            pendingRequests={activeRoom.pendingRequests}
            onLeaveRoom={handleLeaveRoom}
            onShowToast={showToast}
          />
        )}

        {currentPath === 'how-it-works' && (
          <div className="w-full">
            <LandingPage
              onCreateRoomClick={() => navigateTo('create-join')}
              onJoinRoomClick={() => navigateTo('create-join')}
              onQuickJoin={(code) => {
                setUrlRoomCode(code);
                navigateTo('create-join');
              }}
            />
          </div>
        )}
      </main>

      {/* Global Toast */}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};
