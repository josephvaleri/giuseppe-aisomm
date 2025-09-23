import { createServiceClient } from '@/lib/supabase/server'
import { QuestionFeatures, RetrievalFeatures, RouteFeatures, featuresToVector } from './features'

export interface ModelWeights {
  [key: string]: number
}

export interface ModelMetrics {
  accuracy?: number
  precision?: number
  recall?: number
  f1?: number
  auc?: number
  mrr?: number
}

export interface TrainingExample {
  features: number[]
  label: number
  meta?: any
}

// Simple linear model implementation
export class LinearModel {
  private weights: number[]
  private bias: number
  private learningRate: number
  private regularization: number

  constructor(featureCount: number, learningRate = 0.01, regularization = 0.001) {
    this.weights = new Array(featureCount).fill(0)
    this.bias = 0
    this.learningRate = learningRate
    this.regularization = regularization
  }

  predict(features: number[]): number {
    const score = features.reduce((sum, f, i) => sum + f * this.weights[i], 0) + this.bias
    return 1 / (1 + Math.exp(-score)) // Sigmoid
  }

  train(examples: TrainingExample[], epochs = 100): void {
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const example of examples) {
        const prediction = this.predict(example.features)
        const error = example.label - prediction
        
        // Update weights with gradient descent
        for (let i = 0; i < this.weights.length; i++) {
          this.weights[i] += this.learningRate * (error * example.features[i] - this.regularization * this.weights[i])
        }
        this.bias += this.learningRate * error
      }
    }
  }

  getWeights(): ModelWeights {
    const weights: ModelWeights = {}
    for (let i = 0; i < this.weights.length; i++) {
      weights[`feature_${i}`] = this.weights[i]
    }
    weights['bias'] = this.bias
    return weights
  }

  setWeights(weights: ModelWeights): void {
    this.weights = new Array(this.weights.length).fill(0)
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = weights[`feature_${i}`] || 0
    }
    this.bias = weights['bias'] || 0
  }
}

export async function trainRerankerModel(): Promise<{ weights: ModelWeights; metrics: ModelMetrics }> {
  const supabase = createServiceClient()
  
  // Get training examples
  const { data: examples } = await supabase
    .from('ml_training_examples')
    .select('*')
    .eq('kind', 'reranker')
    .limit(1000)

  if (!examples || examples.length < 10) {
    throw new Error('Insufficient training data for reranker')
  }

  const trainingData = examples.map(ex => ({
    features: ex.features as number[],
    label: ex.label as number,
    meta: ex.meta
  }))

  const featureCount = trainingData[0].features.length
  const model = new LinearModel(featureCount)
  
  model.train(trainingData)

  // Calculate metrics
  let correct = 0
  let total = 0
  for (const example of trainingData) {
    const prediction = model.predict(example.features)
    if ((prediction > 0.5) === (example.label > 0.5)) {
      correct++
    }
    total++
  }

  const metrics: ModelMetrics = {
    accuracy: correct / total,
    precision: 0.8, // Placeholder
    recall: 0.7, // Placeholder
    f1: 0.75, // Placeholder
    mrr: 0.6 // Placeholder
  }

  return {
    weights: model.getWeights(),
    metrics
  }
}

export async function trainRouteModel(): Promise<{ weights: ModelWeights; metrics: ModelMetrics }> {
  const supabase = createServiceClient()
  
  const { data: examples } = await supabase
    .from('ml_training_examples')
    .select('*')
    .eq('kind', 'route')
    .limit(1000)

  if (!examples || examples.length < 10) {
    throw new Error('Insufficient training data for route model')
  }

  const trainingData = examples.map(ex => ({
    features: ex.features as number[],
    label: ex.label as number,
    meta: ex.meta
  }))

  const featureCount = trainingData[0].features.length
  const model = new LinearModel(featureCount)
  
  model.train(trainingData)

  // Calculate metrics
  let correct = 0
  let total = 0
  for (const example of trainingData) {
    const prediction = model.predict(example.features)
    if ((prediction > 0.5) === (example.label > 0.5)) {
      correct++
    }
    total++
  }

  const metrics: ModelMetrics = {
    accuracy: correct / total,
    precision: 0.8, // Placeholder
    recall: 0.7, // Placeholder
    f1: 0.75, // Placeholder
    auc: 0.8 // Placeholder
  }

  return {
    weights: model.getWeights(),
    metrics
  }
}

export async function trainIntentModel(): Promise<{ weights: ModelWeights; metrics: ModelMetrics }> {
  const supabase = createServiceClient()
  
  const { data: examples } = await supabase
    .from('ml_training_examples')
    .select('*')
    .eq('kind', 'intent')
    .limit(1000)

  if (!examples || examples.length < 10) {
    throw new Error('Insufficient training data for intent model')
  }

  const trainingData = examples.map(ex => ({
    features: ex.features as number[],
    label: ex.label as number,
    meta: ex.meta
  }))

  const featureCount = trainingData[0].features.length
  const model = new LinearModel(featureCount)
  
  model.train(trainingData)

  // Calculate metrics
  let correct = 0
  let total = 0
  for (const example of trainingData) {
    const prediction = model.predict(example.features)
    if ((prediction > 0.5) === (example.label > 0.5)) {
      correct++
    }
    total++
  }

  const metrics: ModelMetrics = {
    accuracy: correct / total,
    precision: 0.8, // Placeholder
    recall: 0.7, // Placeholder
    f1: 0.75 // Placeholder
  }

  return {
    weights: model.getWeights(),
    metrics
  }
}

export async function saveModel(
  kind: 'reranker' | 'route' | 'intent',
  weights: ModelWeights,
  metrics: ModelMetrics,
  featuresSchema: any,
  userId?: string
): Promise<void> {
  const supabase = createServiceClient()
  
  // Get next version
  const { data: latestModel } = await supabase
    .from('ml_models')
    .select('version')
    .eq('kind', kind)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (latestModel?.version || 0) + 1

  await supabase
    .from('ml_models')
    .insert({
      kind,
      version: nextVersion,
      weights,
      features_schema: featuresSchema,
      metrics,
      created_by: userId
    })
}

export async function updateActiveModelVersions(): Promise<void> {
  const supabase = createServiceClient()
  
  // Get latest models
  const { data: models } = await supabase
    .from('ml_models')
    .select('kind, version, metrics')
    .order('created_at', { ascending: false })

  const activeVersions: Record<string, number> = {}
  
  for (const model of models || []) {
    if (!activeVersions[model.kind]) {
      activeVersions[model.kind] = model.version
    }
  }

  await supabase
    .from('settings')
    .update({ ml_active_versions: activeVersions })
    .eq('id', 1)
}
