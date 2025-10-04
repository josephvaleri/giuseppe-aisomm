'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Download, Search, Edit, Trash2, Wine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CellarItem, Wine as WineType } from '@/types/cellar'
import { AddWineModal } from '@/components/cellar/AddWineModal'
import { EditWineModal } from '@/components/cellar/EditWineModal'
import { CSVUploadModal } from '@/components/cellar/CSVUploadModal'
import { WineMatchModal } from '@/components/cellar/WineMatchModal'
import Papa from 'papaparse'

export default function CellarPage() {
  const [cellarItems, setCellarItems] = useState<CellarItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CellarItem | null>(null)
  const [matchedWines, setMatchedWines] = useState<any[]>([])
  const [pendingWine, setPendingWine] = useState<any>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadCellarItems()
  }, [])

  const loadCellarItems = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.rpc('get_user_cellar')
      
      if (error) throw error
      
      setCellarItems(data || [])
    } catch (error) {
      console.error('Error loading cellar items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteItem = async (bottleId: number) => {
    if (!confirm('Are you sure you want to delete this wine from your cellar?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('cellar_items')
        .delete()
        .eq('bottle_id', bottleId)

      if (error) throw error

      setCellarItems(prev => prev.filter(item => item.bottle_id !== bottleId))
    } catch (error) {
      console.error('Error deleting cellar item:', error)
      alert('Error deleting wine from cellar')
    }
  }

  const handleEditItem = (item: CellarItem) => {
    setEditingItem(item)
    setShowEditModal(true)
  }

  const filteredItems = cellarItems.filter(item => {
    const matchesSearch = 
      item.wine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.producer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.appellation?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stored': return 'bg-green-100 text-green-800'
      case 'drank': return 'bg-blue-100 text-blue-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'stored': return '🍷'
      case 'drank': return '✅'
      case 'lost': return '❌'
      default: return '❓'
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        wine_name: 'Château Margaux',
        producer: 'Château Margaux',
        vintage: 2015,
        appellation: 'Margaux',
        country: 'France',
        region: 'Bordeaux',
        quantity: 1,
        where_stored: 'Wine cellar',
        value: 500.00,
        currency: 'USD',
        my_notes: 'Excellent vintage with full-bodied notes',
        my_rating: 9,
        status: 'stored',
        bottle_size: '750ml',
        alcohol: '13.5%',
        barcode: '123456789012'
      },
      {
        wine_name: 'Barolo Brunate',
        producer: 'Vietti',
        vintage: 2018,
        appellation: 'Barolo',
        country: 'Italy',
        region: 'Piedmont',
        quantity: 2,
        where_stored: 'Wine cellar',
        value: 120.00,
        currency: 'USD',
        my_notes: 'Classic Barolo with great aging potential',
        my_rating: 8,
        status: 'stored',
        bottle_size: '750ml',
        alcohol: '14.0%',
        barcode: '123456789013'
      }
    ]

    const csvContent = Papa.unparse(sampleData)

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sample_cellar_import_v${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Wine className="w-8 h-8 text-white" />
          </div>
          <p className="text-amber-700">Loading your cellar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              My Cellar
            </h1>
            <p className="text-amber-700 text-lg">
              Manage your personal wine collection
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search wines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Status</option>
                <option value="stored">Stored</option>
                <option value="drank">Drank</option>
                <option value="lost">Lost</option>
              </select>
              
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Wine
              </Button>
              
              <Button
                onClick={() => setShowCSVModal(true)}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              
              <Button
                onClick={downloadSampleCSV}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Sample CSV
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">{cellarItems.length}</div>
                <div className="text-sm text-amber-600">Total Wines</div>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">
                  {cellarItems.filter(item => item.status === 'stored').length}
                </div>
                <div className="text-sm text-amber-600">Stored</div>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">
                  {cellarItems.filter(item => item.status === 'drank').length}
                </div>
                <div className="text-sm text-amber-600">Drank</div>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">
                  ${cellarItems.reduce((sum, item) => sum + (item.value || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-amber-600">Total Value</div>
              </div>
            </Card>
          </div>

          {/* Wine List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item.bottle_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                      {/* Wine Info */}
                      <div>
                        <h3 className="font-bold text-amber-900 text-lg mb-1">
                          {item.wine_name}
                        </h3>
                        <p className="text-amber-700 text-sm mb-2">
                          {item.producer} {item.vintage && `(${item.vintage})`}
                        </p>
                        {item.appellation && (
                          <p className="text-amber-600 text-xs mb-2">
                            {item.appellation}, {item.country_name}
                          </p>
                        )}
                      </div>

                      {/* Status and Quantity */}
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusIcon(item.status)} {item.status}
                        </Badge>
                        <span className="text-sm text-amber-700">
                          Qty: {item.quantity}
                        </span>
                      </div>

                      {/* Value and Rating */}
                      <div className="flex items-center justify-between">
                        {item.value && (
                          <span className="text-sm text-amber-700">
                            ${item.value} {item.currency}
                          </span>
                        )}
                        {item.my_rating && (
                          <div className="flex items-center">
                            <span className="text-sm text-amber-700 mr-1">Rating:</span>
                            <span className="text-amber-900 font-semibold">{item.my_rating}/10</span>
                          </div>
                        )}
                      </div>

                      {/* Storage Location */}
                      {item.where_stored && (
                        <p className="text-xs text-amber-600">
                          📍 {item.where_stored}
                        </p>
                      )}

                      {/* Notes Preview */}
                      {item.my_notes && (
                        <p className="text-xs text-amber-700 line-clamp-2">
                          {item.my_notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleEditItem(item)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteItem(item.bottle_id)}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredItems.length === 0 && !isLoading && (
            <Card className="p-12 bg-white/80 backdrop-blur-sm border-amber-200 text-center">
              <Wine className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-amber-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No wines found' : 'Your cellar is empty'}
              </h3>
              <p className="text-amber-700 mb-6">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start building your wine collection by adding your first bottle'
                }
              </p>
              {(!searchTerm && filterStatus === 'all') && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Wine
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddWineModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onWineAdded={loadCellarItems}
        onWineMatched={(wines, wineData) => {
          setMatchedWines(wines)
          setPendingWine(wineData)
          setShowMatchModal(true)
        }}
      />

      <EditWineModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        cellarItem={editingItem}
        onWineUpdated={loadCellarItems}
      />

      <CSVUploadModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        onWinesImported={loadCellarItems}
      />

      <WineMatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedWines={matchedWines}
        pendingWine={pendingWine}
        onMatchSelected={(wineId) => {
          // Handle wine match selection
          setShowMatchModal(false)
          setShowAddModal(false)
          loadCellarItems()
        }}
        onNoMatch={() => {
          // Handle no match - create new wine
          setShowMatchModal(false)
          setShowAddModal(false)
          loadCellarItems()
        }}
      />
    </div>
  )
}
