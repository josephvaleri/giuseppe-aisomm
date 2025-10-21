import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
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

export async function POST(request: NextRequest) {
  try {
    const { foodText, searchType } = await request.json()
    
    if (!foodText) {
      return NextResponse.json({ error: 'Food text is required' }, { status: 400 })
    }

    
    const supabase = createServiceClient()
    let matches: string[] = []
    
    if (searchType === 'grape') {
      // Comprehensive grape pairings for all food categories
      const enhancedPairings: { [key: string]: string[] } = {
        // Proteins / Meats
        'steak': ['Cabernet Sauvignon', 'Malbec', 'Merlot', 'Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese', 'Tempranillo', 'Pinot Noir'],
        'ribeye': ['Cabernet Sauvignon', 'Malbec', 'Merlot', 'Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese', 'Tempranillo', 'Pinot Noir'],
        'filet': ['Cabernet Sauvignon', 'Malbec', 'Merlot', 'Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese', 'Tempranillo', 'Pinot Noir'],
        'mignon': ['Cabernet Sauvignon', 'Malbec', 'Merlot', 'Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese', 'Tempranillo', 'Pinot Noir'],
        'beef': ['Cabernet Sauvignon', 'Malbec', 'Merlot', 'Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese', 'Tempranillo', 'Pinot Noir'],
        'lamb': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        'rack': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        'chops': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        'roast': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec', 'Tempranillo'],
        'prime': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec', 'Tempranillo'],
        'rib': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec', 'Tempranillo'],
        'pork': ['Pinot Noir', 'Chardonnay', 'Riesling', 'Gewürztraminer', 'Sauvignon Blanc', 'Chenin Blanc'],
        'tenderloin': ['Pinot Noir', 'Chardonnay', 'Riesling', 'Gewürztraminer', 'Sauvignon Blanc', 'Chenin Blanc'],
        'duck': ['Pinot Noir', 'Merlot', 'Syrah', 'Grenache', 'Chardonnay', 'Riesling'],
        'foie': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'gras': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'chicken': ['Chardonnay', 'Pinot Noir', 'Sauvignon Blanc', 'Riesling', 'Viognier', 'Chenin Blanc'],
        'turkey': ['Pinot Noir', 'Chardonnay', 'Riesling', 'Gewürztraminer', 'Sauvignon Blanc', 'Chenin Blanc'],
        'veal': ['Pinot Noir', 'Chardonnay', 'Riesling', 'Gewürztraminer', 'Sauvignon Blanc', 'Chenin Blanc'],
        'venison': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        'game': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        
        // Seafood
        'salmon': ['Pinot Noir', 'Chardonnay', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'tuna': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Pinot Noir'],
        'shrimp': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'scallops': ['Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Chenin Blanc', 'Viognier', 'Pinot Grigio'],
        'lobster': ['Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Chenin Blanc', 'Viognier', 'Pinot Grigio'],
        'crab': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'oysters': ['Champagne', 'Sauvignon Blanc', 'Muscadet', 'Chablis', 'Sancerre', 'Riesling'],
        'fish': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'cod': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'halibut': ['Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Chenin Blanc', 'Viognier', 'Pinot Grigio'],
        'sole': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'seabass': ['Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Chenin Blanc', 'Viognier', 'Pinot Grigio'],
        'sushi': ['Sake', 'Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc'],
        'sashimi': ['Sake', 'Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc'],
        'seafood': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'caviar': ['Champagne', 'Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer'],
        'smoked': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        
        // Italian & Mediterranean
        'pasta': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'bolognese': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'marinara': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'alfredo': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'carbonara': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'pesto': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'risotto': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'pizza': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'margherita': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'pepperoni': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'truffle': ['Chardonnay', 'Pinot Noir', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'lasagna': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'antipasto': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'charcuterie': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'caprese': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'bruschetta': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'italian': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'mediterranean': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        
        // Cheese
        'cheese': ['Port', 'Sauternes', 'Champagne', 'Sherry', 'Madeira', 'Riesling'],
        'brie': ['Champagne', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'camembert': ['Champagne', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'goat': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'blue': ['Port', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'gorgonzola': ['Port', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'roquefort': ['Port', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'parmigiano': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'reggiano': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'cheddar': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'gruyere': ['Chardonnay', 'Pinot Noir', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'manchego': ['Tempranillo', 'Garnacha', 'Monastrell', 'Bobal', 'Graciano', 'Mencía'],
        'feta': ['Assyrtiko', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino'],
        'mozzarella': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'ricotta': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        
        // Vegetarian / Vegan
        'mushroom': ['Pinot Noir', 'Chardonnay', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'vegetables': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'eggplant': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'zucchini': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'peppers': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'salad': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'vinaigrette': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'lentil': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'bean': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'tofu': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'tempeh': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'burger': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'veggie': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'root': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'carrots': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'beets': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'broccoli': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'spinach': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'lettuce': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'tomato': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'onion': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'garlic': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        
        // Spicy / Global Cuisines
        'curry': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'indian': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'thai': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'mexican': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'tacos': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'fajitas': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'korean': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'bbq': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'sichuan': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'teriyaki': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'japanese': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'kebabs': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        'shawarma': ['Syrah', 'Shiraz', 'Grenache', 'Mourvèdre', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon'],
        'ethiopian': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'chinese': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'greek': ['Assyrtiko', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino'],
        'spicy': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'hot': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'chili': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'chile': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'jalapeno': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'pepper': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'cumin': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'paprika': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        
        // Casual & Comfort Foods
        'burger': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'ribs': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'pulled': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'brisket': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'fried': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'mac': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'fries': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'dog': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'sausage': ['Zinfandel', 'Syrah', 'Shiraz', 'Malbec', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo'],
        'meatloaf': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'comfort': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'casual': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        
        // Desserts & Sweets
        'chocolate': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'dark': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'milk': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'white': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'cheesecake': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'tart': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'fruit': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'creme': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'brulee': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'apple': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'pie': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'brownie': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'ice': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'cream': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'tiramisu': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'panettone': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'biscotti': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'dessert': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'sweet': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'sugar': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'honey': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'vanilla': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'cake': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'cookie': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'candy': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        
        // Snacks & Small Bites
        'nuts': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'almonds': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'walnuts': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'pistachios': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'popcorn': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'buttered': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'caramel': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'olives': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'paté': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'pate': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'small': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'bites': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'appetizer': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'snack': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        
        // Grains & Starches
        'rice': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'bread': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'quinoa': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'barley': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'oats': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'wheat': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'noodles': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'spaghetti': ['Sangiovese', 'Barbera', 'Montepulciano', 'Primitivo', 'Nebbiolo', 'Chianti'],
        'paella': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'gumbo': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'jambalaya': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'casserole': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'quiche': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'frittata': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        
        // Cooking methods & preparations
        'grilled': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'roasted': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'baked': ['Chardonnay', 'Pinot Grigio', 'Riesling', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'fried': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'steamed': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'boiled': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'sauteed': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'braised': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'seared': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'smoked': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'cured': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'marinated': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'stuffed': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'wrapped': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        
        // Meal times & occasions
        'breakfast': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'lunch': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'dinner': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'brunch': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'appetizer': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'entree': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'main': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'course': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'holiday': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'celebration': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'party': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'gathering': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        
        // General food terms
        'food': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'meal': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'dish': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'recipe': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'cook': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'eat': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'dining': ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Shiraz', 'Pinot Noir', 'Malbec'],
        'cuisine': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'kitchen': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc']
      }
      
      for (const [food, grapes] of Object.entries(enhancedPairings)) {
        if (foodText.toLowerCase().includes(food)) {
          matches.push(...grapes)
        }
      }
      
      // If we found grapes, now find appellations that use those grapes using proper database logic
      if (matches.length > 0) {
        // Step 1: Find grape_ids by matching grape names to grapes.grape_variety with 60% confidence
        const { data: grapeData, error: grapeError } = await supabase
          .from('grapes')
          .select('grape_id, grape_variety')
        
        if (grapeError) {
          console.error('Error fetching grapes:', grapeError)
        } else {
          const matchingGrapeIds: number[] = []
          
          for (const targetGrape of matches) {
            for (const grape of grapeData || []) {
              const similarity = calculateSimilarity(grape.grape_variety.toLowerCase(), targetGrape.toLowerCase())
              if (similarity >= 0.6) {
                matchingGrapeIds.push(grape.grape_id)
              }
            }
          }
          
          // Step 2: Use grape_ids to find ALL appellation_ids in join_grape_appellation table
          if (matchingGrapeIds.length > 0) {
            
            const { data: appellationData, error: appellationError } = await supabase
              .from('join_grape_appellation')
              .select(`
                appellation_id,
                appellation:appellation_id(appellation)
              `)
              .in('grape_id', matchingGrapeIds)
            
            if (!appellationError && appellationData) {
              const allAppellations = appellationData
                .map(item => item.appellation?.appellation)
                .filter(Boolean)
              
              // Add all appellations to matches
              matches.push(...allAppellations)
            } else {
              console.error('Error fetching appellations from join table:', appellationError)
            }
          }
        }
      }
      
    } else if (searchType === 'appellation') {
      // Comprehensive appellation pairings for all food categories
      const enhancedPairings: { [key: string]: string[] } = {
        // Proteins / Meats
        'steak': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'ribeye': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'filet': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'mignon': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'beef': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'lamb': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        'rack': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        'chops': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        'roast': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'prime': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'rib': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'pork': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'tenderloin': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'duck': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'foie': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'gras': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'chicken': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'turkey': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'veal': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'venison': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        'game': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        
        // Seafood
        'salmon': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'tuna': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'shrimp': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'scallops': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'lobster': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'crab': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'oysters': ['Champagne', 'Muscadet', 'Chablis', 'Sancerre', 'Riesling', 'Chenin Blanc'],
        'fish': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'cod': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'halibut': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'sole': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'seabass': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'sushi': ['Sake', 'Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc'],
        'sashimi': ['Sake', 'Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc'],
        'seafood': ['Chablis', 'Sancerre', 'Muscadet', 'Soave', 'Verdicchio', 'Burgundy'],
        'caviar': ['Champagne', 'Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer'],
        'smoked': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        
        // Italian & Mediterranean
        'pasta': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'bolognese': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'marinara': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'alfredo': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'carbonara': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'pesto': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'risotto': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'pizza': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'margherita': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'pepperoni': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'truffle': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'lasagna': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'antipasto': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'charcuterie': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'caprese': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'bruschetta': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'italian': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'mediterranean': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        
        // Cheese
        'cheese': ['Port', 'Sauternes', 'Champagne', 'Sherry', 'Madeira', 'Riesling'],
        'brie': ['Champagne', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'camembert': ['Champagne', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'goat': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'blue': ['Port', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'gorgonzola': ['Port', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'roquefort': ['Port', 'Sauternes', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Pinot Noir'],
        'parmigiano': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'reggiano': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'cheddar': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'gruyere': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'manchego': ['Rioja', 'Ribera del Duero', 'Priorat', 'Tempranillo', 'Garnacha', 'Monastrell'],
        'feta': ['Assyrtiko', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino'],
        'mozzarella': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'ricotta': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        
        // Vegetarian / Vegan
        'mushroom': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'vegetables': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'eggplant': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'zucchini': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'peppers': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'salad': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'vinaigrette': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'lentil': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'bean': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'tofu': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'tempeh': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'burger': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'veggie': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'root': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'carrots': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'beets': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'broccoli': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'spinach': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'lettuce': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'tomato': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'onion': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'garlic': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        
        // Spicy / Global Cuisines
        'curry': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'indian': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'thai': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'mexican': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'tacos': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'fajitas': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'korean': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'bbq': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'sichuan': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'teriyaki': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'japanese': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'kebabs': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        'shawarma': ['Côtes du Rhône', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Bandol', 'Rioja', 'Priorat'],
        'ethiopian': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'chinese': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'greek': ['Assyrtiko', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino'],
        'spicy': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'hot': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'chili': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'chile': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'jalapeno': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'pepper': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'cumin': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'paprika': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        
        // Casual & Comfort Foods
        'burger': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'ribs': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'pulled': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'brisket': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'fried': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'mac': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'fries': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'dog': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'sausage': ['Zinfandel', 'Lodi', 'Paso Robles', 'Sonoma', 'Napa Valley', 'Rioja', 'Priorat'],
        'meatloaf': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'comfort': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'casual': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        
        // Desserts & Sweets
        'chocolate': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'dark': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'milk': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'white': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'cheesecake': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'tart': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'fruit': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'creme': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'brulee': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'apple': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'pie': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'brownie': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'ice': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'cream': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'tiramisu': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'panettone': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'biscotti': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'dessert': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'sweet': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'sugar': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'honey': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'vanilla': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'cake': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'cookie': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'candy': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        
        // Snacks & Small Bites
        'nuts': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'almonds': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'walnuts': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'pistachios': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'popcorn': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'buttered': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'caramel': ['Port', 'Madeira', 'Banyuls', 'Pedro Ximenez', 'Sauternes', 'Tokaji'],
        'olives': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'paté': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'pate': ['Sauternes', 'Tokaji', 'Riesling', 'Chenin Blanc', 'Gewürztraminer', 'Champagne'],
        'small': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'bites': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'appetizer': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'snack': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        
        // Grains & Starches
        'rice': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'bread': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'quinoa': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'barley': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'oats': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'wheat': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'noodles': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'spaghetti': ['Chianti', 'Barbera d\'Asti', 'Montepulciano d\'Abruzzo', 'Primitivo di Manduria', 'Nebbiolo', 'Sangiovese'],
        'paella': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'gumbo': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'jambalaya': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'casserole': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'quiche': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'frittata': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        
        // Cooking methods & preparations
        'grilled': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'roasted': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'baked': ['Burgundy', 'Chablis', 'Sancerre', 'Champagne', 'Alsace', 'Soave', 'Verdicchio'],
        'fried': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'steamed': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'boiled': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'sauteed': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'braised': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'seared': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'smoked': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'cured': ['Riesling', 'Gewürztraminer', 'Pinot Grigio', 'Sauvignon Blanc', 'Chenin Blanc', 'Viognier'],
        'marinated': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'stuffed': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'wrapped': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        
        // Meal times & occasions
        'breakfast': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'lunch': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'dinner': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'brunch': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'appetizer': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'entree': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'main': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'course': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'holiday': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'celebration': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'party': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        'gathering': ['Champagne', 'Prosecco', 'Cava', 'Sekt', 'Sauvignon Blanc', 'Pinot Grigio'],
        
        // General food terms
        'food': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'meal': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'dish': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'recipe': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'cook': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'eat': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'dining': ['Bordeaux', 'Napa Valley', 'Barolo', 'Brunello di Montalcino', 'Amarone', 'Chianti Classico', 'Rioja', 'Priorat'],
        'cuisine': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc'],
        'kitchen': ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Chardonnay', 'Vermentino', 'Chenin Blanc']
      }
      
      for (const [food, appellations] of Object.entries(enhancedPairings)) {
        if (foodText.toLowerCase().includes(food)) {
          matches.push(...appellations)
        }
      }
      
      // If we found appellations, verify they exist in the database with 60% confidence
      if (matches.length > 0) {
        
        // Step 1: Find appellation_ids by matching appellation names to appellation.appellation with 60% confidence
        const { data: appellationData, error: appellationError } = await supabase
          .from('appellation')
          .select('appellation_id, appellation')
        
        if (appellationError) {
          console.error('Error fetching appellations:', appellationError)
        } else {
          const matchingAppellationIds: number[] = []
          const verifiedAppellations: string[] = []
          
          for (const targetAppellation of matches) {
            for (const appellation of appellationData || []) {
              const similarity = calculateSimilarity(appellation.appellation.toLowerCase(), targetAppellation.toLowerCase())
              if (similarity >= 0.6) {
                matchingAppellationIds.push(appellation.appellation_id)
                verifiedAppellations.push(appellation.appellation)
              }
            }
          }
          
          // Update matches to only include verified appellations
          matches = verifiedAppellations
        }
      }
    }
    
    // Remove duplicates
    const uniqueMatches = [...new Set(matches)]
    
    
    return NextResponse.json({ 
      matches: uniqueMatches,
      documentCount: 0,
      searchType: searchType,
      totalMatches: uniqueMatches.length
    })
    
  } catch (error) {
    console.error('Food pairing search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
