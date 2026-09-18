import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';
import { LandingPage } from './pages/LandingPage';
import { CreateJoinPage } from './pages/CreateJoinPage';
import { WatchPartyPage } from './pages/WatchPartyPage';
import { ToastMessage, RoomData, Role } from './types';
import { socket, getOrCreateUserId, getSavedUsername, saveUsername } from './services/socket';

export const App: React.FC = () => {
  // Navigation state
  const [currentPath, setCurrentPath] = useState<'home' | 'create-join' | 'room' | 'how-it-works'>('home');
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  // Active room state
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role>('PARTICIPANT');
  const [username, setUsername] = useState<string>(getSavedUsername() || '');
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
    const handleLocation = () => {
      const path = window.location.pathname;
      const roomMatch = path.match(/^\/room\/([a-zA-Z0-9_-]{4,8})$/i);
      if (roomMatch && roomMatch[1]) {
        const code = roomMatch[1].toUpperCase();
        setUrlRoomCode(code);
        setCurrentPath('create-join');
      } else if (path === '/create-join') {
        setCurrentPath('create-join');
      } else {
        if (!activeRoom) {
          setCurrentPath('home');
        }
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, [activeRoom]);

  // Socket connection monitor
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      showToast('Connected', 'Real-time WebSocket connected', 'success');

      // If user was in an active room, rejoin gracefully
      if (activeRoom) {
        socket.emit('join_room', { roomId: activeRoom.roomId, username, userId }, (res) => {
          if (res.success && res.room) {
            setActiveRoom(res.room);
            if (res.userRole) setCurrentUserRole(res.userRole);
          }
        });
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
  }, [activeRoom, username, userId, showToast]);

  // Navigation helper
  const navigateTo = (path: 'home' | 'create-join' | 'how-it-works') => {
    setCurrentPath(path);
    if (path === 'home') {
      window.history.pushState({}, '', '/');
    } else if (path === 'create-join') {
      window.history.pushState({}, '', '/create-join');
    }
  };

  // Create Room handler
  const handleCreateRoom = async (roomName: string, videoUrl: string) => {
    const defaultName = username || 'Host';
    setUsername(defaultName);
    saveUsername(defaultName);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, videoUrl })
      });
      const data = await res.json();
      if (!data.success || !data.room) {
        throw new Error(data.error || 'Failed to create room');
      }

      const createdRoom: RoomData = data.room;

      // Join socket room as creator
      socket.emit(
        'join_room',
        { roomId: createdRoom.roomId, username: defaultName, userId },
        (joinRes) => {
          if (joinRes.success && joinRes.room) {
            setActiveRoom(joinRes.room);
            setCurrentUserRole('HOST');
            setCurrentPath('room');
            window.history.pushState({}, '', `/room/${createdRoom.roomId}`);
            showToast('Room Created!', `Room #${createdRoom.roomId} created with Host privileges`, 'success');
          } else {
            showToast('Join Error', joinRes.error || 'Could not join created room', 'error');
          }
        }
      );
    } catch (err: any) {
      showToast('Error Creating Room', err?.message || 'Server error', 'error');
      throw err;
    }
  };

  // Join Room handler
  const handleJoinRoom = async (roomId: string, inputUsername: string) => {
    setUsername(inputUsername);
    saveUsername(inputUsername);

    return new Promise<void>((resolve, reject) => {
      socket.emit('join_room', { roomId, username: inputUsername, userId }, (res) => {
        if (res.success && res.room) {
          setActiveRoom(res.room);
          setCurrentUserRole(res.userRole || 'PARTICIPANT');
          setCurrentPath('room');
          window.history.pushState({}, '', `/room/${res.room.roomId}`);
          showToast('Welcome!', `Connected to "${res.room.roomName}"`, 'success');
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
                roomId: activeRoom.roomId,
                roomName: activeRoom.roomName,
                username,
                role: currentUserRole,
                onCopyCode: () => {
                  navigator.clipboard.writeText(activeRoom.roomId).catch(() => {});
                  showToast('Room Code Copied!', `Code ${activeRoom.roomId} copied to clipboard`, 'success');
                },
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
