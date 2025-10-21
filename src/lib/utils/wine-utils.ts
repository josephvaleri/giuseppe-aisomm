/**
 * Utility functions for wine-related operations
 */

/**
 * Checks if a wine is ready to drink based on drink_starting and drink_by dates
 * @param drinkStarting - The date when the wine should start being drinkable
 * @param drinkBy - The date when the wine should be drunk by
 * @returns boolean - true if the wine is ready to drink now
 */
export function isWineReadyToDrink(drinkStarting?: string | Date, drinkBy?: string | Date): boolean {
  if (!drinkStarting || !drinkBy) {
    console.log('📅 isWineReadyToDrink: Missing dates', { drinkStarting, drinkBy })
    return false
  }

  const today = new Date()
  // Set time to start of day for accurate date comparison
  today.setHours(0, 0, 0, 0)
  
  const startDate = new Date(drinkStarting)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(drinkBy)
  endDate.setHours(0, 0, 0, 0)

  const isReady = today >= startDate && today <= endDate
  
  console.log('📅 isWineReadyToDrink calculation:', {
    drinkStarting,
    drinkBy,
    today: today.toISOString().split('T')[0],
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    isReady,
    todayStart: today >= startDate,
    todayEnd: today <= endDate
  })

  // Check if today is between start and end dates (inclusive)
  return isReady
}

/**
 * Gets the ready-to-drink status for display
 * @param drinkStarting - The date when the wine should start being drinkable
 * @param drinkBy - The date when the wine should be drunk by
 * @returns object with status and message
 */
export function getReadyToDrinkStatus(drinkStarting?: string | Date, drinkBy?: string | Date) {
  if (!drinkStarting || !drinkBy) {
    return {
      isReady: false,
      message: 'No drink window set',
      status: 'unknown'
    }
  }

  const today = new Date()
  // Set time to start of day for accurate date comparison
  today.setHours(0, 0, 0, 0)
  
  const startDate = new Date(drinkStarting)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(drinkBy)
  endDate.setHours(0, 0, 0, 0)

  console.log('Status calculation debug:', {
    drinkStarting,
    drinkBy,
    today: today.toISOString().split('T')[0],
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    todayStart: today < startDate,
    todayEnd: today > endDate
  })

  if (today < startDate) {
    return {
      isReady: false,
      message: `Not ready yet (ready from ${startDate.toLocaleDateString()})`,
      status: 'not-ready'
    }
  }

  if (today > endDate) {
    return {
      isReady: false,
      message: `Past peak (should have been drunk by ${endDate.toLocaleDateString()})`,
      status: 'past-peak'
    }
  }

  return {
    isReady: true,
    message: 'Ready to drink now!',
    status: 'ready'
  }
}
