// Photo Editor Types
import { PhotoSizeInfo } from '../../utils/photoSizes'

// Polaroid border style options
export type PolaroidBorderStyle = 'bottom' | 'full'

// Orientation for rectangular photos
export type PhotoOrientation = 'portrait' | 'landscape'

export interface PhotoEditState {
  // Zoom level (1.0 = fit to frame, > 1.0 = zoomed in)
  zoom: number
  // Pan offset as percentage of overflow (-1 to 1)
  panX: number
  panY: number
  // Filter applied
  filter: FilterOption
  // Number of copies of this photo
  copies: number
  // Orientation for rectangular photos
  orientation?: PhotoOrientation
  // Polaroid border style
  polaroidBorder?: PolaroidBorderStyle
  // Caption (only for Polaroid)
  caption?: string
  font?: FontOption
  color?: ColorOption
}

export interface FilterOption {
  name: string
  displayName: string
  // CSS filter string
  css: string
  // Canvas filter operations (for final render)
  apply: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void
}

export interface FontOption {
  name: string
  family: string
  displayName: string
}

export interface ColorOption {
  name: string
  hex: string
}

export interface PhotoEditorProps {
  preview: string
  sizeInfo: PhotoSizeInfo
  editState: PhotoEditState | null
  onSave: (state: PhotoEditState, previewDataUrl: string) => void
  onCancel: () => void
}

// Default edit state
export function getDefaultEditState(isPolaroid: boolean, isRectangular: boolean = false): PhotoEditState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    filter: FILTERS[0],
    copies: 1,
    orientation: isRectangular ? 'portrait' : undefined,
    polaroidBorder: isPolaroid ? 'bottom' : undefined,
    caption: isPolaroid ? '' : undefined,
    font: isPolaroid ? FONTS[0] : undefined,
    color: isPolaroid ? COLORS[0] : undefined,
  }
}

// Available filters
export const FILTERS: FilterOption[] = [
  {
    name: 'none',
    displayName: 'Original',
    css: 'none',
    apply: () => {},
  },
  {
    name: 'grayscale',
    displayName: 'P&B',
    css: 'grayscale(100%)',
    apply: (ctx, canvas) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }
      ctx.putImageData(imageData, 0, 0)
    },
  },
  {
    name: 'sepia',
    displayName: 'Sépia',
    css: 'sepia(100%)',
    apply: (ctx, canvas) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
      }
      ctx.putImageData(imageData, 0, 0)
    },
  },
  {
    name: 'vintage',
    displayName: 'Vintage',
    css: 'sepia(50%) contrast(90%) brightness(110%)',
    apply: (ctx, canvas) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        // Slight sepia + warm tones
        const r = data[i], g = data[i + 1], b = data[i + 2]
        data[i] = Math.min(255, r * 1.1 + 20)
        data[i + 1] = Math.min(255, g * 0.95 + 10)
        data[i + 2] = Math.min(255, b * 0.8)
      }
      ctx.putImageData(imageData, 0, 0)
    },
  },
]

// Available handwriting fonts from Google Fonts (for Polaroid)
export const FONTS: FontOption[] = [
  { name: 'caveat', family: 'Caveat', displayName: 'Cursiva' },
  { name: 'patrick-hand', family: 'Patrick Hand', displayName: 'Manuscrita' },
  { name: 'indie-flower', family: 'Indie Flower', displayName: 'Divertida' },
  { name: 'permanent-marker', family: 'Permanent Marker', displayName: 'Marcador' },
  { name: 'kalam', family: 'Kalam', displayName: 'Escrita' },
]

// Available caption colors (for Polaroid)
export const COLORS: ColorOption[] = [
  { name: 'black', hex: '#000000' },
  { name: 'blue', hex: '#1a237e' },
  { name: 'red', hex: '#b71c1c' },
  { name: 'green', hex: '#1b5e20' },
  { name: 'purple', hex: '#4a148c' },
]

// Load Google Fonts
let fontsLoaded = false
export async function loadFonts(): Promise<void> {
  if (fontsLoaded) return

  const families = FONTS.map(f => f.family.replace(/ /g, '+')).join('&family=')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  document.head.appendChild(link)

  await document.fonts.ready
  fontsLoaded = true
}
