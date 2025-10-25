// Test script to verify Quintessa detection
// Run with: node test-quintessa.js

function isWineQuestion(question) {
  const lowerQuestion = question.toLowerCase()
  
  // First, check if this is an appellation question (should NOT be wine question)
  const appellationPatterns = [
    'brunello di montalcino', 'barolo', 'barbaresco', 'chianti classico', 'amarone della valpolicella',
    'valpolicella', 'soave', 'bardolino', 'prosecco', 'franciacorta', 'champagne', 'burgundy',
    'bordeaux', 'cote du rhone', 'sancerre', 'vouvray', 'rioja', 'ribera del duero', 'cava',
    'jerez', 'manzanilla', 'montilla', 'porto', 'madeira', 'vinho verde', 'douro', 'alentejo',
    'tokaj', 'chianti', 'super tuscan'
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
    'tenuta san guido', 'antinori', 'frescobaldi', 'marchesi antinori',
    
    // French specific wines
    'mouton rothschild', 'chateau lafite', 'chateau margaux', 'chateau latour', 'haut brion',
    'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
    'domaine de la romanee conti', 'drc', 'la tache', 'romanee conti',
    
    // American specific wines
    'opus one', 'screaming eagle', 'harlan', 'dominus', 'caymus', 'stags leap',
    'quintessa', 'caymus', 'stags leap wine cellars', 'ridge monte bello',
    'heitz cellars', 'spottswoode', 'shafer hillside select', 'dominique laurent',
    
    // Australian specific wines
    'penfolds grange', 'henschke hill of grace', 'vega sicilia unicornio', 'pingus',
    'clarendon hills', 'greenock creek', 'torbreck', 'two hands',
    
    // Spanish specific wines
    'vega sicilia', 'pingus', 'alvaro palacios', 'artadi', 'remirez de ganuza',
    
    // Other regions
    'sassicaia', 'tignanello', 'solaia', 'ornellaia', 'masseto'
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

// Test the specific case
const testQuestion = "tell me about 2015 Quintessa"
const isWine = isWineQuestion(testQuestion)

console.log(`Testing: "${testQuestion}"`)
console.log(`Result: ${isWine ? 'WINE QUESTION' : 'NOT A WINE QUESTION'}`)
console.log('')
console.log('Expected: WINE QUESTION (because it has "Quintessa" + vintage "2015")')





