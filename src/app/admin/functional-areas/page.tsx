'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Save, X, ArrowLeft } from 'lucide-react'

interface FunctionalArea {
  id: string
  value: string
  label: string
}

const DEFAULT_FUNCTIONAL_AREAS = [
  { id: '1', value: 'wine_regions', label: 'Wine Regions' },
  { id: '2', value: 'grape_genetics', label: 'Grape Genetics' },
  { id: '3', value: 'food_pairings', label: 'Food Pairings' },
  { id: '4', value: 'grape_profiles', label: 'Grape Profiles' },
  { id: '5', value: 'viticulture', label: 'Viticulture' },
  { id: '6', value: 'winemaking', label: 'Winemaking' }
]

export default function FunctionalAreasPage() {
  const [areas, setAreas] = useState<FunctionalArea[]>(DEFAULT_FUNCTIONAL_AREAS)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newArea, setNewArea] = useState({ value: '', label: '' })
  const [editArea, setEditArea] = useState({ value: '', label: '' })
  const router = useRouter()

  // Load areas from localStorage on mount
  useEffect(() => {
    const savedAreas = localStorage.getItem('functionalAreas')
    if (savedAreas) {
      try {
        const parsed = JSON.parse(savedAreas)
        setAreas(parsed)
      } catch (error) {
        console.error('Error parsing saved functional areas:', error)
      }
    }
  }, [])

  // Save areas to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('functionalAreas', JSON.stringify(areas))
  }, [areas])

  const handleAddArea = () => {
    if (newArea.value.trim() && newArea.label.trim()) {
      const id = Date.now().toString()
      const area: FunctionalArea = {
        id,
        value: newArea.value.toLowerCase().replace(/\s+/g, '_'),
        label: newArea.label.trim()
      }
      
      setAreas([...areas, area])
      setNewArea({ value: '', label: '' })
      setIsAdding(false)
    }
  }

  const handleEditArea = (id: string) => {
    const area = areas.find(a => a.id === id)
    if (area) {
      setEditArea({ value: area.value, label: area.label })
      setEditingId(id)
    }
  }

  const handleSaveEdit = () => {
    if (editingId && editArea.value.trim() && editArea.label.trim()) {
      setAreas(areas.map(area => 
        area.id === editingId 
          ? { 
              ...area, 
              value: editArea.value.toLowerCase().replace(/\s+/g, '_'),
              label: editArea.label.trim()
            }
          : area
      ))
      setEditingId(null)
      setEditArea({ value: '', label: '' })
    }
  }

  const handleDeleteArea = (id: string) => {
    if (confirm('Are you sure you want to delete this functional area?')) {
      setAreas(areas.filter(area => area.id !== id))
    }
  }

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset to default functional areas? This will remove all custom areas.')) {
      setAreas(DEFAULT_FUNCTIONAL_AREAS)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Functional Areas Management</h1>
              <p className="text-amber-700">Manage the functional areas available for document categorization</p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-amber-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </div>

          {/* Management Card */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-amber-900">Manage Functional Areas</h2>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setIsAdding(true)}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Area
                </Button>
                <Button
                  onClick={handleResetToDefaults}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>

            {/* Adding new area */}
            {isAdding && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-lg font-medium text-amber-800 mb-3">Add New Functional Area</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-amber-700 mb-1">
                      Value (e.g., custom_area)
                    </label>
                    <Input
                      placeholder="Enter value..."
                      value={newArea.value}
                      onChange={(e) => setNewArea({ ...newArea, value: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-700 mb-1">
                      Label (e.g., Custom Area)
                    </label>
                    <Input
                      placeholder="Enter label..."
                      value={newArea.label}
                      onChange={(e) => setNewArea({ ...newArea, label: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleAddArea}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Area
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAdding(false)
                      setNewArea({ value: '', label: '' })
                    }}
                    variant="outline"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Areas list */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-amber-800 mb-3">Current Functional Areas</h3>
              {areas.map((area) => (
                <div key={area.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  {editingId === area.id ? (
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-1">
                        <Input
                          placeholder="Value"
                          value={editArea.value}
                          onChange={(e) => setEditArea({ ...editArea, value: e.target.value })}
                          className="mb-2"
                        />
                        <Input
                          placeholder="Label"
                          value={editArea.label}
                          onChange={(e) => setEditArea({ ...editArea, label: e.target.value })}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSaveEdit}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="outline"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3 flex-1">
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-100">
                          {area.label}
                        </Badge>
                        <span className="text-sm text-amber-600 font-mono">({area.value})</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleEditArea(area.id)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteArea(area.id)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Usage Instructions:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Value:</strong> Used internally (lowercase, underscores) - e.g., "wine_regions"</li>
                <li>• <strong>Label:</strong> Displayed in the dropdown - e.g., "Wine Regions"</li>
                <li>• Values are automatically converted to lowercase with underscores</li>
                <li>• Changes are automatically saved and will appear in the document upload dropdown</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
