// Test script for the fixed wine detection logic
// Run with: node test-wine-detection-fix.js

// Test the fixed isWineQuestion function logic
function isWineQuestion(question) {
  const lowerQuestion = question.toLowerCase()
  
  // First, check if this is an appellation question (should NOT be wine question)
  const appellationPatterns = [
    'brunello di montalcino', 'barolo', 'barbaresco', 'chianti classico', 'amarone della valpolicella',
    'valpolicella', 'soave', 'bardolino', 'prosecco', 'franciacorta', 'champagne', 'burgundy',
    'bordeaux', 'cote du rhone', 'sancerre', 'vouvray', 'rioja', 'ribera del duero', 'cava',
    'jerez', 'manzanilla', 'montilla', 'porto', 'madeira', 'vinho verde', 'douro', 'alentejo',
    'tokaj', 'chianti', 'super tuscan' // Note: 'super tuscan' can be both appellation and wine
  ]
  
  const isAppellationQuestion = appellationPatterns.some(pattern => lowerQuestion.includes(pattern))
  
  // If it's clearly an appellation question, it's NOT a wine question
  if (isAppellationQuestion) {
    return false
  }
  
  // Check for specific wine names (not appellations)
  const specificWineNames = [
    // Italian specific wines
    'cerretalto', 'rubesco', 'sassicaia', 'tignanello', 'solaia', 'ornellaia', 'masseto',
    
    // French specific wines
    'mouton rothschild', 'chateau lafite', 'chateau margaux', 'chateau latour', 'haut brion',
    'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
    
    // Other specific wines
    'opus one', 'screaming eagle', 'harlan', 'dominus', 'caymus', 'stags leap',
    'penfolds grange', 'henschke hill of grace', 'vega sicilia unicornio', 'pingus'
  ]
  
  // Check for vintage patterns (4-digit years)
  const vintagePattern = /\b(19|20)\d{2}\b/
  const hasVintage = vintagePattern.test(question)
  
  // Check for specific wine name patterns
  const hasSpecificWineName = specificWineNames.some(pattern => lowerQuestion.includes(pattern))
  
  // Check for producer patterns
  const producerPatterns = [
    'producer', 'winery', 'estate', 'domaine', 'chateau', 'cantina', 'azienda',
    'bodega', 'bodegas', 'weingut', 'weingüter', 'vineyard', 'vineyards'
  ]
  const hasProducer = producerPatterns.some(pattern => lowerQuestion.includes(pattern))
  
  // Check for specific wine question patterns
  const wineQuestionPatterns = [
    'tell me about', 'what is', 'tell me about the wine', 'about this wine',
    'this wine', 'that wine', 'specific wine', 'particular wine'
  ]
  const hasWineQuestionPattern = wineQuestionPatterns.some(pattern => lowerQuestion.includes(pattern))
  
  // A question is considered a wine question if:
  // 1. It has a specific wine name AND (producer OR vintage)
  // 2. It has a wine question pattern AND (specific wine name OR producer)
  // 3. It has a vintage AND specific wine name
  return (hasSpecificWineName && (hasProducer || hasVintage)) ||
         (hasWineQuestionPattern && (hasSpecificWineName || hasProducer)) ||
         (hasVintage && hasSpecificWineName)
}

// Test cases
const testQuestions = [
  "tell me about Casanova di Neri Cerretalto", // Should be wine (specific wine)
  "tell me about 2018 Lungorotti Rubesco", // Should be wine (specific wine + vintage)
  "what is Sassicaia", // Should be wine (specific wine)
  "about this wine Chateau Margaux", // Should be wine (specific wine)
  "tell me about the wine Opus One", // Should be wine (specific wine)
  "what grapes are in Chianti", // Should NOT be wine (appellation)
  "tell me about Italian wines", // Should NOT be wine (general)
  "what is the best wine from Tuscany", // Should NOT be wine (general)
  "tell me about 2015 Barolo from Piedmont", // Should NOT be wine (appellation)
  "what is the producer of Brunello di Montalcino", // Should NOT be wine (appellation)
  "tell me about Barolo", // Should NOT be wine (appellation)
  "what is Chianti Classico", // Should NOT be wine (appellation)
  "about Amarone della Valpolicella", // Should NOT be wine (appellation)
  "tell me about 2018 Sassicaia", // Should be wine (specific wine + vintage)
  "what is the producer of Tenuta San Guido Sassicaia" // Should be wine (specific wine + producer)
]

console.log('Testing FIXED wine question detection:')
console.log('======================================')

testQuestions.forEach((question, index) => {
  const isWine = isWineQuestion(question)
  console.log(`${index + 1}. "${question}"`)
  console.log(`   → Wine question: ${isWine}`)
  console.log('')
})

console.log('Expected results:')
console.log('- Questions 1-5, 14-15 should be detected as wine questions (specific wines)')
console.log('- Questions 6-13 should NOT be detected as wine questions (appellations/general)')

