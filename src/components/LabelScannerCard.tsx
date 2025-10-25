'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Upload, Search, Loader2 } from 'lucide-react'
import { WineSelectionModal } from './WineSelectionModal'
import { useToast } from '@/components/ui/use-toast'

export function LabelScannerCard() {
  const [vintage, setVintage] = useState('')
  const [producer, setProducer] = useState('')
  const [wineName, setWineName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState<any>(null)
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
          imageKey: key,
          hint: {
            vintage: vintage ? parseInt(vintage) : undefined,
            producer: producer || undefined,
            wine_name: wineName || undefined
          }
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

      // Show results in modal
      setModalData(data)
      setShowModal(true)
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

  const handleManualSubmit = async () => {
    if (!producer || !wineName) {
      toast({
        title: 'Missing information',
        description: 'Producer and wine name are required',
        variant: 'destructive'
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const res = await fetch('/api/labels/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producer, wine_name: wineName, vintage })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Manual search failed')
      }

      setModalData(data)
      setShowModal(true)
    } catch (error: any) {
      console.error('Manual search error:', error)
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <>
      <Card className="p-4 bg-white/70 backdrop-blur-sm border-amber-200">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-900 text-sm">Label Scanner</h3>
            <div className="flex gap-2">
              {/* Upload button */}
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isAnalyzing}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </Button>

              {/* Camera button (mobile) */}
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading || isAnalyzing}
              >
                <Camera className="w-4 h-4" />
              </Button>

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
          </div>

          {/* Manual input fields */}
          <div className="grid grid-cols-12 gap-2">
            <Input
              placeholder="Vintage"
              value={vintage}
              onChange={(e) => setVintage(e.target.value)}
              className="col-span-3 text-sm border-amber-300"
              maxLength={4}
            />
            <Input
              placeholder="Producer"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
              className="col-span-4 text-sm border-amber-300"
            />
            <Input
              placeholder="Wine Name"
              value={wineName}
              onChange={(e) => setWineName(e.target.value)}
              className="col-span-5 text-sm border-amber-300"
            />
          </div>

          {/* Submit button */}
          <Button
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700"
            onClick={handleManualSubmit}
            disabled={isAnalyzing || (!producer && !wineName)}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>

          {/* Tips */}
          <div className="text-xs text-amber-600 leading-tight">
            <strong>Tips:</strong> Good lighting, steady phone, fill frame with label, straight-on view, no glare.
          </div>
        </div>
      </Card>

      {/* Wine Selection Modal */}
      {showModal && modalData && (
        <WineSelectionModal
          open={showModal}
          onClose={() => setShowModal(false)}
          data={modalData}
          imageKey={imageKey}
        />
      )}
    </>
  )
}

