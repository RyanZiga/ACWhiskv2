import React, { useState, useRef } from 'react';
import { X, Camera, Video, Image as ImageIcon, Type, Upload } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface StoryCreatorProps {
  user: any;
  onClose: () => void;
  onStoryCreated: () => void;
}

export function StoryCreator({ user, onClose, onStoryCreated }: StoryCreatorProps) {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#8B5CF6');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backgroundColors = [
    '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', 
    '#3B82F6', '#EF4444', '#8B5A3C', '#6366F1',
    '#14B8A6', '#F97316'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    const type = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaType(type);
    setMediaFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStory = async () => {
    if (!mediaFile && !text) {
      alert('Please add media or text to create a story');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let mediaUrl = '';
      let storyType: 'image' | 'video' | 'text' = 'text';

      // Upload media if present
      if (mediaFile) {
        const formData = new FormData();
        formData.append('file', mediaFile);

        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/upload/stories`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload error:', errorText);
          throw new Error('Failed to upload media');
        }

        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.url;
        storyType = mediaType!;
        setUploadProgress(50);
      }

      // Create story
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/stories/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: storyType,
            media_url: mediaUrl,
            text_content: text,
            background_color: backgroundColor,
            duration: mediaType === 'video' ? 15 : 5,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create story');
      }

      setUploadProgress(100);
      onStoryCreated();
      onClose();
    } catch (error) {
      console.error('Error creating story:', error);
      alert(error instanceof Error ? error.message : 'Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  const isTextOnly = !mediaFile;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-white font-semibold">Create Story</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Area */}
        <div 
          className="relative overflow-hidden flex-shrink-0"
          style={{
            aspectRatio: '9/16',
            maxHeight: '40vh',
            minHeight: '200px',
            ...(isTextOnly ? { backgroundColor } : {})
          }}
        >
          {mediaPreview ? (
            mediaType === 'video' ? (
              <video
                src={mediaPreview}
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <ImageWithFallback
                src={mediaPreview}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Camera className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 mb-2">Add photo or video</p>
                <p className="text-white/50 text-sm">or create a text story</p>
              </div>
            </div>
          )}

          {/* Text overlay */}
          {text && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <p className="text-white text-2xl font-bold text-center break-words max-w-full">
                {text}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 space-y-3 flex-shrink-0 overflow-y-auto max-h-[35vh]">
          {/* Text input for text-only stories */}
          {isTextOnly && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share something..."
                className="w-full bg-slate-800 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                maxLength={200}
              />

              {/* Background color picker */}
              <div>
                <label className="text-white text-sm mb-1.5 block">Background Color</label>
                <div className="flex gap-2 flex-wrap">
                  {backgroundColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-9 h-9 rounded-full transition-transform ${
                        backgroundColor === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Caption for media stories */}
          {mediaFile && (
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!mediaFile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Add Media</span>
              </button>
            )}

            <button
              onClick={handleCreateStory}
              disabled={loading || (!mediaFile && !text)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">{uploadProgress > 0 ? `${uploadProgress}%` : 'Creating...'}</span>
                </span>
              ) : (
                <span className="text-sm">Share Story</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
