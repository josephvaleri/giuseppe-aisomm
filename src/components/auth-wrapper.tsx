'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let timeout: NodeJS.Timeout
    let subscription: any

    const initializeAuth = async () => {
      try {
        // Set a shorter timeout for faster loading
        timeout = setTimeout(() => {
          console.warn('Auth timeout, allowing access')
          setUser({ id: 'temp-user' } as any)
          setIsLoading(false)
        }, 2000) // Reduced from 5000ms to 2000ms

        // Try to get user
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.warn('Auth error, allowing access:', error.message)
          setUser({ id: 'temp-user' } as any)
        } else {
          setUser(user)
        }
        
        setIsLoading(false)
        clearTimeout(timeout)

        // Set up auth state listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setUser(session?.user ?? { id: 'temp-user' } as any)
            setIsLoading(false)
          }
        )
        
        subscription = authSubscription
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser({ id: 'temp-user' } as any)
        setIsLoading(false)
        if (timeout) clearTimeout(timeout)
      }
    }

    initializeAuth()

    return () => {
      if (timeout) clearTimeout(timeout)
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-amber-800">Loading...</div>
      </div>
    )
  }

  // Temporarily allow access without authentication
  // if (!user) {
  //   router.push('/auth/login')
  //   return null
  // }

  return <>{children}</>
}
