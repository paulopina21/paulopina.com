import { PhotoEditState, FilterOption } from './types'
import { PhotoSizeInfo } from '../../utils/photoSizes'
import { upscaleForPrint, checkResolutionQuality } from '../../utils/imageUtils'

interface ImagePosition {
  dx: number
  dy: number
  dw: number
  dh: number
}

/**
 * Calculate how to position the image within the target area
 * considering zoom and pan values
 */
export function calculateImagePosition(
  imgWidth: number,
  imgHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  targetWidth: number,
  targetHeight: number
): ImagePosition {
  const imgAspect = imgWidth / imgHeight
  const targetAspect = targetWidth / targetHeight

  let baseWidth: number
  let baseHeight: number

  // Cover the target area - image fills the frame
  if (imgAspect > targetAspect) {
    // Image is wider than target - fit height
    baseHeight = targetHeight
    baseWidth = targetHeight * imgAspect
  } else {
    // Image is taller than target - fit width
    baseWidth = targetWidth
    baseHeight = targetWidth / imgAspect
  }

  // Apply zoom
  const scaledWidth = baseWidth * zoom
  const scaledHeight = baseHeight * zoom

  // Calculate pan offset (pan is -1 to 1, representing max scroll in each direction)
  const overflowX = Math.max(0, scaledWidth - targetWidth)
  const overflowY = Math.max(0, scaledHeight - targetHeight)

  const offsetX = (panX * overflowX) / 2
  const offsetY = (panY * overflowY) / 2

  // Center the image and apply pan
  const dx = (targetWidth - scaledWidth) / 2 + offsetX
  const dy = (targetHeight - scaledHeight) / 2 + offsetY

  return {
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
 * Apply filter to canvas
 */
function applyFilter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  filter: FilterOption
): void {
  if (filter.name !== 'none') {
    filter.apply(ctx, canvas)
  }
}

/**
 * Get effective dimensions considering orientation
 */
function getEffectiveDimensions(
  sizeInfo: PhotoSizeInfo,
  orientation: 'portrait' | 'landscape' | undefined,
  scale: number
): { width: number; height: number } {
  let width = sizeInfo.widthPx
  let height = sizeInfo.heightPx

  // For non-square, non-polaroid photos, respect orientation
  if (!sizeInfo.isPolaroid && sizeInfo.orientation !== 'square' && orientation === 'landscape') {
    // Swap dimensions for landscape
    width = sizeInfo.heightPx
    height = sizeInfo.widthPx
  }

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

/**
 * Render the photo to a canvas at the specified dimensions
 */
async function renderToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  editState: PhotoEditState,
  sizeInfo: PhotoSizeInfo,
  scale: number = 1
): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // For Polaroid with full border
  if (sizeInfo.isPolaroid) {
    const borderStyle = editState.polaroidBorder || 'bottom'

    if (borderStyle === 'full') {
      // Full white border on all sides
      // Border proportions: 6% on sides, 6% on top, 20% on bottom (for caption)
      const borderSide = Math.round(sizeInfo.widthPx * 0.06 * scale)
      const borderTop = Math.round(sizeInfo.widthPx * 0.06 * scale)
      const borderBottom = Math.round(sizeInfo.widthPx * 0.20 * scale)

      const photoWidth = Math.round(sizeInfo.widthPx * scale) - borderSide * 2
      const photoHeight = Math.round(sizeInfo.widthPx * scale) // Square photo area

      const totalWidth = photoWidth + borderSide * 2
      const totalHeight = photoHeight + borderTop + borderBottom

      canvas.width = totalWidth
      canvas.height = totalHeight

      // Fill white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, totalWidth, totalHeight)

      // Calculate and draw image in photo area
      const pos = calculateImagePosition(
        img.naturalWidth,
        img.naturalHeight,
        editState.zoom,
        editState.panX,
        editState.panY,
        photoWidth,
        photoHeight
      )

      // Clip to photo area
      ctx.save()
      ctx.beginPath()
      ctx.rect(borderSide, borderTop, photoWidth, photoHeight)
      ctx.clip()

      ctx.drawImage(
        img, 0, 0, img.naturalWidth, img.naturalHeight,
        borderSide + pos.dx, borderTop + pos.dy, pos.dw, pos.dh
      )

      // Apply filter to photo area only
      if (editState.filter.name !== 'none') {
        const photoData = ctx.getImageData(borderSide, borderTop, photoWidth, photoHeight)
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = photoWidth
        tempCanvas.height = photoHeight
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(photoData, 0, 0)
        editState.filter.apply(tempCtx, tempCanvas)
        ctx.putImageData(tempCtx.getImageData(0, 0, photoWidth, photoHeight), borderSide, borderTop)
      }

      ctx.restore()

      // Draw caption if present
      if (editState.caption?.trim() && editState.font && editState.color) {
        const fontSize = Math.round(42 * scale)
        const lineHeight = Math.round(50 * scale)
        const padding = Math.round(20 * scale)
        const maxTextWidth = totalWidth - padding * 2

        ctx.font = `${fontSize}px '${editState.font.family}', cursive`
        ctx.fillStyle = editState.color.hex
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const lines = wrapText(ctx, editState.caption, maxTextWidth)
        const totalTextHeight = lines.length * lineHeight
        const captionAreaStart = borderTop + photoHeight
        const startY = captionAreaStart + (borderBottom - totalTextHeight) / 2 + lineHeight / 2

        lines.forEach((line, i) => {
          ctx.fillText(line, totalWidth / 2, startY + i * lineHeight)
        })
      }
    } else {
      // Original bottom-only border style
      const width = Math.round(sizeInfo.widthPx * scale)
      const height = Math.round(sizeInfo.heightPx * scale)
      const photoWidth = Math.round(sizeInfo.photoAreaPx!.width * scale)
      const photoHeight = Math.round(sizeInfo.photoAreaPx!.height * scale)
      const marginHeight = Math.round(sizeInfo.marginPx! * scale)

      canvas.width = width
      canvas.height = height

      // Fill white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // Calculate and draw image in photo area
      const pos = calculateImagePosition(
        img.naturalWidth,
        img.naturalHeight,
        editState.zoom,
        editState.panX,
        editState.panY,
        photoWidth,
        photoHeight
      )

      // Clip to photo area
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, photoWidth, photoHeight)
      ctx.clip()

      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, pos.dx, pos.dy, pos.dw, pos.dh)

      // Apply filter to photo area only
      if (editState.filter.name !== 'none') {
        const photoData = ctx.getImageData(0, 0, photoWidth, photoHeight)
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = photoWidth
        tempCanvas.height = photoHeight
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(photoData, 0, 0)
        editState.filter.apply(tempCtx, tempCanvas)
        ctx.putImageData(tempCtx.getImageData(0, 0, photoWidth, photoHeight), 0, 0)
      }

      ctx.restore()

      // Draw caption if present
      if (editState.caption?.trim() && editState.font && editState.color) {
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
        const startY = photoHeight + (marginHeight - totalTextHeight) / 2 + lineHeight / 2

        lines.forEach((line, i) => {
          ctx.fillText(line, width / 2, startY + i * lineHeight)
        })
      }
    }
  } else {
    // Regular photo (not Polaroid)
    const { width, height } = getEffectiveDimensions(sizeInfo, editState.orientation, scale)

    canvas.width = width
    canvas.height = height

    const pos = calculateImagePosition(
      img.naturalWidth,
      img.naturalHeight,
      editState.zoom,
      editState.panX,
      editState.panY,
      width,
      height
    )

    // Fill with white background (in case of gaps)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Draw image
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, pos.dx, pos.dy, pos.dw, pos.dh)

    // Apply filter
    applyFilter(ctx, canvas, editState.filter)
  }
}

