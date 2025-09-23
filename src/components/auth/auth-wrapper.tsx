'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthWrapperProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
}

export function AuthWrapper({ children, requireAuth = false, requireAdmin = false }: AuthWrapperProps) {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Get user role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              role_id,
              role,
              roles!inner(name)
            `)
            .eq('user_id', user.id)
            .single()
          
          if (profile) {
            console.log('Auth wrapper profile:', profile) // Debug log
            
            // Use role_id if available, otherwise fall back to role field
            if (profile.role_id && profile.roles) {
              setUserRole(profile.roles.name)
            } else if (profile.role) {
              setUserRole(profile.role)
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Get user role when auth state changes
        supabase
          .from('profiles')
          .select(`
            role_id,
            role,
            roles!inner(name)
          `)
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              if (profile.role_id && profile.roles) {
                setUserRole(profile.roles.name)
              } else if (profile.role) {
                setUserRole(profile.role)
              }
            }
          })
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.push('/auth')
        return
      }

      if (requireAdmin && (!user || userRole !== 'admin')) {
        router.push('/')
        return
      }
    }
  }, [isLoading, user, userRole, requireAuth, requireAdmin, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-amber-800">Loading...</div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null // Will redirect to auth
  }

  if (requireAdmin && (!user || userRole !== 'admin')) {
    return null // Will redirect to home
  }

  return <>{children}</>
}
