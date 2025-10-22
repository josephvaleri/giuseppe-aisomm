'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Sparkles, BookMarked } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

interface WineSelectionModalProps {
  open: boolean
  onClose: () => void
  data: any
  imageKey: string | null
}

export function WineSelectionModal({ open, onClose, data, imageKey }: WineSelectionModalProps) {
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [saveToCellar, setSaveToCellar] = useState(false)
  const [cellarQuantity, setCellarQuantity] = useState(1)
  
  const router = useRouter()
  const { toast } = useToast()

  // Auto-populate AI result if it came from analyze endpoint
  useEffect(() => {
    if (data.type === 'ai_result' && data.wineData && !aiResult) {
      console.log('[Modal] Auto-loaded AI result from analyze endpoint')
      setAiResult({
        wineData: data.wineData,
        traceId: data.traceId,
        source: data.source || 'openai_auto',
        confidence: 0.85 // High confidence for auto-triggered AI results
      })
    }
  }, [data, aiResult])

  const handleAiSearch = async () => {
    setIsAiSearching(true)

    try {
      // Ensure we have at least producer OR wine_name
      const parsedData = data.parsed || {}
      
      console.log('[AI Search] Parsed data:', parsedData)
      
      // If wine_name is missing but we have producer, try to use it
      // (the AI can figure out the wine from just the producer text)
      if (!parsedData.producer && !parsedData.wine_name) {
        console.error('[AI Search] Missing both fields')
        throw new Error('Missing wine information for AI search. Please use manual entry.')
      }
      
      // Create a fallback wine_name from producer if needed
      const searchData = {
        ...parsedData,
        wine_name: parsedData.wine_name || parsedData.producer // Fallback
      }

      const res = await fetch('/api/labels/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed: searchData })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'AI search failed')
      }

      setAiResult(result)
    } catch (error: any) {
      console.error('AI search error:', error)
      toast({
        title: 'AI Search Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsAiSearching(false)
    }
  }

  const handleSelectWine = async (selection: any, source: string) => {
    setIsCommitting(true)

    try {
      const res = await fetch('/api/labels/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection,
          imageKey,
          source,
          saveToCellar,
          cellarQuantity: saveToCellar ? cellarQuantity : 0,
          openaiTraceId: aiResult?.traceId
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to commit selection')
      }

      toast({
        title: 'Success!',
        description: result.message
      })

      onClose()
      
      // Redirect to pending wine page
      if (result.redirectUrl) {
        router.push(result.redirectUrl)
      }
    } catch (error: any) {
      console.error('Commit error:', error)
      toast({
        title: 'Failed to submit',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsCommitting(false)
    }
  }

  const renderCandidates = () => {
    if (!data.candidates || data.candidates.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No matching wines found in database</p>
          {data.allowAiSearch && !aiResult && (
            <Button
              onClick={handleAiSearch}
              disabled={isAiSearching}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAiSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Search with AI
                </>
              )}
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {data.candidates.map((candidate: any, index: number) => (
          <div
            key={index}
            className="p-4 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900">
                  {candidate.producer} – {candidate.wine_name}
                  {candidate.vintage && ` (${candidate.vintage})`}
                </h4>
                {candidate.appellation && (
                  <p className="text-sm text-gray-600">{candidate.appellation}</p>
                )}
                {candidate.country && candidate.wine_region && (
                  <p className="text-xs text-gray-500">
                    {candidate.wine_region}, {candidate.country}
                  </p>
                )}
              </div>
              <div className="ml-4 text-right">
                <Badge variant={candidate.confidence >= 0.85 ? 'default' : 'secondary'}>
                  {Math.round(candidate.confidence * 100)}% match
                </Badge>
                <Progress
                  value={candidate.confidence * 100}
                  className="w-20 mt-2"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={() => handleSelectWine(candidate, data.source || 'label_scan')}
                disabled={isCommitting}
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Select This Wine'
                )}
              </Button>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => {
                const params = new URLSearchParams({
                  wine_name: candidate.wine_name || '',
                  producer: candidate.producer || '',
                  vintage: candidate.vintage?.toString() || '',
                  alcohol_pct: candidate.alcohol_percent?.toString() || '',
                  bottle_size: candidate.bottle_size || '',
                  is_bubbly: candidate.bubbly === 'Yes' ? 'true' : 'false'
                });
                router.push(`/tasting-notebook/new?${params.toString()}`);
                onClose();
              }}
              >
                <BookMarked className="w-4 h-4 mr-1" />
                Tasting Note
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderAiResult = () => {
    if (!aiResult || !aiResult.wineData) return null

    const wine = aiResult.wineData

    return (
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">AI Search Result</h3>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>{wine.producer}</strong> – {wine.wine_name}</p>
          {wine.vintage && <p>Vintage: {wine.vintage}</p>}
          {wine.color && <p>Type: {wine.color}</p>}
          {wine.bottle_size && <p>Bottle Size: {wine.bottle_size}</p>}
          {wine.appellation && <p>Appellation: {wine.appellation}</p>}
          {wine.country && wine.wine_region && (
            <p>Origin: {wine.wine_region}, {wine.country}</p>
          )}
          {wine.country && !wine.wine_region && (
            <p>Country: {wine.country}</p>
          )}
          {wine.grapes && wine.grapes.length > 0 && (
            <p>Grapes: {wine.grapes.join(', ')}</p>
          )}
          {wine.typical_price && <p>Typical Price: ${wine.typical_price}</p>}
          {wine.alcohol_percent && <p>Alcohol: {wine.alcohol_percent}%</p>}
          {wine.ratings && Object.keys(wine.ratings).length > 0 && (
            <div>
              <p className="font-semibold">Ratings:</p>
              <ul className="ml-4">
                {Object.entries(wine.ratings).map(([pub, score]) => (
                  <li key={pub}>{pub}: {String(score)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            onClick={() => handleSelectWine({ wineData: wine, confidence: aiResult.confidence || 0.85 }, 'ai_search')}
            disabled={isCommitting}
          >
            {isCommitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Select This Wine'
            )}
          </Button>
          <Button
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => {
              const wineData = wine;
              const params = new URLSearchParams({
                wine_name: wineData.wine_name || '',
                producer: wineData.producer || '',
                vintage: wineData.vintage?.toString() || '',
                alcohol_pct: wineData.alcohol_percent?.toString() || '',
                bottle_size: wineData.bottle_size || '',
                is_bubbly: wineData.bubbly === 'Yes' ? 'true' : 'false'
              });
              router.push(`/tasting-notebook/new?${params.toString()}`);
              onClose();
            }}
          >
            <BookMarked className="w-4 h-4 mr-1" />
            Tasting Note
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Your Wine</DialogTitle>
          <DialogDescription>
            {data.type === 'ai_result' 
              ? 'AI search automatically found detailed information for this wine.'
              : 'Choose a wine from the matches below or search with AI for more options.'
            }
          </DialogDescription>
        </DialogHeader>

        {data.parsed && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">Detected from Label:</p>
              {data.parsed.confidence && (
                <Badge variant={
                  (data.parsed.confidence.producer + data.parsed.confidence.wine_name) / 2 >= 0.75 
                    ? 'default' 
                    : 'secondary'
                }>
                  {Math.round(((data.parsed.confidence.producer + data.parsed.confidence.wine_name) / 2) * 100)}% confidence
                </Badge>
              )}
            </div>
            <p>
              {data.parsed.producer || '(Unknown producer)'} – {data.parsed.wine_name || '(Unknown wine)'}
              {data.parsed.vintage && ` (${data.parsed.vintage})`}
            </p>
            {data.parsed.alcohol_percent && <p>Alcohol: {data.parsed.alcohol_percent}%</p>}
            {data.parsed.confidence && (
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                <p>Producer: {Math.round(data.parsed.confidence.producer * 100)}%</p>
                <p>Wine Name: {Math.round(data.parsed.confidence.wine_name * 100)}%</p>
                {data.parsed.vintage && <p>Vintage: {Math.round(data.parsed.confidence.vintage * 100)}%</p>}
                {data.parsed.alcohol_percent && <p>Alcohol: {Math.round(data.parsed.confidence.alcohol_percent * 100)}%</p>}
              </div>
            )}
          </div>
        )}

        {/* Don't show candidates if we have auto AI result */}
        {data.type !== 'ai_result' && renderCandidates()}
        {renderAiResult()}

        {data.allowAiSearch && !aiResult && data.candidates && data.candidates.length > 0 && data.type !== 'ai_result' && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Not what you're looking for?</p>
            <Button
              onClick={handleAiSearch}
              disabled={isAiSearching}
              variant="outline"
              className="border-purple-300 text-purple-700"
            >
              {isAiSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try AI Search
                </>
              )}
            </Button>
          </div>
        )}

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveToCellar"
              checked={saveToCellar}
              onChange={(e) => setSaveToCellar(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="saveToCellar" className="text-sm text-gray-700">
              Save to my cellar after approval
            </label>
          </div>
          
          {saveToCellar && (
            <div className="flex items-center gap-2 ml-6">
              <label htmlFor="cellarQuantity" className="text-sm text-gray-700">
                Quantity:
              </label>
              <input
                type="number"
                id="cellarQuantity"
                min="1"
                max="100"
                value={cellarQuantity}
                onChange={(e) => setCellarQuantity(parseInt(e.target.value) || 1)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

