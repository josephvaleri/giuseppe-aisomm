'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { WineMatch } from '@/types/cellar'
import { Wine, AlertCircle, CheckCircle } from 'lucide-react'

interface WineMatchModalProps {
  isOpen: boolean
  onClose: () => void
  matchedWines: WineMatch[]
  pendingWine: any
  onMatchSelected: (wineId: number) => void
  onNoMatch: () => void
}

export function WineMatchModal({ 
  isOpen, 
  onClose, 
  matchedWines, 
  pendingWine, 
  onMatchSelected, 
  onNoMatch 
}: WineMatchModalProps) {
  const [selectedMatch, setSelectedMatch] = useState<WineMatch | null>(null)

  const handleMatchSelect = (match: WineMatch) => {
    setSelectedMatch(match)
  }

  const handleConfirm = () => {
    if (selectedMatch) {
      onMatchSelected(selectedMatch.wine_id)
    } else {
      onNoMatch()
    }
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800'
    if (score >= 0.8) return 'bg-blue-100 text-blue-800'
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getMatchScoreText = (score: number) => {
    if (score >= 0.9) return 'Excellent Match'
    if (score >= 0.8) return 'Very Good Match'
    if (score >= 0.7) return 'Good Match'
    return 'Possible Match'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-amber-900 flex items-center">
            <Wine className="w-6 h-6 mr-2" />
            Found Similar Wines
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pending Wine Info */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">You're adding:</h3>
            <div className="text-amber-800">
              <p className="font-medium">{pendingWine?.wine_name}</p>
              {pendingWine?.producer && <p>Producer: {pendingWine.producer}</p>}
              {pendingWine?.vintage && <p>Vintage: {pendingWine.vintage}</p>}
            </div>
          </div>

          {/* Match Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">
                We found {matchedWines.length} similar wine{matchedWines.length !== 1 ? 's' : ''} in our database:
              </h3>
            </div>

            <div className="space-y-3">
              {matchedWines.map((match, index) => (
                <div
                  key={match.wine_id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedMatch?.wine_id === match.wine_id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
                  }`}
                  onClick={() => handleMatchSelect(match)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="radio"
                          name="wine_match"
                          checked={selectedMatch?.wine_id === match.wine_id}
                          onChange={() => handleMatchSelect(match)}
                          className="mt-1"
                        />
                        <div>
                          <h4 className="font-semibold text-amber-900">{match.wine_name}</h4>
                          {match.producer && (
                            <p className="text-sm text-amber-700">Producer: {match.producer}</p>
                          )}
                          {match.vintage && (
                            <p className="text-sm text-amber-700">Vintage: {match.vintage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getMatchScoreColor(match.total_score)}>
                        {Math.round(match.total_score * 100)}% {getMatchScoreText(match.total_score)}
                      </Badge>
                      {selectedMatch?.wine_id === match.wine_id && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No Match Option */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedMatch === null
                  ? 'border-gray-500 bg-gray-100'
                  : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMatch(null)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="wine_match"
                  checked={selectedMatch === null}
                  onChange={() => setSelectedMatch(null)}
                />
                <div>
                  <h4 className="font-semibold text-gray-900">
                    None of these match - Create new wine
                  </h4>
                  <p className="text-sm text-gray-600">
                    Add this as a new wine to our database
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {selectedMatch ? 'Use Selected Wine' : 'Create New Wine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




