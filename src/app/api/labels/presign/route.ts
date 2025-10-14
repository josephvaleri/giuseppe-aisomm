import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/labels/presign
 * Generates a presigned upload URL for label image
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error in presign:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { mimeType = 'image/jpeg' } = body

    console.log('Presign request:', { userId: user.id, mimeType })

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Invalid image type. Allowed: JPEG, PNG, WebP' },
        { status: 400 }
      )
    }

    // Generate unique key for this upload
    const ext = mimeType.split('/')[1]
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 12)
    const imageKey = `${user.id}/${timestamp}-${randomId}.${ext}`

    console.log('Attempting to create signed upload URL for:', imageKey)

    // Generate presigned upload URL (expires in 5 minutes)
    const { data, error } = await supabase.storage
      .from('label-images')
      .createSignedUploadUrl(imageKey)

    if (error) {
      console.error('Error creating signed URL:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: `Failed to create upload URL: ${error.message}`, details: error },
        { status: 500 }
      )
    }

    console.log('Signed URL created successfully')

    return NextResponse.json({
      imageKey,
      uploadUrl: data.signedUrl,
      expiresIn: 300 // 5 minutes
    })
  } catch (error) {
    console.error('Presign error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

