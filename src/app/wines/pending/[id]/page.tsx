'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Wine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingWinePage({ params }: { params: { id: string } }) {
  const [wine, setWine] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadWineData()
  }, [params.id])

  const loadWineData = async () => {
    try {
      const { data, error } = await supabase
        .from('moderation_items_wines')
        .select('*')
        .eq('mod_id', parseInt(params.id))
        .single()

      if (error) throw error

      setWine(data)
    } catch (err) {
      console.error('Error loading wine:', err)
      setError('Wine not found or has been processed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-amber-800">Loading...</div>
      </div>
    )
  }

  if (error || !wine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <p className="text-red-600 mb-4">{error || 'Wine not found'}</p>
              <Button onClick={() => router.push('/')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const isPending = wine.status === 'pending'
  const isAccepted = wine.status === 'accepted'
  const isDenied = wine.status === 'denied'

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Giuseppe
          </Button>

          {/* Status Banner */}
          {isPending && (
            <Card className="p-6 mb-6 bg-amber-50 border-amber-300">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Awaiting Moderation</h3>
                  <p className="text-sm text-amber-700">
                    This wine is pending review by our moderators. You'll be notified when it's approved.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {isAccepted && (
            <Card className="p-6 mb-6 bg-green-50 border-green-300">
              <div className="flex items-center gap-3">
                <Wine className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Approved!</h3>
                  <p className="text-sm text-green-700">
                    This wine has been approved and added to the database.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {isDenied && (
            <Card className="p-6 mb-6 bg-red-50 border-red-300">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold text-red-900">Not Approved</h3>
                  <p className="text-sm text-red-700">
                    This wine submission was not approved. You can try submitting again with better information.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Wine Details */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-amber-900">
                  {wine.wine_name || 'Wine Name Not Available'}
                </h1>
                <p className="text-xl text-amber-700">{wine.producer}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-200">
                {wine.vintage && (
                  <div>
                    <p className="text-sm text-gray-600">Vintage</p>
                    <p className="font-semibold text-gray-900">{wine.vintage}</p>
                  </div>
                )}

                {wine.alcohol_percent && (
                  <div>
                    <p className="text-sm text-gray-600">Alcohol</p>
                    <p className="font-semibold text-gray-900">{wine.alcohol_percent}%</p>
                  </div>
                )}

                {wine.country && (
                  <div>
                    <p className="text-sm text-gray-600">Country</p>
                    <p className="font-semibold text-gray-900">{wine.country}</p>
                  </div>
                )}

                {wine.wine_region && (
                  <div>
                    <p className="text-sm text-gray-600">Region</p>
                    <p className="font-semibold text-gray-900">{wine.wine_region}</p>
                  </div>
                )}

                {wine.appellation && (
                  <div>
                    <p className="text-sm text-gray-600">Appellation</p>
                    <p className="font-semibold text-gray-900">{wine.appellation}</p>
                  </div>
                )}

                {wine.typical_price && (
                  <div>
                    <p className="text-sm text-gray-600">Typical Price</p>
                    <p className="font-semibold text-gray-900">${wine.typical_price}</p>
                  </div>
                )}
              </div>

              {wine.grapes && wine.grapes.length > 0 && (
                <div className="pt-4 border-t border-amber-200">
                  <p className="text-sm text-gray-600 mb-2">Grape Varieties</p>
                  <div className="flex flex-wrap gap-2">
                    {wine.grapes.map((grape: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-amber-50">
                        {grape}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {wine.flavor_profile && (
                <div className="pt-4 border-t border-amber-200">
                  <p className="text-sm text-gray-600 mb-2">Flavor Profile</p>
                  <p className="text-gray-900">{wine.flavor_profile}</p>
                </div>
              )}

              {wine.ratings && Object.keys(wine.ratings).length > 0 && (
                <div className="pt-4 border-t border-amber-200">
                  <p className="text-sm text-gray-600 mb-2">Ratings</p>
                  <div className="space-y-1">
                    {Object.entries(wine.ratings).map(([publication, score]) => (
                      <div key={publication} className="flex justify-between">
                        <span className="text-gray-700">{publication}</span>
                        <span className="font-semibold text-amber-700">{score as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Badge */}
              <div className="pt-4 border-t border-amber-200">
                <Badge variant="secondary" className="text-xs">
                  Source: {wine.source === 'label_scan' ? 'Label Scan' : wine.source === 'ai_search' ? 'AI Search' : 'Manual Entry'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

