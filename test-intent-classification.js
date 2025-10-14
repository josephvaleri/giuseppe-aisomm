#!/usr/bin/env node

// Test script to verify intent classification and "Buon appetito" logic
const { extractIntentQuestionFeatures } = require('./src/lib/ml/features.ts');

// Test cases
const testCases = [
  {
    question: "What wine pairs well with pasta?",
    expectedPairing: true,
    description: "Direct food pairing question - should have high pairing intent"
  },
  {
    question: "What is Chianti wine?",
    expectedPairing: false,
    description: "General wine question - should have low pairing intent"
  },
  {
    question: "What food goes well with Pinot Noir?",
    expectedPairing: true,
    description: "Food pairing question - should have high pairing intent"
  },
  {
    question: "Tell me about Italian wine regions",
    expectedPairing: false,
    description: "Regional wine question - should have low pairing intent"
  },
  {
    question: "What's the best wine to serve with steak?",
    expectedPairing: true,
    description: "Food pairing question - should have high pairing intent"
  },
  {
    question: "How do I store wine in my cellar?",
    expectedPairing: false,
    description: "Cellar/storage question - should have low pairing intent"
  }
];

console.log('Testing Intent Classification for "Buon appetito" Logic\n');
console.log('=' * 60);

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`Question: "${testCase.question}"`);
  
  try {
    const features = extractIntentQuestionFeatures(testCase.question);
    const hasPairingIntent = features.intent_pairing > 0;
    const pairingScore = features.intent_pairing;
    
    console.log(`Intent Pairing Score: ${pairingScore}`);
    console.log(`Has Pairing Intent: ${hasPairingIntent}`);
    console.log(`Expected Pairing Intent: ${testCase.expectedPairing}`);
    
    const passed = hasPairingIntent === testCase.expectedPairing;
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) {
      console.log(`✅ "Buon appetito" will ${testCase.expectedPairing ? 'appear' : 'NOT appear'} - Correct!`);
    } else {
      console.log(`❌ "Buon appetito" will ${hasPairingIntent ? 'incorrectly appear' : 'incorrectly NOT appear'} - Wrong!`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
});

console.log('\n' + '=' * 60);
console.log('Test completed. Check results above to verify intent classification works correctly.');


