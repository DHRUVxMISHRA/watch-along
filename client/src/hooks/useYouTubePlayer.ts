import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface UseYouTubePlayerProps {
  elementId: string;
  initialVideoId: string;
  onLocalPlay?: () => void;
  onLocalPause?: () => void;
  onLocalSeek?: (time: number) => void;
}

export function useYouTubePlayer({
  elementId,
  initialVideoId,
  onLocalPlay,
  onLocalPause,
  onLocalSeek
}: UseYouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(initialVideoId);
  const [playerState, setPlayerState] = useState<number>(-1); // -1: unstarted, 1: playing, 2: paused, 3: buffering
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Guards against echo/feedback loops when applying remote updates
  const isRemoteAction = useRef(false);

  // Helper to instantiate player
  const instantiatePlayer = useCallback((vidId: string, startSecs = 0, autoplay = 0) => {
    if (!elementId || !document.getElementById(elementId) || playerRef.current || !vidId) return;

    try {
      playerRef.current = new window.YT.Player(elementId, {
        videoId: vidId,
        playerVars: {
          autoplay,
          controls: 0,
          disablekb: 0,
          enablejsapi: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          start: Math.floor(startSecs),
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
          },
          onStateChange: (event: any) => {
            const newState = event.data;
            setPlayerState(newState);

            const dur = event.target.getDuration();
            if (dur) setDuration(dur);

            // If this state change was triggered by a remote sync, ignore it
            if (isRemoteAction.current) {
              return;
            }

            // YT.PlayerState.PLAYING === 1
            if (newState === 1) {
              if (onLocalPlay) onLocalPlay();
            }
            // YT.PlayerState.PAUSED === 2
            else if (newState === 2) {
              if (onLocalPause) onLocalPause();
            }
          },
          onError: (err: any) => {
            console.warn('[YouTube Player Error]', err);
          }
        }
      });
    } catch (e) {
      console.error('Failed to instantiate YouTube Player', e);
    }
  }, [elementId, onLocalPlay, onLocalPause]);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      if (initialVideoId) {
        instantiatePlayer(initialVideoId);
      }
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      if (initialVideoId) {
        instantiatePlayer(initialVideoId);
      }
    };
  }, [initialVideoId, instantiatePlayer]);

  // Interval to track currentTime and progress
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isReady) {
        try {
          const time = playerRef.current.getCurrentTime() || 0;
          setCurrentTime(time);
          const dur = playerRef.current.getDuration() || 0;
          if (dur && dur !== duration) {
            setDuration(dur);
          }
        } catch {
          // Player might be reinitializing
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, [isReady, duration]);

  // Remote Synchronization Handler
  const applyRemoteSync = useCallback((
    targetVideoId: string,
    targetIsPlaying: boolean,
    targetTime: number
  ) => {
    if (!targetVideoId) {
      setCurrentVideoId('');
      return;
    }

    // If player has not been created yet because room started without a video
    if (!playerRef.current) {
      setCurrentVideoId(targetVideoId);
      instantiatePlayer(targetVideoId, targetTime, targetIsPlaying ? 1 : 0);
      return;
    }

    if (!isReady || typeof playerRef.current.getPlayerState !== 'function') {
      return;
    }

    isRemoteAction.current = true;

    try {
      // 1. Check if video changed
      if (targetVideoId !== currentVideoId) {
        setCurrentVideoId(targetVideoId);
        playerRef.current.loadVideoById({
          videoId: targetVideoId,
          startSeconds: Math.max(0, targetTime)
        });
        if (!targetIsPlaying) {
          playerRef.current.pauseVideo();
        }
        setTimeout(() => {
          isRemoteAction.current = false;
        }, 1200);
        return;
      }

      // 2. Check time drift (threshold of 1.5 seconds)
      const localTime = playerRef.current.getCurrentTime() || 0;
      const drift = Math.abs(localTime - targetTime);

      if (drift > 1.5) {
        playerRef.current.seekTo(targetTime, true);
      }

      // 3. Check play/pause state
      const currentLocalState = playerRef.current.getPlayerState();
      if (targetIsPlaying) {
        if (currentLocalState !== 1 && currentLocalState !== 3) {
          playerRef.current.playVideo();
        }
      } else {
        if (currentLocalState === 1 || currentLocalState === 3) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (err) {
      console.warn('Error applying remote sync', err);
    } finally {
      setTimeout(() => {
        isRemoteAction.current = false;
      }, 700);
    }
  }, [isReady, currentVideoId, instantiatePlayer]);

  // Local actions (callable by UI)
  const localPlay = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    isRemoteAction.current = false;
    playerRef.current.playVideo();
  }, [isReady]);

  const localPause = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    isRemoteAction.current = false;
    playerRef.current.pauseVideo();
  }, [isReady]);

  const localSeek = useCallback((time: number) => {
    if (!playerRef.current || !isReady) return;
    isRemoteAction.current = false;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
    if (onLocalSeek) {
      onLocalSeek(time);
    }
  }, [isReady, onLocalSeek]);

  const localChangeVideo = useCallback((videoId: string) => {
    setCurrentVideoId(videoId);
    if (!playerRef.current) {
      instantiatePlayer(videoId, 0, 0);
      return;
    }
    if (!isReady) return;
    isRemoteAction.current = false;
    playerRef.current.loadVideoById({
      videoId,
      startSeconds: 0
    });
  }, [isReady, instantiatePlayer]);

  const setVolume = useCallback((vol: number) => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(Math.min(100, Math.max(0, vol)));
    }
  }, []);

  const getVolume = useCallback((): number => {
    if (playerRef.current && typeof playerRef.current.getVolume === 'function') {
      return playerRef.current.getVolume();
    }
    return 100;
  }, []);

  return {
    player: playerRef.current,
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
    setVolume,
    getVolume
  };
}
