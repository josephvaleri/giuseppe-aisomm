'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface ManualWineEntryProps {
  initialData?: any
  onComplete: () => void
}

export default function ManualWineEntry({ initialData, onComplete }: ManualWineEntryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    producer: '',
    wine_name: '',
    vintage: '',
    appellation: '',
    country: '',
    wine_region: '',
    color: '',
    bottle_size: '',
    alcohol_percent: '',
    typical_price: '',
    grapes: '',
    ratings: '',
    notes: '',
    quantity: 1,
    where_stored: '',
    drink_starting: '',
    drink_by: '',
    bubbly: false
  })

  const { toast } = useToast()
  const supabase = createClient()

  // Format ratings object into readable text
  const formatRatings = (ratings: any) => {
    if (!ratings || typeof ratings !== 'object') return ''
    
    return Object.entries(ratings)
      .map(([publication, score]) => `${publication}: ${score} pts`)
      .join('\n')
  }

  // Parse ratings text back to object
  const parseRatings = (ratingsText: string) => {
    if (!ratingsText.trim()) return {}
    
    try {
      // Try to parse as JSON first (in case it's already JSON)
      return JSON.parse(ratingsText)
    } catch {
      // Parse formatted text like "Wine Enthusiast: 87 pts\nWine Spectator: 88 pts"
      const ratings: Record<string, number> = {}
      const lines = ratingsText.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        const match = line.match(/^(.+?):\s*(\d+)\s*pts?$/i)
        if (match) {
          const [, publication, score] = match
          ratings[publication.trim()] = parseInt(score, 10)
        }
      }
      
      return ratings
    }
  }

  // Populate form with scanned data if available
  useEffect(() => {
    if (initialData?.parsed) {
      const parsed = initialData.parsed
      setFormData(prev => ({
        ...prev,
        producer: parsed.producer || '',
        wine_name: parsed.wine_name || '',
        vintage: parsed.vintage?.toString() || '',
        appellation: parsed.appellation || '',
        country: parsed.country || '',
        wine_region: parsed.wine_region || '',
        color: parsed.color || '',
        bottle_size: parsed.bottle_size || '',
        alcohol_percent: parsed.alcohol_percent?.toString() || '',
        typical_price: parsed.typical_price?.toString() || '',
        grapes: Array.isArray(parsed.grapes) ? parsed.grapes.join(', ') : (parsed.grapes || ''),
        ratings: parsed.ratings ? (typeof parsed.ratings === 'string' ? parsed.ratings : formatRatings(parsed.ratings)) : '',
        bubbly: parsed.bubbly || false,
        drink_starting: parsed.drink_starting || '',
        drink_by: parsed.drink_by || ''
      }))
    }
  }, [initialData])

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.producer || !formData.wine_name) {
      toast({
        title: 'Missing required fields',
        description: 'Producer and wine name are required',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Get the current session to include auth token
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Parse grapes and ratings
      const grapes = formData.grapes ? formData.grapes.split(',').map(g => g.trim()).filter(Boolean) : []
      const ratings = parseRatings(formData.ratings)

      // Create wine data (only fields that exist in wines table)
      const wineData = {
        producer: formData.producer,
        wine_name: formData.wine_name,
        vintage: formData.vintage ? parseInt(formData.vintage) : null,
        color: formData.color || null,
        bottle_size: formData.bottle_size || null,
        alcohol_percent: formData.alcohol_percent ? parseFloat(formData.alcohol_percent) : null,
        typical_price: formData.typical_price ? parseFloat(formData.typical_price) : null,
        ratings: ratings,
        bubbly: formData.bubbly
      }

      // Submit to API
      const response = await fetch('/api/wines/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          wineData,
          cellarData: {
            quantity: formData.quantity,
            where_stored: formData.where_stored || null,
            drink_starting: formData.drink_starting || null,
            drink_by: formData.drink_by || null,
            // Additional fields for cellar_items
            currency: 'USD',
            my_notes: formData.notes || null,
            status: 'stored'
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('API Error:', result)
        throw new Error(result.error || 'Failed to add wine')
      }

      toast({
        title: 'Success!',
        description: 'Wine added to your cellar successfully'
      })

      onComplete()
    } catch (error: any) {
      console.error('Submit error:', error)
      toast({
        title: 'Failed to add wine',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            {initialData ? 'Review & Complete Wine Details' : 'Enter Wine Details'}
          </CardTitle>
          <CardDescription>
            {initialData 
              ? 'Review the scanned information and complete any missing fields'
              : 'Enter all the wine details manually'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="producer">Producer *</Label>
                <Input
                  id="producer"
                  value={formData.producer}
                  onChange={(e) => handleInputChange('producer', e.target.value)}
                  placeholder="e.g., Domaine de la Côte"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wine_name">Wine Name *</Label>
                <Input
                  id="wine_name"
                  value={formData.wine_name}
                  onChange={(e) => handleInputChange('wine_name', e.target.value)}
                  placeholder="e.g., Pinot Noir"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vintage">Vintage</Label>
                  <Input
                    id="vintage"
                    type="number"
                    value={formData.vintage}
                    onChange={(e) => handleInputChange('vintage', e.target.value)}
                    placeholder="2020"
                    min="1800"
                    max="2030"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Red">Red</SelectItem>
                      <SelectItem value="White">White</SelectItem>
                      <SelectItem value="Rosé">Rosé</SelectItem>
                      <SelectItem value="Sparkling">Sparkling</SelectItem>
                      <SelectItem value="Dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appellation">Appellation</Label>
                <Input
                  id="appellation"
                  value={formData.appellation}
                  onChange={(e) => handleInputChange('appellation', e.target.value)}
                  placeholder="e.g., Burgundy, Napa Valley"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="e.g., France"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wine_region">Region</Label>
                  <Input
                    id="wine_region"
                    value={formData.wine_region}
                    onChange={(e) => handleInputChange('wine_region', e.target.value)}
                    placeholder="e.g., Burgundy"
                  />
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Technical Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bottle_size">Bottle Size</Label>
                  <Input
                    id="bottle_size"
                    value={formData.bottle_size}
                    onChange={(e) => handleInputChange('bottle_size', e.target.value)}
                    placeholder="750ml"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alcohol_percent">Alcohol %</Label>
                  <Input
                    id="alcohol_percent"
                    type="number"
                    step="0.1"
                    value={formData.alcohol_percent}
                    onChange={(e) => handleInputChange('alcohol_percent', e.target.value)}
                    placeholder="13.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="typical_price">Typical Price ($)</Label>
                <Input
                  id="typical_price"
                  type="number"
                  step="0.01"
                  value={formData.typical_price}
                  onChange={(e) => handleInputChange('typical_price', e.target.value)}
                  placeholder="45.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grapes">Grapes</Label>
                <Input
                  id="grapes"
                  value={formData.grapes}
                  onChange={(e) => handleInputChange('grapes', e.target.value)}
                  placeholder="Pinot Noir, Chardonnay (comma separated)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ratings">Ratings</Label>
                <Textarea
                  id="ratings"
                  value={formData.ratings}
                  onChange={(e) => handleInputChange('ratings', e.target.value)}
                  placeholder="Wine Enthusiast: 87 pts&#10;Wine Spectator: 88 pts"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bubbly"
                  checked={formData.bubbly}
                  onCheckedChange={(checked) => handleInputChange('bubbly', checked)}
                />
                <Label htmlFor="bubbly">Sparkling wine</Label>
              </div>
            </div>
          </div>

          {/* Cellar Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Cellar Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="where_stored">Storage Location</Label>
                <Input
                  id="where_stored"
                  value={formData.where_stored}
                  onChange={(e) => handleInputChange('where_stored', e.target.value)}
                  placeholder="e.g., Wine cellar, Refrigerator"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink_starting">Drink Starting (YYYY-MM-DD)</Label>
                <Input
                  id="drink_starting"
                  type="date"
                  value={formData.drink_starting}
                  onChange={(e) => handleInputChange('drink_starting', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink_by">Drink By (YYYY-MM-DD)</Label>
                <Input
                  id="drink_by"
                  type="date"
                  value={formData.drink_by}
                  onChange={(e) => handleInputChange('drink_by', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this wine..."
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              onClick={onComplete}
              variant="outline"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.producer || !formData.wine_name}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Wine...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Add to Cellar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
