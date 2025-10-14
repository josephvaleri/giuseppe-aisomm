// Test feature extraction functions
const { extractQuestionFeatures, extractRetrievalFeatures, extractIntentFeatures } = require('./src/lib/ml/features.ts')

// Test questions
const testQuestions = [
  "What wines go well with cheese?",
  "Tell me about Chardonnay grapes",
  "What is the difference between Cabernet and Merlot?",
  "What grapes are used in Tuscany?",
  "How do I store wine properly?"
]

console.log("Testing feature extraction...\n")

testQuestions.forEach((question, index) => {
  console.log(`Question ${index + 1}: "${question}"`)
  
  const questionFeatures = extractQuestionFeatures(question)
  console.log("Question features:", questionFeatures)
  
  const intentFeatures = extractIntentFeatures(question)
  console.log("Intent features:", intentFeatures)
  
  console.log("---")
})








