import { createServiceClient } from '@/lib/supabase/server'
import { LinearModel } from './train'
import { extractQuestionFeatures, extractRetrievalFeatures, featuresToVector } from './features'

export interface IntentScores {
  pairing: number
  region: number
  grape: number
  cellar: number
  recommendation: number
  joke: number
  non_wine: number
}

export interface RerankResult {
  chunk: string
  score: number
  originalScore: number
  doc_id?: string
}

export class MLInference {
  private rerankerModel?: LinearModel
  private routeModel?: LinearModel
  private intentModel?: LinearModel
  private featuresSchema?: any

  async loadModels(): Promise<void> {
    const supabase = createServiceClient()
    
    // Get active model versions
    const { data: settings } = await supabase
      .from('settings')
      .select('ml_active_versions')
      .single()

    if (!settings?.ml_active_versions) {
      console.warn('No active ML models found')
      return
    }

    const activeVersions = settings.ml_active_versions as Record<string, number>

    // Load models
    const modelPromises = Object.entries(activeVersions).map(async ([kind, version]) => {
      const { data: model } = await supabase
        .from('ml_models')
        .select('weights, features_schema')
        .eq('kind', kind)
        .eq('version', version)
        .single()

      if (!model) return

      const linearModel = new LinearModel(0) // Will be set with weights
      linearModel.setWeights(model.weights as any)

      switch (kind) {
        case 'reranker':
          this.rerankerModel = linearModel
          break
        case 'route':
          this.routeModel = linearModel
          break
        case 'intent':
          this.intentModel = linearModel
          break
      }

      if (!this.featuresSchema) {
        this.featuresSchema = model.features_schema
      }
    })

    await Promise.all(modelPromises)
  }

  async predictIntent(questionFeatures: QuestionFeatures): Promise<IntentScores> {
    if (!this.intentModel) {
      // Fallback to rule-based
      return {
        pairing: questionFeatures.intent_pairing ? 0.8 : 0.2,
        region: questionFeatures.intent_region ? 0.8 : 0.2,
        grape: questionFeatures.intent_grape ? 0.8 : 0.2,
        cellar: questionFeatures.intent_cellar ? 0.8 : 0.2,
        recommendation: questionFeatures.intent_recommendation ? 0.8 : 0.2,
        joke: questionFeatures.intent_joke ? 0.8 : 0.2,
        non_wine: questionFeatures.intent_non_wine ? 0.8 : 0.2
      }
    }

    const features = featuresToVector(questionFeatures)
    const scores = this.intentModel.predict(features)

    return {
      pairing: scores,
      region: scores,
      grape: scores,
      cellar: scores,
      recommendation: scores,
      joke: scores,
      non_wine: scores
    }
  }

  async rerankCandidates(
    question: string,
    candidates: Array<{ chunk: string; score: number; doc_id?: string }>,
    questionFeatures: QuestionFeatures,
    retrievalFeatures: RetrievalFeatures
  ): Promise<RerankResult[]> {
    if (!this.rerankerModel || candidates.length === 0) {
      return candidates.map(c => ({
        chunk: c.chunk,
        score: c.score,
        originalScore: c.score,
        doc_id: c.doc_id
      }))
    }

    const reranked: RerankResult[] = []

    for (const candidate of candidates) {
      // Create features for this candidate
      const candidateFeatures = {
        ...questionFeatures,
        ...retrievalFeatures,
        chunk_length: candidate.chunk.length,
        chunk_score: candidate.score
      }

      const features = featuresToVector(candidateFeatures)
      const rerankScore = this.rerankerModel.predict(features)

      reranked.push({
        chunk: candidate.chunk,
        score: rerankScore,
        originalScore: candidate.score,
        doc_id: candidate.doc_id
      })
    }

    // Sort by rerank score
    return reranked.sort((a, b) => b.score - a.score)
  }

  async predictRoute(
    questionFeatures: QuestionFeatures,
    retrievalFeatures: RetrievalFeatures,
    routeFeatures: RouteFeatures
  ): Promise<number> {
    if (!this.routeModel) {
      console.log('No route model loaded, using fallback')
      // Fallback to rule-based
      if (routeFeatures.can_answer_from_joins && retrievalFeatures.retr_top1_score > 0.7) {
        return 0.8
      }
      return 0.3
    }

    try {
      const features = featuresToVector({
        ...questionFeatures,
        ...retrievalFeatures,
        ...routeFeatures
      })

      const prediction = this.routeModel.predict(features)
      
      // Check for NaN or invalid values
      if (isNaN(prediction) || !isFinite(prediction)) {
        console.warn('ML prediction returned NaN, using fallback')
        if (routeFeatures.can_answer_from_joins && retrievalFeatures.retr_top1_score > 0.7) {
          return 0.8
        }
        return 0.3
      }
      
      return prediction
    } catch (error) {
      console.error('Error in ML prediction:', error)
      // Fallback to rule-based
      if (routeFeatures.can_answer_from_joins && retrievalFeatures.retr_top1_score > 0.7) {
        return 0.8
      }
      return 0.3
    }
  }

  async shouldRedirectNonWine(intentScores: IntentScores, threshold = 0.7): Promise<boolean> {
    return intentScores.non_wine > threshold
  }
}

// Singleton instance
let mlInference: MLInference | null = null

export async function getMLInference(): Promise<MLInference> {
  if (!mlInference) {
    mlInference = new MLInference()
    await mlInference.loadModels()
  }
  return mlInference
}
