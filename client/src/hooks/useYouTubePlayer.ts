import { useCallback, useEffect, useRef, useState } from 'react';

declare global { interface Window { YT: any; onYouTubeIframeAPIReady: (() => void) | undefined; } }

interface UseYouTubePlayerProps { elementId: string; onLocalPlay?: () => void; onLocalPause?: () => void; onLocalSeek?: (time: number) => void; }
interface RemoteState { videoId: string; isPlaying: boolean; time: number; }

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const script = document.getElementById('youtube-iframe-api') || Object.assign(document.createElement('script'), {
      id: 'youtube-iframe-api',
      src: 'https://www.youtube.com/iframe_api'
    });
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!script.parentNode) document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

export function useYouTubePlayer({ elementId, onLocalPlay, onLocalPause, onLocalSeek }: UseYouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  // Do not preload a video from local/default state. The room's first
  // authoritative sync selects both the video and whether it may play.
  const [currentVideoId, setCurrentVideoId] = useState('');
  const currentVideoIdRef = useRef('');
  const [playerState, setPlayerState] = useState(-1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const pendingRemoteRef = useRef<RemoteState | null>(null);
  const suppressEventsUntilRef = useRef(0);
  const callbacksRef = useRef({ onLocalPlay, onLocalPause, onLocalSeek });
  const suppressRemoteEvents = () => { suppressEventsUntilRef.current = Date.now() + 2_500; };

  useEffect(() => { callbacksRef.current = { onLocalPlay, onLocalPause, onLocalSeek }; }, [onLocalPause, onLocalPlay, onLocalSeek]);

  const instantiatePlayer = useCallback(() => {
    if (playerRef.current || !document.getElementById(elementId) || !window.YT?.Player) return;
    playerRef.current = new window.YT.Player(elementId, {
      playerVars: { autoplay: 0, controls: 0, disablekb: 0, enablejsapi: 1, fs: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, origin: window.location.origin },
      events: {
        onReady: (event: any) => { setIsReady(true); setDuration(event.target.getDuration() || 0); },
        onStateChange: (event: any) => {
          setPlayerState(event.data);
          setDuration(event.target.getDuration() || 0);
          if (Date.now() < suppressEventsUntilRef.current) return;
          if (event.data === 1) callbacksRef.current.onLocalPlay?.();
          if (event.data === 2) callbacksRef.current.onLocalPause?.();
        },
        onError: (error: any) => console.warn('[YouTube Player Error]', error)
      }
    });
  }, [elementId]);

  useEffect(() => {
    let disposed = false;
    loadYouTubeApi().then(() => {
      if (!disposed) instantiatePlayer();
    });
    return () => {
      disposed = true;
      try { playerRef.current?.destroy?.(); } catch { /* iframe may already be detached */ }
      playerRef.current = null;
    };
  }, [instantiatePlayer]);

  const applyRemoteSync = useCallback((videoId: string, isPlaying: boolean, time: number) => {
    if (!videoId) return;
    const state = { videoId, isPlaying, time: Math.max(0, time) };
    pendingRemoteRef.current = state;
    if (!playerRef.current || !isReady) {
      currentVideoIdRef.current = videoId;
      setCurrentVideoId(videoId);
      instantiatePlayer();
      return;
    }
    suppressRemoteEvents();
    try {
      if (currentVideoIdRef.current !== state.videoId) {
        currentVideoIdRef.current = state.videoId;
        setCurrentVideoId(state.videoId);
        // cueVideoById deliberately does not autoplay. This is essential for
        // joins/refreshes of a paused room and avoids racing the iframe's
        // default load behaviour.
        if (state.isPlaying) {
          playerRef.current.loadVideoById({ videoId: state.videoId, startSeconds: state.time });
          playerRef.current.seekTo(state.time, true);
          playerRef.current.playVideo();
        } else {
          playerRef.current.cueVideoById({ videoId: state.videoId, startSeconds: state.time });
          playerRef.current.seekTo(state.time, true);
          playerRef.current.pauseVideo();
        }
      } else {
        const localTime = playerRef.current.getCurrentTime?.() || 0;
        if (Math.abs(localTime - state.time) > 1) playerRef.current.seekTo(state.time, true);
        const localState = playerRef.current.getPlayerState?.();
        if (state.isPlaying && localState !== 1 && localState !== 3) playerRef.current.playVideo();
        if (!state.isPlaying && (localState === 1 || localState === 3)) playerRef.current.pauseVideo();
      }
    } catch (error) { console.warn('Error applying remote sync', error); }
  }, [instantiatePlayer, isReady]);

  useEffect(() => {
    if (isReady && pendingRemoteRef.current) {
      const state = pendingRemoteRef.current;
      pendingRemoteRef.current = null;
      applyRemoteSync(state.videoId, state.isPlaying, state.time);
    }
  }, [applyRemoteSync, isReady]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isReady || !playerRef.current) return;
      try { setCurrentTime(playerRef.current.getCurrentTime?.() || 0); setDuration(playerRef.current.getDuration?.() || 0); } catch { /* iframe is changing videos */ }
    }, 250);
    return () => window.clearInterval(timer);
  }, [isReady]);

  const localPlay = useCallback(() => { if (isReady) playerRef.current?.playVideo(); }, [isReady]);
  const localPause = useCallback(() => { if (isReady) playerRef.current?.pauseVideo(); }, [isReady]);
  const localSeek = useCallback((time: number) => {
    if (!isReady || !playerRef.current) return;
    playerRef.current.seekTo(time, true); setCurrentTime(time); callbacksRef.current.onLocalSeek?.(time);
  }, [isReady]);
  const localChangeVideo = useCallback((videoId: string) => applyRemoteSync(videoId, false, 0), [applyRemoteSync]);
  const setVolume = useCallback((value: number) => playerRef.current?.setVolume?.(Math.min(100, Math.max(0, value))), []);
  const getVolume = useCallback(() => playerRef.current?.getVolume?.() ?? 100, []);
  return { player: playerRef.current, isReady, currentVideoId, playerState, duration, currentTime, applyRemoteSync, localPlay, localPause, localSeek, localChangeVideo, setVolume, getVolume };
}
