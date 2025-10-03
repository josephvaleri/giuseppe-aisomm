// Test script for the new wine search functionality
// Run with: node test-wine-search.js

// Test the isWineQuestion function logic
function isWineQuestion(question) {
  const lowerQuestion = question.toLowerCase()
  
  // Check for wine name + producer pattern
  const wineNamePatterns = [
    'casanova di neri', 'cerretalto', 'lungorotti', 'rubesco', 'antinori', 'sassicaia',
    'tignanello', 'solaia', 'ornellaia', 'masseto', 'brunello', 'barolo', 'barbaresco',
    'amarone', 'valpolicella', 'chianti', 'super tuscan',
    'domaine', 'chateau', 'mouton', 'lafite', 'margaux', 'latour', 'haut brion',
    'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
    'opus one', 'screaming eagle', 'harlan', 'dominus', 'caymus', 'stags leap',
    'penfolds', 'grange', 'henschke', 'hill of grace', 'vega sicilia', 'pingus'
  ]
  
  // Check for vintage patterns (4-digit years)
  const vintagePattern = /\b(19|20)\d{2}\b/
  const hasVintage = vintagePattern.test(question)
  
  // Check for wine name patterns
  const hasWineName = wineNamePatterns.some(pattern => lowerQuestion.includes(pattern))
  
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
  // 1. It has a wine name AND (producer OR vintage)
  // 2. It has a wine question pattern AND (wine name OR producer)
  // 3. It has a vintage AND wine name
  return (hasWineName && (hasProducer || hasVintage)) ||
         (hasWineQuestionPattern && (hasWineName || hasProducer)) ||
         (hasVintage && hasWineName)
}

// Test cases
const testQuestions = [
  "tell me about Casanova di Neri Cerretalto",
  "tell me about 2018 Lungorotti Rubesco",
  "what is Sassicaia",
  "about this wine Chateau Margaux",
  "tell me about the wine Opus One",
  "what grapes are in Chianti", // Should NOT be wine question
  "tell me about Italian wines", // Should NOT be wine question
  "what is the best wine from Tuscany", // Should NOT be wine question
  "tell me about 2015 Barolo from Piedmont", // Should be wine question
  "what is the producer of Brunello di Montalcino" // Should be wine question
]

console.log('Testing wine question detection:')
console.log('================================')

testQuestions.forEach((question, index) => {
  const isWine = isWineQuestion(question)
  console.log(`${index + 1}. "${question}"`)
  console.log(`   → Wine question: ${isWine}`)
  console.log('')
})

console.log('Expected results:')
console.log('- Questions 1-5, 9-10 should be detected as wine questions')
console.log('- Questions 6-8 should NOT be detected as wine questions')

