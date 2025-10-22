'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Download, Search, Edit, Trash2, Wine, BookMarked } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CellarItem, Wine as WineType } from '@/types/cellar'
import { AddWineModal } from '@/components/cellar/AddWineModal'
import { EditWineModal } from '@/components/cellar/EditWineModal'
import { WineMatchModal } from '@/components/cellar/WineMatchModal'
import { BottleSelectorModal } from '@/components/cellar/BottleSelectorModal'
import { WineGlassRating } from '@/components/ui/wine-glass-rating'
import { isWineReadyToDrink, getReadyToDrinkStatus } from '@/lib/utils/wine-utils'

export default function CellarPage() {
  const [cellarItems, setCellarItems] = useState<CellarItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showBottleSelector, setShowBottleSelector] = useState(false)
  const [editingItem, setEditingItem] = useState<CellarItem | null>(null)
  const [matchedWines, setMatchedWines] = useState<any[]>([])
  const [pendingWine, setPendingWine] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('grid')
  const [sortBy, setSortBy] = useState<string>('wine_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
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

  const filteredAndSortedItems = cellarItems
    .filter(item => {
      const matchesSearch = 
        item.wine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.producer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.appellation?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'wine_name':
          aValue = a.wine_name || ''
          bValue = b.wine_name || ''
          break
        case 'vintage':
          aValue = a.vintage || 0
          bValue = b.vintage || 0
          break
        case 'drink_from':
          aValue = a.drink_starting ? new Date(a.drink_starting).getTime() : 0
          bValue = b.drink_starting ? new Date(b.drink_starting).getTime() : 0
          break
        case 'drink_by':
          aValue = a.drink_by ? new Date(a.drink_by).getTime() : 0
          bValue = b.drink_by ? new Date(b.drink_by).getTime() : 0
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        default:
          aValue = a.wine_name || ''
          bValue = b.wine_name || ''
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
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
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="wine_name">Sort by Wine</option>
                <option value="vintage">Sort by Vintage</option>
                <option value="drink_from">Sort by Drink From</option>
                <option value="drink_by">Sort by Drink By</option>
                <option value="status">Sort by Status</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              
              <Button
                onClick={() => router.push('/cellar/import')}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Wine
              </Button>
            </div>
          </div>

          {/* View Toggle and Select a Bottle Button */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBottleSelector(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Wine className="w-4 h-4 mr-2" />
                Select a Bottle
              </Button>
              
              <Button
                onClick={() => router.push('/add-wine')}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Wine
              </Button>
            </div>
            
            <div className="flex bg-white/80 backdrop-blur-sm border border-amber-200 rounded-lg p-1">
              <Button
                onClick={() => setViewMode('card')}
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                className={`px-3 py-1 text-sm ${
                  viewMode === 'card' 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Card
              </Button>
              <Button
                onClick={() => setViewMode('grid')}
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className={`px-3 py-1 text-sm ${
                  viewMode === 'grid' 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">{filteredAndSortedItems.length}</div>
                <div className="text-sm text-amber-600">
                  {searchTerm || filterStatus !== 'all' ? 'Filtered Wines' : 'Total Wines'}
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">
                  {filteredAndSortedItems.filter(item => item.status === 'stored').length}
                </div>
                <div className="text-sm text-amber-600">Stored</div>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">
                  {filteredAndSortedItems.filter(item => item.status === 'drank').length}
                </div>
                <div className="text-sm text-amber-600">Drank</div>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-900">
                  ${filteredAndSortedItems.reduce((sum, item) => sum + (item.value || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-amber-600">Total Value</div>
              </div>
            </Card>
          </div>

          {/* Wine List */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredAndSortedItems.map((item) => (
                  <motion.div
                    key={item.bottle_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/wines/${item.wine_id}`)}
                    >
                      <div className="space-y-4">
                        {/* Wine Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-amber-900 text-lg">
                              {item.wine_name}
                            </h3>
                            {isWineReadyToDrink(item.drink_starting, item.drink_by) && (
                              <span className="text-green-600 text-lg" title="Ready to drink now!">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-amber-700 text-sm mb-2">
                            {item.producer} {item.vintage && `(${item.vintage})`}
                          </p>
                          {item.appellation && (
                            <p className="text-amber-600 text-xs mb-2">
                              {item.appellation}, {item.country_name}
                            </p>
                          )}
                          
                          {/* Wine Details */}
                          <div className="space-y-1 text-xs text-amber-600">
                            {item.typical_price && (
                              <div className="flex justify-between">
                                <span>Typical Price:</span>
                                <span className="text-green-600 font-semibold">${item.typical_price}</span>
                              </div>
                            )}
                            {item.ratings && (
                              <div className="flex justify-between">
                                <span>Ratings:</span>
                                <span>{item.ratings}</span>
                              </div>
                            )}
                            {item.drink_starting && item.drink_by && (
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span>Drink Window:</span>
                                  <span>
                                    {new Date(item.drink_starting).toLocaleDateString()} - {new Date(item.drink_by).toLocaleDateString()}
                                  </span>
                                </div>
                                {(() => {
                                  const status = getReadyToDrinkStatus(item.drink_starting, item.drink_by)
                                  return (
                                    <div className={`p-1 rounded text-xs ${
                                      status.status === 'ready' 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : status.status === 'past-peak'
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : status.status === 'not-ready'
                                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                                    }`}>
                                      <div className="flex items-center gap-1">
                                        {status.status === 'ready' && <span className="text-green-600">✓</span>}
                                        {status.status === 'past-peak' && <span className="text-red-600">⚠️</span>}
                                        {status.status === 'not-ready' && <span className="text-yellow-600">⏳</span>}
                                        <span className="font-medium">{status.message}</span>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                            {item.alcohol && (
                              <div className="flex justify-between">
                                <span>Alcohol:</span>
                                <span>{item.alcohol}%</span>
                              </div>
                            )}
                            {item.bottle_size && (
                              <div className="flex justify-between">
                                <span>Bottle Size:</span>
                                <span>{item.bottle_size}</span>
                              </div>
                            )}
                          </div>
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
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            {item.value && (
                              <span className="text-sm text-amber-700">
                                <span className="text-xs text-amber-600">My Value:</span> ${item.value} {item.currency}
                              </span>
                            )}
                          </div>
                          
                          {/* My Rating with Wine Glasses */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-amber-600">My Rating:</span>
                            <div onClick={(e) => e.stopPropagation()}>
                              <WineGlassRating 
                                rating={item.my_rating || 0} 
                                onRatingChange={async (newRating) => {
                                  try {
                                    const { error } = await supabase
                                      .from('cellar_items')
                                      .update({ my_rating: newRating })
                                      .eq('bottle_id', item.bottle_id);
                                    
                                    if (error) throw error;
                                    
                                    // Update local state
                                    setCellarItems(prev => 
                                      prev.map(ci => 
                                        ci.bottle_id === item.bottle_id 
                                          ? { ...ci, my_rating: newRating }
                                          : ci
                                      )
                                    );
                                  } catch (error) {
                                    console.error('Error updating rating:', error);
                                  }
                                }}
                                interactive={true}
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Storage Location */}
                        {item.where_stored && (
                          <p className="text-xs text-amber-600">
                            📍 {item.where_stored}
                          </p>
                        )}

                        {/* Notes Preview */}
                        <div className="space-y-1">
                          <span className="text-xs text-amber-600">My Notes:</span>
                          {item.my_notes ? (
                            <p className="text-xs text-amber-700 line-clamp-2 bg-amber-50 p-2 rounded border border-amber-200">
                              {item.my_notes}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-500 italic">No notes yet</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              const params = new URLSearchParams({
                                wine_name: item.wine_name || '',
                                producer: item.producer || '',
                                vintage: item.vintage?.toString() || '',
                                alcohol_pct: item.alcohol?.toString() || '',
                                country_id: item.country_id?.toString() || '',
                                region_id: item.region_id?.toString() || '',
                                bottle_size: item.bottle_size || '',
                                is_bubbly: item.bubbly === 'Yes' ? 'true' : 'false'
                              });
                              router.push(`/tasting-notebook/new?${params.toString()}`)
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <BookMarked className="w-3 h-3 mr-1" />
                            Tasting Note
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditItem(item)
                            }}
                            variant="outline"
                            size="sm"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteItem(item.bottle_id)
                            }}
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
          ) : (
            /* Table View */
            <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-amber-50 border-b border-amber-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Wine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Vintage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Origin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">My Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">My Rating</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200">
                    {filteredAndSortedItems.map((item) => (
                      <motion.tr
                        key={item.bottle_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-amber-50/50 cursor-pointer"
                        onClick={() => router.push(`/wines/${item.wine_id}`)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-amber-900">{item.wine_name}</div>
                              {isWineReadyToDrink(item.drink_starting, item.drink_by) && (
                                <span className="text-green-600 text-lg" title="Ready to drink now!">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-amber-700">{item.producer}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-700">
                          {item.vintage || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-700">
                          {item.appellation && item.country_name 
                            ? `${item.appellation}, ${item.country_name}`
                            : item.country_name || '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                          {item.typical_price ? `$${item.typical_price}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-700">
                          {item.value ? `$${item.value} ${item.currency}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-700">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const drinkStatus = item.drink_starting && item.drink_by 
                              ? getReadyToDrinkStatus(item.drink_starting, item.drink_by)
                              : null
                            
                            // Determine background color based on drink window status
                            const getDrinkWindowColor = () => {
                              if (!drinkStatus) return 'bg-gray-100 text-gray-800'
                              switch (drinkStatus.status) {
                                case 'ready': return 'bg-green-100 text-green-800'
                                case 'past-peak': return 'bg-red-100 text-red-800'
                                case 'not-ready': return 'bg-yellow-100 text-yellow-800'
                                default: return 'bg-gray-100 text-gray-800'
                              }
                            }
                            
                            return (
                              <Badge className={getDrinkWindowColor()}>
                                {getStatusIcon(item.status)} {item.status}
                              </Badge>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <WineGlassRating 
                              rating={item.my_rating || 0} 
                              onRatingChange={async (newRating) => {
                                try {
                                  const { error } = await supabase
                                    .from('cellar_items')
                                    .update({ my_rating: newRating })
                                    .eq('bottle_id', item.bottle_id);
                                  
                                  if (error) throw error;
                                  
                                  // Update local state
                                  setCellarItems(prev => 
                                    prev.map(ci => 
                                      ci.bottle_id === item.bottle_id 
                                        ? { ...ci, my_rating: newRating }
                                        : ci
                                    )
                                  );
                                } catch (error) {
                                  console.error('Error updating rating:', error);
                                }
                              }}
                              interactive={true}
                              size="sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                const params = new URLSearchParams({
                                  wine_name: item.wine_name || '',
                                  producer: item.producer || '',
                                  vintage: item.vintage?.toString() || '',
                                  alcohol_pct: item.alcohol?.toString() || '',
                                  country_id: item.country_id?.toString() || '',
                                  region_id: item.region_id?.toString() || '',
                                  bottle_size: item.bottle_size || '',
                                  is_bubbly: item.bubbly === 'Yes' ? 'true' : 'false'
                                });
                                router.push(`/tasting-notebook/new?${params.toString()}`)
                              }}
                              variant="outline"
                              size="sm"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              title="Add Tasting Note"
                            >
                              <BookMarked className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditItem(item)
                              }}
                              variant="outline"
                              size="sm"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item.bottle_id)
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedItems.length === 0 && !isLoading && (
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
                  onClick={() => router.push('/add-wine')}
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

      <BottleSelectorModal
        isOpen={showBottleSelector}
        onClose={() => setShowBottleSelector(false)}
        onBottleSelected={(bottleId) => {
          // Refresh cellar items after bottle removal
          loadCellarItems()
        }}
      />
    </div>
  )
}
