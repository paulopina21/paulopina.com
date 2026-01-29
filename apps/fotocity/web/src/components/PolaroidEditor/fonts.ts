import { FontOption, ColorOption } from './types'

// Available handwriting fonts from Google Fonts
export const FONTS: FontOption[] = [
  { name: 'caveat', family: 'Caveat', displayName: 'Cursiva' },
  { name: 'patrick-hand', family: 'Patrick Hand', displayName: 'Manuscrita' },
  { name: 'indie-flower', family: 'Indie Flower', displayName: 'Divertida' },
  { name: 'permanent-marker', family: 'Permanent Marker', displayName: 'Marcador' },
  { name: 'kalam', family: 'Kalam', displayName: 'Escrita' },
]

// Available caption colors
export const COLORS: ColorOption[] = [
  { name: 'black', hex: '#000000' },
  { name: 'blue', hex: '#1a237e' },
  { name: 'red', hex: '#b71c1c' },
  { name: 'green', hex: '#1b5e20' },
  { name: 'purple', hex: '#4a148c' },
]

// Default edit state
export const DEFAULT_FONT = FONTS[0]
export const DEFAULT_COLOR = COLORS[0]

let fontsLoaded = false

// Load Google Fonts dynamically
export async function loadFonts(): Promise<void> {
  if (fontsLoaded) return

  const families = FONTS.map(f => f.family.replace(/ /g, '+')).join('&family=')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  document.head.appendChild(link)

  // Wait for fonts to load
  await document.fonts.ready
  fontsLoaded = true
}

// Check if fonts are loaded
export function areFontsLoaded(): boolean {
  return fontsLoaded
}
