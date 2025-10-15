import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const avatarSchema = z.object({
  path: z.string(),
  publicUrl: z.string().url()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { path, publicUrl } = avatarSchema.parse(body)

    // Update profile details with avatar info
    const { error: updateError } = await supabase
      .from('profile_details')
      .upsert({
        user_id: user.id,
        avatar_url: publicUrl,
        avatar_storage_path: path,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Error updating avatar:', updateError)
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar update error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
