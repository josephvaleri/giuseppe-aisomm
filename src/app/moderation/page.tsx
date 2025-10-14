'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Check, X, Edit, Wine, MessageSquare } from 'lucide-react'
import Image from 'next/image'

interface ModerationItem {
  id: number
  question: string
  answer: string
  status: 'pending' | 'accepted' | 'rejected' | 'edited'
  created_at: string
  user_email?: string
}

function ModerationPageContent() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [wineItems, setWineItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWines, setIsLoadingWines] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null)
  const [selectedWine, setSelectedWine] = useState<any>(null)
  const [editedAnswer, setEditedAnswer] = useState('')
  const [editedWine, setEditedWine] = useState<Record<number, any>>({})
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  // Get signed image URL from storage (for private buckets)
  const getImageUrl = async (imageKey: string) => {
    if (!imageKey) return null
    try {
      const { data, error } = await supabase.storage
        .from('label-images')
        .createSignedUrl(imageKey, 3600) // 1 hour expiry
      
      if (error) {
        console.error('Error getting signed URL:', error)
        return null
      }
      
      return data.signedUrl
    } catch (err) {
      console.error('Error creating signed URL:', err)
      return null
    }
  }

  useEffect(() => {
    loadModerationItems()
    loadWineItems()
  }, [])

  // Load image URL when wine is selected
  useEffect(() => {
    const loadImageUrl = async () => {
      if (selectedWine?.image_key) {
        const url = await getImageUrl(selectedWine.image_key)
        setImageUrl(url)
      } else {
        setImageUrl(null)
      }
    }
    loadImageUrl()
  }, [selectedWine])

  const loadWineItems = async () => {
    try {
      const { data, error } = await supabase
        .from('moderation_items_wines')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      setWineItems(data || [])
    } catch (error) {
      console.error('Error loading wine items:', error)
    } finally {
      setIsLoadingWines(false)
    }
  }

  const loadModerationItems = async () => {
    try {
      console.log('Loading moderation items...')
      
      // First get moderation items
      const { data: moderationData, error: moderationError } = await supabase
        .from('moderation_items')
        .select('item_id, qa_id, status, updated_at')
        .order('updated_at', { ascending: false })

      console.log('Moderation data:', moderationData)
      console.log('Moderation error:', moderationError)

      if (moderationError) throw moderationError

      if (!moderationData || moderationData.length === 0) {
        console.log('No moderation items found')
        setItems([])
        setIsLoading(false)
        return
      }

      // Get the qa_ids
      const qaIds = moderationData.map(item => item.qa_id)

      // Get questions_answers data
      const { data: qaData, error: qaError } = await supabase
        .from('questions_answers')
        .select('qa_id, question, answer, created_at, user_id')
        .in('qa_id', qaIds)

      if (qaError) throw qaError

      // Get user emails
      const userIds = [...new Set(qaData?.map(qa => qa.user_id) || [])]
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds)

      if (profileError) throw profileError

      // Create a map of user_id to email
      const userEmailMap = new Map(profileData?.map(profile => [profile.user_id, profile.email]) || [])

      // Combine the data
      const formattedData = moderationData.map(moderationItem => {
        const qaItem = qaData?.find(qa => qa.qa_id === moderationItem.qa_id)
        const userEmail = qaItem ? userEmailMap.get(qaItem.user_id) : 'Unknown'

        return {
          id: moderationItem.qa_id,
          question: qaItem?.question || 'Unknown question',
          answer: qaItem?.answer || 'Unknown answer',
          status: moderationItem.status,
          created_at: qaItem?.created_at || moderationItem.updated_at,
          user_email: userEmail || 'Unknown'
        }
      })

      console.log('Formatted data:', formattedData)
      setItems(formattedData)
    } catch (error) {
      console.error('Error loading moderation items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptWine = async (modId: number) => {
    try {
      const editData = editedWine[modId] || {}
      
      const res = await fetch(`/api/moderation/wines/${modId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedData: editData })
      })

      if (!res.ok) {
        throw new Error('Failed to accept wine')
      }

      // Reload wine items
      await loadWineItems()
      setSelectedWine(null)
      alert('Wine accepted and added to database!')
    } catch (error) {
      console.error('Error accepting wine:', error)
      alert('Error accepting wine')
    }
  }

  const handleDenyWine = async (modId: number) => {
    if (!confirm('Are you sure you want to deny this wine? This will delete the record and image.')) {
      return
    }

    try {
      const res = await fetch(`/api/moderation/wines/${modId}/deny`, {
        method: 'POST'
      })

      if (!res.ok) {
        throw new Error('Failed to deny wine')
      }

      // Reload wine items
      await loadWineItems()
      setSelectedWine(null)
      alert('Wine denied and removed')
    } catch (error) {
      console.error('Error denying wine:', error)
      alert('Error denying wine')
    }
  }

  const updateStatus = async (id: number, status: string, editedAnswer?: string) => {
    try {
      // Get current user for moderation decision tracking
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Store moderation decision for model retraining
      const { error: decisionError } = await supabase
        .from('moderation_decisions')
        .insert({
          qa_id: id,
          moderator_id: user.id,
          decision: status,
          edited_answer: editedAnswer || null,
          moderation_notes: status === 'edited' ? 'Answer was edited by moderator' : null
        })

      if (decisionError) {
        console.error('Error storing moderation decision:', decisionError)
        // Continue anyway - don't block the moderation process
      }

      // Update the moderation item status
      const { error: moderationError } = await supabase
        .from('moderation_items')
        .update({ status })
        .eq('qa_id', id)

      if (moderationError) throw moderationError

      // If editing the answer, update the questions_answers table
      if (editedAnswer) {
        const { error: answerError } = await supabase
          .from('questions_answers')
          .update({ answer: editedAnswer })
          .eq('qa_id', id)

        if (answerError) throw answerError
      }

      // If accepting or rejecting, remove from moderation queue
      if (status === 'accepted' || status === 'rejected') {
        const { error: deleteError } = await supabase
          .from('moderation_items')
          .delete()
          .eq('qa_id', id)

        if (deleteError) throw deleteError
      }

      // Reload items
      loadModerationItems()
      setSelectedItem(null)
      setEditedAnswer('')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating item')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      accepted: 'default',
      rejected: 'destructive',
      edited: 'secondary'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">                                                                                                     
        <div className="text-amber-800">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Moderation Queue</h1>
              <p className="text-amber-700">Review Q&A pairs and wine label submissions</p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-amber-300"
            >
              Back to Admin
            </Button>
          </div>

          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="questions" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Question Quality ({items.length})
              </TabsTrigger>
              <TabsTrigger value="wines" className="flex items-center gap-2">
                <Wine className="w-4 h-4" />
                Wine Labels ({wineItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items List */}
            <div className="lg:col-span-2">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <h2 className="text-xl font-semibold text-amber-900 mb-4">
                  Q&A Pairs ({items.length})
                </h2>
                
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-amber-200 hover:border-amber-300'
                      }`}
                      onClick={() => {
                        setSelectedItem(item)
                        setEditedAnswer(item.answer)
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-amber-900 mb-1">
                            {item.question}
                          </h3>
                          <p className="text-sm text-amber-600 mb-2">
                            {item.user_email} • {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-sm text-amber-800 line-clamp-2">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Details Panel */}
            <div>
              {selectedItem ? (
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">
                    Review Item
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Question
                      </label>
                      <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                        {selectedItem.question}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Answer
                      </label>
                      <textarea
                        value={editedAnswer}
                        onChange={(e) => setEditedAnswer(e.target.value)}
                        className="w-full h-32 px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"                                                               
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => updateStatus(selectedItem.id, 'accepted')}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => updateStatus(selectedItem.id, 'rejected')}
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>

                    <Button
                      onClick={() => updateStatus(selectedItem.id, 'edited', editedAnswer)}
                      size="sm"
                      variant="outline"
                      className="w-full border-amber-300"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Save Edit
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                  <p className="text-amber-600 text-center">
                    Select an item to review
                  </p>
                </Card>
              )}
            </div>
              </div>
            </TabsContent>

            <TabsContent value="wines">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Wine Items List */}
                <div className="lg:col-span-2">
                  <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                    <h2 className="text-xl font-semibold text-amber-900 mb-4">
                      Pending Wine Labels ({wineItems.length})
                    </h2>
                    
                    {isLoadingWines ? (
                      <p className="text-amber-600">Loading...</p>
                    ) : wineItems.length === 0 ? (
                      <p className="text-amber-600">No pending wine labels</p>
                    ) : (
                      <div className="space-y-4">
                        {wineItems.map((wine) => (
                          <div
                            key={wine.mod_id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedWine?.mod_id === wine.mod_id
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-amber-200 hover:border-amber-300'
                            }`}
                            onClick={() => {
                              setSelectedWine(wine)
                              setEditedWine({})
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium text-amber-900 mb-1">
                                  {wine.producer} – {wine.wine_name || '(No wine name)'}
                                  {wine.vintage && ` (${wine.vintage})`}
                                </h3>
                                <div className="flex gap-2 text-xs text-amber-600">
                                  <Badge variant="outline" className="text-xs">
                                    {wine.source}
                                  </Badge>
                                  <span>{new Date(wine.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            {wine.country && (
                              <p className="text-sm text-gray-600">{wine.wine_region}, {wine.country}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Wine Details Panel */}
                <div>
                  {selectedWine ? (
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                      <h3 className="text-lg font-semibold text-amber-900 mb-4">
                        Review Wine
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Image Preview */}
                        {selectedWine.image_key && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-amber-800 mb-2">Label Image</p>
                            <div className="bg-gray-100 rounded-lg p-2 flex justify-center min-h-[200px] items-center">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt="Wine Label"
                                  width={300}
                                  height={400}
                                  className="rounded object-contain max-h-96"
                                  unoptimized
                                />
                              ) : (
                                <p className="text-gray-500 text-sm">Loading image...</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 break-all">{selectedWine.image_key}</p>
                          </div>
                        )}

                        {/* Editable Fields */}
                        <div>
                          <label className="block text-sm font-medium text-amber-800 mb-1">
                            Producer
                          </label>
                          <input
                            type="text"
                            defaultValue={selectedWine.producer}
                            onChange={(e) => setEditedWine(prev => ({ ...prev, [selectedWine.mod_id]: { ...prev[selectedWine.mod_id], producer: e.target.value }}))}
                            className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-amber-800 mb-1">
                            Wine Name
                          </label>
                          <input
                            type="text"
                            defaultValue={selectedWine.wine_name || ''}
                            onChange={(e) => setEditedWine(prev => ({ ...prev, [selectedWine.mod_id]: { ...prev[selectedWine.mod_id], wine_name: e.target.value }}))}
                            className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-amber-800 mb-1">
                              Vintage
                            </label>
                            <input
                              type="number"
                              defaultValue={selectedWine.vintage || ''}
                              onChange={(e) => setEditedWine(prev => ({ ...prev, [selectedWine.mod_id]: { ...prev[selectedWine.mod_id], vintage: parseInt(e.target.value) }}))}
                              className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-amber-800 mb-1">
                              Alcohol %
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={selectedWine.alcohol_percent || ''}
                              onChange={(e) => setEditedWine(prev => ({ ...prev, [selectedWine.mod_id]: { ...prev[selectedWine.mod_id], alcohol_percent: parseFloat(e.target.value) }}))}
                              className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm"
                            />
                          </div>
                        </div>

                        {selectedWine.confidence && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 mb-2">Confidence Scores</p>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex justify-between">
                                <span>Producer:</span>
                                <span>{Math.round((selectedWine.confidence.producer || 0) * 100)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Wine Name:</span>
                                <span>{Math.round((selectedWine.confidence.wine_name || 0) * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2 pt-4 border-t">
                          <Button
                            onClick={() => handleAcceptWine(selectedWine.mod_id)}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleDenyWine(selectedWine.mod_id)}
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                      <p className="text-amber-600 text-center">
                        Select a wine to review
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function ModerationPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <ModerationPageContent />
    </AuthWrapper>
  )
}