/**
 * Render the final photo for upload at print resolution
 * Includes smart upscaling for low-resolution images
 */
export async function renderPhoto(
  imageSrc: string,
  editState: PhotoEditState,
  sizeInfo: PhotoSizeInfo,
  enableUpscale: boolean = true
): Promise<Blob> {
  let img = await loadImage(imageSrc)

  // Calculate target dimensions for quality check
  let targetWidth = sizeInfo.widthPx
  let targetHeight = sizeInfo.heightPx

  // Adjust for orientation
  if (!sizeInfo.isPolaroid && sizeInfo.orientation !== 'square' && editState.orientation === 'landscape') {
    targetWidth = sizeInfo.heightPx
    targetHeight = sizeInfo.widthPx
  }

  // Check if upscaling would help and apply if enabled
  if (enableUpscale) {
    const { needsUpscale, currentDPI } = checkResolutionQuality(
      img.naturalWidth,
      img.naturalHeight,
      targetWidth,
      targetHeight
    )

    if (needsUpscale) {
      // Upscale low resolution images to improve print quality
      console.log(`Upscaling image from ${img.naturalWidth}x${img.naturalHeight} (${currentDPI} DPI) to target ${targetWidth}x${targetHeight}`)
      img = await upscaleForPrint(img, targetWidth, targetHeight)
      console.log(`Upscaled to ${img.naturalWidth}x${img.naturalHeight}`)
    }
  }

  const canvas = document.createElement('canvas')
  await renderToCanvas(canvas, img, editState, sizeInfo, 1)

  // If this size requires a larger print canvas (e.g., Mini Polaroid on 8x10 paper, 5x7 on 8x10)
  if (sizeInfo.printCanvas) {
    const isLandscape = !sizeInfo.isPolaroid && sizeInfo.orientation !== 'square' && editState.orientation === 'landscape'
    const printCanvas = document.createElement('canvas')
    printCanvas.width = isLandscape ? sizeInfo.printCanvas.heightPx : sizeInfo.printCanvas.widthPx
    printCanvas.height = isLandscape ? sizeInfo.printCanvas.widthPx : sizeInfo.printCanvas.heightPx

    const ctx = printCanvas.getContext('2d')
    if (ctx) {
      // Fill with border color (red for cutting guide)
      ctx.fillStyle = sizeInfo.printCanvas.borderColor
      ctx.fillRect(0, 0, printCanvas.width, printCanvas.height)

      // Center the rendered photo on the print canvas
      const offsetX = Math.round((printCanvas.width - canvas.width) / 2)
      const offsetY = Math.round((printCanvas.height - canvas.height) / 2)
      ctx.drawImage(canvas, offsetX, offsetY)
    }

    return new Promise((resolve, reject) => {
      printCanvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        },
        'image/jpeg',
        0.95
      )
    })
  }

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
 * Note: printCanvas border is NOT applied here - only in renderPhoto for the final upload
 */
export async function renderPreview(
  imageSrc: string,
  editState: PhotoEditState,
  sizeInfo: PhotoSizeInfo,
  maxWidth: number = 300
): Promise<string> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')

  // For landscape orientation, use height as reference for scale
  let baseWidth = sizeInfo.widthPx
  if (!sizeInfo.isPolaroid && sizeInfo.orientation !== 'square' && editState.orientation === 'landscape') {
    baseWidth = sizeInfo.heightPx
  }

  const scale = maxWidth / baseWidth
  await renderToCanvas(canvas, img, editState, sizeInfo, scale)

  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Draw preview on an existing canvas (for interactive preview)
 * Note: printCanvas border is NOT applied here - only in renderPhoto for the final upload
 */
export async function drawPreviewOnCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  editState: PhotoEditState,
  sizeInfo: PhotoSizeInfo,
  scale: number
): Promise<void> {
  await renderToCanvas(canvas, img, editState, sizeInfo, scale)
}
