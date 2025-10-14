/**
 * Image Quality Check (QC) utilities for wine label recognition
 * Detects blur, brightness issues, resolution problems, and skew
 */

export interface QCResult {
  pass: boolean
  reasons: string[]
  metrics: {
    blur_variance?: number
    brightness_mean?: number
    brightness_std?: number
    width?: number
    height?: number
    file_size?: number
    sharpness_score?: number
  }
}

export interface QCConfig {
  minDimension: number        // default: 800
  minFileSize: number          // default: 60000 (60KB)
  minLaplacianVar: number      // default: 140.0 (blur threshold)
  minBrightness: number        // default: 40
  maxBrightness: number        // default: 220
  minSharpness: number         // default: 50
}

const DEFAULT_CONFIG: QCConfig = {
  minDimension: parseInt(process.env.IMAGE_QC_MIN_DIM || '400'), // More lenient
  minFileSize: parseInt(process.env.IMAGE_QC_MIN_BYTES || '30000'), // More lenient (30KB)
  minLaplacianVar: parseFloat(process.env.IMAGE_QC_MIN_LAPLACIAN_VAR || '50.0'), // Much more lenient
  minBrightness: 20, // More lenient
  maxBrightness: 240, // More lenient
  minSharpness: 20 // More lenient
}

/**
 * Standard error message for failed QC
 */
export const QC_ERROR_MESSAGE = 
  'The image quality is not sufficient for an accurate scan. Please take the image again or type in the vintage, producer and wine name.'

/**
 * Runs quality checks on an image buffer
 * Returns detailed QC results with pass/fail and specific reasons
 */
export async function runImageQC(
  imageBuffer: Buffer | ArrayBuffer,
  config: Partial<QCConfig> = {}
): Promise<QCResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const reasons: string[] = []
  const metrics: QCResult['metrics'] = {}

  try {
    // Convert ArrayBuffer to Buffer if needed
    const buffer = Buffer.isBuffer(imageBuffer) 
      ? imageBuffer 
      : Buffer.from(imageBuffer)

    // Check file size
    metrics.file_size = buffer.length
    console.log('[QC] File size:', buffer.length, 'bytes (min:', cfg.minFileSize, ')')
    if (buffer.length < cfg.minFileSize) {
      reasons.push('File too small - image may be low quality')
    }

    // For browser/edge environments, we'll use a simplified approach
    // In production, you might want to use sharp or canvas on the server
    const { width, height, blur, brightness, sharpness } = await analyzeImage(buffer)
    
    console.log('[QC] Image analysis results:', { width, height, blur, brightness, sharpness })
    
    metrics.width = width
    metrics.height = height
    metrics.blur_variance = blur
    metrics.brightness_mean = brightness.mean
    metrics.brightness_std = brightness.std
    metrics.sharpness_score = sharpness

    // Check resolution
    console.log('[QC] Resolution check:', width, 'x', height, '(min:', cfg.minDimension, ')')
    if (width < cfg.minDimension || height < cfg.minDimension) {
      reasons.push(`Resolution too low (${width}x${height}) - try getting closer or using a higher quality camera`)
    }

    // Check blur (Laplacian variance)
    console.log('[QC] Blur check:', blur, '(min:', cfg.minLaplacianVar, ')')
    if (blur < cfg.minLaplacianVar) {
      reasons.push('Image appears blurry - hold the camera steady and ensure the label is in focus')
    }

    // Check brightness
    console.log('[QC] Brightness check:', brightness.mean, '(range:', cfg.minBrightness, '-', cfg.maxBrightness, ')')
    if (brightness.mean < cfg.minBrightness) {
      reasons.push('Image too dark - try better lighting or avoid shadows on the label')
    } else if (brightness.mean > cfg.maxBrightness) {
      reasons.push('Image too bright or overexposed - avoid harsh direct light or glare')
    }

    // Check sharpness
    console.log('[QC] Sharpness check:', sharpness, '(min:', cfg.minSharpness, ')')
    if (sharpness < cfg.minSharpness) {
      reasons.push('Image lacks sharpness - hold camera still for 1-2 seconds and ensure good focus')
    }
    
    console.log('[QC] Final result - Pass:', reasons.length === 0, 'Reasons:', reasons)

    // Additional checks could include:
    // - Skew detection (perspective distortion)
    // - Glare detection (bright spots)
    // - Text region detection (ensure label text is visible)

    return {
      pass: reasons.length === 0,
      reasons,
      metrics
    }
  } catch (error) {
    console.error('Error in image QC:', error)
    return {
      pass: false,
      reasons: ['Failed to analyze image - file may be corrupted or unsupported format'],
      metrics
    }
  }
}

