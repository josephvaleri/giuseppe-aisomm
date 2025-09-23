'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userRoleId, setUserRoleId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          console.log('Getting role for user:', user.id)
          
          // First try to get profile with role_id
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role_id, role, trial_end_date')
            .eq('user_id', user.id)
            .single()
          
          if (profileError) {
            console.error('Profile error:', profileError)
            // If profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email,
                role: 'user',
                role_id: 1
              })
              .select()
              .single()
            
            if (createError) {
              console.error('Create profile error:', createError)
            } else {
              console.log('Created profile:', newProfile)
              setUserRole('user')
              setUserRoleId(1)
            }
          } else {
            console.log('Found profile:', profile)
            
            // If we have role_id, get the role name
            if (profile.role_id) {
              const { data: roleData } = await supabase
                .from('roles')
                .select('name')
                .eq('id', profile.role_id)
                .single()
              
              if (roleData) {
                setUserRole(roleData.name)
                setUserRoleId(profile.role_id)
              } else {
                // Fallback to role field
                setUserRole(profile.role || 'user')
                setUserRoleId(profile.role === 'admin' ? 4 : profile.role === 'moderator' ? 3 : 1)
              }
            } else {
              // Use role field as fallback
              setUserRole(profile.role || 'user')
              setUserRoleId(profile.role === 'admin' ? 4 : profile.role === 'moderator' ? 3 : 1)
            }
            
            // Check if trial is expired
            if (profile.role_id === 2 && profile.trial_end_date) {
              const trialEnd = new Date(profile.trial_end_date)
              const now = new Date()
              setIsTrialExpired(trialEnd < now)
            }
          }
        } else {
          setUserRole(null)
          setUserRoleId(null)
          setIsTrialExpired(false)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole(null)
        setUserRoleId(null)
        setIsTrialExpired(false)
      } finally {
        setIsLoading(false)
      }
    }

    getUserRole()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUserRole()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { 
    userRole, 
    userRoleId,
    isLoading, 
    isAdmin: userRole === 'admin',
    isModerator: userRole === 'moderator' || userRole === 'admin',
    isTrial: userRole === 'trial',
    isTrialExpired,
    canAskQuestions: userRole && !isTrialExpired,
    canGiveFeedback: userRole && !isTrialExpired,
    canModerate: userRole === 'moderator' || userRole === 'admin',
    canAdmin: userRole === 'admin'
  }
}
