'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserRole } from '@/components/auth/user-role'

export default function DebugPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [roles, setRoles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { userRole, userRoleId, isAdmin, isModerator, isLoading } = useUserRole()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Get profile data (simpler query)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (profileError) {
            setError(`Profile error: ${profileError.message}`)
          } else {
            setProfile(profileData)
          }
        }

        // Get all roles (simpler query)
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .order('id')
        
        if (rolesError) {
          setError(`Roles error: ${rolesError.message}`)
        } else {
          setRoles(rolesData || [])
        }
      } catch (error: any) {
        setError(`General error: ${error.message}`)
        console.error('Error loading debug data:', error)
      }
    }

    loadData()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-900 mb-8">Debug Information</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* Profile Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>

          {/* Role Hook Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Role Hook Information</h2>
            <div className="space-y-2">
              <p><strong>User Role:</strong> {userRole || 'null'}</p>
              <p><strong>User Role ID:</strong> {userRoleId || 'null'}</p>
              <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
              <p><strong>Is Moderator:</strong> {isModerator ? 'Yes' : 'No'}</p>
              <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* All Roles */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">All Roles</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(roles, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
