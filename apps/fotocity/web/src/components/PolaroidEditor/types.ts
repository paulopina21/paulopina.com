// Polaroid Editor Types

export interface PolaroidEditState {
  // Zoom level (1.0 = fit to frame, > 1.0 = zoomed in)
  zoom: number
  // Pan offset as percentage of overflow (-1 to 1)
  panX: number
  panY: number
  // Caption text
  caption: string
  // Selected font
  font: FontOption
  // Caption color
  color: ColorOption
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

export interface PolaroidEditorProps {
  preview: string
  editState: PolaroidEditState | null
  onSave: (state: PolaroidEditState, previewDataUrl: string) => void
  onCancel: () => void
}

export interface PolaroidPreviewProps {
  imageSrc: string
  editState: PolaroidEditState
  onChange: (state: PolaroidEditState) => void
}

export interface CaptionEditorProps {
  caption: string
  font: FontOption
  color: ColorOption
  onCaptionChange: (caption: string) => void
  onFontChange: (font: FontOption) => void
  onColorChange: (color: ColorOption) => void
}

// Polaroid dimensions (8cm x 10cm @ 300 DPI)
export const POLAROID_WIDTH = 944
export const POLAROID_HEIGHT = 1181
export const PHOTO_AREA_SIZE = 944
export const MARGIN_HEIGHT = 237

// Preview dimensions (smaller for display)
export const PREVIEW_SCALE = 0.4
export const PREVIEW_WIDTH = Math.round(POLAROID_WIDTH * PREVIEW_SCALE)
export const PREVIEW_HEIGHT = Math.round(POLAROID_HEIGHT * PREVIEW_SCALE)