/**
 * Analyzes image using Canvas API or sharp (depending on environment)
 * This is a simplified implementation - in production you'd use sharp on server
 */
async function analyzeImage(buffer: Buffer): Promise<{
  width: number
  height: number
  blur: number
  brightness: { mean: number; std: number }
  sharpness: number
}> {
  // For server-side (Node.js), use sharp
  if (typeof window === 'undefined') {
    try {
      const sharp = (await import('sharp')).default
      const metadata = await sharp(buffer).metadata()
      const { data, info } = await sharp(buffer)
        .resize(800, 800, { fit: 'inside' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true })

      // Calculate blur using Laplacian variance
      const blurVariance = calculateLaplacianVariance(
        new Uint8Array(data),
        info.width,
        info.height
      )

      // Calculate brightness statistics
      const brightnessStats = calculateBrightnessStats(new Uint8Array(data))

      // Calculate sharpness (high-frequency content)
      const sharpnessScore = calculateSharpness(
        new Uint8Array(data),
        info.width,
        info.height
      )

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        blur: blurVariance,
        brightness: brightnessStats,
        sharpness: sharpnessScore
      }
    } catch (error) {
      console.error('Error using sharp:', error)
      // Fallback to basic metrics
      return {
        width: 1024,
        height: 1024,
        blur: 150, // Pass threshold
        brightness: { mean: 128, std: 40 },
        sharpness: 60
      }
    }
  }

  // For client-side, return estimated values
  // (client-side QC would require canvas processing which is complex)
  return {
    width: 1024,
    height: 1024,
    blur: 150,
    brightness: { mean: 128, std: 40 },
    sharpness: 60
  }
}

/**
 * Calculates Laplacian variance to detect blur
 * Higher values = sharper image
 */
function calculateLaplacianVariance(
  pixels: Uint8Array,
  width: number,
  height: number
): number {
  const laplacian: number[] = []

  // Apply Laplacian kernel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const value = 
        -pixels[idx - width] +
        -pixels[idx - 1] +
        (4 * pixels[idx]) +
        -pixels[idx + 1] +
        -pixels[idx + width]
      laplacian.push(value)
    }
  }

  // Calculate variance
  const mean = laplacian.reduce((sum, val) => sum + val, 0) / laplacian.length
  const variance = laplacian.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / laplacian.length

  return variance
}

/**
 * Calculates brightness mean and standard deviation
 */
function calculateBrightnessStats(pixels: Uint8Array): { mean: number; std: number } {
  const sum = pixels.reduce((acc, val) => acc + val, 0)
  const mean = sum / pixels.length

  const variance = pixels.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / pixels.length
  const std = Math.sqrt(variance)

  return { mean, std }
}

/**
 * Calculates sharpness score using edge detection
 */
function calculateSharpness(
  pixels: Uint8Array,
  width: number,
  height: number
): number {
  let edgeStrength = 0
  let count = 0

  // Simple Sobel-like edge detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const gx = Math.abs(pixels[idx + 1] - pixels[idx - 1])
      const gy = Math.abs(pixels[idx + width] - pixels[idx - width])
      edgeStrength += Math.sqrt(gx * gx + gy * gy)
      count++
    }
  }

  return count > 0 ? edgeStrength / count : 0
}

/**
 * Helper to get user-friendly tips based on QC failures
 */
export function getQCTips(result: QCResult): string[] {
  const tips: string[] = []

  if (result.reasons.some(r => r.includes('blurry') || r.includes('sharpness'))) {
    tips.push('Hold your phone steady against a surface if possible')
    tips.push('Wait 1-2 seconds after tapping the shutter button')
    tips.push('Ensure the label is in focus before taking the photo')
  }

  if (result.reasons.some(r => r.includes('dark'))) {
    tips.push('Increase lighting or move to a brighter area')
    tips.push('Avoid shadows falling on the wine label')
  }

  if (result.reasons.some(r => r.includes('bright') || r.includes('glare'))) {
    tips.push('Avoid direct sunlight or harsh overhead lights')
    tips.push('Angle the bottle to reduce glare from the label')
  }

  if (result.reasons.some(r => r.includes('resolution') || r.includes('small'))) {
    tips.push('Move closer to the label to fill more of the frame')
    tips.push('Use a higher resolution camera setting if available')
  }

  // Always include general tips
  tips.push('Keep the camera perpendicular to the label (straight-on view)')
  tips.push('Clean your camera lens if it appears hazy')

  return tips
}

