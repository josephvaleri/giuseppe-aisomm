'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_FUNCTIONAL_AREAS = [
  { value: 'wine_regions', label: 'Wine Regions' },
  { value: 'grape_genetics', label: 'Grape Genetics' },
  { value: 'food_pairings', label: 'Food Pairings' },
  { value: 'grape_profiles', label: 'Grape Profiles' },
  { value: 'viticulture', label: 'Viticulture' },
  { value: 'winemaking', label: 'Winemaking' }
]

interface DocumentUploadProps {
  onUploadSuccess?: () => void
}



export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [functionalArea, setFunctionalArea] = useState('wine_regions')
  const [functionalAreas, setFunctionalAreas] = useState(DEFAULT_FUNCTIONAL_AREAS)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Load functional areas from localStorage
  useEffect(() => {
    const savedAreas = localStorage.getItem('functionalAreas')
    if (savedAreas) {
      try {
        const parsed = JSON.parse(savedAreas)
        setFunctionalAreas(parsed)
      } catch (error) {
        console.error('Error parsing saved functional areas:', error)
      }
    }
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to upload')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${functionalArea}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = fileName // Upload directly to root of bucket

        // Upload file to Supabase Storage
        console.log(`Uploading file to path: ${filePath}`)
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          console.error(`Upload error for ${file.name}:`, uploadError)
          throw uploadError
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }

        // Create database record in documents table
        const documentData = {
          user_id: user.id, // Add the missing user_id
          filename: fileName,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: filePath,
          category: functionalArea,
          extracted_content: null, // Will be populated during processing
          processed: false // Will be set to true after chunking and embedding
        }

        console.log(`Creating database record for ${file.name}`)
        const { data, error: dbError } = await supabase
          .from('documents')
          .insert([documentData])
          .select()
          .single()

        if (dbError) {
          console.error(`Database error for ${file.name}:`, dbError)
          throw dbError
        }

        setUploadProgress(((index + 1) / selectedFiles.length) * 100)
        return data
      })

      const uploadedDocuments = await Promise.all(uploadPromises)
      
      // Process documents into chunks for vector search
      try {
        const processResponse = await fetch('/api/admin/process-documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentIds: uploadedDocuments.map(doc => doc.id)
          })
        })

        if (!processResponse.ok) {
          console.warn('Documents uploaded but processing failed. You can process them manually later.')
        }
      } catch (error) {
        console.warn('Documents uploaded but processing failed:', error)
      }
      
      alert(`Successfully uploaded ${selectedFiles.length} document(s)!`)
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      if (onUploadSuccess) {
        onUploadSuccess()
      }

    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }


  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
      <h2 className="text-xl font-semibold text-amber-900 mb-4">Document Upload</h2>
      
      <div className="space-y-4">

        {/* Functional Area Selection */}
        <div>
          <label className="block text-sm font-medium text-amber-800 mb-2">
            Functional Area
          </label>
          <select
            value={functionalArea}
            onChange={(e) => setFunctionalArea(e.target.value)}
            className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {functionalAreas.map(area => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </div>



        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-amber-800 mb-2">
            Select Files
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.csv"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-amber-600 mt-1">
            Supported formats: PDF, DOC, DOCX, TXT, MD, XLS, XLSX, CSV
          </p>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Selected Files ({selectedFiles.length})
            </label>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-amber-50 p-2 rounded">
                  <div className="flex-1">
                    <span className="text-sm text-amber-800 font-medium">{file.name}</span>
                    <span className="text-xs text-amber-600 ml-2">({formatFileSize(file.size)})</span>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Upload Progress
            </label>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {Math.round(uploadProgress)}% complete
            </p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : `Upload ${selectedFiles.length} Document(s)`}
        </Button>

        {/* Info */}
        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded">
          <p className="font-medium mb-1">Upload Information:</p>
          <ul className="space-y-1">
            <li>• Documents will be stored securely in Supabase Storage</li>
            <li>• Metadata will be saved to the database for search</li>
            <li>• Documents can be processed later for embedding generation</li>
            <li>• Only admins can upload documents</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
