'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, Eye, AlertCircle } from 'lucide-react'
import { AuthWrapper } from '@/components/auth/auth-wrapper'

interface AvatarFile {
  name: string
  url: string
  size: number
  lastModified: string
}

function AvatarManagementContent() {
  const [avatars, setAvatars] = useState<AvatarFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedAvatarType, setSelectedAvatarType] = useState<'waiting' | 'answering' | 'error'>('waiting')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadAvatars()
  }, [])

  const loadAvatars = async () => {
    try {
      setError(null)
      const { data, error } = await supabase.storage
        .from('giuseppe-avatars')
        .list('', {
          limit: 100,
          offset: 0,
        })

      if (error) {
        console.error('Storage error:', error)
        throw error
      }

      const avatarFiles = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('giuseppe-avatars')
            .getPublicUrl(file.name)
          
          return {
            name: file.name,
            url: urlData.publicUrl,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at || ''
          }
        })
      )

      setAvatars(avatarFiles)
    } catch (error) {
      console.error('Error loading avatars:', error)
      setError('Failed to load avatars. Please check your permissions.')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.')
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.')
        return
      }
      
      setSelectedFile(file)
      setError(null)
      setSuccess(null)
    }
  }

  const uploadAvatar = async () => {
    if (!selectedFile || !selectedAvatarType) return

    setUploading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const fileName = `${selectedAvatarType}.png`
      
      console.log('Uploading file:', fileName, 'Size:', selectedFile.size)
      
      const { error } = await supabase.storage
        .from('giuseppe-avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      await loadAvatars()
      setSelectedFile(null)
      setSelectedAvatarType('waiting')
      
      // Reset file input
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      setSuccess('Avatar uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      
      let errorMessage = 'Error uploading avatar'
      if (error.message?.includes('row-level security')) {
        errorMessage = 'Permission denied. Please ensure you are logged in as an admin user.'
      } else if (error.message?.includes('413')) {
        errorMessage = 'File too large. Please select a smaller image.'
      } else if (error.message?.includes('column r.role_id does not exist')) {
        errorMessage = 'Database schema issue. Please run the latest migration scripts.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const deleteAvatar = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return

    try {
      setError(null)
      setSuccess(null)
      const { error } = await supabase.storage
        .from('giuseppe-avatars')
        .remove([fileName])

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      await loadAvatars()
      setSuccess('Avatar deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting avatar:', error)
      
      let errorMessage = 'Error deleting avatar'
      if (error.message?.includes('row-level security')) {
        errorMessage = 'Permission denied. Please ensure you are logged in as an admin user.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Avatar Management</h1>
              <p className="text-amber-700">Manage Giuseppe's avatar images</p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-amber-300"
            >
              Back to Admin
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200 mb-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <strong>Error:</strong> {error}
                </div>
              </div>
            </Card>
          )}

          {/* Success Display */}
          {success && (
            <Card className="p-4 bg-green-50 border-green-200 mb-6">
              <div className="text-green-800">
                <strong>Success:</strong> {success}
              </div>
            </Card>
          )}

          {/* Upload Section */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 mb-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Upload New Avatar</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">
                  Avatar Type
                </label>
                <select
                  value={selectedAvatarType}
                  onChange={(e) => setSelectedAvatarType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"                                                                                  
                >
                  <option value="waiting">Waiting (Default State)</option>
                  <option value="answering">Answering (Thinking)</option>
                  <option value="error">Error (Problem State)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">
                  Image File (PNG, JPG, GIF, WebP - Max 5MB)
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"                                                                                  
                />
                {selectedFile && (
                  <p className="text-sm text-amber-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <Button
                onClick={uploadAvatar}
                disabled={!selectedFile || uploading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Avatar'}
              </Button>
            </div>
          </Card>

          {/* Current Avatars */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Current Avatars</h2>
            
            {avatars.length === 0 ? (
              <p className="text-amber-600">No avatars uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {avatars.map((avatar) => (
                  <div key={avatar.name} className="border border-amber-200 rounded-lg p-4">
                    <div className="aspect-square mb-3 bg-amber-50 rounded-lg flex items-center justify-center">                                                                                                        
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement
                          target.style.display = 'none'
                          const nextElement = target.nextElementSibling as HTMLElement
                          if (nextElement) {
                            nextElement.style.display = 'flex'
                          }
                        }}
                      />
                      <div className="hidden items-center justify-center text-amber-600">
                        <span>No Image</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-amber-900">{avatar.name}</h3>
                      <p className="text-sm text-amber-600">
                        {(avatar.size / 1024).toFixed(1)} KB
                      </p>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(avatar.url, '_blank')}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteAvatar(avatar.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AvatarManagementPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <AvatarManagementContent />
    </AuthWrapper>
  )
}
