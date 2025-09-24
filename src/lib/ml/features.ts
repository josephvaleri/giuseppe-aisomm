/**
 * Feature extraction functions for ML training
 */

export function extractQuestionFeatures(question: string) {
  const lowerQuestion = question.toLowerCase()
  
  // Wine-related keywords
  const wineKeywords = [
    'wine', 'grape', 'vineyard', 'vintage', 'bottle', 'cellar', 'sommelier',
    'chardonnay', 'cabernet', 'merlot', 'pinot', 'sauvignon', 'riesling',
    'tannin', 'acidity', 'bouquet', 'aroma', 'flavor', 'taste', 'pairing',
    'region', 'appellation', 'terroir', 'fermentation', 'aging', 'oak',
    'sparkling', 'champagne', 'prosecco', 'port', 'sherry', 'dessert wine',
    'italy', 'france', 'spain', 'california', 'napa', 'tuscany', 'burgundy',
    'bordeaux', 'rioja', 'chianti', 'barolo', 'brunello', 'amarone'
  ]
  
  const wineKeywordCount = wineKeywords.filter(keyword => 
    lowerQuestion.includes(keyword)
  ).length
  
  // Food pairing keywords
  const foodKeywords = [
    'pair', 'go well', 'match', 'food', 'cheese', 'meat', 'fish', 'poultry',
    'pasta', 'pizza', 'steak', 'seafood', 'dessert', 'appetizer'
  ]
  
  const foodKeywordCount = foodKeywords.filter(keyword => 
    lowerQuestion.includes(keyword)
  ).length
  
  // Question type indicators
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
  const questionWordCount = questionWords.filter(word => 
    lowerQuestion.startsWith(word)
  ).length
  
  // Technical wine terms
  const technicalTerms = [
    'tannin', 'acidity', 'ph', 'alcohol', 'sugar', 'residual', 'malolactic',
    'fermentation', 'yeast', 'barrel', 'oak', 'aging', 'bottle', 'cork',
    'decant', 'aerate', 'temperature', 'serving'
  ]
  
  const technicalTermCount = technicalTerms.filter(term => 
    lowerQuestion.includes(term)
  ).length
  
  // Geographic indicators
  const geographicTerms = [
    'region', 'country', 'appellation', 'terroir', 'climate', 'soil',
    'italy', 'france', 'spain', 'germany', 'portugal', 'australia',
    'california', 'oregon', 'washington', 'chile', 'argentina', 'south africa'
  ]
  
  const geographicTermCount = geographicTerms.filter(term => 
    lowerQuestion.includes(term)
  ).length
  
  return {
    question_length: question.length,
    word_count: question.split(' ').length,
    wine_keywords: wineKeywordCount,
    food_keywords: foodKeywordCount,
    question_words: questionWordCount,
    technical_terms: technicalTermCount,
    geographic_terms: geographicTermCount,
    has_question_mark: question.includes('?') ? 1 : 0,
    is_question: questionWordCount > 0 ? 1 : 0,
    complexity_score: wineKeywordCount + technicalTermCount + geographicTermCount
  }
}

export function extractRetrievalFeatures(question: string, answer: string, source: string) {
  const questionFeatures = extractQuestionFeatures(question)
  
  return {
    ...questionFeatures,
    answer_length: answer.length,
    answer_word_count: answer.split(' ').length,
    source_type: source === 'db' ? 1 : 0,
    has_italian_phrases: answer.includes('*(') ? 1 : 0,
    has_grape_links: answer.includes('grape-link') ? 1 : 0,
    has_html_formatting: answer.includes('<') ? 1 : 0,
    has_bold_text: answer.includes('**') ? 1 : 0,
    has_list_formatting: answer.includes('•') || answer.includes('-') ? 1 : 0,
    confidence_indicators: {
      has_specific_grape_names: /chardonnay|cabernet|merlot|pinot|riesling/i.test(answer) ? 1 : 0,
      has_region_names: /tuscany|burgundy|bordeaux|napa|rioja/i.test(answer) ? 1 : 0,
      has_vintage_info: /\d{4}/.test(answer) ? 1 : 0,
      has_producer_names: /producer|winery|estate|chateau/i.test(answer) ? 1 : 0
    }
  }
}

export function extractIntentFeatures(question: string) {
  const lowerQuestion = question.toLowerCase()
  
  // Intent classification features
  const intents = {
    wine_recommendation: [
      'recommend', 'suggest', 'best', 'good', 'favorite', 'prefer'
    ],
    food_pairing: [
      'pair', 'go well', 'match', 'food', 'cheese', 'meat', 'dinner'
    ],
    educational: [
      'what is', 'explain', 'tell me about', 'learn', 'understand'
    ],
    comparison: [
      'compare', 'difference', 'vs', 'versus', 'better', 'best'
    ],
    technical: [
      'tannin', 'acidity', 'ph', 'fermentation', 'aging', 'barrel'
    ],
    geographic: [
      'region', 'country', 'from', 'where', 'appellation', 'terroir', 'tuscany', 'italy', 'france', 'spain'
    ],
    shopping: [
      'buy', 'purchase', 'price', 'cost', 'store', 'shop'
    ]
  }
  
  const intentScores = {}
  for (const [intent, keywords] of Object.entries(intents)) {
    intentScores[intent] = keywords.filter(keyword => 
      lowerQuestion.includes(keyword)
    ).length
  }
  
  return {
    ...extractQuestionFeatures(question),
    intent_scores: intentScores,
    primary_intent: Object.entries(intentScores).reduce((a, b) => 
      intentScores[a[0]] > intentScores[b[0]] ? a : b
    )[0],
    is_wine_related: intentScores.wine_recommendation + 
                    intentScores.food_pairing + 
                    intentScores.educational + 
                    intentScores.technical + 
                    intentScores.geographic > 0 ? 1 : 0
  }
}

export function featuresToVector(features: any): number[] {
  if (Array.isArray(features)) {
    return features
  }
  
  // Convert object features to array
  return [
    features.question_length || 0,
    features.word_count || 0,
    features.wine_keywords || 0,
    features.food_keywords || 0,
    features.technical_terms || 0,
    features.geographic_terms || 0,
    features.complexity_score || 0,
    features.is_question ? 1 : 0
  ]
}

export function loadEntityDictionaries() {
  // Placeholder function - can be implemented later
  return {}
}

export function extractRouteFeatures(questionFeatures: any, retrievalFeatures: any, canAnswer: boolean) {
  return [
    questionFeatures.wine_keywords || 0,
    questionFeatures.technical_terms || 0,
    questionFeatures.geographic_terms || 0,
    questionFeatures.complexity_score || 0,
    canAnswer ? 1 : 0,
    questionFeatures.is_question ? 1 : 0
  ]
}