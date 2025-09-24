'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Check, X, Edit } from 'lucide-react'

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
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null)
  const [editedAnswer, setEditedAnswer] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadModerationItems()
  }, [])

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

  const updateStatus = async (id: number, status: string, editedAnswer?: string) => {
    try {
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
              <p className="text-amber-700">Review and moderate Q&A pairs</p>
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
