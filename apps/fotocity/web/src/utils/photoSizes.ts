// Photo size utilities - calculates aspect ratios and print dimensions

// Print quality: 300 DPI (dots per inch)
// 1 inch = 2.54 cm
// pixels = (cm / 2.54) * 300
const DPI = 300
const CM_TO_INCH = 2.54

export function cmToPixels(cm: number): number {
  return Math.round((cm / CM_TO_INCH) * DPI)
}

export interface PhotoSizeInfo {
  name: string
  widthCm: number
  heightCm: number
  widthPx: number
  heightPx: number
  aspectRatio: number // width / height
  orientation: 'square' | 'portrait' | 'landscape'
  isPolaroid: boolean
  // For Polaroid, photo area is square, margin is at bottom
  photoAreaPx?: { width: number; height: number }
  marginPx?: number
  // For Mini Polaroid: render on larger canvas with colored border for cutting
  printCanvas?: {
    widthPx: number
    heightPx: number
    borderColor: string
  }
}

// Pre-calculated sizes for all formats
export const PHOTO_SIZE_INFO: Record<string, PhotoSizeInfo> = {
  '5x7': {
    name: '5x7',
    widthCm: 5, heightCm: 7,
    widthPx: cmToPixels(5), heightPx: cmToPixels(7),
    aspectRatio: 5 / 7, orientation: 'portrait', isPolaroid: false,
    // Print on 8x10 paper with red border for cutting (printer minimum is 8x10)
    printCanvas: {
      widthPx: cmToPixels(8),
      heightPx: cmToPixels(10),
      borderColor: '#FF0000',
    },
  },
  'Mini Polaroid 5x7': {
    name: 'Mini Polaroid 5x7',
    widthCm: 5, heightCm: 7,
    widthPx: cmToPixels(5), heightPx: cmToPixels(7),
    aspectRatio: 5 / 7, orientation: 'portrait', isPolaroid: true,
    photoAreaPx: { width: cmToPixels(5), height: cmToPixels(5) },
    marginPx: cmToPixels(2),
    // Print on 8x10 paper with red border for cutting
    printCanvas: {
      widthPx: cmToPixels(8),
      heightPx: cmToPixels(10),
      borderColor: '#FF0000',
    },
  },
  'Mini Polaroid 6x8': {
    name: 'Mini Polaroid 6x8',
    widthCm: 6, heightCm: 8,
    widthPx: cmToPixels(6), heightPx: cmToPixels(8),
    aspectRatio: 6 / 8, orientation: 'portrait', isPolaroid: true,
    photoAreaPx: { width: cmToPixels(6), height: cmToPixels(6) },
    marginPx: cmToPixels(2),
    // Print on 8x10 paper with red border for cutting
    printCanvas: {
      widthPx: cmToPixels(8),
      heightPx: cmToPixels(10),
      borderColor: '#FF0000',
    },
  },
  '6x8': {
    name: '6x8',
    widthCm: 6, heightCm: 8,
    widthPx: cmToPixels(6), heightPx: cmToPixels(8),
    aspectRatio: 6 / 8, orientation: 'portrait', isPolaroid: false,
    // Print on 8x10 paper with red border for cutting (printer minimum is 8x10)
    printCanvas: {
      widthPx: cmToPixels(8),
      heightPx: cmToPixels(10),
      borderColor: '#FF0000',
    },
  },
  '8x8': {
    name: '8x8',
    widthCm: 8, heightCm: 8,
    widthPx: cmToPixels(8), heightPx: cmToPixels(8),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '8x10': {
    name: '8x10',
    widthCm: 8, heightCm: 10,
    widthPx: cmToPixels(8), heightPx: cmToPixels(10),
    aspectRatio: 8 / 10, orientation: 'portrait', isPolaroid: false,
  },
  'Polaroid 8x10': {
    name: 'Polaroid 8x10',
    widthCm: 8, heightCm: 10,
    widthPx: cmToPixels(8), heightPx: cmToPixels(10),
    aspectRatio: 8 / 10, orientation: 'portrait', isPolaroid: true,
    photoAreaPx: { width: cmToPixels(8), height: cmToPixels(8) },
    marginPx: cmToPixels(2),
  },
  '9x12': {
    name: '9x12',
    widthCm: 9, heightCm: 12,
    widthPx: cmToPixels(9), heightPx: cmToPixels(12),
    aspectRatio: 9 / 12, orientation: 'portrait', isPolaroid: false,
  },
  '10x10': {
    name: '10x10',
    widthCm: 10, heightCm: 10,
    widthPx: cmToPixels(10), heightPx: cmToPixels(10),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '10x15': {
    name: '10x15',
    widthCm: 10, heightCm: 15,
    widthPx: cmToPixels(10), heightPx: cmToPixels(15),
    aspectRatio: 10 / 15, orientation: 'portrait', isPolaroid: false,
  },
  '13x18': {
    name: '13x18',
    widthCm: 13, heightCm: 18,
    widthPx: cmToPixels(13), heightPx: cmToPixels(18),
    aspectRatio: 13 / 18, orientation: 'portrait', isPolaroid: false,
  },
  '15x15': {
    name: '15x15',
    widthCm: 15, heightCm: 15,
    widthPx: cmToPixels(15), heightPx: cmToPixels(15),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '15x20': {
    name: '15x20',
    widthCm: 15, heightCm: 20,
    widthPx: cmToPixels(15), heightPx: cmToPixels(20),
    aspectRatio: 15 / 20, orientation: 'portrait', isPolaroid: false,
  },
  '20x20': {
    name: '20x20',
    widthCm: 20, heightCm: 20,
    widthPx: cmToPixels(20), heightPx: cmToPixels(20),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '20x25': {
    name: '20x25',
    widthCm: 20, heightCm: 25,
    widthPx: cmToPixels(20), heightPx: cmToPixels(25),
    aspectRatio: 20 / 25, orientation: 'portrait', isPolaroid: false,
  },
  '20x30': {
    name: '20x30',
    widthCm: 20, heightCm: 30,
    widthPx: cmToPixels(20), heightPx: cmToPixels(30),
    aspectRatio: 20 / 30, orientation: 'portrait', isPolaroid: false,
  },
  '25x25': {
    name: '25x25',
    widthCm: 25, heightCm: 25,
    widthPx: cmToPixels(25), heightPx: cmToPixels(25),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '30x30': {
    name: '30x30',
    widthCm: 30, heightCm: 30,
    widthPx: cmToPixels(30), heightPx: cmToPixels(30),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '30x40': {
    name: '30x40',
    widthCm: 30, heightCm: 40,
    widthPx: cmToPixels(30), heightPx: cmToPixels(40),
    aspectRatio: 30 / 40, orientation: 'portrait', isPolaroid: false,
  },
  '30x42': {
    name: '30x42',
    widthCm: 30, heightCm: 42,
    widthPx: cmToPixels(30), heightPx: cmToPixels(42),
    aspectRatio: 30 / 42, orientation: 'portrait', isPolaroid: false,
  },
  '40x40': {
    name: '40x40',
    widthCm: 40, heightCm: 40,
    widthPx: cmToPixels(40), heightPx: cmToPixels(40),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '40x50': {
    name: '40x50',
    widthCm: 40, heightCm: 50,
    widthPx: cmToPixels(40), heightPx: cmToPixels(50),
    aspectRatio: 40 / 50, orientation: 'portrait', isPolaroid: false,
  },
  '40x60': {
    name: '40x60',
    widthCm: 40, heightCm: 60,
    widthPx: cmToPixels(40), heightPx: cmToPixels(60),
    aspectRatio: 40 / 60, orientation: 'portrait', isPolaroid: false,
  },
  '50x50': {
    name: '50x50',
    widthCm: 50, heightCm: 50,
    widthPx: cmToPixels(50), heightPx: cmToPixels(50),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '50x60': {
    name: '50x60',
    widthCm: 50, heightCm: 60,
    widthPx: cmToPixels(50), heightPx: cmToPixels(60),
    aspectRatio: 50 / 60, orientation: 'portrait', isPolaroid: false,
  },
  '50x70': {
    name: '50x70',
    widthCm: 50, heightCm: 70,
    widthPx: cmToPixels(50), heightPx: cmToPixels(70),
    aspectRatio: 50 / 70, orientation: 'portrait', isPolaroid: false,
  },
  '50x80': {
    name: '50x80',
    widthCm: 50, heightCm: 80,
    widthPx: cmToPixels(50), heightPx: cmToPixels(80),
    aspectRatio: 50 / 80, orientation: 'portrait', isPolaroid: false,
  },
  '50x100': {
    name: '50x100',
    widthCm: 50, heightCm: 100,
    widthPx: cmToPixels(50), heightPx: cmToPixels(100),
    aspectRatio: 50 / 100, orientation: 'portrait', isPolaroid: false,
  },
  '60x60': {
    name: '60x60',
    widthCm: 60, heightCm: 60,
    widthPx: cmToPixels(60), heightPx: cmToPixels(60),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '60x80': {
    name: '60x80',
    widthCm: 60, heightCm: 80,
    widthPx: cmToPixels(60), heightPx: cmToPixels(80),
    aspectRatio: 60 / 80, orientation: 'portrait', isPolaroid: false,
  },
  '60x90': {
    name: '60x90',
    widthCm: 60, heightCm: 90,
    widthPx: cmToPixels(60), heightPx: cmToPixels(90),
    aspectRatio: 60 / 90, orientation: 'portrait', isPolaroid: false,
  },
  '60x100': {
    name: '60x100',
    widthCm: 60, heightCm: 100,
    widthPx: cmToPixels(60), heightPx: cmToPixels(100),
    aspectRatio: 60 / 100, orientation: 'portrait', isPolaroid: false,
  },
  '70x70': {
    name: '70x70',
    widthCm: 70, heightCm: 70,
    widthPx: cmToPixels(70), heightPx: cmToPixels(70),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '70x100': {
    name: '70x100',
    widthCm: 70, heightCm: 100,
    widthPx: cmToPixels(70), heightPx: cmToPixels(100),
    aspectRatio: 70 / 100, orientation: 'portrait', isPolaroid: false,
  },
  '80x80': {
    name: '80x80',
    widthCm: 80, heightCm: 80,
    widthPx: cmToPixels(80), heightPx: cmToPixels(80),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '80x100': {
    name: '80x100',
    widthCm: 80, heightCm: 100,
    widthPx: cmToPixels(80), heightPx: cmToPixels(100),
    aspectRatio: 80 / 100, orientation: 'portrait', isPolaroid: false,
  },
  '80x120': {
    name: '80x120',
    widthCm: 80, heightCm: 120,
    widthPx: cmToPixels(80), heightPx: cmToPixels(120),
    aspectRatio: 80 / 120, orientation: 'portrait', isPolaroid: false,
  },
  '90x90': {
    name: '90x90',
    widthCm: 90, heightCm: 90,
    widthPx: cmToPixels(90), heightPx: cmToPixels(90),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '90x120': {
    name: '90x120',
    widthCm: 90, heightCm: 120,
    widthPx: cmToPixels(90), heightPx: cmToPixels(120),
    aspectRatio: 90 / 120, orientation: 'portrait', isPolaroid: false,
  },
  '100x100': {
    name: '100x100',
    widthCm: 100, heightCm: 100,
    widthPx: cmToPixels(100), heightPx: cmToPixels(100),
    aspectRatio: 1, orientation: 'square', isPolaroid: false,
  },
  '100x150': {
    name: '100x150',
    widthCm: 100, heightCm: 150,
    widthPx: cmToPixels(100), heightPx: cmToPixels(150),
    aspectRatio: 100 / 150, orientation: 'portrait', isPolaroid: false,
  },
}

// Parse size string like "10x15", "Polaroid 8x10", "8x8" etc.
export function parsePhotoSize(sizeStr: string): PhotoSizeInfo | null {
  if (!sizeStr) return null

  // Try exact match first
  if (PHOTO_SIZE_INFO[sizeStr]) {
    return PHOTO_SIZE_INFO[sizeStr]
  }

  // Try to find by partial match
  const normalized = sizeStr.trim()
  for (const key of Object.keys(PHOTO_SIZE_INFO)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return PHOTO_SIZE_INFO[key]
    }
  }

  // Fallback: parse manually
  const isPolaroid = sizeStr.toLowerCase().includes('polaroid')
  const match = sizeStr.match(/(\d+)\s*x\s*(\d+)/i)
  if (!match) return null

  const widthCm = parseInt(match[1], 10)
  const heightCm = parseInt(match[2], 10)

  let orientation: 'square' | 'portrait' | 'landscape'
  if (widthCm === heightCm) {
    orientation = 'square'
  } else if (widthCm < heightCm) {
    orientation = 'portrait'
  } else {
    orientation = 'landscape'
  }

  return {
    name: sizeStr,
    widthCm,
    heightCm,
    widthPx: cmToPixels(widthCm),
    heightPx: cmToPixels(heightCm),
    aspectRatio: widthCm / heightCm,
    orientation,
    isPolaroid,
  }
}

// Extract size from product ID string like "2025-01-28_22-30_Polaroid8x10" or "2025-01-28_22-30_10x15"
export function extractSizeFromProductId(productId: string): string | null {
  // Try to match Mini Polaroid first
  const miniPolaroidMatch = productId.match(/MiniPolaroid\s*(\d+x\d+)/i)
  if (miniPolaroidMatch) {
    return `Mini Polaroid ${miniPolaroidMatch[1]}`
  }

  // Try to match regular Polaroid
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

// All available photo sizes - Polaroids first, then normal sizes
export const PHOTO_SIZES = [
  // Polaroid
  'Mini Polaroid 5x7',
  'Mini Polaroid 6x8',
  'Polaroid 8x10',
  // Normal
  '5x7',
  '6x8',
  '8x8',
  '8x10',
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
  '40x40',
  '40x50',
  '40x60',
  '50x50',
  '50x60',
  '50x70',
  '50x80',
  '50x100',
  '60x60',
  '60x80',
  '60x90',
  '60x100',
  '70x70',
  '70x100',
  '80x80',
  '80x100',
  '80x120',
  '90x90',
  '90x120',
  '100x100',
  '100x150',
]
