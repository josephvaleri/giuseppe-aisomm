#!/usr/bin/env tsx

/**
 * Test script to manually trigger badge recomputation
 * This will test the badge engine directly
 */

import { createClient } from '@supabase/supabase-js'
import { recomputeBadges } from '../src/lib/badges/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testBadgeRecomputation() {
  console.log('🧪 Testing Badge Recomputation...\n')

  const userId = 'c837e6dc-f372-463d-abe7-393d70b50658'

  try {
    // Check current data
    console.log('📊 Checking current data...')
    
    const { data: metrics } = await supabase
      .from('v_user_badge_metrics')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('User metrics:', metrics)

    const { data: milestones } = await supabase
      .from('v_user_badge_milestones')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('User milestones:', milestones)

    // Check current badges
    console.log('\n🏆 Current badges:')
    const { data: currentBadges } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (
          badge_code,
          name,
          category,
          icon_emoji,
          description,
          is_tiered
        )
      `)
      .eq('user_id', userId)

    if (currentBadges && currentBadges.length > 0) {
      currentBadges.forEach(badge => {
        const badgeInfo = badge.badges
        if (badgeInfo) {
          console.log(`  • ${badgeInfo.icon_emoji} ${badgeInfo.name} (${badgeInfo.category})`)
          if (badgeInfo.is_tiered) {
            console.log(`    - Current: ${badge.current_value}, Tier: ${badge.current_tier}, Best: ${badge.best_tier}`)
          } else {
            console.log(`    - Status: ${badge.current_tier > 0 ? 'Unlocked' : 'Locked'}`)
          }
        }
      })
    } else {
      console.log('  • No badges found')
    }

    // Trigger recomputation
    console.log('\n🔄 Triggering badge recomputation...')
    await recomputeBadges(userId)
    console.log('  ✅ Badge recomputation completed')

    // Check updated badges
    console.log('\n🏆 Updated badges:')
    const { data: updatedBadges } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (
          badge_code,
          name,
          category,
          icon_emoji,
          description,
          is_tiered
        )
      `)
      .eq('user_id', userId)

    if (updatedBadges && updatedBadges.length > 0) {
      updatedBadges.forEach(badge => {
        const badgeInfo = badge.badges
        if (badgeInfo) {
          console.log(`  • ${badgeInfo.icon_emoji} ${badgeInfo.name} (${badgeInfo.category})`)
          if (badgeInfo.is_tiered) {
            console.log(`    - Current: ${badge.current_value}, Tier: ${badge.current_tier}, Best: ${badge.best_tier}`)
          } else {
            console.log(`    - Status: ${badge.current_tier > 0 ? 'Unlocked' : 'Locked'}`)
          }
        }
      })
    } else {
      console.log('  • Still no badges found - there may be an issue with the badge engine')
    }

    console.log('\n✅ Badge recomputation test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testBadgeRecomputation()
