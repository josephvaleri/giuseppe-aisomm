"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Wine } from 'lucide-react'
import { getGrapeInfo, GrapeInfo } from '@/lib/grape-linking'
import { debugGrapeData, testSpecificGrape } from '@/lib/debug-grapes'
import Image from 'next/image'

interface GrapeDetailProps {
  grapeId: number
  onBack: () => void
}

export default function GrapeDetail({ grapeId, onBack }: GrapeDetailProps) {
  const [grapeInfo, setGrapeInfo] = useState<GrapeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGrapeInfo() {
      try {
        setLoading(true)
        console.log('Fetching grape info for grape_id:', grapeId)
        const info = await getGrapeInfo(grapeId)
        console.log('Fetched grape info:', info)
        if (info) {
          setGrapeInfo(info)
        } else {
          setError('Grape information not found')
        }
      } catch (err) {
        setError('Failed to load grape information')
        console.error('Error fetching grape info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGrapeInfo()
  }, [grapeId])

  if (loading) {
    return (
      <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-amber-600">Loading grape information...</div>
        </div>
      </Card>
    )
  }

  if (error || !grapeInfo) {
    return (
      <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 h-full">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-600">{error || 'Grape not found'}</div>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Answers
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-amber-900 flex items-center">
            <Wine className="w-6 h-6 mr-2" />
            {grapeInfo.grape_variety}
          </h2>
          <div className="flex gap-2">
            <Button 
              onClick={() => testSpecificGrape(grapeId)} 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              Debug
            </Button>
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Grape Image */}
        {grapeInfo.image_url ? (
          <div className="flex justify-center">
            <div className="relative w-48 h-48 rounded-lg overflow-hidden shadow-lg">
              <Image
                src={grapeInfo.image_url}
                alt={grapeInfo.grape_variety}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={(e) => {
                  console.error('Image failed to load:', grapeInfo.image_url)
                  // Hide the image and show placeholder
                  const container = e.currentTarget.parentElement
                  if (container) {
                    container.innerHTML = `
                      <div class="w-full h-full bg-amber-100 flex items-center justify-center rounded-lg">
                        <span class="text-amber-600 text-sm">Image unavailable</span>
                      </div>
                    `
                  }
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', grapeInfo.image_url)
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-lg bg-amber-100 flex items-center justify-center">
              <span className="text-amber-600 text-sm">No image available</span>
            </div>
          </div>
        )}

        {/* Wine Color */}
        <div className="bg-amber-50 p-4 rounded-lg">
          <h3 className="font-semibold text-amber-900 mb-2">Wine Color</h3>
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 rounded-full border-2 border-amber-300"
              style={{ backgroundColor: getWineColorHex(grapeInfo.wine_color) }}
            />
            <span className="text-amber-800 capitalize">{grapeInfo.wine_color}</span>
          </div>
        </div>

        {/* Flavor Profile */}
        <div className="bg-amber-50 p-4 rounded-lg">
          <h3 className="font-semibold text-amber-900 mb-2">Flavor Profile</h3>
          <p className="text-amber-800">{grapeInfo.flavor}</p>
        </div>

        {/* Notable Wines */}
        {grapeInfo.notable_wines && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">Notable Wines</h3>
            <p className="text-amber-800">{grapeInfo.notable_wines}</p>
          </div>
        )}

        {/* Appellations */}
        {grapeInfo.appellations.length > 0 && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">Appellations</h3>
            <div className="flex flex-wrap gap-2">
              {grapeInfo.appellations.map((appellation, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm"
                >
                  {appellation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper function to get wine color hex values
function getWineColorHex(color: string): string {
  const colorMap: { [key: string]: string } = {
    'red': '#8B0000',
    'white': '#F5F5DC',
    'rosé': '#FFB6C1',
    'rose': '#FFB6C1',
    'sparkling': '#FFF8DC',
    'dessert': '#DDA0DD',
    'fortified': '#CD853F'
  }
  
  return colorMap[color.toLowerCase()] || '#8B0000'
}
