import { useRef, useEffect, useState, useCallback } from 'react'
import { PolaroidPreviewProps, POLAROID_WIDTH, POLAROID_HEIGHT } from './types'
import { drawPreviewOnCanvas, loadImage } from './canvasUtils'

// Preview canvas size
const CANVAS_WIDTH = 300
const CANVAS_SCALE = CANVAS_WIDTH / POLAROID_WIDTH

export default function PolaroidPreview({
  imageSrc,
  editState,
  onChange,
}: PolaroidPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 })

  // Touch gesture state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [initialZoom, setInitialZoom] = useState(1)

  // Load image
  useEffect(() => {
    loadImage(imageSrc).then(setImg)
  }, [imageSrc])

  // Redraw canvas when state changes
  useEffect(() => {
    if (!canvasRef.current || !img) return

    drawPreviewOnCanvas(canvasRef.current, img, editState, CANVAS_SCALE)
  }, [img, editState])

  const getPhotoAreaBounds = useCallback(() => {
    const photoAreaHeight = Math.round(CANVAS_WIDTH) // Square photo area
    return { width: CANVAS_WIDTH, height: photoAreaHeight }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const bounds = getPhotoAreaBounds()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Only allow dragging in the photo area (top square)
    const y = e.clientY - rect.top
    if (y > bounds.height) return

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialPan({ x: editState.panX, y: editState.panY })
  }, [editState.panX, editState.panY, getPhotoAreaBounds])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    // Convert pixel movement to pan value (-1 to 1)
    // Sensitivity based on zoom level
    const sensitivity = 0.01 / editState.zoom

    const newPanX = Math.max(-1, Math.min(1, initialPan.x - dx * sensitivity))
    const newPanY = Math.max(-1, Math.min(1, initialPan.y - dy * sensitivity))

    onChange({
      ...editState,
      panX: newPanX,
      panY: newPanY,
    })
  }, [isDragging, dragStart, initialPan, editState, onChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for mobile
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX, y: touch.clientY })
      setInitialPan({ x: editState.panX, y: editState.panY })
    } else if (e.touches.length === 2) {
      // Pinch - zoom
      setIsDragging(false)
      setLastTouchDistance(getTouchDistance(e.touches))
      setInitialZoom(editState.zoom)
    }
  }, [editState.panX, editState.panY, editState.zoom])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && isDragging) {
      // Pan
      const touch = e.touches[0]
      const dx = touch.clientX - dragStart.x
      const dy = touch.clientY - dragStart.y

      const sensitivity = 0.01 / editState.zoom

      const newPanX = Math.max(-1, Math.min(1, initialPan.x - dx * sensitivity))
      const newPanY = Math.max(-1, Math.min(1, initialPan.y - dy * sensitivity))

      onChange({
        ...editState,
        panX: newPanX,
        panY: newPanY,
      })
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches)
      const scale = currentDistance / lastTouchDistance
      const newZoom = Math.max(1, Math.min(3, initialZoom * scale))

      onChange({
        ...editState,
        zoom: newZoom,
      })
    }
  }, [isDragging, dragStart, initialPan, editState, onChange, lastTouchDistance, initialZoom])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setLastTouchDistance(null)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(1, Math.min(3, editState.zoom + delta))

    onChange({
      ...editState,
      zoom: newZoom,
    })
  }, [editState, onChange])

  const canvasHeight = Math.round(POLAROID_HEIGHT * CANVAS_SCALE)

  return (
    <div
      ref={containerRef}
      className="polaroid-preview-container"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={canvasHeight}
        className="polaroid-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
      <div className="preview-hint">
        Arraste para posicionar a foto
      </div>
    </div>
  )
}
