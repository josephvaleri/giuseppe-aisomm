'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { WineGlassRating } from '@/components/ui/wine-glass-rating'
import { createClient } from '@/lib/supabase/client'
import { CellarItem } from '@/types/cellar'

interface EditWineModalProps {
  isOpen: boolean
  onClose: () => void
  cellarItem: CellarItem | null
  onWineUpdated: () => void
}

export function EditWineModal({ isOpen, onClose, cellarItem, onWineUpdated }: EditWineModalProps) {
  const [cellarData, setCellarData] = useState({
    quantity: 1,
    where_stored: '',
    value: '',
    currency: 'USD',
    my_notes: '',
    my_rating: 0,
    status: 'stored' as 'stored' | 'drank' | 'lost',
    // Wine details fields (can be overridden by user)
    drink_starting: '',
    drink_by: '',
    typical_price: '',
    ratings: '',
    color: '',
    alcohol: '',
    bottle_size: ''
  })

  const [wineBasicData, setWineBasicData] = useState({
    wine_name: '',
    producer: '',
    vintage: ''
  })

  const [wineData, setWineData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingWine, setIsLoadingWine] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Location data state
  const [countries, setCountries] = useState<Array<{country_id: string, country_name: string}>>([])
  const [regions, setRegions] = useState<Array<{region_id: number, wine_region: string}>>([])
  const [appellations, setAppellations] = useState<Array<{appellation_id: number, appellation: string, classification: string}>>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null)
  const [selectedAppellation, setSelectedAppellation] = useState<number | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)

  const supabase = createClient()

  // Fetch countries on component mount
  useEffect(() => {
    if (isOpen) {
      fetchCountries()
    }
  }, [isOpen])

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/locations/countries')
      if (response.ok) {
        const data = await response.json()
        setCountries(data)
      }
    } catch (error) {
      console.error('Error fetching countries:', error)
    }
  }

  // Fetch regions when country changes
  const fetchRegions = async (countryId: string) => {
    if (!countryId) {
      setRegions([])
      setAppellations([])
      return
    }
    
    setIsLoadingLocations(true)
    try {
      const response = await fetch(`/api/locations/regions?country_id=${countryId}`)
      if (response.ok) {
        const data = await response.json()
        setRegions(data)
        setAppellations([]) // Clear appellations when region changes
      }
    } catch (error) {
      console.error('Error fetching regions:', error)
    } finally {
      setIsLoadingLocations(false)
    }
  }

  // Fetch appellations when region changes
  const fetchAppellations = async (regionId: number) => {
    if (!regionId) {
      setAppellations([])
      return
    }
    
    setIsLoadingLocations(true)
    try {
      const response = await fetch(`/api/locations/appellations?region_id=${regionId}`)
      if (response.ok) {
        const data = await response.json()
        setAppellations(data)
      }
    } catch (error) {
      console.error('Error fetching appellations:', error)
    } finally {
      setIsLoadingLocations(false)
    }
  }

  // Handle country selection
  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId)
    setSelectedRegion(null)
    setSelectedAppellation(null)
    if (countryId && countryId !== 'all') {
      fetchRegions(countryId)
    } else {
      setRegions([])
      setAppellations([])
    }
  }

  // Handle region selection
  const handleRegionChange = (regionId: number) => {
    setSelectedRegion(regionId)
    setSelectedAppellation(null)
    fetchAppellations(regionId)
  }

  // Handle appellation selection
  const handleAppellationChange = (appellationId: number) => {
    setSelectedAppellation(appellationId)
  }

  useEffect(() => {
    if (cellarItem && isOpen) {
      setCellarData({
        quantity: cellarItem.quantity,
        where_stored: cellarItem.where_stored || '',
        value: cellarItem.value?.toString() || '',
        currency: cellarItem.currency,
        my_notes: cellarItem.my_notes || '',
        my_rating: cellarItem.my_rating || 0,
        status: cellarItem.status,
        // Wine details fields (use cellar_item values if available, otherwise will be populated from wines table)
        drink_starting: cellarItem.drink_starting || '',
        drink_by: cellarItem.drink_by || '',
        typical_price: cellarItem.typical_price?.toString() || '',
        ratings: cellarItem.ratings || '',
        color: cellarItem.color || 'none',
        alcohol: cellarItem.alcohol?.toString() || '',
        bottle_size: cellarItem.bottle_size || 'none'
      })
      fetchWineData(cellarItem.wine_id)
    }
  }, [cellarItem, isOpen])

  const fetchWineData = async (wineId: number) => {
    setIsLoadingWine(true)
    try {
      const { data, error } = await supabase
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
          region_id,
          appellation_id,
          appellation:appellation_id(appellation),
          countries_regions:region_id(country_id, country_name, wine_region)
        `)
        .eq('wine_id', wineId)
        .single()

      if (error) throw error

      // Flatten the nested data
      const wine = {
        ...data,
        appellation: (data.appellation as any)?.appellation,
        country: (data.countries_regions as any)?.country_name,
        wine_region: (data.countries_regions as any)?.wine_region,
      }

      setWineData(wine)
      
      // Set wine basic data for editing
      setWineBasicData({
        wine_name: wine.wine_name || '',
        producer: wine.producer || '',
        vintage: wine.vintage ? wine.vintage.toString() : ''
      })
      
      // Set initial location selections if wine has location data
      if (wine.countries_regions) {
        const countryId = wine.countries_regions.country_id
        if (countryId) {
          setSelectedCountry(countryId)
          // Fetch regions for this country
          fetchRegions(countryId).then(() => {
            // Set region if available
            if (wine.countries_regions.region_id) {
              setSelectedRegion(wine.countries_regions.region_id)
              // Fetch appellations for this region
              fetchAppellations(wine.countries_regions.region_id).then(() => {
                // Set appellation if available
                if (wine.appellation_id) {
                  setSelectedAppellation(wine.appellation_id)
                }
              })
            }
          })
        }
      }
    } catch (error) {
      console.error('Error fetching wine data:', error)
    } finally {
      setIsLoadingWine(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (cellarData.quantity && (isNaN(Number(cellarData.quantity)) || Number(cellarData.quantity) < 0)) {
      newErrors.quantity = 'Quantity must be a positive number'
    }

    if (cellarData.value && (isNaN(Number(cellarData.value)) || Number(cellarData.value) < 0)) {
      newErrors.value = 'Value must be a positive number'
    }

    if (cellarData.my_rating && (isNaN(Number(cellarData.my_rating)) || Number(cellarData.my_rating) < 1 || Number(cellarData.my_rating) > 5)) {
      newErrors.my_rating = 'Rating must be between 1 and 5 wine glasses'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !cellarItem) return

    setIsLoading(true)
    try {
      // Update cellar_items table
      const { error: cellarError } = await supabase
        .from('cellar_items')
        .update({
          quantity: Number(cellarData.quantity),
          where_stored: cellarData.where_stored || null,
          value: cellarData.value ? Number(cellarData.value) : null,
          currency: cellarData.currency,
          my_notes: cellarData.my_notes || null,
          my_rating: cellarData.my_rating > 0 ? Number(cellarData.my_rating) : null,
          status: cellarData.status,
          // Wine details fields (user can override)
          drink_starting: cellarData.drink_starting || null,
          drink_by: cellarData.drink_by || null,
          typical_price: cellarData.typical_price ? Number(cellarData.typical_price) : null,
          ratings: cellarData.ratings || null,
          color: cellarData.color && cellarData.color !== 'none' ? cellarData.color : null,
          alcohol: cellarData.alcohol ? Number(cellarData.alcohol) : null,
          bottle_size: cellarData.bottle_size && cellarData.bottle_size !== 'none' ? cellarData.bottle_size : null
        })
        .eq('bottle_id', cellarItem.bottle_id)

      if (cellarError) throw cellarError

      // Update wines table with basic wine information and location
      const wineUpdateData: any = {}
      
      // Update basic wine information
      if (wineBasicData.wine_name) {
        wineUpdateData.wine_name = wineBasicData.wine_name
      }
      if (wineBasicData.producer) {
        wineUpdateData.producer = wineBasicData.producer
      }
      if (wineBasicData.vintage) {
        wineUpdateData.vintage = parseInt(wineBasicData.vintage) || null
      }
      
      // Update location information
      if (selectedRegion) {
        wineUpdateData.region_id = selectedRegion
      }
      if (selectedAppellation) {
        wineUpdateData.appellation_id = selectedAppellation
      }

      if (Object.keys(wineUpdateData).length > 0) {
        const { error: wineError } = await supabase
          .from('wines')
          .update(wineUpdateData)
          .eq('wine_id', cellarItem.wine_id)

        if (wineError) {
          console.error('Error updating wine information:', wineError)
          // Don't throw here - cellar update was successful
        }
      }

      onWineUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating cellar item:', error)
      alert('Error updating wine in cellar')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    if (cellarItem) {
      setCellarData({
        quantity: cellarItem.quantity,
        where_stored: cellarItem.where_stored || '',
        value: cellarItem.value?.toString() || '',
        currency: cellarItem.currency,
        my_notes: cellarItem.my_notes || '',
        my_rating: cellarItem.my_rating || 0,
        status: cellarItem.status,
        // Wine details fields
        drink_starting: cellarItem.drink_starting || '',
        drink_by: cellarItem.drink_by || '',
        typical_price: cellarItem.typical_price?.toString() || '',
        ratings: cellarItem.ratings || '',
        color: cellarItem.color || 'none',
        alcohol: cellarItem.alcohol?.toString() || '',
        bottle_size: cellarItem.bottle_size || 'none'
      })
    }
    setErrors({})
    // Reset wine basic data
    setWineBasicData({
      wine_name: '',
      producer: '',
      vintage: ''
    })
    
    // Reset location selections
    setSelectedCountry('all')
    setSelectedRegion(null)
    setSelectedAppellation(null)
    setRegions([])
    setAppellations([])
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!cellarItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-amber-900">
            Edit Wine in Cellar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wine Info Display */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-3">Wine Information (Read-Only)</h3>
            {isLoadingWine ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
                <p className="text-sm text-amber-600 mt-2">Loading wine details...</p>
              </div>
            ) : wineData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-800">
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Producer:</span>
                    <span className="ml-2">{wineData.producer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Wine Name:</span>
                    <span className="ml-2">{wineData.wine_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Vintage:</span>
                    <span className="ml-2">{wineData.vintage || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{wineData.color || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Alcohol:</span>
                    <span className="ml-2">{wineData.alcohol ? `${wineData.alcohol}%` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Bottle Size:</span>
                    <span className="ml-2">{wineData.bottle_size || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Appellation:</span>
                    <span className="ml-2">{wineData.appellation || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Region:</span>
                    <span className="ml-2">{wineData.wine_region || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Country:</span>
                    <span className="ml-2">{wineData.country || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Typical Price:</span>
                    <span className="ml-2">{wineData.typical_price ? `$${wineData.typical_price}` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Ratings:</span>
                    <span className="ml-2">{wineData.ratings || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Drink Window:</span>
                    <span className="ml-2">
                      {wineData.drink_starting && wineData.drink_by 
                        ? `${new Date(wineData.drink_starting).toLocaleDateString()} - ${new Date(wineData.drink_by).toLocaleDateString()}`
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
                {wineData.flavor_profile && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Flavor Profile:</span>
                    <p className="mt-1 text-amber-700">{wineData.flavor_profile}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-amber-800">
                <p className="font-medium">{cellarItem.wine_name}</p>
                {cellarItem.producer && <p>Producer: {cellarItem.producer}</p>}
                {cellarItem.vintage && <p>Vintage: {cellarItem.vintage}</p>}
                {cellarItem.appellation && <p>Appellation: {cellarItem.appellation}</p>}
              </div>
            )}
          </div>

          {/* Editable Wine Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-800">Wine Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wine_name">Wine Name</Label>
                <Input
                  id="wine_name"
                  placeholder="e.g., Cabernet Sauvignon"
                  value={wineBasicData.wine_name}
                  onChange={(e) => setWineBasicData(prev => ({ ...prev, wine_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="producer">Producer</Label>
                <Input
                  id="producer"
                  placeholder="e.g., Château Margaux"
                  value={wineBasicData.producer}
                  onChange={(e) => setWineBasicData(prev => ({ ...prev, producer: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vintage">Vintage</Label>
                <Input
                  id="vintage"
                  type="number"
                  min="1800"
                  max="2030"
                  placeholder="e.g., 2015"
                  value={wineBasicData.vintage}
                  onChange={(e) => setWineBasicData(prev => ({ ...prev, vintage: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Editable Cellar Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-800">Cellar Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={cellarData.quantity}
                  onChange={(e) => setCellarData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={cellarData.status} onValueChange={(value: any) => setCellarData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stored">Stored</SelectItem>
                    <SelectItem value="drank">Drank</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="where_stored">Where Stored</Label>
                <Input
                  id="where_stored"
                  placeholder="e.g., Wine cellar, Kitchen"
                  value={cellarData.where_stored}
                  onChange={(e) => setCellarData(prev => ({ ...prev, where_stored: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cellarData.value}
                  onChange={(e) => setCellarData(prev => ({ ...prev, value: e.target.value }))}
                  className={errors.value ? 'border-red-500' : ''}
                />
                {errors.value && <p className="text-sm text-red-500">{errors.value}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={cellarData.currency} onValueChange={(value) => setCellarData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>My Rating</Label>
                <div className="flex items-center gap-2">
                  <WineGlassRating 
                    rating={cellarData.my_rating} 
                    onRatingChange={(rating) => setCellarData(prev => ({ ...prev, my_rating: rating }))}
                    interactive={true}
                    size="md"
                  />
                  {cellarData.my_rating > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCellarData(prev => ({ ...prev, my_rating: 0 }))}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="my_notes">Flavor Profile & Notes</Label>
              <Textarea
                id="my_notes"
                placeholder="Describe the wine's flavor profile, tasting notes, etc."
                value={cellarData.my_notes}
                onChange={(e) => setCellarData(prev => ({ ...prev, my_notes: e.target.value }))}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Wine Details Override Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-800">Wine Details (Optional Override)</h3>
            <p className="text-sm text-amber-600">You can override the wine details below if you have different information for this specific bottle.</p>
            
            {/* Location Dropdowns */}
            <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-900">Location Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={selectedCountry} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country.country_id} value={country.country_id}>
                          {country.country_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select 
                    value={selectedRegion?.toString() || ''} 
                    onValueChange={(value) => handleRegionChange(Number(value))}
                    disabled={!selectedCountry || isLoadingLocations}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.region_id} value={region.region_id.toString()}>
                          {region.wine_region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appellation">Appellation</Label>
                  <Select 
                    value={selectedAppellation?.toString() || ''} 
                    onValueChange={(value) => handleAppellationChange(Number(value))}
                    disabled={!selectedRegion || isLoadingLocations}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select appellation" />
                    </SelectTrigger>
                    <SelectContent>
                      {appellations.map((appellation) => (
                        <SelectItem key={appellation.appellation_id} value={appellation.appellation_id.toString()}>
                          {appellation.appellation}
                          {appellation.classification && ` (${appellation.classification})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="typical_price">Typical Price ($)</Label>
                <Input
                  id="typical_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 45.00"
                  value={cellarData.typical_price}
                  onChange={(e) => setCellarData(prev => ({ ...prev, typical_price: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Wine Color</Label>
                <Select value={cellarData.color} onValueChange={(value) => setCellarData(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No override</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="White">White</SelectItem>
                    <SelectItem value="Rosé">Rosé</SelectItem>
                    <SelectItem value="Sparkling">Sparkling</SelectItem>
                    <SelectItem value="Dessert">Dessert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alcohol">Alcohol %</Label>
                <Input
                  id="alcohol"
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  placeholder="e.g., 13.5"
                  value={cellarData.alcohol}
                  onChange={(e) => setCellarData(prev => ({ ...prev, alcohol: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bottle_size">Bottle Size</Label>
                <Select value={cellarData.bottle_size} onValueChange={(value) => setCellarData(prev => ({ ...prev, bottle_size: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No override</SelectItem>
                    <SelectItem value="187ml">187ml (Split)</SelectItem>
                    <SelectItem value="375ml">375ml (Half)</SelectItem>
                    <SelectItem value="750ml">750ml (Standard)</SelectItem>
                    <SelectItem value="1.5L">1.5L (Magnum)</SelectItem>
                    <SelectItem value="3L">3L (Double Magnum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink_starting">Drink Starting</Label>
                <Input
                  id="drink_starting"
                  type="date"
                  value={cellarData.drink_starting}
                  onChange={(e) => setCellarData(prev => ({ ...prev, drink_starting: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink_by">Drink By</Label>
                <Input
                  id="drink_by"
                  type="date"
                  value={cellarData.drink_by}
                  onChange={(e) => setCellarData(prev => ({ ...prev, drink_by: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ratings">Professional Ratings</Label>
              <Input
                id="ratings"
                placeholder="e.g., 92 WS, 90 WA"
                value={cellarData.ratings}
                onChange={(e) => setCellarData(prev => ({ ...prev, ratings: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? 'Updating...' : 'Update Wine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


