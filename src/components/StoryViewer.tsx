import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface StoryItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  type: 'image' | 'video' | 'text';
  media_url?: string;
  text_content?: string;
  background_color?: string;
  duration: number;
  created_at: string;
  viewed?: boolean;
}

interface StoryGroup {
  user_id: string;
  user_name: string;
  user_avatar: string;
  stories: StoryItem[];
}

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  accessToken: string;
  onClose: () => void;
  onStoryView: (storyId: string) => void;
}

export function StoryViewer({ 
  storyGroups, 
  initialGroupIndex, 
  currentUserId,
  accessToken,
  onClose,
  onStoryView 
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.viewed) {
      onStoryView(currentStory.id);
    }
  }, [currentStory?.id]);

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || isPaused) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      return;
    }

    setProgress(0);
    const duration = currentStory.duration * 1000; // Convert to ms
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentStory?.id, isPaused]);

  // Handle video
  useEffect(() => {
    if (currentStory?.type === 'video' && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      videoRef.current.muted = isMuted;
    }
  }, [currentStory?.type, isPaused, isMuted]);

  const goToNextStory = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      setCurrentStoryIndex(storyGroups[currentGroupIndex - 1].stories.length - 1);
    }
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      goToPreviousStory();
    } else if (x > third * 2) {
      goToNextStory();
    } else {
      setIsPaused(!isPaused);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white/80 hover:text-white transition-colors"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Navigation arrows for desktop */}
      <div className="hidden md:flex absolute inset-0 items-center justify-between px-4 pointer-events-none z-40">
        {(currentGroupIndex > 0 || currentStoryIndex > 0) && (
          <button
            onClick={goToPreviousStory}
            className="pointer-events-auto bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {(currentGroupIndex < storyGroups.length - 1 || currentStoryIndex < currentGroup.stories.length - 1) && (
          <button
            onClick={goToNextStory}
            className="pointer-events-auto bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Story container */}
      <div className="relative max-w-md w-full h-full md:h-[90vh] bg-black">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
          {currentGroup.stories.map((story, index) => (
            <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-30 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageWithFallback
              src={currentGroup.user_avatar || ''}
              alt={currentGroup.user_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <div>
              <p className="text-white font-medium text-sm">{currentGroup.user_name}</p>
              <p className="text-white/70 text-xs">
                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStory.type === 'video' && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Story content */}
        <div
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={handleScreenClick}
        >
          {currentStory.type === 'text' ? (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ backgroundColor: currentStory.background_color || '#8B5CF6' }}
            >
              <p className="text-white text-3xl font-bold text-center break-words">
                {currentStory.text_content}
              </p>
            </div>
          ) : currentStory.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onEnded={goToNextStory}
            />
          ) : (
            <ImageWithFallback
              src={currentStory.media_url || ''}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Text overlay for media stories */}
          {currentStory.type !== 'text' && currentStory.text_content && (
            <div className="absolute bottom-20 left-0 right-0 px-6">
              <p className="text-white text-lg text-center drop-shadow-lg">
                {currentStory.text_content}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
