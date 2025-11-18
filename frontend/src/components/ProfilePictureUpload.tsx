import { useState, useRef } from 'react';
import { Upload, Camera, User } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner@2.0.3';

interface ProfilePictureUploadProps {
  currentImage?: string;
  onUpload: (imageUrl: string) => void;
  userName: string;
}

export function ProfilePictureUpload({ currentImage, onUpload, userName }: ProfilePictureUploadProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setPreview(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (preview) {
      // In production, upload to your backend/cloud storage
      onUpload(preview);
      localStorage.setItem('profilePicture_' + userName, preview);
      toast.success('Profile picture updated!');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative group">
          {currentImage || preview ? (
            <img
              src={currentImage || preview}
              alt={userName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl border-4 border-white shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>Upload a new profile picture</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Photo
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!preview}
              className="flex-1"
            >
              Save
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Supported formats: JPG, PNG, GIF (Max 5MB)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
