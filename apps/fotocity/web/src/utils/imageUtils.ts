/**
 * Image processing utilities for FotoCity
 * - HEIC to JPEG conversion
 * - Smart upscaling for low-resolution images
 */

import heic2any from 'heic2any'

/**
 * Check if file is HEIC format
 */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  )
}

/**
 * Convert HEIC file to JPEG
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    // Timeout after 30 seconds for large files
    const conversionPromise = heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Conversão HEIC demorou demais')), 30000)
    )

    const blob = await Promise.race([conversionPromise, timeoutPromise])

    // heic2any can return array or single blob
    const resultBlob = Array.isArray(blob) ? blob[0] : blob

    // Create new file with .jpg extension
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    return new File([resultBlob], newName, { type: 'image/jpeg' })
  } catch (error) {
    console.error('HEIC conversion failed for', file.name, ':', error)
    throw new Error(`Falha ao converter ${file.name} (HEIC). Tente converter para JPG antes de enviar.`)
  }
}

/**
 * Load image from file and get its dimensions
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

/**
 * Apply sharpening filter to image data
 */
function sharpenImageData(imageData: ImageData, strength: number = 0.3): void {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  // Unsharp mask kernel
  const kernel = [
    0, -strength, 0,
    -strength, 1 + 4 * strength, -strength,
    0, -strength, 0,
  ]

  const result = new Uint8ClampedArray(data)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c
            const ki = (ky + 1) * 3 + (kx + 1)
            sum += data[idx] * kernel[ki]
          }
        }
        result[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum))
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = result[i]
  }
}

/**
 * High-quality upscale using multi-step approach with sharpening
 * This produces better results than single-step bicubic interpolation
 */
export async function upscaleImage(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  const srcWidth = img.naturalWidth
  const srcHeight = img.naturalHeight

  // Calculate scale factor
  const scaleX = targetWidth / srcWidth
  const scaleY = targetHeight / srcHeight
  const scale = Math.max(scaleX, scaleY)

  // If no upscaling needed, return original
  if (scale <= 1) {
    const canvas = document.createElement('canvas')
    canvas.width = srcWidth
    canvas.height = srcHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        0.95
      )
    })
  }

  // Multi-step upscaling for better quality
  // Each step is max 2x to avoid artifacts
  let currentCanvas = document.createElement('canvas')
  currentCanvas.width = srcWidth
  currentCanvas.height = srcHeight
  let currentCtx = currentCanvas.getContext('2d')!
  currentCtx.drawImage(img, 0, 0)

  let currentWidth = srcWidth
  let currentHeight = srcHeight

  while (currentWidth < targetWidth || currentHeight < targetHeight) {
    // Calculate next step size (max 2x)
    const stepScale = Math.min(2, Math.max(targetWidth / currentWidth, targetHeight / currentHeight))
    const nextWidth = Math.min(targetWidth, Math.round(currentWidth * stepScale))
    const nextHeight = Math.min(targetHeight, Math.round(currentHeight * stepScale))

    // Create new canvas for this step
    const nextCanvas = document.createElement('canvas')
    nextCanvas.width = nextWidth
    nextCanvas.height = nextHeight
    const nextCtx = nextCanvas.getContext('2d')!

    // Use high-quality scaling
    nextCtx.imageSmoothingEnabled = true
    nextCtx.imageSmoothingQuality = 'high'
    nextCtx.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight)

    // Apply sharpening to reduce blur from interpolation
    // Stronger sharpening for larger upscales
    const sharpenStrength = 0.2 + (stepScale - 1) * 0.15
    const imageData = nextCtx.getImageData(0, 0, nextWidth, nextHeight)
    sharpenImageData(imageData, sharpenStrength)
    nextCtx.putImageData(imageData, 0, 0)

    currentCanvas = nextCanvas
    currentWidth = nextWidth
    currentHeight = nextHeight
  }

  return new Promise((resolve, reject) => {
    currentCanvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/jpeg',
      0.95
    )
  })
}

/**
 * Check if image needs upscaling for the target print size
 * Returns the recommended minimum resolution for good print quality
 */
export function checkResolutionQuality(
  imgWidth: number,
  imgHeight: number,
  targetWidthPx: number,
  targetHeightPx: number
): {
  needsUpscale: boolean
  quality: 'excellent' | 'good' | 'acceptable' | 'low'
  currentDPI: number
  recommendedDPI: number
} {
  // Calculate effective DPI if image were used at target size
  const scaleX = imgWidth / targetWidthPx
  const scaleY = imgHeight / targetHeightPx
  const scale = Math.min(scaleX, scaleY)

  // Base DPI is 300, scale represents how much larger the source is
  const effectiveDPI = Math.round(300 * scale)

  let quality: 'excellent' | 'good' | 'acceptable' | 'low'
  let needsUpscale = false

  if (effectiveDPI >= 300) {
    quality = 'excellent'
  } else if (effectiveDPI >= 250) {
    quality = 'good'
  } else if (effectiveDPI >= 200) {
    quality = 'acceptable'
    needsUpscale = true
  } else {
    quality = 'low'
    needsUpscale = true
  }

  return {
    needsUpscale,
    quality,
    currentDPI: effectiveDPI,
    recommendedDPI: 300,
  }
}

/**
 * Process image file - converts HEIC and handles basic validation
 * Returns the processed file and a data URL for preview
 */
export async function processImageFile(
  file: File,
  onProgress?: (status: string) => void
): Promise<{ file: File; dataUrl: string }> {
  let processedFile = file

  // Convert HEIC to JPEG if needed
  if (isHeicFile(file)) {
    onProgress?.('Convertendo HEIC para JPEG...')
    processedFile = await convertHeicToJpeg(file)
  }

  // Create data URL for preview
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(processedFile)
  })

  return { file: processedFile, dataUrl }
}

/**
 * Upscale image if needed for print quality
 * This should be called before final render
 */
export async function upscaleForPrint(
  img: HTMLImageElement,
  targetWidthPx: number,
  targetHeightPx: number,
  onProgress?: (status: string) => void
): Promise<HTMLImageElement> {
  // Calculate scale needed to reach target print dimensions
  const scaleNeeded = Math.max(
    targetWidthPx / img.naturalWidth,
    targetHeightPx / img.naturalHeight
  )

  // No upscaling needed if image is already large enough
  if (scaleNeeded <= 1.05) {
    return img
  }

  const currentDPI = Math.round(300 / scaleNeeded)
  onProgress?.(`Melhorando resolução (${currentDPI} DPI → 300 DPI)...`)

  // Don't upscale more than 4x to avoid too much quality loss
  const maxScale = 4
  const actualScale = Math.min(scaleNeeded, maxScale)

  const newWidth = Math.round(img.naturalWidth * actualScale)
  const newHeight = Math.round(img.naturalHeight * actualScale)

  const blob = await upscaleImage(img, newWidth, newHeight)

  // Convert blob back to HTMLImageElement
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const newImg = new Image()
    newImg.onload = () => {
      URL.revokeObjectURL(url)
      resolve(newImg)
    }
    newImg.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load upscaled image'))
    }
    newImg.src = url
  })
}
