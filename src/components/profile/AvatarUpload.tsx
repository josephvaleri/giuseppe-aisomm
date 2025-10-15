'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Upload, User, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarUpdate: (url: string) => void
}

export function AvatarUpload({ currentAvatarUrl, onAvatarUpdate }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create file path
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile details
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          publicUrl
        })
      })

      if (!response.ok) throw new Error('Failed to update avatar')

      setPreviewUrl(publicUrl)
      onAvatarUpdate(publicUrl)

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated successfully'
      })
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to update your avatar. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update profile details to remove avatar
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: null,
          publicUrl: null
        })
      })

      if (!response.ok) throw new Error('Failed to remove avatar')

      setPreviewUrl(null)
      onAvatarUpdate('')

      toast({
        title: 'Avatar removed',
        description: 'Your profile picture has been removed'
      })
    } catch (error) {
      console.error('Avatar removal error:', error)
      toast({
        title: 'Removal failed',
        description: 'Failed to remove your avatar. Please try again.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border-2 border-amber-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-200 flex items-center justify-center">
            <User className="w-8 h-8 text-amber-600" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {isUploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </>
            )}
          </Button>

          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveAvatar}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          JPG, PNG, or WebP. Max 5MB.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
