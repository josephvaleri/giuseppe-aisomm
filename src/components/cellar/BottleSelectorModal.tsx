'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Search, Wine, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isWineReadyToDrink } from '@/lib/utils/wine-utils'
import { extractIntentQuestionFeatures } from '@/lib/ml/features'

interface BottleSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onBottleSelected: (bottleId: number) => void
}

interface SearchCriteria {
  pairsWith: {
    enabled: boolean
    food: string
  }
  color: string
  bubbly: string
  priceRange: {
    min: number | null
    max: number | null
  }
  readyToDrink: string
  bottleSize: string
  minQuantity: number
}

interface SearchResult {
  bottle_id: number
  wine_id: number
  wine_name: string
  producer: string
  vintage: number
  appellation: string
  color: string
  where_stored: string
  ready_to_drink: boolean
  typical_price: number
  value: number
  quantity: number
  match_score: number
}

export function BottleSelectorModal({ isOpen, onClose, onBottleSelected }: BottleSelectorModalProps) {
  const [criteria, setCriteria] = useState<SearchCriteria>({
    pairsWith: { enabled: false, food: '' },
    color: '',
    bubbly: 'No',
    priceRange: { min: null, max: null },
    readyToDrink: '',
    bottleSize: '750ml',
    minQuantity: 1
  })
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBottle, setSelectedBottle] = useState<SearchResult | null>(null)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  
  const supabase = createClient()

  const handleSearch = async () => {
    setIsSearching(true)
    setError(null)
    
    try {
      if (criteria.pairsWith.enabled && criteria.pairsWith.food.trim()) {
        // COMPLEX search: Food pairing requires document search and appellation matching
        console.log('🍽️ Food pairing enabled - using complex search')
        await searchWithFoodPairing()
      } else {
        // SIMPLE search: Direct filtering of cellar table
        console.log('🔍 No food pairing - using simple search')
        await searchBasicCriteria()
      }
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const searchBasicCriteria = async () => {
    console.log('🔍 Starting SIMPLE search with criteria:', criteria)
    console.log('📝 Note: This is a direct search of cellar table - no complex matching required')
    
    // Use the get_user_cellar function instead of direct table query
    // This ensures we get the proper COALESCE logic for fields that might be in wines table
    console.log('📊 Using get_user_cellar function for consistent data...')
    
    const { data, error } = await supabase.rpc('get_user_cellar')

    if (error) {
      console.error('❌ Database query error:', error)
      throw error
    }
    
    console.log('✅ Database query successful, found', data?.length || 0, 'raw results')
    
    // Filter by minimum quantity first
    let filteredData = data?.filter(item => item.quantity >= criteria.minQuantity) || []
    console.log(`📊 After min quantity filter (${criteria.minQuantity}):`, filteredData.length, 'items')
    
    // Apply additional filters in JavaScript since we're using the RPC function
    if (criteria.color) {
      filteredData = filteredData.filter(item => item.color === criteria.color)
      console.log('🎨 After color filter:', filteredData.length, 'items')
    }
    
    if (criteria.bubbly !== 'No') {
      filteredData = filteredData.filter(item => item.bubbly === criteria.bubbly)
      console.log('🥂 After bubbly filter:', filteredData.length, 'items')
    }
    
    if (criteria.bottleSize) {
      filteredData = filteredData.filter(item => item.bottle_size === criteria.bottleSize)
      console.log('🍾 After bottle size filter:', filteredData.length, 'items')
    }
    
    if (criteria.priceRange.min !== null) {
      filteredData = filteredData.filter(item => 
        !item.typical_price || item.typical_price === 0 || item.typical_price >= criteria.priceRange.min
      )
      console.log('💰 After min price filter (NULL/zero prices included):', filteredData.length, 'items')
    }
    
    if (criteria.priceRange.max !== null) {
      filteredData = filteredData.filter(item => 
        !item.typical_price || item.typical_price === 0 || item.typical_price <= criteria.priceRange.max
      )
      console.log('💰 After max price filter (NULL/zero prices included):', filteredData.length, 'items')
    }
    
    // Apply ready-to-drink filter
    if (criteria.readyToDrink) {
      filteredData = filteredData.filter(item => {
        const readyToDrink = isWineReadyToDrink(item.drink_starting, item.drink_by)
        const matches = criteria.readyToDrink === 'yes' ? readyToDrink : !readyToDrink
        return matches
      })
      console.log('🍷 After ready-to-drink filter:', filteredData.length, 'items')
    }

    // Process results - no need for complex scoring since we're doing direct filtering
    console.log('🧮 Processing filtered results...')
    const results: SearchResult[] = filteredData.map((item: any, index: number) => {
      const readyToDrink = isWineReadyToDrink(item.drink_starting, item.drink_by)
      
      console.log(`🍷 Processing wine ${index + 1}:`, {
        wine_name: item.wine_name,
        color: item.color,
        bubbly: item.bubbly,
        bottle_size: item.bottle_size,
        typical_price: item.typical_price,
        readyToDrink
      })
      
      return {
        bottle_id: item.bottle_id,
        wine_id: item.wine_id,
        wine_name: item.wine_name,
        producer: item.producer,
        vintage: item.vintage,
        appellation: item.appellation || '',
        color: item.color,
        where_stored: item.where_stored,
        ready_to_drink: readyToDrink,
        typical_price: item.typical_price,
        value: item.value,
        quantity: item.quantity,
        match_score: 1 // Simple score since we're doing direct filtering
      }
    })

    // Sort by match score (highest to lowest) and limit to 25 results
    console.log('🔍 Sorting and limiting results...')
    const finalResults = results
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 25)

    // No minimum match requirement - show whatever we find
    if (finalResults.length === 0) {
      console.log('❌ No matches found')
      setSearchResults([])
      setError('No matching wines found. Try adjusting your search criteria.')
      return
    }

    console.log('🎯 Final results:', finalResults.length, 'wines')
    console.log('📋 Final results:', finalResults.map(r => ({ 
      wine_name: r.wine_name, 
      color: r.color,
      bubbly: r.bubbly,
      bottle_size: r.bottle_size
    })))

    setSearchResults(finalResults)
  }

  // Helper function to search for appellations that pair with food using API route
  const searchAppellationsForFood = async (foodText: string) => {
    console.log('🔍 Searching appellations for food pairing with:', foodText)
    
    try {
      // Use API route for document search
      console.log('📚 Searching documents for food pairing information...')
      const response = await fetch('/api/search-food-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodText,
          searchType: 'appellation'
        })
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      const data = await response.json()
      console.log('📄 API Response:', data)
      console.log('📄 Document search results:', data.documentCount, 'chunks found')
      
      let appellations = data.matches || []
      console.log('📊 Raw appellations from API:', appellations)
      
      // Fallback to common pairings if document search doesn't find enough
      if (appellations.length < 2) {
        console.log('📚 Document search found limited results, using fallback pairings...')
        const commonPairings: { [key: string]: string[] } = {
          'chicken': ['Champagne', 'Burgundy', 'Chablis', 'Sancerre'],
          'beef': ['Bordeaux', 'Barolo', 'Brunello', 'Napa Valley'],
          'fish': ['Chablis', 'Sancerre', 'Muscadet', 'Pinot Grigio'],
          'pasta': ['Chianti', 'Barbera', 'Montepulciano', 'Primitivo'],
          'cheese': ['Port', 'Sauternes', 'Champagne', 'Sherry'],
          'chocolate': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez']
        }
        
        for (const [food, fallbackAppellations] of Object.entries(commonPairings)) {
          if (foodText.toLowerCase().includes(food)) {
            appellations.push(...fallbackAppellations)
          }
        }
      }
      
      console.log('📊 Found appellations:', appellations)
      return [...new Set(appellations)] // Remove duplicates
      
    } catch (error) {
      console.error('❌ Document search error:', error)
      console.log('🔄 Falling back to basic appellation search...')
      
      // Fallback to basic search
      const commonPairings: { [key: string]: string[] } = {
        'chicken': ['Champagne', 'Burgundy', 'Chablis', 'Sancerre'],
        'beef': ['Bordeaux', 'Barolo', 'Brunello', 'Napa Valley'],
        'fish': ['Chablis', 'Sancerre', 'Muscadet', 'Pinot Grigio'],
        'pasta': ['Chianti', 'Barbera', 'Montepulciano', 'Primitivo'],
        'cheese': ['Port', 'Sauternes', 'Champagne', 'Sherry'],
        'chocolate': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez']
      }
      
      const matchingAppellations: string[] = []
      for (const [food, appellations] of Object.entries(commonPairings)) {
        if (foodText.toLowerCase().includes(food)) {
          matchingAppellations.push(...appellations)
        }
      }
      
      return matchingAppellations
    }
  }
  
  // Helper function to search for grapes that pair with food using API route
  const searchGrapesForFood = async (foodText: string) => {
    console.log('🍇 Searching grapes for food pairing with:', foodText)
    
    try {
      // Use API route for document search
      console.log('📚 Searching documents for grape-food pairing information...')
      const response = await fetch('/api/search-food-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodText,
          searchType: 'grape'
        })
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      const data = await response.json()
      console.log('📄 API Response:', data)
      console.log('📄 Document search results:', data.documentCount, 'chunks found')
      
      let grapes = data.matches || []
      console.log('📊 Raw grapes from API:', grapes)
      
      // Fallback to common pairings if document search doesn't find enough
      if (grapes.length < 2) {
        console.log('📚 Document search found limited results, using fallback grape pairings...')
        const commonPairings: { [key: string]: string[] } = {
          'chicken': ['Chardonnay', 'Pinot Noir', 'Sauvignon Blanc'],
          'beef': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Nebbiolo'],
          'fish': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling'],
          'pasta': ['Sangiovese', 'Barbera', 'Montepulciano'],
          'cheese': ['Port', 'Sauternes', 'Champagne'],
          'chocolate': ['Port', 'Madeira', 'Banyuls']
        }
        
        for (const [food, fallbackGrapes] of Object.entries(commonPairings)) {
          if (foodText.toLowerCase().includes(food)) {
            grapes.push(...fallbackGrapes)
          }
        }
      }
      
      console.log('🍇 Found grapes:', grapes)
      return [...new Set(grapes)] // Remove duplicates
      
    } catch (error) {
      console.error('❌ Document search error:', error)
      console.log('🔄 Falling back to basic grape search...')
      
      // Fallback to basic search
      const commonPairings: { [key: string]: string[] } = {
        'chicken': ['Chardonnay', 'Pinot Noir', 'Sauvignon Blanc'],
        'beef': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Nebbiolo'],
        'fish': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling'],
        'pasta': ['Sangiovese', 'Barbera', 'Montepulciano'],
        'cheese': ['Port', 'Sauternes', 'Champagne'],
        'chocolate': ['Port', 'Madeira', 'Banyuls']
      }
      
      const matchingGrapes: string[] = []
      for (const [food, grapes] of Object.entries(commonPairings)) {
        if (foodText.toLowerCase().includes(food)) {
          matchingGrapes.push(...grapes)
        }
      }
      
      return matchingGrapes
    }
  }
  
  // Helper function to find cellar wines that match appellations or grapes
  const findCellarWinesForFoodPairing = async (appellations: string[], grapes: string[]) => {
    
    // Get all cellar items
    const { data: cellarData, error: cellarError } = await supabase.rpc('get_user_cellar')
    if (cellarError) {
      console.error('Database error:', cellarError)
      throw cellarError
    }
    
    // Find wines that match appellations (with 60% confidence)
    const appellationMatches: any[] = []
    if (appellations.length > 0) {
      
      for (const cellarItem of cellarData || []) {
        if (cellarItem.appellation) {
          for (const targetAppellation of appellations) {
            const similarity = calculateSimilarity(cellarItem.appellation.toLowerCase(), targetAppellation.toLowerCase())
            
            if (similarity >= 0.6) {
              appellationMatches.push({
                ...cellarItem,
                match_type: 'appellation',
                match_confidence: similarity,
                match_value: targetAppellation
              })
              break // Only add once per wine
            }
          }
        }
      }
    }
    
    // Find wines that match grapes (with 60% confidence)
    const grapeMatches: any[] = []
    if (grapes.length > 0) {
      
      // This would require a more complex query to join grapes through appellations
      // For now, we'll use a simplified approach
      for (const cellarItem of cellarData || []) {
        // Check if wine name contains grape names (more comprehensive matching)
        for (const targetGrape of grapes) {
          const wineName = cellarItem.wine_name?.toLowerCase() || ''
          const grapeName = targetGrape.toLowerCase()
          
          // Check for exact match, partial match, or similarity
          const isExactMatch = wineName.includes(grapeName)
          const isPartialMatch = wineName.includes(grapeName.split(' ')[0]) // Check for first word match
          const similarity = calculateSimilarity(wineName, grapeName)
          
          if (similarity >= 0.6) {
            grapeMatches.push({
              ...cellarItem,
              match_type: 'grape',
              match_confidence: similarity,
              match_value: targetGrape
            })
            break
          }
        }
      }
    }
    
    // Combine and deduplicate matches
    const allMatches = [...appellationMatches, ...grapeMatches]
    
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.bottle_id === match.bottle_id)
    )
    
    return uniqueMatches
  }
  
  // Helper function to calculate string similarity (simple implementation)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }
  
  // Levenshtein distance calculation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  const searchWithFoodPairing = async () => {
    
    const foodText = criteria.pairsWith.food.trim()
    
    // Enhanced validation using Ask Giuseppe's intent classification
    
    let isFoodPairing = false
    let isWineRelated = false
    
    try {
      const features = extractIntentQuestionFeatures(foodText)
      
      if (features && features.intent_scores && features.intent_scores.food_pairing !== undefined) {
        isFoodPairing = features.intent_scores.food_pairing > 0.5
        isWineRelated = features.is_wine_related > 0
        
      } else {
        // Fallback to basic food validation - comprehensive food database
        const foodKeywords = [
          // Proteins / Meats
          'steak', 'ribeye', 'filet', 'mignon', 'beef', 'lamb', 'rack', 'chops', 'roast', 'prime', 'rib',
          'pork', 'tenderloin', 'chops', 'duck', 'foie', 'gras', 'chicken', 'turkey', 'veal', 'venison',
          'game', 'meat', 'ham', 'bacon', 'sausage', 'prosciutto', 'chorizo', 'salami',
          
          // Seafood
          'salmon', 'tuna', 'shrimp', 'scallops', 'lobster', 'crab', 'oysters', 'fish', 'cod', 'halibut',
          'sole', 'seabass', 'sushi', 'sashimi', 'seafood', 'caviar', 'smoked', 'salmon',
          
          // Italian & Mediterranean
          'pasta', 'bolognese', 'marinara', 'alfredo', 'carbonara', 'pesto', 'risotto', 'pizza',
          'margherita', 'pepperoni', 'truffle', 'lasagna', 'antipasto', 'charcuterie', 'caprese',
          'bruschetta', 'italian', 'mediterranean',
          
          // Cheese
          'cheese', 'brie', 'camembert', 'goat', 'blue', 'gorgonzola', 'roquefort', 'parmigiano',
          'reggiano', 'cheddar', 'gruyere', 'manchego', 'feta', 'mozzarella', 'ricotta',
          
          // Vegetarian / Vegan
          'mushroom', 'truffle', 'vegetables', 'eggplant', 'zucchini', 'peppers', 'salad',
          'vinaigrette', 'lentil', 'bean', 'tofu', 'tempeh', 'burger', 'veggie', 'root',
          'carrots', 'beets', 'broccoli', 'spinach', 'lettuce', 'tomato', 'onion', 'garlic',
          
          // Spicy / Global Cuisines
          'curry', 'indian', 'thai', 'mexican', 'tacos', 'fajitas', 'korean', 'bbq', 'sichuan',
          'teriyaki', 'japanese', 'kebabs', 'shawarma', 'ethiopian', 'chinese', 'greek',
          'spicy', 'hot', 'chili', 'chile', 'jalapeno', 'pepper', 'cumin', 'paprika',
          
          // Casual & Comfort Foods
          'burger', 'bbq', 'ribs', 'pulled', 'brisket', 'fried', 'chicken', 'mac', 'cheese',
          'fries', 'hot', 'dog', 'sausage', 'meatloaf', 'chili', 'comfort', 'casual',
          
          // Desserts & Sweets
          'chocolate', 'dark', 'milk', 'white', 'cheesecake', 'tart', 'fruit', 'creme', 'brulee',
          'apple', 'pie', 'brownie', 'ice', 'cream', 'tiramisu', 'panettone', 'biscotti',
          'dessert', 'sweet', 'sugar', 'honey', 'vanilla', 'cake', 'cookie', 'candy',
          
          // Snacks & Small Bites
          'nuts', 'almonds', 'walnuts', 'pistachios', 'popcorn', 'buttered', 'truffle', 'caramel',
          'olives', 'paté', 'pate', 'small', 'bites', 'appetizer', 'snack',
          
          // Grains & Starches
          'rice', 'bread', 'quinoa', 'barley', 'oats', 'wheat', 'noodles', 'spaghetti',
          'paella', 'gumbo', 'jambalaya', 'casserole', 'quiche', 'frittata',
          
          // Cooking methods & preparations
          'grilled', 'roasted', 'baked', 'fried', 'steamed', 'boiled', 'sauteed', 'braised',
          'seared', 'smoked', 'cured', 'marinated', 'stuffed', 'wrapped',
          
          // Meal times & occasions
          'breakfast', 'lunch', 'dinner', 'brunch', 'appetizer', 'entree', 'main', 'course',
          'holiday', 'celebration', 'party', 'gathering',
          
          // General food terms
          'food', 'meal', 'dish', 'recipe', 'cook', 'eat', 'dining', 'cuisine', 'kitchen'
        ]
        
        const isFoodRelated = foodKeywords.some(keyword => foodText.toLowerCase().includes(keyword)) || 
                             foodText.includes('recipe') || 
                             foodText.includes('dish') || 
                             foodText.includes('meal') ||
                             foodText.includes('dinner') ||
                             foodText.includes('lunch') ||
                             foodText.includes('breakfast') ||
                             foodText.includes('cook') ||
                             foodText.includes('food') ||
                             foodText.includes('eat')
        
        if (!isFoodRelated) {
          setError('Please enter a food name or recipe name to match based on food pairing')
          return
        }
        
        isFoodPairing = true // Assume it's food pairing if basic validation passes
      }
    } catch (error) {
      console.error('Intent classification error:', error)
      
      // Fallback to basic food validation - comprehensive food database
      const foodKeywords = [
        // Proteins / Meats
        'steak', 'ribeye', 'filet', 'mignon', 'beef', 'lamb', 'rack', 'chops', 'roast', 'prime', 'rib',
        'pork', 'tenderloin', 'chops', 'duck', 'foie', 'gras', 'chicken', 'turkey', 'veal', 'venison',
        'game', 'meat', 'ham', 'bacon', 'sausage', 'prosciutto', 'chorizo', 'salami',
        
        // Seafood
        'salmon', 'tuna', 'shrimp', 'scallops', 'lobster', 'crab', 'oysters', 'fish', 'cod', 'halibut',
        'sole', 'seabass', 'sushi', 'sashimi', 'seafood', 'caviar', 'smoked', 'salmon',
        
        // Italian & Mediterranean
        'pasta', 'bolognese', 'marinara', 'alfredo', 'carbonara', 'pesto', 'risotto', 'pizza',
        'margherita', 'pepperoni', 'truffle', 'lasagna', 'antipasto', 'charcuterie', 'caprese',
        'bruschetta', 'italian', 'mediterranean',
        
        // Cheese
        'cheese', 'brie', 'camembert', 'goat', 'blue', 'gorgonzola', 'roquefort', 'parmigiano',
        'reggiano', 'cheddar', 'gruyere', 'manchego', 'feta', 'mozzarella', 'ricotta',
        
        // Vegetarian / Vegan
        'mushroom', 'truffle', 'vegetables', 'eggplant', 'zucchini', 'peppers', 'salad',
        'vinaigrette', 'lentil', 'bean', 'tofu', 'tempeh', 'burger', 'veggie', 'root',
        'carrots', 'beets', 'broccoli', 'spinach', 'lettuce', 'tomato', 'onion', 'garlic',
        
        // Spicy / Global Cuisines
        'curry', 'indian', 'thai', 'mexican', 'tacos', 'fajitas', 'korean', 'bbq', 'sichuan',
        'teriyaki', 'japanese', 'kebabs', 'shawarma', 'ethiopian', 'chinese', 'greek',
        'spicy', 'hot', 'chili', 'chile', 'jalapeno', 'pepper', 'cumin', 'paprika',
        
        // Casual & Comfort Foods
        'burger', 'bbq', 'ribs', 'pulled', 'brisket', 'fried', 'chicken', 'mac', 'cheese',
        'fries', 'hot', 'dog', 'sausage', 'meatloaf', 'chili', 'comfort', 'casual',
        
        // Desserts & Sweets
        'chocolate', 'dark', 'milk', 'white', 'cheesecake', 'tart', 'fruit', 'creme', 'brulee',
        'apple', 'pie', 'brownie', 'ice', 'cream', 'tiramisu', 'panettone', 'biscotti',
        'dessert', 'sweet', 'sugar', 'honey', 'vanilla', 'cake', 'cookie', 'candy',
        
        // Snacks & Small Bites
        'nuts', 'almonds', 'walnuts', 'pistachios', 'popcorn', 'buttered', 'truffle', 'caramel',
        'olives', 'paté', 'pate', 'small', 'bites', 'appetizer', 'snack',
        
        // Grains & Starches
        'rice', 'bread', 'quinoa', 'barley', 'oats', 'wheat', 'noodles', 'spaghetti',
        'paella', 'gumbo', 'jambalaya', 'casserole', 'quiche', 'frittata',
        
        // Cooking methods & preparations
        'grilled', 'roasted', 'baked', 'fried', 'steamed', 'boiled', 'sauteed', 'braised',
        'seared', 'smoked', 'cured', 'marinated', 'stuffed', 'wrapped',
        
        // Meal times & occasions
        'breakfast', 'lunch', 'dinner', 'brunch', 'appetizer', 'entree', 'main', 'course',
        'holiday', 'celebration', 'party', 'gathering',
        
        // General food terms
        'food', 'meal', 'dish', 'recipe', 'cook', 'eat', 'dining', 'cuisine', 'kitchen'
      ]
      
      const isFoodRelated = foodKeywords.some(keyword => foodText.toLowerCase().includes(keyword)) || 
                           foodText.includes('recipe') || 
                           foodText.includes('dish') || 
                           foodText.includes('meal') ||
                           foodText.includes('dinner') ||
                           foodText.includes('lunch') ||
                           foodText.includes('breakfast') ||
                           foodText.includes('cook') ||
                           foodText.includes('food') ||
                           foodText.includes('eat')
      
      if (!isFoodRelated) {
        setError('Please enter a food name or recipe name to match based on food pairing')
        return
      }
      
      isFoodPairing = true // Assume it's food pairing if basic validation passes
    }
    
    if (!isFoodPairing && !isWineRelated) {
      setError('Please enter a food name or recipe name to match based on food pairing')
      return
    }
    
    
    try {
      
      // Step 1: Search for appellations that pair with the food
      const appellationResults = await searchAppellationsForFood(foodText)
      
      // Step 2: Search for grapes that pair with the food  
      const grapeResults = await searchGrapesForFood(foodText)
      
      // Step 3: Find wines in cellar that match the appellations or grapes
      const cellarMatches = await findCellarWinesForFoodPairing(appellationResults, grapeResults)
      
      // Step 4: Check if we have any matches
      if (cellarMatches.length === 0) {
        setError('No food pairing matches found. Try a different food or adjust your search criteria.')
        setSearchResults([])
        return
      }
      
      // Step 5: Format results for display
      const formattedResults: SearchResult[] = cellarMatches.map((match: any) => {
        const readyToDrink = isWineReadyToDrink(match.drink_starting, match.drink_by)
        
        return {
          bottle_id: match.bottle_id,
          wine_id: match.wine_id,
          wine_name: match.wine_name,
          producer: match.producer,
          vintage: match.vintage,
          appellation: match.appellation || '',
          color: match.color,
          where_stored: match.where_stored,
          ready_to_drink: readyToDrink,
          typical_price: match.typical_price,
          value: match.value,
          quantity: match.quantity,
          match_score: Math.round(match.match_confidence * 10) // Convert to 1-10 scale
        }
      })
      
      // Step 6: Sort by match score (highest to lowest) and present results
      const sortedResults = formattedResults
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 25)
      
      setSearchResults(sortedResults)
      
    } catch (error: any) {
      console.error('❌ Food pairing search error:', error)
      setError(error.message || 'Food pairing search failed')
    }
  }

  const handleBottleSelect = (bottle: SearchResult) => {
    setSelectedBottle(bottle)
    setShowConfirmRemove(true)
  }

  const confirmRemoveBottle = async () => {
    if (!selectedBottle) return

    try {
      const { error } = await supabase
        .from('cellar_items')
        .update({ quantity: selectedBottle.quantity - 1 })
        .eq('bottle_id', selectedBottle.bottle_id)

      if (error) throw error

      // Update local state
      setSearchResults(prev => 
        prev.map(result => 
          result.bottle_id === selectedBottle.bottle_id 
            ? { ...result, quantity: result.quantity - 1 }
            : result
        )
      )

      onBottleSelected(selectedBottle.bottle_id)
      setShowConfirmRemove(false)
      setSelectedBottle(null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove bottle')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[url('/Background_06.jpg')] bg-cover bg-center bg-no-repeat relative rounded-lg overflow-hidden">
        {/* 50% fade overlay */}
        <div className="absolute inset-0 bg-white/50"></div>
        
        {/* Content with proper layering */}
        <div className="relative z-10 w-full h-full overflow-y-auto">
          <Card className="w-full h-full bg-transparent border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-amber-900">
            Select a Bottle
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Search Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pairs With */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="pairs-with"
                  checked={criteria.pairsWith.enabled}
                  onCheckedChange={(checked) => 
                    setCriteria(prev => ({
                      ...prev,
                      pairsWith: { ...prev.pairsWith, enabled: !!checked }
                    }))
                  }
                />
                <Label htmlFor="pairs-with">Pairs with</Label>
              </div>
              <Input
                placeholder="Enter a food or recipe"
                value={criteria.pairsWith.food}
                onChange={(e) => 
                  setCriteria(prev => ({
                    ...prev,
                    pairsWith: { ...prev.pairsWith, food: e.target.value }
                  }))
                }
                disabled={!criteria.pairsWith.enabled}
                className={!criteria.pairsWith.enabled ? 'bg-gray-100' : ''}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <Select 
                value={criteria.color} 
                onValueChange={(value) => setCriteria(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Red">Red</SelectItem>
                  <SelectItem value="White">White</SelectItem>
                  <SelectItem value="Orange">Orange</SelectItem>
                  <SelectItem value="Rose">Rose</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bubbly */}
            <div className="space-y-2">
              <Label>Bubbly?</Label>
              <Select 
                value={criteria.bubbly} 
                onValueChange={(value) => setCriteria(prev => ({ ...prev, bubbly: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Slight">Slight</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min $"
                  value={criteria.priceRange.min || ''}
                  onChange={(e) => 
                    setCriteria(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, min: e.target.value ? Number(e.target.value) : null }
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Max $"
                  value={criteria.priceRange.max || ''}
                  onChange={(e) => 
                    setCriteria(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, max: e.target.value ? Number(e.target.value) : null }
                    }))
                  }
                />
              </div>
            </div>

            {/* Ready to Drink */}
            <div className="space-y-2">
              <Label>Ready to drink now?</Label>
              <Select 
                value={criteria.readyToDrink} 
                onValueChange={(value) => setCriteria(prev => ({ ...prev, readyToDrink: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bottle Size */}
            <div className="space-y-2">
              <Label>Bottle Size</Label>
              <Select 
                value={criteria.bottleSize} 
                onValueChange={(value) => setCriteria(prev => ({ ...prev, bottleSize: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="187ml">187ml</SelectItem>
                  <SelectItem value="375ml">375ml</SelectItem>
                  <SelectItem value="750ml">750ml</SelectItem>
                  <SelectItem value="1.5L">1.5L</SelectItem>
                  <SelectItem value="3L">3L</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Quantity */}
            <div className="space-y-2">
              <Label>Quantity of at least</Label>
              <Select 
                value={criteria.minQuantity.toString()} 
                onValueChange={(value) => setCriteria(prev => ({ ...prev, minQuantity: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Button */}
          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <Search className="w-4 h-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search Bottles'}
          </Button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-amber-900">
                Found {searchResults.length} matching bottles
              </h3>
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <Card 
                    key={result.bottle_id}
                    className="p-4 hover:bg-amber-50 cursor-pointer transition-colors"
                    onClick={() => handleBottleSelect(result)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-amber-900">
                          {result.wine_name}
                        </h4>
                        <p className="text-sm text-amber-700">
                          {result.producer} {result.vintage && `(${result.vintage})`}
                        </p>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline">{result.color}</Badge>
                          {result.appellation && (
                            <Badge variant="outline">{result.appellation}</Badge>
                          )}
                          <Badge variant="outline">Qty: {result.quantity}</Badge>
                          {result.ready_to_drink && (
                            <Badge className="bg-green-100 text-green-800">Ready</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-amber-600">
                        {result.typical_price && (
                          <div>${result.typical_price}</div>
                        )}
                        {result.where_stored && (
                          <div className="text-xs">📍 {result.where_stored}</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.length === 0 && !isSearching && (
            <div className="text-center py-8 text-amber-600">
              <Wine className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No bottles found matching your criteria</p>
            </div>
          )}
        </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Remove Modal */}
      {showConfirmRemove && selectedBottle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Remove Bottle?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Should I remove 1 bottle of <strong>{selectedBottle.wine_name}</strong> from your cellar?
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={confirmRemoveBottle}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Yes, Remove
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowConfirmRemove(false)
                    setSelectedBottle(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
