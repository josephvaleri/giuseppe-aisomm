'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [trialMessage, setTrialMessage] = useState('')
  const [trialError, setTrialError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (error) throw error
        
        // Set up trial user after successful signup
        if (data.user) {
          // Get trial days from admin settings
          const { data: settings } = await supabase
            .from('settings')
            .select('trial_days')
            .single()
          
          const trialDays = settings?.trial_days || 7
          
          await supabase.rpc('set_user_trial', {
            user_id: data.user.id,
            trial_days: trialDays
          })
        }
        
        setError('Check your email for the confirmation link! Your free trial has started.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error

        // Check trial status after successful login
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, trial_end_date')
            .eq('user_id', data.user.id)
            .single()

          if (profile) {
            const isTrialUser = profile.role === 'trial'
            const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null
            const now = new Date()
            
            if (isTrialUser && trialEndDate) {
              const isLastDay = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) === 1
              const isExpired = trialEndDate < now
              
              if (isExpired) {
                setTrialError('Giuseppe is sorry but your free trial has ended. He would love to see you again so please sign up here')
                return
              } else if (isLastDay) {
                setTrialMessage('Today is the last day of your free trial. Click here to sign up')
                return
              }
            }
          }
        }
        
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/80 backdrop-blur-sm border-amber-200">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">
            Giuseppe the AISomm
          </h1>
          <p className="text-amber-700">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-amber-800 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-amber-800 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Trial Messages */}
          {trialMessage && (
            <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-md">
              <p className="text-amber-700 text-sm">
                {trialMessage.split('Click here to sign up')[0]}
                <button 
                  onClick={() => window.open('/pricing', '_blank')}
                  className="text-amber-800 font-semibold underline hover:text-amber-900"
                >
                  Click here to sign up
                </button>
              </p>
            </div>
          )}

          {trialError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
              <p className="text-red-700 text-sm">
                {trialError.split('please sign up here')[0]}
                <button 
                  onClick={() => window.open('/pricing', '_blank')}
                  className="text-red-800 font-semibold underline hover:text-red-900"
                >
                  please sign up here
                </button>
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-amber-600 hover:text-amber-700 text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
    </div>
  )
}
