import React, { useState } from 'react';

interface LandingPageProps {
  onCreateRoomClick: () => void;
  onJoinRoomClick: () => void;
  onQuickJoin: (code: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoomClick,
  onJoinRoomClick,
  onQuickJoin
}) => {
  const [quickCode, setQuickCode] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim()) {
      onQuickJoin(quickCode.trim().toUpperCase());
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden px-4 md:px-8 py-12 lg:py-24">
        {/* Ambient Backdrop Light Splashes */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-primary-container/15 via-secondary-container/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-tertiary/10 blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          {/* Live Sync Beacon Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-md mb-6 backdrop-blur-md border border-surface-container-highest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-tertiary font-medium">
              Real-Time YouTube Watch Party
            </span>
            <span className="text-outline/40">•</span>
            <span className="text-xs text-on-surface-variant font-medium">Instant Sync</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-on-surface max-w-4xl">
            Watch YouTube{' '}
            <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
              Together.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Create a room, invite your friends, and watch videos together in real time with synchronized playback, dynamic queues, and zero signups.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onCreateRoomClick}
              className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF0033] hover:bg-[#E62117] text-white font-semibold tracking-wide shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-white text-[20px] fill">play_circle</span>
              <span>Create a Room</span>
              <span className="material-symbols-outlined text-white/80 transition-transform group-hover:translate-x-1 text-[18px]">
                arrow_forward
              </span>
            </button>

            <button
              onClick={onJoinRoomClick}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold shadow-md transition-all duration-200 cursor-pointer border border-surface-container-high"
              type="button"
            >
              <span className="material-symbols-outlined text-secondary text-[20px]">link</span>
              <span>Join a Room</span>
            </button>
          </div>

          {/* Product Capability Banner */}
          <div className="mt-10 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-surface-container-low shadow-sm border border-surface-container-high/60">
            <div className="flex flex-col items-center py-2 px-4 rounded-xl bg-surface-container/60">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-on-surface">Create</span>
                <span className="material-symbols-outlined text-primary text-[16px]">add_circle</span>
              </div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium mt-0.5">
                Start a Room
              </span>
            </div>

            <div className="flex flex-col items-center py-2 px-4 rounded-xl bg-surface-container/60">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-tertiary">Share</span>
                <span className="material-symbols-outlined text-tertiary text-[16px]">link</span>
              </div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium mt-0.5">
                Invite Friends
              </span>
            </div>

            <div className="flex flex-col items-center py-2 px-4 rounded-xl bg-surface-container/60">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-secondary">Watch</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">play_circle</span>
              </div>
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium mt-0.5">
                Together
              </span>
            </div>
          </div>

          {/* Cinema Mockup Frame */}
          <div className="mt-10 w-full max-w-5xl rounded-2xl bg-surface-container-low p-2 sm:p-4 shadow-2xl relative border border-surface-container-high/80">
            <div className="rounded-xl bg-surface-container-lowest overflow-hidden shadow-inner relative flex flex-col">
              {/* Room Title Bar inside Mockup */}
              <div className="h-12 bg-surface-container-lowest px-4 flex items-center justify-between border-b border-surface-container-low">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full bg-error-container" />
                  <span className="w-3 h-3 rounded-full bg-surface-variant" />
                  <span className="w-3 h-3 rounded-full bg-surface-variant" />
                  <span className="ml-2 text-xs sm:text-sm text-on-surface font-medium truncate">
                    WatchTogether Live Preview
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono text-xs">
                    PRODUCT PREVIEW
                  </span>
                </div>

                {/* Glowing Synced Pill */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/30 text-tertiary shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span className="text-[11px] uppercase font-bold tracking-wider">
                      Synchronized YouTube Playback
                    </span>
                  </div>
                </div>
              </div>

              {/* Cinema Viewport Media Area with Mockup Visual */}
              <div className="relative w-full aspect-video max-h-[480px] bg-black flex items-center justify-center overflow-hidden">
                <img
                  className="w-full h-full object-cover select-none pointer-events-none"
                  alt="Cinematic Space Preview"
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop"
                />

                {/* Real-Time Timeline Scrub Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent p-4 sm:p-6 flex flex-col gap-2">
                  <div className="w-full flex flex-col gap-1.5">
                    <div className="relative w-full h-2 rounded-full bg-surface-variant/80 overflow-hidden cursor-pointer group">
                      <div className="h-full bg-primary-container relative w-[68%] rounded-full">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg" />
                      </div>
                      <div className="absolute left-[68%] top-0 h-full w-[18%] bg-surface-bright/40" />
                    </div>

                    <div className="flex items-center justify-between text-on-surface-variant font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-white text-[20px] fill">pause</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">volume_up</span>
                        <span className="text-on-surface font-medium">Playback controls</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary text-[11px]">Preview</span>
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">fullscreen</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Participant Shelf */}
              <div className="h-14 bg-surface-container-low px-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">
                    A polished preview of shared playback
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                  <span className="font-mono text-xs text-tertiary font-semibold">All Participants Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS (3-COLUMN GRID) */}
      <section className="w-full px-4 md:px-8 py-16 lg:py-20 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-12">
            <span className="text-xs uppercase tracking-widest text-primary-container font-semibold">
              Architected For Precision
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-on-surface">
              Engineered for Communal Streaming
            </h2>
            <p className="mt-2 max-w-xl text-sm sm:text-base text-on-surface-variant">
              Everything you need for seamless group watching without lag, desyncs, or complex installs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Synchronized Playback */}
            <div className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-surface-container border border-surface-container-high/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-primary-container/15 flex items-center justify-center mb-6 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[26px] fill">play_circle</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-2">Synchronized Playback</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Everyone stays aligned when the video plays, pauses, or seeks, with the room state shared in real time.
                </p>
              </div>
              {/* Feature Micro Visualization */}
              <div className="mt-6 pt-4 bg-surface-container-low p-4 rounded-xl border border-surface-container-high/40">
                <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant mb-2">
                  <span className="text-tertiary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Shared room state
                  </span>
                  <span className="text-outline/70">Automatic Drift Fix</span>
                </div>
                <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full w-4/5 rounded-full" />
                </div>
              </div>
            </div>

            {/* Card 2: Private Watch Rooms */}
            <div className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-surface-container border border-surface-container-high/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center mb-6 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary shadow-sm">
                    <span className="material-symbols-outlined text-[26px]">groups</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-2">Private Watch Rooms</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Create a room and invite friends using a simple 6-character room code or one-click shareable link. No account creation or setup needed.
                </p>
              </div>
              {/* Feature Micro Visualization */}
              <div className="mt-6 pt-4 bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-surface-container-high/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">key</span>
                  <span className="font-mono text-sm text-on-surface font-bold">Shareable invite</span>
                </div>
                <span className="text-xs text-secondary bg-secondary-container/30 px-2 py-0.5 rounded">
                  Instant Join
                </span>
              </div>
            </div>

            {/* Card 3: Role-Based Controls */}
            <div className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-surface-container border border-surface-container-high/60 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-6 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm">
                    <span className="material-symbols-outlined text-[26px] fill">admin_panel_settings</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-2">Role-Based Controls</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Hosts can assign moderators and control who can manage playback, queue videos, or moderate participants, keeping watch parties peaceful and grief-free.
                </p>
              </div>
              {/* Feature Micro Visualization */}
              <div className="mt-6 pt-4 bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-surface-container-high/40">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] fill">crown</span> Host
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">shield</span> Mod
                  </span>
                </div>
                <span className="material-symbols-outlined text-tertiary text-[20px]">toggle_on</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="scroll-mt-20 w-full px-4 md:px-8 py-16 lg:py-24 bg-surface-container-lowest relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-secondary font-semibold">
                Frictionless Workflow
              </span>
              <h2 className="mt-1 text-3xl sm:text-4xl font-bold text-on-surface">
                Start Streaming In Three Clicks
              </h2>
            </div>
            <p className="max-w-md text-sm sm:text-base text-on-surface-variant">
              No signups, no heavy browser extensions, and no configuration files. Jump straight into the stream.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-surface-container-high/60 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-lg font-bold text-primary">
                  1
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
                  smart_display
                </span>
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">Paste Any YouTube Link</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                Choose any public video, music stream, live broadcast, or full documentary URL from YouTube.
              </p>
              <div className="mt-auto p-3 rounded-xl bg-surface-container flex items-center gap-2 text-on-surface-variant font-mono text-xs truncate">
                <span className="text-primary material-symbols-outlined text-[16px]">link</span>
                <span className="truncate">youtube.com/watch?v=your-video</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-surface-container-high/60 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-lg font-bold text-secondary">
                  2
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[24px]">share</span>
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">Share Room Code</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                Send your unique 6-character room code or your instant invite link to friends across any chat app.
              </p>
              <div className="mt-auto p-3 rounded-xl bg-surface-container flex items-center justify-between text-on-surface font-mono text-xs">
                <span className="font-bold text-secondary">Your room link</span>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">content_copy</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-surface-container-high/60 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-lg font-bold text-tertiary">
                  3
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[24px]">sync</span>
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">Enjoy Synchronized Stream</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                Play, pause, seek, and react together simultaneously. Enjoy synchronized audio and video without buffer spikes.
              </p>
              <div className="mt-auto p-3 rounded-xl bg-surface-container flex items-center justify-between text-tertiary font-mono text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" /> Shared playback
                </span>
                <span className="text-on-surface-variant">Ready to watch together</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK JOIN DIALOG / INTERACTION CALLOUT */}
      <section className="w-full px-4 md:px-8 py-12 bg-surface">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-surface-container-high to-surface-container p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-surface-container-highest">
          <div className="flex flex-col text-left max-w-md z-10">
            <span className="text-xs uppercase tracking-wider text-primary font-bold">
              Instant Jump-In
            </span>
            <h3 className="mt-1 text-2xl font-bold text-on-surface">Have a room code ready?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Enter the 6-character room alphanumeric token to sync instantly with your crew.
            </p>
          </div>

          <form onSubmit={handleQuickSubmit} className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 z-10">
            <div className="relative w-full sm:w-48">
              <input
                className="w-full uppercase font-mono text-sm tracking-widest text-center px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-secondary transition-all border border-surface-container-high"
                maxLength={6}
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                type="text"
              />
            </div>
            <button
              type="submit"
              disabled={!quickCode.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-container hover:bg-primary-container/90 disabled:opacity-50 text-on-primary-container font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Join Now</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          {/* Ambient Glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>

      {/* TECHNICAL / DEVELOPER BADGE FOOTER BAR */}
      <section className="w-full px-4 md:px-8 py-8 bg-surface-container-lowest flex flex-col items-center text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-3 px-6 py-2 rounded-full bg-surface-container-low text-on-surface-variant shadow-sm backdrop-blur-md border border-surface-container-high/60">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[18px]">terminal</span>
            <span className="text-xs text-on-surface font-semibold tracking-wide">Tech Stack:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs text-on-surface-variant">
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">React 18</span>
            <span className="text-outline/40">•</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">TypeScript</span>
            <span className="text-outline/40">•</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">WebSockets / Socket.IO</span>
            <span className="text-outline/40">•</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">YouTube IFrame API</span>
          </div>
        </div>
        <span className="mt-3 text-xs text-outline/60">
          Simple, reliable synchronization powered by WebSockets.
        </span>
      </section>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-lowest py-6 border-t border-surface-container-high/30">
        <div className="w-full max-w-[1720px] mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-on-surface-variant text-xs">
          <span>© 2025 WatchTogether. Synchronized communal streaming.</span>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-on-surface transition-colors">
              Architecture & Sync
            </a>
            <button onClick={onJoinRoomClick} className="hover:text-on-surface transition-colors">
              Public Hub
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
