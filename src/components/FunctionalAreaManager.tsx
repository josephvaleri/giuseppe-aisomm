'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'

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

interface FunctionalAreaManagerProps {
  selectedArea: string
  onAreaChange: (area: string) => void
}

export default function FunctionalAreaManager({ selectedArea, onAreaChange }: FunctionalAreaManagerProps) {
  const [areas, setAreas] = useState<FunctionalArea[]>(DEFAULT_FUNCTIONAL_AREAS)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newArea, setNewArea] = useState({ value: '', label: '' })
  const [editArea, setEditArea] = useState({ value: '', label: '' })

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
      
      // If the deleted area was selected, switch to the first available area
      const deletedArea = areas.find(area => area.id === id)
      if (deletedArea && selectedArea === deletedArea.value) {
        const remainingAreas = areas.filter(area => area.id !== id)
        if (remainingAreas.length > 0) {
          onAreaChange(remainingAreas[0].value)
        }
      }
    }
  }

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset to default functional areas? This will remove all custom areas.')) {
      setAreas(DEFAULT_FUNCTIONAL_AREAS)
    }
  }

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-900">Functional Areas</h3>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
          <Button
            onClick={handleResetToDefaults}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Adding new area */}
      {isAdding && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Input
              placeholder="Value (e.g., custom_area)"
              value={newArea.value}
              onChange={(e) => setNewArea({ ...newArea, value: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="Label (e.g., Custom Area)"
              value={newArea.label}
              onChange={(e) => setNewArea({ ...newArea, label: e.target.value })}
              className="flex-1"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleAddArea}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false)
                setNewArea({ value: '', label: '' })
              }}
              size="sm"
              variant="outline"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Areas list */}
      <div className="space-y-2">
        {areas.map((area) => (
          <div key={area.id} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
            {editingId === area.id ? (
              <div className="flex items-center space-x-2 flex-1">
                <Input
                  placeholder="Value"
                  value={editArea.value}
                  onChange={(e) => setEditArea({ ...editArea, value: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Label"
                  value={editArea.label}
                  onChange={(e) => setEditArea({ ...editArea, label: e.target.value })}
                  className="flex-1"
                />
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
            ) : (
              <>
                <div className="flex items-center space-x-2 flex-1">
                  <Badge 
                    variant={selectedArea === area.value ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedArea === area.value 
                        ? "bg-amber-600 text-white" 
                        : "border-amber-300 text-amber-700 hover:bg-amber-100"
                    }`}
                    onClick={() => onAreaChange(area.value)}
                  >
                    {area.label}
                  </Badge>
                  <span className="text-sm text-amber-600">({area.value})</span>
                </div>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => handleEditArea(area.id)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteArea(area.id)}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-amber-600">
        Click on a badge to select it. Values are automatically converted to lowercase with underscores.
      </div>
    </Card>
  )
}
