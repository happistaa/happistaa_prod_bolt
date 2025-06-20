'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// Interface for a meditation track
interface MeditationTrack {
  id: string;
  title: string;
  description: string;
  duration: string; // Duration in seconds as a string
  category: string;
  icon: string;
  audioUrl: string;
  instructor: string;
  fileId?: string;
}

// --- Reusable Helper Functions ---
const formatTime = (time: number) => {
  // Check if time is not a finite number (catches both NaN and Infinity)
  if (!isFinite(time)) {
    return '--:--'; // Return a placeholder for unknown duration
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// This properly converts "123" to 123 seconds
const parseDuration = (durationStr: string | undefined): number => {
  if (!durationStr) return 0;

  // Split the string by the colon into minutes and seconds
  const parts = durationStr.split(':');
  
  // Check if the string is in the expected "minutes:seconds" format
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    // Ensure both parts are valid numbers before calculating total seconds
    if (!isNaN(minutes) && !isNaN(seconds)) {
      return (minutes * 60) + seconds; // e.g., 10 * 60 + 10 = 610
    }
  }

  // Fallback for original behavior (if format is not "MM:SS")
  const parsedDuration = parseInt(durationStr, 10);
  return isNaN(parsedDuration) ? 0 : parsedDuration;
};

// --- [NEW] Unified Audio Player UI Component ---
// This component renders the player's UI and is used by both
// the Google Drive and custom audio players to ensure a consistent look.
const UnifiedAudioPlayer = ({
  icon,
  isPlaying,
  progress,
  currentTime,
  duration,
  volume,
  playbackRate,
  isReady,
  isAuthenticated,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onRewind,
  onForward,
  onPlaybackRateChange,
  onMarkComplete,
}: {
  icon: string;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isReady: boolean;
  isAuthenticated: boolean;
  onPlayPause: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRewind: () => void;
  onForward: () => void;
  onPlaybackRateChange: () => void;
  onMarkComplete: () => void;
}) => {
  // Shows a loading spinner until the audio metadata is loaded
  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-50 rounded-xl border border-gray-200">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const getVolumeIcon = () => {
    if (volume === 0) return 'volume_off';
    if (volume < 0.5) return 'volume_down';
    return 'volume_up';
  };

  return (
    <div className="custom-audio-player bg-gray-50 rounded-xl p-4 border border-gray-200">
      {/* Album art / visualization */}
      <div className="relative w-full h-32 mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div
          className={`text-6xl transition-transform duration-500 ${isPlaying ? 'animate-pulse' : ''}`}
          style={{ transform: isPlaying ? 'scale(1.05)' : 'scale(1)', opacity: isPlaying ? '1' : '0.8' }}
        >
          {icon}
        </div>

        {/* Audio wave visualization (stylized) */}
        {isPlaying && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center items-end space-x-1 h-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 opacity-75 rounded-full"
                style={{
                  height: `${4 + Math.random() * 12}px`,
                  animation: `wave 1.${i % 4}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Timeline / progress */}
      <div className="w-full h-2 rounded-full bg-gray-200 cursor-pointer mb-2 group" onClick={onSeek}>
        <div
          className="bg-blue-500 h-2 rounded-full relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>

      {/* Time indicators */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      {/* <div className="flex items-center justify-between"> */}
        {/* Volume control */}
       {/* <div className="flex items-center w-1/4 space-x-1">
          <button className="text-gray-600 hover:text-gray-900 transition-colors">
            <span className="material-icons text-xl">{getVolumeIcon()}</span>
          </button>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={onVolumeChange}
            className="w-full accent-blue-500 h-1"
          />
        </div> */}

        {/* Main controls */}
        <div className="flex items-center justify-center space-x-4">
          <button onClick={onRewind} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
            <span className="material-icons">replay_10</span>
          </button>

          <button onClick={onPlayPause} className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg transform active:scale-95 transition-transform">
            <span className="material-icons text-3xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>

          <button onClick={onForward} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
            <span className="material-icons">forward_10</span>
          </button>
</div>

        {/* Speed control */}
       {/*  <div className="w-1/4 flex justify-end">
          <button onClick={onPlaybackRateChange} className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors">
            {playbackRate}x
          </button>
        </div>
     {/* </div>*/}

      {/* Complete button */}
      <div className="mt-6 flex justify-center">
        <button onClick={onMarkComplete} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all">
          Mark as Complete {!isAuthenticated && '(Sign Up)'}
        </button>
      </div>
    </div>
  );
};


// --- [REFACTORED] Google Drive Audio Player Component ---
// This component now manages the audio logic and uses the UnifiedAudioPlayer for its UI.
interface GoogleDriveAudioProps {
  fileId: string;
  icon: string; // Added icon prop
  isAuthenticated: boolean;
  onRequestSignup: () => void;
  onEnded?: () => void;
  onMarkComplete: () => void;
  duration: number; // Add duration prop
}

const GoogleDriveAudio = ({
  fileId,
  icon,
  isAuthenticated,
  onRequestSignup,
  onEnded,
  onMarkComplete,
  duration
}: GoogleDriveAudioProps) => {
  const audioUrl = `/api/proxy/google-drive?fileId=${fileId}`;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration); // Use passed duration
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Update progress when currentTime changes
  useEffect(() => {
    if (audioDuration > 0) {
      const newProgress = (currentTime / audioDuration) * 100;
      setProgress(newProgress);
    }
  }, [currentTime, audioDuration]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    // Use the audio's actual duration if available, otherwise fall back to the provided duration
    if (audioRef.current.duration && (!audioDuration || audioDuration <= 0)) {
      console.log('Setting Google Drive audio duration from element:', audioRef.current.duration);
      setAudioDuration(audioRef.current.duration);
    }
    setIsAudioReady(true);
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => console.error('Play failed:', error));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || audioDuration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  };
  
  const handlePlaybackRateChange = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentRateIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentRateIndex + 1) % rates.length];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleRewind = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const handleForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + 10);
  };

  return (
    <div>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        onError={(e) => {
          console.error("Audio error:", e);
          alert("There was an error playing this meditation. Please try again or choose another meditation.");
        }}
        className="hidden"
        preload="auto"
      />
      <UnifiedAudioPlayer
        icon={icon}
        isReady={isAudioReady}
        isPlaying={isPlaying}
        progress={progress}
        currentTime={currentTime}
        duration={audioDuration}
        volume={volume}
        playbackRate={playbackRate}
        isAuthenticated={isAuthenticated}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onRewind={handleRewind}
        onForward={handleForward}
        onPlaybackRateChange={handlePlaybackRateChange}
        onMarkComplete={onMarkComplete}
      />
    </div>
  );
};


// --- [REFACTORED] Main EnhancedMeditation Component ---
interface EnhancedMeditationProps {
  onClose: () => void;
  currentResource?: MeditationTrack | null;
}

export default function EnhancedMeditation({ onClose, currentResource }: EnhancedMeditationProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [activeResource, setActiveResource] = useState<MeditationTrack | null>(currentResource || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Parse duration from activeResource when it changes
  useEffect(() => {
    if (currentResource) {
      setActiveResource(currentResource);
      // Reset state when resource changes
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      
      // Parse the duration from the resource if available
      const parsedDuration = parseDuration(currentResource.duration);
      console.log('Parsed duration from resource:', parsedDuration, 'seconds');
      setDuration(parsedDuration);
      setIsReady(false);
    }
  }, [currentResource]);

  // Update progress when currentTime changes
  useEffect(() => {
    if (duration > 0) {
      const newProgress = (currentTime / duration) * 100;
      setProgress(newProgress);
    }
  }, [currentTime, duration]);
  
  const updateStreak = async (activityType: 'mindfulness') => {
    console.log(`Updating ${activityType} streak for user ${user?.id}`);
    try {
      const response = await fetch('/api/mindfulness/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityType, userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to update streak via API');
      const data = await response.json();
      console.log('Streak updated successfully:', data);
    } catch (error) {
      console.error('Error updating streak via API, falling back to localStorage:', error);
      // Fallback logic can be implemented here if needed
    }
  };
  
  const handleMarkComplete = () => {
    if (isAuthenticated) {
      updateStreak('mindfulness');
      onClose();
    } else {
      router.push('/auth/signup?redirect=mindfulness');
    }
  };

  // --- Handlers for the custom audio player ---
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => console.error('Play failed:', error));
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);
  };
  
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    // If we have a valid duration from the track data, use it
    // Otherwise fall back to the audio element's duration
    if (duration <= 0 && audioRef.current.duration) {
      const audioDuration = audioRef.current.duration;
      console.log('Setting duration from audio element:', audioDuration);
      setDuration(audioDuration);
    }
    setIsReady(true);
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  };

  const handlePlaybackRateChange = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentRateIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentRateIndex + 1) % rates.length];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleRewind = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const handleForward = () => {
    if (!audioRef.current || duration <= 0) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };


  if (!activeResource) return null;

  // Parse duration from activeResource
  const resourceDuration = parseDuration(activeResource.duration);

  return (
    <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">{activeResource.title}</h2>
          <p className="text-gray-600">{activeResource.instructor}</p>
        </div>
        <button 
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            onClose();
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="text-center mb-6">
        <p className="text-gray-600">{activeResource.description}</p>
      </div>
      
      {activeResource.fileId ? (
        // Render the refactored Google Drive player
        <GoogleDriveAudio 
          fileId={activeResource.fileId}
          icon={activeResource.icon}
          isAuthenticated={isAuthenticated}
          onMarkComplete={handleMarkComplete}
          onRequestSignup={() => router.push('/auth/signup?redirect=mindfulness')}
          duration={resourceDuration}
          onEnded={() => {
            if (isAuthenticated) updateStreak('mindfulness');
            onClose();
          }}
        />
      ) : (
        // Render the custom URL player using the Unified UI component
        <>
          <audio
            ref={audioRef}
            src={activeResource.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              if (isAuthenticated) updateStreak('mindfulness');
            }}
            onError={(e) => {
              console.error("Audio error:", e);
              alert("There was an error playing this audio. Please try another meditation.");
            }}
            preload="auto"
            className="hidden"
          />
          <UnifiedAudioPlayer
            icon={activeResource.icon}
            isReady={isReady}
            isPlaying={isPlaying}
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            playbackRate={playbackRate}
            isAuthenticated={isAuthenticated}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onRewind={handleRewind}
            onForward={handleForward}
            onPlaybackRateChange={handlePlaybackRateChange}
            onMarkComplete={handleMarkComplete}
          />
        </>
      )}
      
      {/* Meditation guidance */}
      <div className="mt-6">
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="font-medium text-blue-800 mb-2">Meditation Guidance:</p>
          <ol className="list-decimal list-inside text-gray-700 space-y-1.5">
            <li>Find a comfortable seated position with your back straight.</li>
            <li>Close your eyes or maintain a soft, unfocused gaze.</li>
            <li>Take a few deep breaths to center yourself in the present moment.</li>
            <li>Follow the audio guidance with gentle, non-judgmental awareness.</li>
            <li>When your mind wanders, gently guide it back to the practice.</li>
            <li>At the end, take a moment to notice how you feel.</li>
          </ol>
        </div>
      </div>

      {/* Global style for audio wave animation */}
      <style jsx global>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}