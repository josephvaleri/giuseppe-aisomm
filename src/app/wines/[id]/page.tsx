'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Star, Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EditWineModal } from '@/components/cellar/EditWineModal'
import { CellarItem } from '@/types/cellar'
import { isWineReadyToDrink, getReadyToDrinkStatus } from '@/lib/utils/wine-utils'

interface Wine {
  wine_id: number
  producer: string
  wine_name: string
  vintage?: number
  alcohol?: number
  typical_price?: number
  bottle_size?: string
  color?: string
  ratings?: string
  flavor_profile?: string
  drink_starting?: string
  drink_by?: string
  my_score?: number
  appellation?: string
  country?: string
  wine_region?: string
}

export default function WineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [wine, setWine] = useState<Wine | null>(null)
  const [cellarItem, setCellarItem] = useState<CellarItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchWine(params.id as string)
    }
  }, [params.id])

  const fetchWine = async (wineId: string) => {
    try {
      // Fetch wine details
      const { data: wineData, error: wineError } = await supabase
        .from('wines')
        .select(`
          wine_id,
          producer,
          wine_name,
          vintage,
          alcohol,
          typical_price,
          bottle_size,
          color,
          ratings,
          flavor_profile,
          drink_starting,
          drink_by,
          my_score,
          appellation:appellation_id(appellation),
          countries_regions:region_id(country_name, wine_region)
        `)
        .eq('wine_id', wineId)
        .single()

      if (wineError) throw wineError

      // Flatten the nested data
      const wine: Wine = {
        ...wineData,
        appellation: (wineData.appellation as any)?.appellation,
        country: (wineData.countries_regions as any)?.country_name,
        wine_region: (wineData.countries_regions as any)?.wine_region,
      }

      setWine(wine)

      // Fetch cellar item for this wine
      const { data: cellarData, error: cellarError } = await supabase.rpc('get_user_cellar')
      
      if (!cellarError && cellarData) {
        const userCellarItem = cellarData.find((item: CellarItem) => item.wine_id === parseInt(wineId))
        if (userCellarItem) {
          setCellarItem(userCellarItem)
        }
      }
    } catch (err: any) {
      console.error('Error fetching wine:', err)
      setError(err.message || 'Failed to load wine details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">🍷</span>
          </div>
          <p className="text-amber-700">Loading wine details...</p>
        </div>
      </div>
    )
  }

  if (error || !wine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">❌</span>
          </div>
          <p className="text-red-700 mb-4">{error || 'Wine not found'}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <Button 
                onClick={() => router.push('/cellar')} 
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cellar
              </Button>
              
              {cellarItem && (
                <Button 
                  onClick={() => setShowEditModal(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit in Cellar
                </Button>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              {wine.producer} – {wine.wine_name}
            </h1>
            {wine.vintage && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {wine.vintage}
              </Badge>
            )}
          </div>

          {/* Wine Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Producer:</span>
                  <span>{wine.producer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Wine Name:</span>
                  <span>{wine.wine_name}</span>
                </div>
                {wine.color && (
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <Badge variant="outline">{wine.color}</Badge>
                  </div>
                )}
                {wine.vintage && (
                  <div className="flex justify-between">
                    <span className="font-medium">Vintage:</span>
                    <span>{wine.vintage}</span>
                  </div>
                )}
                {wine.alcohol && (
                  <div className="flex justify-between">
                    <span className="font-medium">Alcohol:</span>
                    <span>{wine.alcohol}%</span>
                  </div>
                )}
                {wine.bottle_size && (
                  <div className="flex justify-between">
                    <span className="font-medium">Bottle Size:</span>
                    <span>{wine.bottle_size}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location & Origin */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900">Origin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wine.appellation && (
                  <div className="flex justify-between">
                    <span className="font-medium">Appellation:</span>
                    <span>{wine.appellation}</span>
                  </div>
                )}
                {wine.wine_region && (
                  <div className="flex justify-between">
                    <span className="font-medium">Region:</span>
                    <span>{wine.wine_region}</span>
                  </div>
                )}
                {wine.country && (
                  <div className="flex justify-between">
                    <span className="font-medium">Country:</span>
                    <span>{wine.country}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing & Ratings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900">Pricing & Ratings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wine.typical_price && (
                  <div className="flex justify-between">
                    <span className="font-medium">Typical Price:</span>
                    <span className="text-green-600 font-semibold">
                      ${wine.typical_price}
                    </span>
                  </div>
                )}
                {wine.ratings && (
                  <div>
                    <span className="font-medium block mb-2">Ratings:</span>
                    <div className="text-sm text-gray-600">
                      {wine.ratings}
                    </div>
                  </div>
                )}
                {wine.my_score && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">My Rating:</span>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-semibold">{wine.my_score}/10</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drink Window */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-amber-900">Drink Window</CardTitle>
                  {isWineReadyToDrink(wine.drink_starting, wine.drink_by) && (
                    <span className="text-green-600 text-xl" title="Ready to drink now!">
                      ✓
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {wine.drink_starting && wine.drink_by && (
                  <div className="mb-3">
                    {(() => {
                      const status = getReadyToDrinkStatus(wine.drink_starting, wine.drink_by)
                      console.log('Wine status debug:', {
                        wine: wine.wine_name,
                        drink_starting: wine.drink_starting,
                        drink_by: wine.drink_by,
                        status: status.status,
                        message: status.message
                      })
                      return (
                        <div className={`p-2 rounded-md text-sm ${
                          status.status === 'ready' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : status.status === 'past-peak'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : status.status === 'not-ready'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2">
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
                {wine.drink_starting && (
                  <div className="flex justify-between">
                    <span className="font-medium">Drink From:</span>
                    <span>{new Date(wine.drink_starting).toLocaleDateString()}</span>
                  </div>
                )}
                {wine.drink_by && (
                  <div className="flex justify-between">
                    <span className="font-medium">Drink By:</span>
                    <span>{new Date(wine.drink_by).toLocaleDateString()}</span>
                  </div>
                )}
                {wine.flavor_profile && (
                  <div>
                    <span className="font-medium block mb-2">Flavor Profile:</span>
                    <div className="text-sm text-gray-600">
                      {wine.flavor_profile}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Success Message */}
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Wine Successfully Added!
                </h3>
                <p className="text-green-700">
                  This wine has been added to the database and is now available for recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Wine Modal */}
      {cellarItem && (
        <EditWineModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          cellarItem={cellarItem}
          onWineUpdated={() => {
            // Refresh the cellar item data
            fetchWine(params.id as string)
          }}
        />
      )}
    </div>
  )
}
