'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Upload, Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface WineScannerProps {
  onScanComplete: (data: any) => void
}

export default function WineScanner({ onScanComplete }: WineScannerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, or WebP)',
        variant: 'destructive'
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: 'File too large',
        description: 'Image must be less than 10MB',
        variant: 'destructive'
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setIsUploading(true)

    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch('/api/labels/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType: file.type })
      })

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { imageKey: key, uploadUrl } = await presignRes.json()

      // Step 2: Upload file to storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image')
      }

      setImageKey(key)

      // Step 3: Analyze the image
      await analyzeImage(key)
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload and analyze image. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const analyzeImage = async (key: string) => {
    setIsAnalyzing(true)

    try {
      const res = await fetch('/api/labels/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageKey: key
        })
      })

      const data = await res.json()

      if (!res.ok) {
        // QC failure or other error
        if (data.type === 'qc_failed') {
          toast({
            title: 'Image Quality Issue',
            description: data.error,
            variant: 'destructive'
          })
          return
        }
        throw new Error(data.error || 'Analysis failed')
      }

      // If we have high confidence results, trigger AI search for complete wine data
      let completeWineData = data.parsed || {}
      
      if (data.type === 'ai_result' && data.wineData) {
        // AI search was already completed automatically
        completeWineData = {
          ...data.parsed,
          ...data.wineData,
          // Map AI search results to form fields
          appellation: data.wineData.appellation || data.parsed?.appellation,
          country: data.wineData.country || data.parsed?.country,
          wine_region: data.wineData.wine_region || data.parsed?.wine_region,
          color: data.wineData.color || data.parsed?.color,
          bottle_size: data.wineData.bottle_size || data.parsed?.bottle_size,
          alcohol_percent: data.wineData.alcohol_percent || data.parsed?.alcohol_percent,
          typical_price: data.wineData.typical_price || data.parsed?.typical_price,
          grapes: data.wineData.grapes || data.parsed?.grapes,
          ratings: data.wineData.ratings || data.parsed?.ratings,
          bubbly: data.wineData.bubbly || data.parsed?.bubbly || false,
          drink_starting: data.wineData.drink_starting || data.parsed?.drink_starting,
          drink_by: data.wineData.drink_by || data.parsed?.drink_by
        }
      } else if (data.parsed && (data.parsed.producer || data.parsed.wine_name)) {
        // High confidence extraction - trigger AI search for complete data
        try {
          const aiRes = await fetch('/api/labels/ai-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parsed: data.parsed })
          })

          if (aiRes.ok) {
            const aiData = await aiRes.json()
            if (aiData.wineData) {
              // Merge parsed data with AI search results
              completeWineData = {
                ...data.parsed,
                ...aiData.wineData,
                // Map AI search results to form fields
                appellation: aiData.wineData.appellation || data.parsed?.appellation,
                country: aiData.wineData.country || data.parsed?.country,
                wine_region: aiData.wineData.wine_region || data.parsed?.wine_region,
                color: aiData.wineData.color || data.parsed?.color,
                bottle_size: aiData.wineData.bottle_size || data.parsed?.bottle_size,
                alcohol_percent: aiData.wineData.alcohol_percent || data.parsed?.alcohol_percent,
                typical_price: aiData.wineData.typical_price || data.parsed?.typical_price,
                grapes: aiData.wineData.grapes || data.parsed?.grapes,
                ratings: aiData.wineData.ratings || data.parsed?.ratings,
                bubbly: aiData.wineData.bubbly || data.parsed?.bubbly || false,
                drink_starting: aiData.wineData.drink_starting || data.parsed?.drink_starting,
                drink_by: aiData.wineData.drink_by || data.parsed?.drink_by
              }
            }
          }
        } catch (aiError) {
          console.log('AI search failed, using parsed data only:', aiError)
          // Continue with just the parsed data if AI search fails
        }
      }

      // Pass the complete wine data to the parent component
      onScanComplete({
        ...data,
        parsed: completeWineData,
        imageKey: key,
        imagePreview
      })
    } catch (error: any) {
      console.error('Analysis error:', error)
      toast({
        title: 'Analysis failed',
        description: error.message || 'Failed to analyze label. Please try manual entry.',
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRetake = () => {
    setImagePreview(null)
    setImageKey(null)
    setIsUploading(false)
    setIsAnalyzing(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Wine Label
          </CardTitle>
          <CardDescription>
            Take a photo of the wine label to automatically extract wine information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!imagePreview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isUploading || isAnalyzing}
                  className="h-20 flex flex-col gap-2"
                >
                  <Camera className="w-6 h-6" />
                  Take Photo
                </Button>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isAnalyzing}
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                >
                  <Upload className="w-6 h-6" />
                  Upload Image
                </Button>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">📸 Tips for best results:</h4>
                <ul className="space-y-1">
                  <li>• Good lighting, avoid shadows and glare</li>
                  <li>• Hold phone steady and straight</li>
                  <li>• Fill frame with the label</li>
                  <li>• Make sure text is clearly readable</li>
                </ul>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Wine label preview"
                  className="w-full max-h-96 object-contain rounded-lg border"
                />
                {(isUploading || isAnalyzing) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>
                        {isUploading ? 'Uploading...' : 'Analyzing label...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  disabled={isUploading || isAnalyzing}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retake Photo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
