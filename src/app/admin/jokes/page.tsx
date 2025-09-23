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
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Joke {
  joke_id: number
  category: string
  joke: string
  created_at: string
  created_by?: string
}

function JokesPageContent() {
  const [jokes, setJokes] = useState<Joke[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [editingJoke, setEditingJoke] = useState<Partial<Joke>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [newJoke, setNewJoke] = useState<Partial<Joke>>({
    category: 'general',
    joke: ''
  })
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadJokes()
  }, [])

  const loadJokes = async () => {
    try {
      const { data, error } = await supabase
        .from('wine_jokes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setJokes(data || [])
    } catch (error) {
      console.error('Error loading jokes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (joke: Joke) => {
    setIsEditing(joke.joke_id)
    setEditingJoke(joke)
  }

  const handleSave = async () => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('wine_jokes')
          .update(editingJoke)
          .eq('joke_id', isEditing)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('wine_jokes')
          .insert(newJoke)

        if (error) throw error
      }

      await loadJokes()
      setIsEditing(null)
      setIsCreating(false)
      setEditingJoke({})
      setNewJoke({ category: 'general', joke: '' })
    } catch (error) {
      console.error('Error saving joke:', error)
      alert('Error saving joke')
    }
  }

  const handleCancel = () => {
    setIsEditing(null)
    setIsCreating(false)
    setEditingJoke({})
    setNewJoke({ category: 'general', joke: '' })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this joke?')) return

    try {
      const { error } = await supabase
        .from('wine_jokes')
        .delete()
        .eq('joke_id', id)

      if (error) throw error

      await loadJokes()
    } catch (error) {
      console.error('Error deleting joke:', error)
      alert('Error deleting joke')
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Manage Wine Jokes</h1>
              <p className="text-amber-700">Add, edit, and manage Giuseppe's wine jokes</p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Joke
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

          {/* Create New Joke Form */}
          {isCreating && (
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 mb-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-4">Add New Joke</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-category">Category</Label>
                  <Input
                    id="new-category"
                    value={newJoke.category || ''}
                    onChange={(e) => setNewJoke({ ...newJoke, category: e.target.value })}
                    className="border-amber-300 focus:border-amber-500"
                    placeholder="e.g., general, red_wine, sparkling"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="new-joke">Joke</Label>
                  <Textarea
                    id="new-joke"
                    value={newJoke.joke || ''}
                    onChange={(e) => setNewJoke({ ...newJoke, joke: e.target.value })}
                    className="border-amber-300 focus:border-amber-500"
                    rows={3}
                    placeholder="Enter your wine joke here..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-1" />
                    Add Joke
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Jokes Table */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-200">
                    <th className="text-left py-3 px-4 font-semibold text-amber-900">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-amber-900">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-amber-900">Joke</th>
                    <th className="text-left py-3 px-4 font-semibold text-amber-900">Created</th>
                    <th className="text-center py-3 px-4 font-semibold text-amber-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jokes.map((joke) => (
                    <tr key={joke.joke_id} className="border-b border-amber-100 hover:bg-amber-50/50">
                      {isEditing === joke.joke_id ? (
                        // Edit Row
                        <>
                          <td className="py-3 px-4 text-amber-700">{joke.joke_id}</td>
                          <td className="py-3 px-4">
                            <Input
                              value={editingJoke.category || ''}
                              onChange={(e) => setEditingJoke({ ...editingJoke, category: e.target.value })}
                              className="border-amber-300 focus:border-amber-500 text-sm"
                              size={20}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Textarea
                              value={editingJoke.joke || ''}
                              onChange={(e) => setEditingJoke({ ...editingJoke, joke: e.target.value })}
                              className="border-amber-300 focus:border-amber-500 text-sm"
                              rows={2}
                            />
                          </td>
                          <td className="py-3 px-4 text-amber-600 text-sm">
                            {new Date(joke.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center space-x-2">
                              <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button onClick={handleCancel} size="sm" variant="outline">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // Display Row
                        <>
                          <td className="py-3 px-4 text-amber-700 font-mono text-sm">{joke.joke_id}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                              {joke.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="max-w-md">
                              <p className="text-amber-800 text-sm leading-relaxed">
                                {joke.joke}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-amber-600 text-sm">
                            {new Date(joke.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center space-x-2">
                              <Button
                                onClick={() => handleEdit(joke)}
                                size="sm"
                                variant="outline"
                                className="border-amber-300"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(joke.joke_id)}
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {jokes.length === 0 && (
                <div className="text-center py-8 text-amber-600">
                  No jokes found. Add your first joke using the "Add Joke" button above.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function JokesPage() {
  return (
    <AuthWrapper requireAdmin={true}>
      <JokesPageContent />
    </AuthWrapper>
  )
}
