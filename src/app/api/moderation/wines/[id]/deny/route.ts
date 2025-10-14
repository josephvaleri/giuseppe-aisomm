import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/moderation/wines/:id/deny
 * Denies a wine from moderation queue and deletes the record and image
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is moderator/admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['admin', 'moderator'].includes(roleData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - moderator access required' },
        { status: 403 }
      )
    }

    // Await params for Next.js 15
    const { id } = await params
    const modId = parseInt(id)
    if (isNaN(modId)) {
      return NextResponse.json(
        { error: 'Invalid moderation ID' },
        { status: 400 }
      )
    }

    // Get moderation item
    const { data: modItem, error: fetchError } = await supabase
      .from('moderation_items_wines')
      .select('*')
      .eq('mod_id', modId)
      .single()

    if (fetchError || !modItem) {
      return NextResponse.json(
        { error: 'Moderation item not found' },
        { status: 404 }
      )
    }

    if (modItem.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item already processed' },
        { status: 400 }
      )
    }

    // Delete image from storage if exists
    if (modItem.image_key) {
      try {
        await supabase.storage
          .from('label-images')
          .remove([modItem.image_key])
      } catch (error) {
        console.error('Error deleting image:', error)
        // Continue even if image deletion fails
      }
    }

    // Update moderation item status to denied
    const { error: updateError } = await supabase
      .from('moderation_items_wines')
      .update({
        status: 'denied',
        decided_at: new Date().toISOString(),
        decided_by: user.id
      })
      .eq('mod_id', modId)

    if (updateError) {
      console.error('Error updating moderation status:', updateError)
      return NextResponse.json(
        { error: 'Failed to deny item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Wine denied and removed from moderation queue'
    })
  } catch (error) {
    console.error('Deny error:', error)
    return NextResponse.json(
      { error: 'Failed to deny wine' },
      { status: 500 }
    )
  }
}

