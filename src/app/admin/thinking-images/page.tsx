"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, Save, Eye } from 'lucide-react'
import Image from 'next/image'

interface ThinkingImage {
  id: number
  image_url: string
  stage_order: number
}

export default function ThinkingImagesPage() {
  const [thinkingImages, setThinkingImages] = useState<ThinkingImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [thinkingInterval, setThinkingInterval] = useState(2000)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadThinkingImages()
    loadThinkingInterval()
  }, [])

  const loadThinkingImages = async () => {
    try {
      const { data, error } = await supabase
        .from('thinking_images')
        .select('*')
        .order('stage_order')

      if (error) {
        console.error('Error loading thinking images:', error)
      } else {
        setThinkingImages(data || [])
      }
    } catch (error) {
      console.error('Error loading thinking images:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadThinkingInterval = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('thinking_interval_ms')
        .single()

      if (data?.thinking_interval_ms) {
        setThinkingInterval(data.thinking_interval_ms)
      }
    } catch (error) {
      console.error('Error loading thinking interval:', error)
    }
  }

  const handleImageUpload = async (stageOrder: number, file: File) => {
    if (!file) return

    setUploading(stageOrder)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `thinking-stage-${stageOrder}.${fileExt}`
      const filePath = `thinking-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('giuseppe-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('giuseppe-avatars')
        .getPublicUrl(filePath)

      // Save to database
      const { error: dbError } = await supabase
        .from('thinking_images')
        .upsert({
          stage_order: stageOrder,
          image_url: publicUrl
        })

      if (dbError) {
        console.error('Database error:', dbError)
        return
      }

      // Reload images
      await loadThinkingImages()
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploading(null)
    }
  }

  const handleDeleteImage = async (stageOrder: number) => {
    try {
      const { error } = await supabase
        .from('thinking_images')
        .delete()
        .eq('stage_order', stageOrder)

      if (error) {
        console.error('Error deleting image:', error)
        return
      }

      await loadThinkingImages()
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  const handleSaveInterval = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .update({ thinking_interval_ms: thinkingInterval })
        .eq('id', 1)

      if (error) {
        console.error('Error saving interval:', error)
      } else {
        alert('Thinking interval saved successfully!')
      }
    } catch (error) {
      console.error('Error saving interval:', error)
    } finally {
      setSaving(false)
    }
  }

  const getImageForStage = (stageOrder: number) => {
    return thinkingImages.find(img => img.stage_order === stageOrder)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading thinking images...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-900 mb-8">
          Manage Thinking Images
        </h1>

        {/* Thinking Interval Setting */}
        <Card className="p-6 mb-8 bg-white/80 backdrop-blur-sm border-amber-200">
          <h2 className="text-xl font-semibold text-amber-900 mb-4">
            Thinking Animation Settings
          </h2>
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="interval">Image Change Interval (milliseconds)</Label>
              <Input
                id="interval"
                type="number"
                value={thinkingInterval}
                onChange={(e) => setThinkingInterval(parseInt(e.target.value) || 2000)}
                min="500"
                max="10000"
                step="100"
                className="w-32"
              />
            </div>
            <Button
              onClick={handleSaveInterval}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Interval'}
            </Button>
          </div>
          <p className="text-sm text-amber-600 mt-2">
            Current: {thinkingInterval}ms ({thinkingInterval / 1000}s per image)
          </p>
        </Card>

        {/* Thinking Images Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7].map((stageOrder) => {
            const image = getImageForStage(stageOrder)
            return (
              <Card key={stageOrder} className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <h3 className="text-lg font-semibold text-amber-900 mb-4">
                  Thinking Stage {stageOrder}
                </h3>
                
                {/* Current Image */}
                {image ? (
                  <div className="mb-4">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={image.image_url}
                        alt={`Thinking stage ${stageOrder}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => handleDeleteImage(stageOrder)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                    <span className="text-amber-600 text-sm">No image uploaded</span>
                  </div>
                )}

                {/* Upload New Image */}
                <div>
                  <Label htmlFor={`upload-${stageOrder}`} className="block mb-2">
                    Upload New Image
                  </Label>
                  <Input
                    id={`upload-${stageOrder}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleImageUpload(stageOrder, file)
                      }
                    }}
                    disabled={uploading === stageOrder}
                    className="mb-2"
                  />
                  {uploading === stageOrder && (
                    <div className="text-sm text-amber-600">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Uploading...
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        {/* Preview Section */}
        {thinkingImages.length > 0 && (
          <Card className="p-6 mt-8 bg-white/80 backdrop-blur-sm border-amber-200">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">
              Animation Preview
            </h2>
            <p className="text-amber-600 mb-4">
              This is how Giuseppe will look while thinking (cycling through all uploaded images)
            </p>
            <div className="flex gap-4 overflow-x-auto">
              {thinkingImages
                .sort((a, b) => a.stage_order - b.stage_order)
                .map((image) => (
                  <div key={image.stage_order} className="flex-shrink-0">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={image.image_url}
                        alt={`Thinking stage ${image.stage_order}`}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                    <p className="text-xs text-center mt-1">Stage {image.stage_order}</p>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
