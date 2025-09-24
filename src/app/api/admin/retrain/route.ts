import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trainRerankerModel, trainRouteModel, trainIntentModel, saveModel, updateActiveModelVersions } from '@/lib/ml/train'
import { featuresToVector } from '@/lib/ml/features'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Train models
    const [rerankerResult, routeResult, intentResult] = await Promise.all([
      trainRerankerModel().catch(err => {
        console.error('Reranker training failed:', err)
        return null
      }),
      trainRouteModel().catch(err => {
        console.error('Route training failed:', err)
        return null
      }),
      trainIntentModel().catch(err => {
        console.error('Intent training failed:', err)
        return null
      })
    ])

    const results = []

    // Save successful models
    if (rerankerResult) {
      await saveModel('reranker', rerankerResult.weights, rerankerResult.metrics, {
        featureCount: Object.keys(rerankerResult.weights).length - 1 // -1 for bias
      }, user.id)
      results.push('Reranker model trained successfully')
    }

    if (routeResult) {
      await saveModel('route', routeResult.weights, routeResult.metrics, {
        featureCount: Object.keys(routeResult.weights).length - 1
      }, user.id)
      results.push('Route model trained successfully')
    }

    if (intentResult) {
      await saveModel('intent', intentResult.weights, intentResult.metrics, {
        featureCount: Object.keys(intentResult.weights).length - 1
      }, user.id)
      results.push('Intent model trained successfully')
    }

    // Update active model versions
    await updateActiveModelVersions()

    return NextResponse.json({
      success: true,
      results,
      message: `Training completed. ${results.length} models updated.`
    })

  } catch (error) {
    console.error('Retrain API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
