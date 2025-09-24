'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Download } from 'lucide-react'

interface ModerationDecision {
  id: number
  qa_id: number
  question: string
  original_answer: string
  moderator_decision: string
  edited_answer?: string
  moderation_notes?: string
  moderated_at: string
  user_id: string
}

function ModerationDecisionsContent() {
  const [decisions, setDecisions] = useState<ModerationDecision[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    loadDecisions()
  }, [])

  const loadDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('moderation_decisions')
        .select(`
          id,
          qa_id,
          decision,
          edited_answer,
          moderation_notes,
          created_at,
          questions_answers!moderation_decisions_qa_id_fkey(
            question,
            answer,
            user_id
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = (data || []).map((decision: any) => ({
        id: decision.id,
        qa_id: decision.qa_id,
        question: decision.questions_answers?.question || 'Unknown question',
        original_answer: decision.questions_answers?.answer || 'Unknown answer',
        moderator_decision: decision.decision,
        edited_answer: decision.edited_answer,
        moderation_notes: decision.moderation_notes,
        moderated_at: decision.created_at,
        user_id: decision.questions_answers?.user_id || 'Unknown'
      }))

      setDecisions(formattedData)
    } catch (error) {
      console.error('Error loading moderation decisions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportDecisions = async () => {
    try {
      const response = await fetch('/api/admin/export-moderation-decisions')
      if (!response.ok) throw new Error('Export failed')
      
      const data = await response.json()
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moderation-decisions-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting decisions:', error)
      alert('Error exporting decisions')
    }
  }

  const getDecisionBadge = (decision: string) => {
    const variants = {
      accepted: 'default',
      rejected: 'destructive',
      edited: 'secondary'
    } as const

    return (
      <Badge variant={variants[decision as keyof typeof variants] || 'default'}>
        {decision.charAt(0).toUpperCase() + decision.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-amber-800">Loading moderation decisions...</div>
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
              <h1 className="text-3xl font-bold text-amber-900">Moderation Decisions</h1>
              <p className="text-amber-700">Training data from moderator decisions ({decisions.length} decisions)</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportDecisions}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export for Training
              </Button>
            </div>
          </div>

          {/* Decisions List */}
          <div className="space-y-4">
            {decisions.map((decision) => (
              <Card key={decision.id} className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-900 mb-2">
                        Q&A ID: {decision.qa_id}
                      </h3>
                      <p className="text-sm text-amber-600 mb-2">
                        Moderated: {new Date(decision.moderated_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getDecisionBadge(decision.moderator_decision)}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-amber-800 mb-1">
                      Question
                    </label>
                    <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                      {decision.question}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-amber-800 mb-1">
                      Original Answer
                    </label>
                    <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                      {decision.original_answer}
                    </p>
                  </div>

                  {decision.edited_answer && (
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Edited Answer
                      </label>
                      <p className="text-sm text-amber-700 bg-green-50 p-3 rounded border border-green-200">
                        {decision.edited_answer}
                      </p>
                    </div>
                  )}

                  {decision.moderation_notes && (
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Moderation Notes
                      </label>
                      <p className="text-sm text-amber-700 bg-blue-50 p-3 rounded border border-blue-200">
                        {decision.moderation_notes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ModerationDecisionsPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <ModerationDecisionsContent />
    </AuthWrapper>
  )
}
