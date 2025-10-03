// Test script for the trial system logic
// Run with: node test-trial-system.js

// Test trial status detection logic
function checkTrialStatus(trialEndDate, currentDate = new Date()) {
  const trialEnd = new Date(trialEndDate)
  const now = new Date(currentDate)
  
  const isExpired = trialEnd < now
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isLastDay = daysRemaining === 1
  
  return {
    isExpired,
    isLastDay,
    daysRemaining
  }
}

// Test cases
const testCases = [
  {
    name: "Trial expired yesterday",
    trialEndDate: "2024-01-01",
    currentDate: "2024-01-02",
    expectedExpired: true,
    expectedLastDay: false
  },
  {
    name: "Trial expires today (last day)",
    trialEndDate: "2024-01-02",
    currentDate: "2024-01-01",
    expectedExpired: false,
    expectedLastDay: true
  },
  {
    name: "Trial has 3 days left",
    trialEndDate: "2024-01-05",
    currentDate: "2024-01-02",
    expectedExpired: false,
    expectedLastDay: false
  },
  {
    name: "Trial expires in 2 days",
    trialEndDate: "2024-01-04",
    currentDate: "2024-01-02",
    expectedExpired: false,
    expectedLastDay: false
  }
]

console.log('Testing Trial System Logic:')
console.log('============================')

testCases.forEach((testCase, index) => {
  const result = checkTrialStatus(testCase.trialEndDate, testCase.currentDate)
  
  console.log(`\n${index + 1}. ${testCase.name}`)
  console.log(`   Trial End: ${testCase.trialEndDate}`)
  console.log(`   Current: ${testCase.currentDate}`)
  console.log(`   Days Remaining: ${result.daysRemaining}`)
  console.log(`   Is Expired: ${result.isExpired} (expected: ${testCase.expectedExpired})`)
  console.log(`   Is Last Day: ${result.isLastDay} (expected: ${testCase.expectedLastDay})`)
  
  const expiredMatch = result.isExpired === testCase.expectedExpired
  const lastDayMatch = result.isLastDay === testCase.expectedLastDay
  
  console.log(`   ✅ Expired: ${expiredMatch ? 'PASS' : 'FAIL'}`)
  console.log(`   ✅ Last Day: ${lastDayMatch ? 'PASS' : 'FAIL'}`)
})

console.log('\n\nExpected Behavior:')
console.log('- Expired trials: Show "Giuseppe is sorry but your free trial has ended..."')
console.log('- Last day: Show "Today is the last day of your free trial. Click here to sign up"')
console.log('- Active trials: Allow normal access')
