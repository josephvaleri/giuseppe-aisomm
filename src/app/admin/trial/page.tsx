'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Users, Clock, Settings } from 'lucide-react'

interface TrialUser {
  id: string
  email: string
  trial_end_date: string
  created_at: string
}

interface TrialSettings {
  trial_days: number
}

function TrialPageContent() {
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([])
  const [settings, setSettings] = useState<TrialSettings>({ trial_days: 7 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadTrialData()
  }, [])

  const loadTrialData = async () => {
    try {
      // Load trial settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('trial_days')
        .single()

      if (settingsError) throw settingsError
      setSettings({ trial_days: settingsData?.trial_days || 7 })

      // Load trial users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          trial_end_date,
          created_at
        `)
        .eq('role_id', 2) // trial role
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setTrialUsers(usersData || [])
    } catch (error) {
      console.error('Error loading trial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .update({ trial_days: settings.trial_days })
        .eq('id', 1)

      if (error) throw error
      alert('Trial settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  const extendTrial = async (userId: string, days: number) => {
    try {
      const { error } = await supabase.rpc('set_user_trial', {
        user_id: userId,
        trial_days: days
      })

      if (error) throw error
      await loadTrialData()
      alert('Trial extended successfully!')
    } catch (error) {
      console.error('Error extending trial:', error)
      alert('Error extending trial')
    }
  }

  const convertToUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role_id: 1, // user role
          trial_end_date: null 
        })
        .eq('id', userId)

      if (error) throw error
      await loadTrialData()
      alert('User converted to regular user!')
    } catch (error) {
      console.error('Error converting user:', error)
      alert('Error converting user')
    }
  }

  const isTrialExpired = (trialEndDate: string) => {
    return new Date(trialEndDate) < new Date()
  }

  const getDaysRemaining = (trialEndDate: string) => {
    const now = new Date()
    const end = new Date(trialEndDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
              <h1 className="text-3xl font-bold text-amber-900">Trial Settings</h1>
              <p className="text-amber-700">Manage trial users and settings</p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-amber-300"
            >
              Back to Admin
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trial Settings */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-semibold text-amber-900">Trial Configuration</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trial-days">Default Trial Duration (Days)</Label>
                  <Input
                    id="trial-days"
                    type="number"
                    value={settings.trial_days}
                    onChange={(e) => setSettings({ trial_days: parseInt(e.target.value) || 7 })}
                    className="border-amber-300 focus:border-amber-500"
                    min="1"
                    max="365"
                  />
                </div>

                <Button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>

                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                  <p><strong>Note:</strong> This setting applies to new trial users. Existing trial users keep their current trial period.</p>
                </div>
              </div>
            </Card>

            {/* Trial Statistics */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-semibold text-amber-900">Trial Statistics</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-amber-700">Total Trial Users</span>
                  <span className="font-semibold text-amber-900">{trialUsers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Active Trials</span>
                  <span className="font-semibold text-green-600">
                    {trialUsers.filter(user => !isTrialExpired(user.trial_end_date)).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Expired Trials</span>
                  <span className="font-semibold text-red-600">
                    {trialUsers.filter(user => isTrialExpired(user.trial_end_date)).length}
                  </span>
                </div>
              </div>
            </Card>

            {/* Trial Users List */}
            <div className="lg:col-span-2">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h2 className="text-xl font-semibold text-amber-900">Trial Users</h2>
                </div>
                
                <div className="space-y-4">
                  {trialUsers.length === 0 ? (
                    <p className="text-amber-600 text-center py-8">No trial users found</p>
                  ) : (
                    trialUsers.map((user) => {
                      const expired = isTrialExpired(user.trial_end_date)
                      const daysRemaining = getDaysRemaining(user.trial_end_date)
                      
                      return (
                        <div
                          key={user.id}
                          className={`p-4 border rounded-lg ${
                            expired 
                              ? 'border-red-200 bg-red-50' 
                              : daysRemaining <= 3 
                                ? 'border-yellow-200 bg-yellow-50'
                                : 'border-amber-200 bg-amber-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-amber-900">{user.email}</h3>
                              <p className="text-sm text-amber-600">
                                Started: {new Date(user.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-amber-600">
                                Trial ends: {new Date(user.trial_end_date).toLocaleDateString()}
                              </p>
                              {expired ? (
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full mt-1">
                                  Expired
                                </span>
                              ) : (
                                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                                  daysRemaining <= 3 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {daysRemaining} days remaining
                                </span>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => extendTrial(user.id, 7)}
                                size="sm"
                                variant="outline"
                                className="border-amber-300"
                              >
                                +7 days
                              </Button>
                              <Button
                                onClick={() => extendTrial(user.id, 30)}
                                size="sm"
                                variant="outline"
                                className="border-amber-300"
                              >
                                +30 days
                              </Button>
                              <Button
                                onClick={() => convertToUser(user.id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Convert to User
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TrialPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <TrialPageContent />
    </AuthWrapper>
  )
}
