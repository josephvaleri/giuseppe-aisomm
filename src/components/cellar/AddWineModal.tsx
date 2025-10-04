'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { WineMatch } from '@/types/cellar'
import { Upload, Search } from 'lucide-react'

interface AddWineModalProps {
  isOpen: boolean
  onClose: () => void
  onWineAdded: () => void
  onWineMatched: (matches: WineMatch[], wineData: any) => void
}

export function AddWineModal({ isOpen, onClose, onWineAdded, onWineMatched }: AddWineModalProps) {
  const [wineData, setWineData] = useState({
    wine_name: '',
    producer: '',
    vintage: '',
    alcohol: '',
    country_id: '',
    region_id: '',
    appellation_id: '',
    bottle_size: '',
    drink_starting: '',
    drink_by: '',
    barcode: '',
    my_score: '',
    color: ''
  })

  const [cellarData, setCellarData] = useState({
    quantity: 1,
    where_stored: '',
    value: '',
    currency: 'USD',
    my_notes: '',
    my_rating: '',
    status: 'stored' as 'stored' | 'drank' | 'lost'
  })

  const [countries, setCountries] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [appellations, setAppellations] = useState<any[]>([])
  const [filteredRegions, setFilteredRegions] = useState<any[]>([])
  const [filteredAppellations, setFilteredAppellations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Wine search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadReferenceData()
    }
  }, [isOpen])

  const loadReferenceData = async () => {
    try {
      // Load all countries_regions data first
      const { data: countriesRegionsData } = await supabase
        .from('countries_regions')
        .select('country_name, country_id, region_id, wine_region')
        .not('country_name', 'is', null)
        .not('country_id', 'is', null)
        .order('country_name')

      // Extract unique countries from the data
      const uniqueCountries = Array.from(
        new Map(
          (countriesRegionsData || []).map(item => [item.country_id, item])
        ).values()
      ).sort((a, b) => a.country_name.localeCompare(b.country_name))

      // Load regions (same data, but we'll use it for regions)
      const regionsData = (countriesRegionsData || []).filter(item => item.wine_region)

      // Load appellations with region relationships
      const { data: appellationsData } = await supabase
        .from('appellation')
        .select(`
          appellation_id, 
          appellation, 
          classification,
          region_id,
          countries_regions!fk_appellation_region(country_name, country_id)
        `)
        .not('appellation', 'is', null)
        .order('appellation')

      setCountries(uniqueCountries)
      setRegions(regionsData)
      setAppellations(appellationsData || [])
      setFilteredRegions([])
      setFilteredAppellations([])
      
      console.log('Loaded reference data:', {
        countries: uniqueCountries.length,
        regions: regionsData.length,
        appellations: (appellationsData || []).length
      })
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!wineData.wine_name.trim()) {
      newErrors.wine_name = 'Wine name is required'
    }

    if (wineData.vintage && (isNaN(Number(wineData.vintage)) || Number(wineData.vintage) < 1800 || Number(wineData.vintage) > new Date().getFullYear() + 5)) {
      newErrors.vintage = 'Please enter a valid vintage year'
    }

    if (cellarData.quantity && (isNaN(Number(cellarData.quantity)) || Number(cellarData.quantity) < 0)) {
      newErrors.quantity = 'Quantity must be a positive number'
    }

    if (cellarData.value && (isNaN(Number(cellarData.value)) || Number(cellarData.value) < 0)) {
      newErrors.value = 'Value must be a positive number'
    }

    if (cellarData.my_rating && (isNaN(Number(cellarData.my_rating)) || Number(cellarData.my_rating) < 1 || Number(cellarData.my_rating) > 10)) {
      newErrors.my_rating = 'Rating must be between 1 and 10'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // First, try to find matching wines
      const { data: matches, error } = await supabase.rpc('fuzzy_match_wines', {
        input_wine_name: wineData.wine_name,
        input_producer: wineData.producer || null,
        input_vintage: wineData.vintage ? Number(wineData.vintage) : null,
        match_threshold: 0.7
      })

      if (error) throw error

      // If we found matches with high confidence, show match modal
      if (matches && matches.length > 0 && matches[0].total_score >= 0.7) {
        onWineMatched(matches, { ...wineData, ...cellarData })
        return
      }

      // No good matches found, create new wine directly
      await createNewWine()
    } catch (error) {
      console.error('Error checking for wine matches:', error)
      alert('Error adding wine to cellar')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewWine = async () => {
    try {
      // Create new wine
      const { data: wine, error: wineError } = await supabase
        .from('wines')
        .insert({
          wine_name: wineData.wine_name,
          producer: wineData.producer || null,
          vintage: wineData.vintage ? Number(wineData.vintage) : null,
          alcohol: wineData.alcohol || null,
          country_id: wineData.country_id || null,
          region_id: wineData.region_id ? Number(wineData.region_id) : null,
          appellation_id: wineData.appellation_id ? Number(wineData.appellation_id) : null,
          bottle_size: wineData.bottle_size || null,
          drink_starting: wineData.drink_starting || null,
          drink_by: wineData.drink_by || null,
          barcode: wineData.barcode || null,
          my_score: wineData.my_score ? Number(wineData.my_score) : null,
          color: wineData.color || null,
          created_from_analysis: true,
          analysis_confidence: 0.0
        })
        .select()
        .single()

      if (wineError) throw wineError

      // Create cellar item
      const { error: cellarError } = await supabase
        .from('cellar_items')
        .insert({
          wine_id: wine.wine_id,
          quantity: Number(cellarData.quantity),
          where_stored: cellarData.where_stored || null,
          value: cellarData.value ? Number(cellarData.value) : null,
          currency: cellarData.currency,
          my_notes: cellarData.my_notes || null,
          my_rating: cellarData.my_rating ? Number(cellarData.my_rating) : null,
          status: cellarData.status
        })

      if (cellarError) throw cellarError

      onWineAdded()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error creating wine:', error)
      alert('Error adding wine to cellar')
    }
  }

  const handleCountryChange = (countryId: string) => {
    // Filter regions by selected country
    const countryRegions = regions.filter(region => region.country_id === countryId)
    setFilteredRegions(countryRegions)
    setFilteredAppellations([]) // Reset appellations
    
    // Update wine data and reset dependent fields
    setWineData(prev => ({
      ...prev,
      country_id: countryId,
      region_id: '', // Reset region
      appellation_id: '' // Reset appellation
    }))
  }

  const handleRegionChange = (regionId: string) => {
    // Filter appellations by selected region
    const regionAppellations = appellations.filter(appellation => 
      appellation.region_id === Number(regionId)
    )
    setFilteredAppellations(regionAppellations)
    
    // Update wine data and reset appellation
    setWineData(prev => ({
      ...prev,
      region_id: regionId,
      appellation_id: '' // Reset appellation
    }))
  }

  const handleAppellationChange = (appellationId: string) => {
    setWineData(prev => ({
      ...prev,
      appellation_id: appellationId
    }))
  }

  const searchWines = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      // Use the fuzzy_match_wines RPC function with 50% threshold
      const { data: matches, error } = await supabase.rpc('fuzzy_match_wines', {
        input_wine_name: searchQuery.trim(),
        input_producer: null,
        input_vintage: null,
        match_threshold: 0.5 // 50% confidence threshold
      })

      if (error) throw error

      // Filter results to only show wines with 50% or better confidence
      const filteredMatches = (matches || []).filter((match: any) => match.total_score >= 0.5)
      setSearchResults(filteredMatches)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching wines:', error)
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  const selectWineFromSearch = (wine: any) => {
    // Populate the form with the selected wine's data
    setWineData({
      wine_name: wine.wine_name || '',
      producer: wine.producer || '',
      vintage: wine.vintage ? wine.vintage.toString() : '',
      alcohol: wine.alcohol || '',
      country_id: wine.country_id || '',
      region_id: wine.region_id ? wine.region_id.toString() : '',
      appellation_id: wine.appellation_id ? wine.appellation_id.toString() : '',
      bottle_size: wine.bottle_size || '',
      drink_starting: wine.drink_starting || '',
      drink_by: wine.drink_by || '',
      barcode: wine.barcode || '',
      my_score: wine.my_score ? wine.my_score.toString() : '',
      color: wine.color || ''
    })

    // Update cascading dropdowns based on the selected wine
    if (wine.country_id) {
      handleCountryChange(wine.country_id)
    }
    if (wine.region_id) {
      handleRegionChange(wine.region_id.toString())
    }
    if (wine.appellation_id) {
      handleAppellationChange(wine.appellation_id.toString())
    }

    // Clear search
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const resetForm = () => {
    setWineData({
      wine_name: '',
      producer: '',
      vintage: '',
      alcohol: '',
      country_id: '',
      region_id: '',
      appellation_id: '',
      bottle_size: '',
      drink_starting: '',
      drink_by: '',
      barcode: '',
      my_score: '',
      color: ''
    })
    setCellarData({
      quantity: 1,
      where_stored: '',
      value: '',
      currency: 'USD',
      my_notes: '',
      my_rating: '',
      status: 'stored'
    })
    setErrors({})
    setFilteredRegions([])
    setFilteredAppellations([])
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-amber-900">
            Add New Bottle to Cellar
          </DialogTitle>
        </DialogHeader>

        {/* Wine Search Section */}
        <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="text-lg font-semibold text-amber-800 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Search Existing Wines
          </h3>
          <p className="text-sm text-amber-700">
            Search our database of wines and select one to auto-populate the form below.
          </p>
          
          <div className="flex gap-2">
            <Input
              placeholder="Search by wine name (e.g., Château Margaux, Opus One)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchWines()}
              className="flex-1"
            />
            <Button 
              onClick={searchWines} 
              disabled={isSearching || !searchQuery.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="border border-amber-300 rounded-lg bg-white max-h-60 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No wines found with 50% or better confidence match.
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((wine, index) => (
                    <div
                      key={wine.wine_id || index}
                      onClick={() => selectWineFromSearch(wine)}
                      className="p-3 hover:bg-amber-50 cursor-pointer border-b border-amber-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-amber-900">
                            {wine.wine_name}
                          </div>
                          <div className="text-sm text-amber-700">
                            {wine.producer && `${wine.producer} • `}
                            {wine.vintage && `Vintage ${wine.vintage} • `}
                            {wine.country_name && `${wine.country_name}`}
                            {wine.wine_region && ` • ${wine.wine_region}`}
                          </div>
                        </div>
                        <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                          {Math.round(wine.total_score * 100)}% match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Wine Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-800 flex items-center">
              🍷 Wine Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wine_name">Wine Name *</Label>
                <Input
                  id="wine_name"
                  placeholder="e.g., Château Margaux"
                  value={wineData.wine_name}
                  onChange={(e) => setWineData(prev => ({ ...prev, wine_name: e.target.value }))}
                  className={errors.wine_name ? 'border-red-500' : ''}
                />
                {errors.wine_name && <p className="text-sm text-red-500">{errors.wine_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="producer">Producer</Label>
                <Input
                  id="producer"
                  placeholder="e.g., Château Margaux"
                  value={wineData.producer}
                  onChange={(e) => setWineData(prev => ({ ...prev, producer: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vintage">Vintage</Label>
                <Input
                  id="vintage"
                  placeholder="e.g., 2015"
                  value={wineData.vintage}
                  onChange={(e) => setWineData(prev => ({ ...prev, vintage: e.target.value }))}
                  className={errors.vintage ? 'border-red-500' : ''}
                />
                {errors.vintage && <p className="text-sm text-red-500">{errors.vintage}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="alcohol">Alcohol %</Label>
                <Input
                  id="alcohol"
                  placeholder="e.g., 13.5"
                  value={wineData.alcohol}
                  onChange={(e) => setWineData(prev => ({ ...prev, alcohol: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country_id">Country</Label>
                <Select value={wineData.country_id} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.country_id} value={country.country_id}>
                        {country.country_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region_id">Region</Label>
                <Select 
                  value={wineData.region_id} 
                  onValueChange={handleRegionChange}
                  disabled={!wineData.country_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={wineData.country_id ? "Select region" : "Select country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRegions.map((region) => (
                      <SelectItem key={region.region_id} value={region.region_id.toString()}>
                        {region.wine_region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appellation_id">Appellation</Label>
                <Select 
                  value={wineData.appellation_id} 
                  onValueChange={handleAppellationChange}
                  disabled={!wineData.region_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={wineData.region_id ? "Select appellation" : "Select region first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAppellations.map((appellation) => (
                      <SelectItem key={appellation.appellation_id} value={appellation.appellation_id.toString()}>
                        {appellation.appellation} {appellation.classification && `(${appellation.classification})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bottle_size">Bottle Size</Label>
                <Select value={wineData.bottle_size} onValueChange={(value) => setWineData(prev => ({ ...prev, bottle_size: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bottle size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="750ml">750ml (Standard)</SelectItem>
                    <SelectItem value="375ml">375ml (Half bottle)</SelectItem>
                    <SelectItem value="187ml">187ml (Quarter bottle)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Cellar Information */}
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
                <Label htmlFor="my_rating">My Rating</Label>
                <Select value={cellarData.my_rating} onValueChange={(value) => setCellarData(prev => ({ ...prev, my_rating: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your rating (1-10)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating}/10
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="my_notes">Flavor Profile</Label>
              <Textarea
                id="my_notes"
                placeholder="Describe the wine's flavor profile, tasting notes, etc."
                value={cellarData.my_notes}
                onChange={(e) => setCellarData(prev => ({ ...prev, my_notes: e.target.value }))}
                className="min-h-[100px] resize-none"
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
            {isLoading ? 'Adding...' : 'Add to Cellar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
