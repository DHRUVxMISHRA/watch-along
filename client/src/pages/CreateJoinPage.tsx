import React, { useState, useEffect } from 'react';
import { extractYouTubeVideoId } from '../utils/youtube';

interface CreateJoinPageProps {
  initialCode?: string;
  initialName?: string;
  onCreateRoom: (roomName: string, videoUrl: string, hostName?: string) => Promise<void>;
  onJoinRoom: (roomId: string, username: string) => Promise<void>;
  onShowToast: (title: string, description: string, type?: 'success' | 'error' | 'info') => void;
}

export const CreateJoinPage: React.FC<CreateJoinPageProps> = ({
  initialCode = '',
  initialName = '',
  onCreateRoom,
  onJoinRoom,
  onShowToast
}) => {
  // Create Room state
  const [roomTitle, setRoomTitle] = useState('');
  const [hostName, setHostName] = useState(initialName || '');
  const [videoUrl, setVideoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Room state
  const [roomCode, setRoomCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState(initialName);
  const [isJoining, setIsJoining] = useState(false);
  const [validatedRoomInfo, setValidatedRoomInfo] = useState<{ roomId: string; roomName: string } | null>(null);

  useEffect(() => {
    if (initialCode) {
      setRoomCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  useEffect(() => {
    if (initialName) {
      setDisplayName(initialName);
      if (!hostName) setHostName(initialName);
    }
  }, [initialName]);

  // Validate room code when 6 characters typed into the Join card
  useEffect(() => {
    const clean = roomCode.trim().toUpperCase();
    if (clean.length === 6) {
      fetch(`/api/rooms/${clean}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.room) {
            setValidatedRoomInfo({
              roomId: data.room.roomId,
              roomName: data.room.roomName
            });
          } else {
            setValidatedRoomInfo(null);
          }
        })
        .catch(() => {
          setValidatedRoomInfo(null);
        });
    } else {
      setValidatedRoomInfo(null);
    }
  }, [roomCode]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hostName.trim()) {
      onShowToast('Name Required', 'Please enter your display name before creating a room.', 'error');
      return;
    }

    // Validate YouTube URL only if supplied
    if (videoUrl.trim()) {
      const extracted = extractYouTubeVideoId(videoUrl);
      if (!extracted) {
        onShowToast(
          'Invalid YouTube URL',
          'Please enter a valid YouTube video URL or leave it empty.',
          'error'
        );
        return;
      }
    }

    setIsCreating(true);
    try {
      await onCreateRoom(roomTitle.trim(), videoUrl.trim(), hostName.trim());
    } catch (err: any) {
      onShowToast('Failed to Create Room', err?.message || 'Server error', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = displayName.trim();

    if (!cleanCode || cleanCode.length < 4) {
      onShowToast('Invalid Room Code', 'Please enter a valid 6-character room code.', 'error');
      return;
    }

    if (!cleanName) {
      onShowToast('Name Required', 'Please enter your display name to join.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      await onJoinRoom(cleanCode, cleanName);
    } catch (err: any) {
      onShowToast('Could Not Join Room', err?.message || 'Room not found or server unreachable', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        let extractedCode = text.trim();
        const urlMatch = text.match(/\/room\/([a-zA-Z0-9_-]{4,8})/);
        if (urlMatch && urlMatch[1]) {
          extractedCode = urlMatch[1];
        } else {
          extractedCode = text.trim().slice(-6);
        }
        const cleaned = extractedCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        setRoomCode(cleaned);
        onShowToast('Code Pasted', `Room code #${cleaned} loaded from clipboard`, 'info');
      }
    } catch {
      onShowToast('Clipboard Error', 'Could not read clipboard. Please paste manually.', 'error');
    }
  };

  return (
    <main className="w-full min-h-[calc(100vh-4rem)] bg-surface flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col w-full max-w-6xl mx-auto py-8 px-2 sm:px-4 relative items-center">
        {/* Subtle Ambient Glow Orbs */}
        <div className="absolute -top-12 left-1/4 w-96 h-96 rounded-full bg-primary-container/10 blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-secondary-container/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full bg-tertiary-container/10 blur-[90px] pointer-events-none" />

        {/* Header Section */}
        <div className="text-center max-w-xl mx-auto mb-10 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary text-xs font-semibold mb-3 shadow-sm border border-surface-container-highest">
            <span className="material-symbols-outlined text-sm text-primary fill">movie</span>
            <span>SYNCHRONOUS STREAMING ENGINE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-on-surface mb-2">
            Start a <span className="text-primary-container">Watch Party</span>
          </h1>

          <p className="text-sm sm:text-base text-on-surface-variant max-w-md mx-auto">
            Choose how you want to start watching YouTube with friends today. Zero delay, pure sync.
          </p>
        </div>

        {/* Main Dual Card Container */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 w-full items-stretch relative z-10">
          {/* CARD A: CREATE ROOM */}
          <div className="lg:col-span-5 bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group border border-surface-container-high/60">
            {/* Glow rim highlight */}
            <div className="absolute -inset-0.5 bg-gradient-to-b from-primary-container/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

            <form onSubmit={handleCreateSubmit} className="relative z-10 flex flex-col h-full justify-between">
              <div>
                {/* Top Badge & Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-primary-container/15 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                    NEW PARTY
                  </span>
                  <span className="material-symbols-outlined text-primary-fixed-dim/40 text-xl">
                    cast_connected
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-on-surface mb-1">Create New Room</h2>
                <p className="text-sm text-on-surface-variant mb-6">
                  You'll become the Host and have full control over the watch party playback and participant permissions.
                </p>

                {/* Input 1: Room Title */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="room-name-input">
                    Room Title
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none">
                      tag
                    </span>
                    <input
                      id="room-name-input"
                      className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all border border-surface-container-high"
                      placeholder="e.g. Friday Movie Night"
                      type="text"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                    />
                  </div>
                </div>

                {/* Input 2: Host Display Name */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="host-name-input">
                    Your Host Display Name
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none">
                      account_circle
                    </span>
                    <input
                      id="host-name-input"
                      className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all border border-surface-container-high"
                      placeholder="Enter your name"
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Input 3: YouTube Video URL (Optional) */}
                <div className="flex flex-col gap-1.5 mb-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="video-url-input">
                      YouTube Video URL (Optional)
                    </label>
                    <span className="text-[11px] text-on-surface-variant">Optional</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none">
                      smart_display
                    </span>
                    <input
                      id="video-url-input"
                      className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all border border-surface-container-high font-mono text-xs"
                      placeholder="Paste a YouTube URL or leave empty..."
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant/80 mt-1">
                    You can also add or change the video inside the room at any time.
                  </p>
                </div>

                {/* Checklist */}
                <div className="flex flex-col gap-2.5 mb-8">
                  <div className="flex items-center gap-2.5 text-xs text-on-surface">
                    <div className="w-5 h-5 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-xs">check</span>
                    </div>
                    <span>Automatic Host status with Crown badge</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-on-surface">
                    <div className="w-5 h-5 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-xs">check</span>
                    </div>
                    <span>Assign Moderators & custom playback queue rules</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-on-surface">
                    <div className="w-5 h-5 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-xs">check</span>
                    </div>
                    <span>Instant shareable code & secure one-click link</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-primary-container hover:bg-inverse-primary disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
                  id="btn-create-room"
                >
                  <span className="material-symbols-outlined text-xl fill">play_circle</span>
                  <span>{isCreating ? 'Creating Room...' : 'Create Room as Host'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* DIVIDER OR */}
          <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-3 py-2 lg:py-0">
            <div className="h-px lg:h-24 w-full lg:w-px bg-surface-container-highest" />
            <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-mono text-xs uppercase tracking-widest shrink-0 border border-surface-container-high">
              OR
            </span>
            <div className="h-px lg:h-24 w-full lg:w-px bg-surface-container-highest" />
          </div>

          {/* CARD B: JOIN ROOM */}
          <div className="lg:col-span-5 bg-surface-container-low/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group border border-surface-container-high/60">
            {/* Glow rim highlight */}
            <div className="absolute -inset-0.5 bg-gradient-to-b from-secondary-container/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

            <form onSubmit={handleJoinSubmit} className="relative z-10 flex flex-col h-full justify-between">
              <div>
                {/* Top Badge & Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">key</span>
                    ENTER CODE
                  </span>
                  <span className="material-symbols-outlined text-secondary-fixed-dim/40 text-xl">
                    group_add
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-on-surface mb-1">Join Existing Room</h2>
                <p className="text-sm text-on-surface-variant mb-6">
                  Have a room code or invite link from a friend? Jump right into the stream as a participant.
                </p>

                {/* Input 1: Room Code */}
                <div className="flex flex-col gap-1.5 mb-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="room-code-input">
                      6-Digit Room Code
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="text-xs font-medium text-secondary hover:text-secondary-fixed cursor-pointer transition-colors"
                    >
                      Paste from Clipboard
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="room-code-input"
                      className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/40 px-4 py-3 rounded-xl text-xl font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-secondary transition-all border border-surface-container-high"
                      maxLength={6}
                      placeholder="AB12CD"
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                {/* Input 2: Display Name */}
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="nickname-input">
                    Your Display Name
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none">
                      account_circle
                    </span>
                    <input
                      id="nickname-input"
                      className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all border border-surface-container-high"
                      placeholder="Enter your name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Helper hint */}
                <div className="flex items-start gap-2 text-xs text-on-surface-variant/80 mb-8">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5">link</span>
                  <p>
                    Joining via link? Paste the room URL directly into the room code field to resolve automatically.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isJoining}
                  className="w-full bg-secondary hover:bg-secondary-fixed text-on-secondary-fixed font-semibold py-3.5 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
                  id="btn-join-room"
                >
                  <span>{isJoining ? 'Connecting...' : 'Join Watch Party'}</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Status Preview Bar (Only shown when a valid 6-char code is typed in Join Room) */}
        {validatedRoomInfo && (
          <div className="w-full max-w-xl mx-auto mt-8 flex flex-col items-center gap-2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-full bg-surface-container-high/90 backdrop-blur-md rounded-xl p-4 flex items-center justify-between shadow-md border border-tertiary/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary shrink-0">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-on-surface truncate">
                    Room #{validatedRoomInfo.roomId} found
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">
                    "{validatedRoomInfo.roomName}" • Ready to join
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleJoinSubmit}
                className="px-4 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-semibold text-xs shrink-0 transition-colors cursor-pointer hover:bg-tertiary-fixed"
              >
                Enter Now
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
