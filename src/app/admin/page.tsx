'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthWrapper } from '@/components/auth/auth-wrapper'

interface Settings {
  monthly_price_cents: number
  annual_price_cents: number
  trial_days: number
  announcement: string
  jokes_enabled: boolean
  ml_config: any
}

function AdminPageContent() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    positiveFeedback: 0,
    pendingModeration: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadSettings()
    loadStats()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (error) throw error
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Get total questions count
      const { count: totalQuestions } = await supabase
        .from('questions_answers')
        .select('*', { count: 'exact', head: true })

      // Get positive feedback count (thumbs_up = true)
      const { count: positiveFeedback } = await supabase
        .from('questions_answers')
        .select('*', { count: 'exact', head: true })
        .eq('thumbs_up', true)

      // Get pending moderation count
      const { count: pendingModeration } = await supabase
        .from('moderation_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        totalQuestions: totalQuestions || 0,
        positiveFeedback: positiveFeedback || 0,
        pendingModeration: pendingModeration || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .update(settings)
        .eq('id', 1)

      if (error) throw error
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRetrain = async () => {
    try {
      const response = await fetch('/api/admin/retrain', {
        method: 'POST',
      })

      if (response.ok) {
        alert('Retraining started successfully!')
      } else {
        alert('Error starting retraining')
      }
    } catch (error) {
      console.error('Error retraining:', error)
      alert('Error starting retraining')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-amber-800">Loading...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-red-600">Error loading settings</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-amber-900">Admin Dashboard</h1>
                <span className="text-sm text-amber-600 bg-amber-100 px-2 py-1 rounded">
                  v1.009
                </span>
              </div>
              <p className="text-amber-700">Manage Giuseppe the AISomm settings</p>
            </div>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-amber-300"
            >
              Back to Giuseppe
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
              <h2 className="text-xl font-semibold text-amber-900 mb-4">Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    Monthly Price (cents)
                  </label>
                  <input
                    type="number"
                    value={settings.monthly_price_cents}
                    onChange={(e) => setSettings({
                      ...settings,
                      monthly_price_cents: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    Annual Price (cents)
                  </label>
                  <input
                    type="number"
                    value={settings.annual_price_cents}
                    onChange={(e) => setSettings({
                      ...settings,
                      annual_price_cents: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    value={settings.trial_days}
                    onChange={(e) => setSettings({
                      ...settings,
                      trial_days: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    Welcome Announcement
                  </label>
                  <textarea
                    value={settings.announcement}
                    onChange={(e) => setSettings({
                      ...settings,
                      announcement: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="jokes_enabled"
                    checked={settings.jokes_enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      jokes_enabled: e.target.checked
                    })}
                    className="rounded border-amber-300"
                  />
                  <label htmlFor="jokes_enabled" className="text-sm font-medium text-amber-800">
                    Enable Wine Jokes
                  </label>
                </div>

                <Button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </Card>

            {/* ML Management */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
              <h2 className="text-xl font-semibold text-amber-900 mb-4">Machine Learning</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-amber-800 mb-2">Model Configuration</h3>
                  <div className="bg-amber-50 p-3 rounded-md text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(settings.ml_config, null, 2)}
                    </pre>
                  </div>
                </div>

                <Button
                  onClick={handleRetrain}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Force Retrain Models
                </Button>

                <div className="text-sm text-amber-600">
                  <p>• Models retrain automatically every 20 feedback items</p>
                  <p>• Use "Force Retrain" to retrain immediately</p>
                  <p>• Check logs for training progress</p>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
              <h2 className="text-xl font-semibold text-amber-900 mb-4">Quick Stats</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-amber-700">Total Questions</span>
                  <Badge variant="outline">
                    {statsLoading ? 'Loading...' : stats.totalQuestions}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Positive Feedback</span>
                  <Badge variant="outline">
                    {statsLoading ? 'Loading...' : stats.positiveFeedback}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Pending Moderation</span>
                  <Badge variant="outline">
                    {statsLoading ? 'Loading...' : stats.pendingModeration}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Navigation */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
              <h2 className="text-xl font-semibold text-amber-900 mb-4">Admin Tools</h2>
              
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/moderation')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Moderation Queue
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/moderation-decisions')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Moderation Decisions
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/roles')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Manage Roles
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/trial')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Trial Settings
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/jokes')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Manage Jokes
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/avatars')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Manage Avatars
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/thinking-images')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  Thinking Images
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/users')}
                  variant="outline"
                  className="w-full border-amber-300"
                >
                  User Management
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <AdminPageContent />
    </AuthWrapper>
  )
}
