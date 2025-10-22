#!/usr/bin/env tsx

/**
 * Test script for the badge system
 * This script tests badge recomputation and milestone unlocking
 */

import { createClient } from '@supabase/supabase-js'
import { recomputeBadges } from '../src/lib/badges/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testBadgeSystem() {
  console.log('🧪 Testing Badge System...\n')

  try {
    // Get a test user (first user in the system)
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1)

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found in the system')
      return
    }

    const testUserId = users[0].user_id
    console.log(`👤 Testing with user: ${testUserId}`)

    // Test 1: Check current badge metrics
    console.log('\n📊 Current Badge Metrics:')
    const { data: metrics } = await supabase
      .from('v_user_badge_metrics')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    if (metrics) {
      console.log(`  • Label Scans: ${metrics.label_scans}`)
      console.log(`  • Countries Logged: ${metrics.countries_logged}`)
      console.log(`  • Wines Added: ${metrics.wines_added}`)
      console.log(`  • Tasting Notes: ${metrics.tasting_notes}`)
      console.log(`  • Correct Answers: ${metrics.correct_answers}`)
      console.log(`  • Max Area Mastery: ${metrics.max_area_mastery}`)
    } else {
      console.log('  • No metrics found (user has no activity)')
    }

    // Test 2: Check milestone status
    console.log('\n🎯 Milestone Status:')
    const { data: milestones } = await supabase
      .from('v_user_badge_milestones')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    if (milestones) {
      console.log(`  • Has First Scan: ${milestones.has_first_scan}`)
      console.log(`  • Has Pre-1980 Wine: ${milestones.has_pre_1980}`)
      console.log(`  • Has Polyglot (10+ countries): ${milestones.has_polyglot}`)
    } else {
      console.log('  • No milestone data found')
    }

    // Test 3: Recompute badges
    console.log('\n🔄 Recomputing Badges...')
    await recomputeBadges(testUserId)
    console.log('  ✅ Badge recomputation completed')

    // Test 4: Check updated badge status
    console.log('\n🏆 Updated Badge Status:')
    const { data: userBadges } = await supabase
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
      .eq('user_id', testUserId)

    if (userBadges && userBadges.length > 0) {
      userBadges.forEach(badge => {
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
      console.log('  • No badges earned yet')
    }

    // Test 5: Check badge definitions
    console.log('\n📋 Available Badge Definitions:')
    const { data: badgeDefs } = await supabase
      .from('badges')
      .select('*')
      .order('category, name')

    if (badgeDefs) {
      const categories = [...new Set(badgeDefs.map(b => b.category))]
      categories.forEach(category => {
        console.log(`  📂 ${category}:`)
        badgeDefs
          .filter(b => b.category === category)
          .forEach(badge => {
            console.log(`    • ${badge.icon_emoji} ${badge.name} (${badge.is_tiered ? 'Tiered' : 'Milestone'})`)
          })
      })
    }

    console.log('\n✅ Badge system test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testBadgeSystem()
