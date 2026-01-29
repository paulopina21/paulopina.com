import {
  PolaroidEditState,
  POLAROID_WIDTH,
  POLAROID_HEIGHT,
  PHOTO_AREA_SIZE,
  MARGIN_HEIGHT,
  PREVIEW_WIDTH,
} from './types'

interface ImagePosition {
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}

/**
 * Calculate how to position the image within the square photo area
 * considering zoom and pan values
 */
export function calculateImagePosition(
  imgWidth: number,
  imgHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  targetSize: number
): ImagePosition {
  const imgAspect = imgWidth / imgHeight

  let baseWidth: number
  let baseHeight: number

  // Cover the square - larger dimension fills the frame
  if (imgAspect >= 1) {
    // Landscape or square image
    baseHeight = targetSize
    baseWidth = targetSize * imgAspect
  } else {
    // Portrait image
    baseWidth = targetSize
    baseHeight = targetSize / imgAspect
  }

  // Apply zoom
  const scaledWidth = baseWidth * zoom
  const scaledHeight = baseHeight * zoom

  // Calculate pan offset (pan is -1 to 1, representing max scroll in each direction)
  const overflowX = Math.max(0, scaledWidth - targetSize)
  const overflowY = Math.max(0, scaledHeight - targetSize)

  const offsetX = (panX * overflowX) / 2
  const offsetY = (panY * overflowY) / 2

  // Center the image and apply pan
  const dx = (targetSize - scaledWidth) / 2 + offsetX
  const dy = (targetSize - scaledHeight) / 2 + offsetY

  return {
    sx: 0,
    sy: 0,
    sw: imgWidth,
    sh: imgHeight,
    dx,
    dy,
    dw: scaledWidth,
    dh: scaledHeight,
  }
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

/**
 * Render the Polaroid to a canvas
 */
async function renderToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  editState: PolaroidEditState,
  scale: number = 1
): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  const width = Math.round(POLAROID_WIDTH * scale)
  const height = Math.round(POLAROID_HEIGHT * scale)
  const photoSize = Math.round(PHOTO_AREA_SIZE * scale)
  const marginHeight = Math.round(MARGIN_HEIGHT * scale)

  canvas.width = width
  canvas.height = height

  // Fill white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Calculate and draw image
  const pos = calculateImagePosition(
    img.naturalWidth,
    img.naturalHeight,
    editState.zoom,
    editState.panX,
    editState.panY,
    photoSize
  )

  // Clip to photo area
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, photoSize, photoSize)
  ctx.clip()

  ctx.drawImage(img, pos.sx, pos.sy, pos.sw, pos.sh, pos.dx, pos.dy, pos.dw, pos.dh)

  ctx.restore()

  // Draw caption if present
  if (editState.caption.trim()) {
    const fontSize = Math.round(48 * scale)
    const lineHeight = Math.round(56 * scale)
    const padding = Math.round(30 * scale)
    const maxTextWidth = width - padding * 2

    ctx.font = `${fontSize}px '${editState.font.family}', cursive`
    ctx.fillStyle = editState.color.hex
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = wrapText(ctx, editState.caption, maxTextWidth)
    const totalTextHeight = lines.length * lineHeight
    const startY = photoSize + (marginHeight - totalTextHeight) / 2 + lineHeight / 2

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight)
    })
  }
}

/**
 * Load an image from a URL or data URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Render the final Polaroid image for upload (944x1181)
 */
export async function renderPolaroid(
  imageSrc: string,
  editState: PolaroidEditState
): Promise<Blob> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')

  await renderToCanvas(canvas, img, editState, 1)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      'image/jpeg',
      0.95
    )
  })
}

/**
 * Render a preview image (smaller size for thumbnails)
 */
export async function renderPreview(
  imageSrc: string,
  editState: PolaroidEditState
): Promise<string> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')

  const scale = PREVIEW_WIDTH / POLAROID_WIDTH
  await renderToCanvas(canvas, img, editState, scale)

  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Draw preview on an existing canvas (for interactive preview)
 */
export async function drawPreviewOnCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  editState: PolaroidEditState,
  scale: number
): Promise<void> {
  await renderToCanvas(canvas, img, editState, scale)
}
