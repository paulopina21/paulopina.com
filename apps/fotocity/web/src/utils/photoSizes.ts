// Photo size utilities - calculates aspect ratios for different photo formats

export interface PhotoSizeInfo {
  width: number
  height: number
  aspectRatio: number // width / height
  orientation: 'square' | 'portrait' | 'landscape'
  isPolaroid: boolean
}

// Parse size string like "10x15", "Polaroid 8x10", "8x8" etc.
export function parsePhotoSize(sizeStr: string): PhotoSizeInfo | null {
  if (!sizeStr) return null

  const isPolaroid = sizeStr.toLowerCase().includes('polaroid')

  // Extract dimensions
  const match = sizeStr.match(/(\d+)\s*x\s*(\d+)/i)
  if (!match) return null

  const width = parseInt(match[1], 10)
  const height = parseInt(match[2], 10)

  // For Polaroid, the format is actually 8cm wide x 10cm tall (portrait)
  // For regular sizes like 10x15, first number is smaller dimension
  // 10x15 means 10cm x 15cm which is landscape (width > height)

  let orientation: 'square' | 'portrait' | 'landscape'
  let aspectRatio: number

  if (isPolaroid) {
    // Polaroid 8x10: 8cm wide, 10cm tall (but photo area is square, margin is bottom)
    // For display purposes, show as portrait 8:10
    aspectRatio = 8 / 10
    orientation = 'portrait'
  } else if (width === height) {
    aspectRatio = 1
    orientation = 'square'
  } else if (width < height) {
    // 9x12 = 9cm x 12cm = portrait
    aspectRatio = width / height
    orientation = 'portrait'
  } else {
    // Shouldn't happen with current sizes, but handle it
    aspectRatio = width / height
    orientation = 'landscape'
  }

  return {
    width,
    height,
    aspectRatio,
    orientation,
    isPolaroid,
  }
}

// Extract size from product ID string like "2025-01-28_22-30_Polaroid8x10" or "2025-01-28_22-30_10x15"
export function extractSizeFromProductId(productId: string): string | null {
  // Try to match size patterns
  const polaroidMatch = productId.match(/Polaroid\s*(\d+x\d+)/i)
  if (polaroidMatch) {
    return `Polaroid ${polaroidMatch[1]}`
  }

  const sizeMatch = productId.match(/_(\d+x\d+)$/)
  if (sizeMatch) {
    return sizeMatch[1]
  }

  return null
}

// Get CSS style for a photo container based on size
export function getPhotoContainerStyle(
  sizeStr: string | null,
  baseWidth: number = 150
): { width: number; height: number } {
  if (!sizeStr) {
    // Default: square
    return { width: baseWidth, height: baseWidth }
  }

  const info = parsePhotoSize(sizeStr)
  if (!info) {
    return { width: baseWidth, height: baseWidth }
  }

  if (info.isPolaroid) {
    // Polaroid: show with white border simulation
    // Photo area is square, plus margin at bottom
    // Total ratio is 8:10 (width:height)
    const height = Math.round(baseWidth / 0.8)
    return { width: baseWidth, height }
  }

  if (info.orientation === 'square') {
    return { width: baseWidth, height: baseWidth }
  }

  if (info.orientation === 'portrait') {
    const height = Math.round(baseWidth / info.aspectRatio)
    return { width: baseWidth, height }
  }

  // landscape
  const height = Math.round(baseWidth / info.aspectRatio)
  return { width: baseWidth, height }
}

// Get CSS class suffix based on orientation
export function getOrientationClass(sizeStr: string | null): string {
  if (!sizeStr) return 'square'

  const info = parsePhotoSize(sizeStr)
  if (!info) return 'square'

  if (info.isPolaroid) return 'polaroid'
  return info.orientation
}

// All available photo sizes
export const PHOTO_SIZES = [
  '8x8',
  'Polaroid 8x10',
  '9x12',
  '10x10',
  '10x15',
  '13x18',
  '15x15',
  '15x20',
  '20x20',
  '20x25',
  '20x30',
  '25x25',
  '30x30',
  '30x40',
  '30x42',
]
