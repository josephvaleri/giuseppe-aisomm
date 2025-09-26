'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import DocumentUpload from '@/components/DocumentUpload'

interface Document {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  category: string
  document_type: string
  upload_date: string
  processed: boolean
  // Wine region specific fields
  region_name?: string
  country?: string
  description?: string
}

function DocumentManagementContent() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [reprocessProgress, setReprocessProgress] = useState(0)
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processedDocuments: 0,
    totalChunks: 0,
    totalFileSize: 0
  })
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      // Load documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false })

      if (documentsError) throw documentsError

      // Get total chunks count
      const { count: totalChunks } = await supabase
        .from('doc_chunks')
        .select('*', { count: 'exact', head: true })

      setDocuments(documentsData || [])

      // Calculate stats
      const totalFileSize = (documentsData || []).reduce((sum, doc) => sum + doc.file_size, 0)
      const processedCount = (documentsData || []).filter(doc => doc.processed).length

      setStats({
        totalDocuments: documentsData?.length || 0,
        processedDocuments: processedCount,
        totalChunks: totalChunks || 0,
        totalFileSize
      })

    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also delete all associated chunks. This action cannot be undone.')) {
      return
    }

    try {
      // First get the document to find the storage path
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Delete associated chunks first (they have foreign key constraint)
      const { error: chunksError } = await supabase
        .from('doc_chunks')
        .delete()
        .eq('doc_id', id)

      if (chunksError) throw chunksError

      // Delete from storage
      if (doc.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.storage_path])

        if (storageError) {
          console.warn('Error deleting from storage:', storageError)
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      alert('Document and all chunks deleted successfully!')
      loadDocuments() // Reload the list
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document')
    }
  }

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error downloading document')
    }
  }

  const handleProcessDocument = async (docId: string) => {
    try {
      const response = await fetch('/api/admin/process-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: [docId]
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Document processed successfully! Created ${result.totalChunksCreated} chunks.`)
        loadDocuments() // Reload to show updated status
      } else {
        alert(`Error processing document: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing document:', error)
      alert('Error processing document')
    }
  }

  const handleReprocessAll = async () => {
    if (!confirm(`Are you sure you want to reprocess all ${documents.length} documents? This will extract text using the new libraries and create new chunks with embeddings.`)) {
      return
    }

    setIsReprocessing(true)
    setReprocessProgress(0)

    try {
      const documentIds = documents.map(doc => doc.id)
      const batchSize = 5
      const totalBatches = Math.ceil(documentIds.length / batchSize)
      let totalChunksCreated = 0
      let totalProcessed = 0

      console.log(`Processing ${documents.length} documents in ${totalBatches} batches of ${batchSize}`)

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize
        const endIndex = Math.min(startIndex + batchSize, documentIds.length)
        const batchDocumentIds = documentIds.slice(startIndex, endIndex)
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches}: documents ${startIndex + 1}-${endIndex}`)
        
        // Update progress based on batch completion
        const batchProgress = (batchIndex / totalBatches) * 100
        setReprocessProgress(batchProgress)

        try {
          const response = await fetch('/api/admin/process-documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentIds: batchDocumentIds
            })
          })

          let result
          try {
            result = await response.json()
          } catch (parseError) {
            console.error('Failed to parse response for batch:', parseError)
            alert(`Error processing batch ${batchIndex + 1}: Server returned invalid response (Status: ${response.status})`)
            continue
          }

          if (response.ok) {
            totalChunksCreated += result.totalChunksCreated || 0
            totalProcessed += result.results?.length || 0
            console.log(`Batch ${batchIndex + 1} completed: ${result.results?.length || 0} documents, ${result.totalChunksCreated || 0} chunks`)
          } else {
            console.error(`Error in batch ${batchIndex + 1}:`, result.error)
            alert(`Error processing batch ${batchIndex + 1}: ${result.error || 'Unknown error'}`)
          }
        } catch (error) {
          console.error(`Error processing batch ${batchIndex + 1}:`, error)
          alert(`Error processing batch ${batchIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // Small delay between batches to prevent overwhelming the server
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      setReprocessProgress(100)
      alert(`Successfully reprocessed ${totalProcessed} documents! Created ${totalChunksCreated} total chunks with embeddings.`)
      loadDocuments() // Reload to show updated status
      
    } catch (error) {
      console.error('Error reprocessing documents:', error)
      alert('Error reprocessing documents')
    } finally {
      setIsReprocessing(false)
      setReprocessProgress(0)
    }
  }

  const currentDocuments = documents

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-amber-800">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Document Management</h1>
              <p className="text-amber-700">Upload and manage Giuseppe's knowledge base documents</p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-amber-300"
            >
              Back to Admin
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Section */}
            <div className="lg:col-span-1">
              <DocumentUpload onUploadSuccess={loadDocuments} />
            </div>

            {/* Stats and Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <h2 className="text-xl font-semibold text-amber-900 mb-4">Document Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{stats.totalDocuments}</div>
                    <div className="text-sm text-amber-700">Total Documents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{stats.totalChunks}</div>
                    <div className="text-sm text-amber-700">Total Chunks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{stats.processedDocuments}</div>
                    <div className="text-sm text-amber-700">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{formatFileSize(stats.totalFileSize)}</div>
                    <div className="text-sm text-amber-700">Total Size</div>
                  </div>
                </div>
              </Card>

              {/* Document List */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-amber-900">Document Library</h2>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="border-amber-300">
                      {documents.length} Documents
                    </Badge>
                             {documents.length > 0 && (
                               <Button
                                 onClick={() => handleReprocessAll()}
                                 variant="outline"
                                 size="sm"
                                 disabled={isReprocessing}
                                 className="border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                 title="Reprocess all documents with embeddings (processes 5 at a time)"
                               >
                                 {isReprocessing ? 'Reprocessing...' : 'Reprocess All'}
                               </Button>
                             )}
                  </div>
                </div>

                {/* Progress Bar */}
                {isReprocessing && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-amber-800">Reprocessing Documents...</span>
                      <span className="text-sm text-amber-600">{Math.round(reprocessProgress)}%</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${reprocessProgress}%` }}
                      ></div>
                    </div>
                             <div className="text-xs text-amber-600 mt-1">
                               Processing {documents.length} documents in batches of 5 with embeddings...
                             </div>
                  </div>
                )}

                {currentDocuments.length === 0 ? (
                  <div className="text-center py-8 text-amber-600">
                    No documents found. Upload some documents to get started!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentDocuments.map((doc) => (
                      <div key={doc.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-amber-900">{doc.original_filename}</h3>
                              <Badge variant={doc.processed ? 'default' : 'secondary'}>
                                {doc.processed ? 'Processed' : 'Pending'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {doc.category.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-sm text-amber-700 space-y-1">
                              <div>Size: {formatFileSize(doc.file_size)} • Type: {doc.mime_type}</div>
                              <div>Uploaded: {formatDate(doc.upload_date)}</div>
                              {doc.extracted_content && (
                                <div className="text-xs text-amber-600">
                                  Content: {doc.extracted_content.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              onClick={() => handleDownloadDocument(doc)}
                              variant="outline"
                              size="sm"
                              className="border-amber-300"
                            >
                              Download
                            </Button>
                            {!doc.processed && (
                              <Button
                                onClick={() => handleProcessDocument(doc.id)}
                                variant="outline"
                                size="sm"
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                Process
                              </Button>
                            )}
                            <Button
                              onClick={() => handleDeleteDocument(doc.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              Delete
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
      </div>
    </div>
  )
}

export default function DocumentManagementPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <DocumentManagementContent />
    </AuthWrapper>
  )
}
