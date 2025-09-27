import React, { useRef, useEffect, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react'

interface VideoPlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number) => void
  onReady?: () => void
  seekTo?: number
  className?: string
}

interface YouTubePlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: any) => YouTubePlayer
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onTimeUpdate,
  onReady,
  seekTo,
  className = ''
}) => {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)

  // YouTube API を読み込み
  useEffect(() => {
    if (!window.YT) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.body.appendChild(script)

      window.onYouTubeIframeAPIReady = initializePlayer
    } else {
      initializePlayer()
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current = null
        } catch (error) {
          console.error('Error destroying player:', error)
        }
      }
    }
  }, [videoId])

  // seekTo プロパティが変更された時の処理
  useEffect(() => {
    if (playerRef.current && typeof seekTo === 'number' && isReady) {
      playerRef.current.seekTo(seekTo, true)
    }
  }, [seekTo, isReady])

  const initializePlayer = () => {
    if (!containerRef.current || !window.YT) return

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange
      }
    })
  }

  const handlePlayerReady = () => {
    if (playerRef.current) {
      setDuration(playerRef.current.getDuration())
      setVolume(playerRef.current.getVolume())
      setIsMuted(playerRef.current.isMuted())
      setIsReady(true)
      onReady?.()
    }
  }

  const handlePlayerStateChange = (event: { data: number }) => {
    if (!playerRef.current) return

    const state = event.data
    setIsPlaying(state === window.YT.PlayerState.PLAYING)

    if (state === window.YT.PlayerState.PLAYING) {
      startTimeTracking()
    }
  }

  const startTimeTracking = () => {
    const updateTime = () => {
      if (playerRef.current && isPlaying) {
        const time = playerRef.current.getCurrentTime()
        setCurrentTime(time)
        onTimeUpdate?.(time)
        requestAnimationFrame(updateTime)
      }
    }
    requestAnimationFrame(updateTime)
  }

  const togglePlayPause = () => {
    if (!playerRef.current) return

    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const toggleMute = () => {
    if (!playerRef.current) return

    if (isMuted) {
      playerRef.current.unMute()
      setIsMuted(false)
    } else {
      playerRef.current.mute()
      setIsMuted(true)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (!playerRef.current) return

    playerRef.current.setVolume(newVolume)
    setVolume(newVolume)
    
    if (newVolume === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`relative bg-black ${className}`}>
      {/* YouTube埋め込みプレイヤー */}
      <div className="youtube-container">
        <div
          ref={containerRef}
          id="youtube-player"
          className="w-full h-full"
        />
      </div>
      
      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <div 
          className="w-full h-2 bg-gray-600 rounded-full cursor-pointer mb-3 group"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-red-500 rounded-full transition-all duration-150 group-hover:bg-red-400"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
            
            {/* Volume Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            {/* Time Display */}
            <span className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Restart Button */}
            <button
              onClick={() => playerRef.current?.seekTo(0, true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="最初から再生"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            {/* Fullscreen Button */}
            <button
              onClick={() => {
                if (containerRef.current?.requestFullscreen) {
                  containerRef.current.requestFullscreen()
                }
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="フルスクリーン"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer