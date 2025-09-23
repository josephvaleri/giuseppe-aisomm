'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Plus, Edit, Trash2, Save, X, Shield, Users, Eye, Clock } from 'lucide-react'

interface Role {
  role_id: number
  role_name: string
  description: string
  permissions: string[]
  created_at: string
  is_system_role?: boolean
}

const SYSTEM_ROLES = ['user', 'trial', 'moderator', 'admin']

function RolesPageContent() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [editingRole, setEditingRole] = useState<Partial<Role>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [newRole, setNewRole] = useState<Partial<Role>>({
    role_name: '',
    description: '',
    permissions: []
  })
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Mark system roles
      const rolesWithSystemFlag = (data || []).map(role => ({
        ...role,
        is_system_role: SYSTEM_ROLES.includes(role.role_name.toLowerCase())
      }))
      
      setRoles(rolesWithSystemFlag)
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (role: Role) => {
    // Prevent editing system roles
    if (role.is_system_role) {
      alert('System roles (user, trial, moderator, admin) cannot be edited.')
      return
    }
    
    setIsEditing(role.role_id)
    setEditingRole(role)
  }

  const handleSave = async () => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('roles')
          .update(editingRole)
          .eq('role_id', isEditing)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('roles')
          .insert(newRole)

        if (error) throw error
      }

      await loadRoles()
      setIsEditing(null)
      setIsCreating(false)
      setEditingRole({})
      setNewRole({ role_name: '', description: '', permissions: [] })
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Error saving role')
    }
  }

  const handleCancel = () => {
    setIsEditing(null)
    setIsCreating(false)
    setEditingRole({})
    setNewRole({ role_name: '', description: '', permissions: [] })
  }

  const handleDelete = async (role: Role) => {
    // Prevent deleting system roles
    if (role.is_system_role) {
      alert('System roles (user, trial, moderator, admin) cannot be deleted.')
      return
    }

    if (!confirm(`Are you sure you want to delete the role "${role.role_name}"?`)) return

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('role_id', role.role_id)

      if (error) throw error

      await loadRoles()
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error deleting role')
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="w-4 h-4" />
      case 'moderator':
        return <Eye className="w-4 h-4" />
      case 'trial':
        return <Clock className="w-4 h-4" />
      case 'user':
        return <Users className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'trial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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
              <h1 className="text-3xl font-bold text-amber-900">Manage Roles</h1>
              <p className="text-amber-700">Manage user roles and permissions. System roles cannot be edited.</p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
              <Button
                onClick={() => router.push('/admin')}
                variant="outline"
                className="border-amber-300"
              >
                Back to Admin
              </Button>
            </div>
          </div>

          {/* System Roles Notice */}
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <div className="flex items-center space-x-2 text-blue-800">
              <Shield className="w-5 h-5" />
              <p className="font-medium">System Roles</p>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              The roles "User", "Trial", "Moderator", and "Admin" are system roles and cannot be edited or deleted.
            </p>
          </Card>

          {/* Create New Role Form */}
          {isCreating && (
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 mb-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-4">Add New Role</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-role-name">Role Name</Label>
                  <Input
                    id="new-role-name"
                    value={newRole.role_name || ''}
                    onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
                    className="border-amber-300 focus:border-amber-500"
                    placeholder="e.g., premium_user, guest"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Textarea
                    id="new-description"
                    value={newRole.description || ''}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    className="border-amber-300 focus:border-amber-500"
                    rows={2}
                    placeholder="Describe this role's purpose and permissions..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-1" />
                    Add Role
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.role_id} className={`p-6 bg-white/80 backdrop-blur-sm border-amber-200 ${role.is_system_role ? 'ring-2 ring-blue-200' : ''}`}>
                {isEditing === role.role_id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-role-name">Role Name</Label>
                      <Input
                        id="edit-role-name"
                        value={editingRole.role_name || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, role_name: e.target.value })}
                        className="border-amber-300 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editingRole.description || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                        className="border-amber-300 focus:border-amber-500"
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} size="sm" variant="outline">
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(role.role_name)}
                        <h3 className="text-lg font-semibold text-amber-900 capitalize">
                          {role.role_name}
                        </h3>
                      </div>
                      {role.is_system_role && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
                          System
                        </span>
                      )}
                    </div>
                    
                    <p className="text-amber-700 text-sm leading-relaxed">
                      {role.description || 'No description provided.'}
                    </p>
                    
                    <div className="text-xs text-amber-600">
                      Created: {new Date(role.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      {!role.is_system_role && (
                        <>
                          <Button
                            onClick={() => handleEdit(role)}
                            size="sm"
                            variant="outline"
                            className="border-amber-300"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(role)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                      {role.is_system_role && (
                        <div className="text-xs text-blue-600 italic">
                          System role - cannot be modified
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
          
          {roles.length === 0 && (
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-amber-600">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No roles found. Add your first custom role using the "Add Role" button above.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RolesPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <RolesPageContent />
    </AuthWrapper>
  )
}
