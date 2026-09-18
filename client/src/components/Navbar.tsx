import React from 'react';
import { Role } from '../types';

interface NavbarProps {
  currentPath?: 'home' | 'create-join' | 'room' | 'how-it-works';
  onNavigate: (path: 'home' | 'create-join' | 'how-it-works') => void;
  roomInfo?: {
    roomId: string;
    roomName: string;
    username: string;
    role: Role;
    onCopyCode?: () => void;
    onLeaveRoom?: () => void;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath = 'home',
  onNavigate,
  roomInfo
}) => {
  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'HOST':
        return 'text-amber-400';
      case 'MODERATOR':
        return 'text-indigo-400';
      default:
        return 'text-on-surface-variant';
    }
  };

  const getAvatarBg = (username: string) => {
    const colors = [
      'bg-red-500/20 text-red-300 ring-red-500/30',
      'bg-blue-500/20 text-blue-300 ring-blue-500/30',
      'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
      'bg-purple-500/20 text-purple-300 ring-purple-500/30',
      'bg-amber-500/20 text-amber-300 ring-amber-500/30'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-surface-container-high/40 shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      <div className="h-16 w-full max-w-[1720px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-container to-[#B71C1C] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-white text-[20px] fill">
                smart_display
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight text-on-surface">
              WatchTogether
            </span>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 p-1">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPath === 'home'
                  ? 'bg-surface-container text-on-surface font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('how-it-works')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPath === 'how-it-works'
                  ? 'bg-surface-container text-on-surface font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              How it works
            </button>
            <button
              onClick={() => onNavigate('create-join')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPath === 'create-join'
                  ? 'bg-surface-container text-on-surface font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Rooms
            </button>
          </nav>
        </div>

        {/* Right Section: Room Stats / User Info or CTA */}
        {roomInfo ? (
          <div className="flex items-center gap-3">
            {/* Live Room Meta (hidden on extra small screens) */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-surface-container-low rounded-full border border-surface-container-high/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="text-xs uppercase font-semibold text-tertiary tracking-wide">
                  Live
                </span>
                <span className="text-xs text-on-surface font-medium ml-1 truncate max-w-[120px]">
                  {roomInfo.roomName}
                </span>
              </div>

              {/* Room Code Badge */}
              <div className="flex items-center gap-1.5 bg-surface-container px-2 py-0.5 rounded-md">
                <span className="font-mono text-xs text-on-surface-variant tracking-wider">
                  #{roomInfo.roomId}
                </span>
                {roomInfo.onCopyCode && (
                  <button
                    onClick={roomInfo.onCopyCode}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Copy Room Code"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                )}
              </div>

              {/* Leave Room Pill */}
              {roomInfo.onLeaveRoom && (
                <button
                  onClick={roomInfo.onLeaveRoom}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container/80 text-on-error-container hover:bg-error hover:text-on-error text-xs font-medium transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[13px]">logout</span>
                  <span>Leave</span>
                </button>
              )}
            </div>

            {/* Profile Avatar & Role */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-on-surface leading-tight truncate max-w-[110px]">
                  {roomInfo.username}
                </span>
                <span className={`text-[11px] font-medium leading-tight ${getRoleColor(roomInfo.role)}`}>
                  {roomInfo.role.charAt(0) + roomInfo.role.slice(1).toLowerCase()}
                </span>
              </div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-1 ${getAvatarBg(
                  roomInfo.username
                )}`}
                title={`${roomInfo.username} (${roomInfo.role})`}
              >
                {roomInfo.username.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('create-join')}
              className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-xs sm:text-sm font-semibold shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create / Join</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
