import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { combinedProfileSchema } from '@/lib/zod/profile'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Get or create profile details
    const { data: details, error: detailsError } = await supabase
      .from('profile_details')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (detailsError && detailsError.code !== 'PGRST116') {
      console.error('Error fetching profile details:', detailsError)
      return NextResponse.json({ error: 'Failed to fetch profile details' }, { status: 500 })
    }

    // Get or create taste preferences
    const { data: taste, error: tasteError } = await supabase
      .from('profile_taste_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (tasteError && tasteError.code !== 'PGRST116') {
      console.error('Error fetching taste preferences:', tasteError)
      return NextResponse.json({ error: 'Failed to fetch taste preferences' }, { status: 500 })
    }

    return NextResponse.json({
      profile,
      details: details || {
        user_id: user.id,
        preferred_name: null,
        phone: null,
        experience: 'newbie',
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        people_count: 1,
        share_cellar: false,
        avatar_url: null,
        avatar_storage_path: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      taste: taste || {
        user_id: user.id,
        styles: [],
        colors: [],
        grapes: [],
        regions: [],
        sweetness: 2,
        acidity: 6,
        tannin: 4,
        body: 5,
        oak: 3,
        price_min: 10,
        price_max: 50,
        old_world_bias: 0,
        sparkling_preference: false,
        natural_pref: false,
        organic_pref: false,
        biodynamic_pref: false,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = combinedProfileSchema.parse(body)

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: validatedData.profile.full_name,
        email: validatedData.profile.email,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Upsert profile details
    const { error: detailsError } = await supabase
      .from('profile_details')
      .upsert({
        user_id: user.id,
        ...validatedData.details,
        updated_at: new Date().toISOString()
      })

    if (detailsError) {
      console.error('Error updating profile details:', detailsError)
      return NextResponse.json({ error: 'Failed to update profile details' }, { status: 500 })
    }

    // Upsert taste preferences
    const { error: tasteError } = await supabase
      .from('profile_taste_preferences')
      .upsert({
        user_id: user.id,
        ...validatedData.taste,
        updated_at: new Date().toISOString()
      })

    if (tasteError) {
      console.error('Error updating taste preferences:', tasteError)
      return NextResponse.json({ error: 'Failed to update taste preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
