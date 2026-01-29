import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PhotoEditorProps,
  PhotoEditState,
  getDefaultEditState,
  FILTERS,
  FONTS,
  COLORS,
  loadFonts,
  PolaroidBorderStyle,
  PhotoOrientation,
} from './types'
import { renderPreview, loadImage, drawPreviewOnCanvas } from './canvasUtils'

// Preview canvas max width
const PREVIEW_MAX_WIDTH = 300

export default function PhotoEditor({
  preview,
  sizeInfo,
  editState,
  onSave,
  onCancel,
}: PhotoEditorProps) {
  const isRectangular = !sizeInfo.isPolaroid && sizeInfo.orientation !== 'square'
  const [state, setState] = useState<PhotoEditState>(() =>
    editState || getDefaultEditState(sizeInfo.isPolaroid, isRectangular)
  )
  const [fontsReady, setFontsReady] = useState(!sizeInfo.isPolaroid)
  const [saving, setSaving] = useState(false)
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 })

  // Touch gesture state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [initialZoom, setInitialZoom] = useState(1)

  // Calculate preview dimensions based on orientation
  const getPreviewDimensions = () => {
    let width = sizeInfo.widthPx
    let height = sizeInfo.heightPx

    // Handle landscape orientation for rectangular photos
    if (isRectangular && state.orientation === 'landscape') {
      width = sizeInfo.heightPx
      height = sizeInfo.widthPx
    }

    // Handle full border Polaroid (different aspect ratio)
    if (sizeInfo.isPolaroid && state.polaroidBorder === 'full') {
      const borderSide = sizeInfo.widthPx * 0.06
      const borderTop = sizeInfo.widthPx * 0.06
      const borderBottom = sizeInfo.widthPx * 0.20
      const photoSize = sizeInfo.widthPx - borderSide * 2
      width = photoSize + borderSide * 2
      height = photoSize + borderTop + borderBottom
    }

    const scale = PREVIEW_MAX_WIDTH / width
    return {
      scale,
      width: PREVIEW_MAX_WIDTH,
      height: Math.round(height * scale),
    }
  }

  const previewDims = getPreviewDimensions()
  const previewScale = previewDims.scale
  const previewWidth = previewDims.width
  const previewHeight = previewDims.height

  // Load fonts for Polaroid
  useEffect(() => {
    if (sizeInfo.isPolaroid) {
      loadFonts().then(() => setFontsReady(true))
    }
  }, [sizeInfo.isPolaroid])

  // Load image
  useEffect(() => {
    loadImage(preview).then(setImg)
  }, [preview])

  // Redraw canvas when state changes
  useEffect(() => {
    if (!canvasRef.current || !img || !fontsReady) return
    drawPreviewOnCanvas(canvasRef.current, img, state, sizeInfo, previewScale)
  }, [img, state, sizeInfo, previewScale, fontsReady])

  const handleStateChange = useCallback((updates: Partial<PhotoEditState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleStateChange({ zoom: parseFloat(e.target.value) })
  }, [handleStateChange])

  const handleResetZoom = useCallback(() => {
    handleStateChange({ zoom: 1, panX: 0, panY: 0 })
  }, [handleStateChange])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const previewDataUrl = await renderPreview(preview, state, sizeInfo, 150)
      onSave(state, previewDataUrl)
    } catch (err) {
      console.error('Error saving photo:', err)
    } finally {
      setSaving(false)
    }
  }, [preview, state, sizeInfo, onSave])

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialPan({ x: state.panX, y: state.panY })
  }, [state.panX, state.panY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    const sensitivity = 0.01 / state.zoom

    const newPanX = Math.max(-1, Math.min(1, initialPan.x - dx * sensitivity))
    const newPanY = Math.max(-1, Math.min(1, initialPan.y - dy * sensitivity))

    handleStateChange({ panX: newPanX, panY: newPanY })
  }, [isDragging, dragStart, initialPan, state.zoom, handleStateChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX, y: touch.clientY })
      setInitialPan({ x: state.panX, y: state.panY })
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      setLastTouchDistance(getTouchDistance(e.touches))
      setInitialZoom(state.zoom)
    }
  }, [state.panX, state.panY, state.zoom])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      const dx = touch.clientX - dragStart.x
      const dy = touch.clientY - dragStart.y

      const sensitivity = 0.01 / state.zoom

      const newPanX = Math.max(-1, Math.min(1, initialPan.x - dx * sensitivity))
      const newPanY = Math.max(-1, Math.min(1, initialPan.y - dy * sensitivity))

      handleStateChange({ panX: newPanX, panY: newPanY })
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      const currentDistance = getTouchDistance(e.touches)
      const scale = currentDistance / lastTouchDistance
      const newZoom = Math.max(1, Math.min(3, initialZoom * scale))

      handleStateChange({ zoom: newZoom })
    }
  }, [isDragging, dragStart, initialPan, state.zoom, handleStateChange, lastTouchDistance, initialZoom])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setLastTouchDistance(null)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(1, Math.min(3, state.zoom + delta))
    handleStateChange({ zoom: newZoom })
  }, [state.zoom, handleStateChange])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="photo-editor-overlay" onClick={onCancel}>
      <div className="photo-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="photo-editor-header">
          <h2>Editar Foto</h2>
          <div className="photo-editor-size-badge">
            {sizeInfo.widthCm}x{sizeInfo.heightCm}cm
          </div>
          <button className="close-btn" onClick={onCancel} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="photo-editor-content">
          <div className="photo-editor-preview">
            <div
              ref={containerRef}
              className="photo-editor-canvas-container"
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                width={previewWidth}
                height={previewHeight}
                className="photo-editor-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              />
            </div>
            <div className="preview-hint">
              Arraste para posicionar a foto
            </div>
          </div>

          <div className="photo-editor-controls">
            {/* Zoom control */}
            <div className="control-section">
              <label>Zoom: {Math.round(state.zoom * 100)}%</label>
              <div className="zoom-slider-container">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={state.zoom}
                  onChange={handleZoomChange}
                />
                <button
                  type="button"
                  className="reset-btn"
                  onClick={handleResetZoom}
                  title="Resetar posição"
                >
                  <i className="fas fa-undo"></i>
                </button>
              </div>
            </div>

            {/* Orientation control for rectangular photos */}
            {isRectangular && (
              <div className="control-section">
                <label>Orientação</label>
                <div className="orientation-buttons">
                  <button
                    type="button"
                    className={`orientation-btn ${state.orientation === 'portrait' ? 'active' : ''}`}
                    onClick={() => handleStateChange({ orientation: 'portrait' as PhotoOrientation, zoom: 1, panX: 0, panY: 0 })}
                    title="Vertical (Retrato)"
                  >
                    <svg viewBox="0 0 24 32" className="orientation-icon">
                      <rect x="2" y="2" width="20" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="14" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 20 Q12 26 17 20" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span>Vertical</span>
                  </button>
                  <button
                    type="button"
                    className={`orientation-btn ${state.orientation === 'landscape' ? 'active' : ''}`}
                    onClick={() => handleStateChange({ orientation: 'landscape' as PhotoOrientation, zoom: 1, panX: 0, panY: 0 })}
                    title="Horizontal (Paisagem)"
                  >
                    <svg viewBox="0 0 32 24" className="orientation-icon">
                      <rect x="2" y="2" width="28" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="16" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10 16 Q16 20 22 16" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span>Horizontal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Polaroid border style */}
            {sizeInfo.isPolaroid && (
              <div className="control-section">
                <label>Estilo da Borda</label>
                <div className="border-style-buttons">
                  <button
                    type="button"
                    className={`border-style-btn ${state.polaroidBorder === 'bottom' ? 'active' : ''}`}
                    onClick={() => handleStateChange({ polaroidBorder: 'bottom' as PolaroidBorderStyle })}
                    title="Borda só embaixo"
                  >
                    <svg viewBox="0 0 24 30" className="border-style-icon">
                      <rect x="0" y="0" width="24" height="24" fill="#ddd"/>
                      <rect x="0" y="24" width="24" height="6" fill="#fff"/>
                    </svg>
                    <span>Clássico</span>
                  </button>
                  <button
                    type="button"
                    className={`border-style-btn ${state.polaroidBorder === 'full' ? 'active' : ''}`}
                    onClick={() => handleStateChange({ polaroidBorder: 'full' as PolaroidBorderStyle })}
                    title="Borda completa"
                  >
                    <svg viewBox="0 0 28 34" className="border-style-icon">
                      <rect x="0" y="0" width="28" height="34" fill="#fff"/>
                      <rect x="2" y="2" width="24" height="24" fill="#ddd"/>
                    </svg>
                    <span>Completo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter control */}
            <div className="control-section">
              <label>Filtro</label>
              <div className="filter-buttons">
                {FILTERS.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    className={`filter-btn ${state.filter.name === f.name ? 'active' : ''}`}
                    onClick={() => handleStateChange({ filter: f })}
                  >
                    <div
                      className="filter-preview"
                      style={{ filter: f.css }}
                    />
                    <span>{f.displayName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption controls (Polaroid only) */}
            {sizeInfo.isPolaroid && (
              <>
                <div className="control-section">
                  <label>Legenda</label>
                  <input
                    type="text"
                    value={state.caption || ''}
                    onChange={e => handleStateChange({ caption: e.target.value.slice(0, 60) })}
                    placeholder="Digite sua legenda..."
                    maxLength={60}
                    className="caption-input"
                  />
                  <span className="char-count">
                    {(state.caption || '').length}/60
                  </span>
                </div>

                <div className="control-section control-row">
                  <div>
                    <label>Fonte</label>
                    <div className="font-buttons">
                      {FONTS.map(f => (
                        <button
                          key={f.name}
                          type="button"
                          className={`font-btn ${state.font?.name === f.name ? 'active' : ''}`}
                          style={{ fontFamily: `'${f.family}', cursive` }}
                          onClick={() => handleStateChange({ font: f })}
                          title={f.displayName}
                        >
                          Aa
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label>Cor</label>
                    <div className="color-buttons">
                      {COLORS.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          className={`color-btn ${state.color?.name === c.name ? 'active' : ''}`}
                          style={{ backgroundColor: c.hex }}
                          onClick={() => handleStateChange({ color: c })}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="photo-editor-footer">
          <div className="photo-editor-info">
            <i className="fas fa-print"></i>
            <span>
              Resolução: {isRectangular && state.orientation === 'landscape'
                ? `${sizeInfo.heightPx}x${sizeInfo.widthPx}`
                : `${sizeInfo.widthPx}x${sizeInfo.heightPx}`}px (300 DPI)
            </span>
          </div>
          <div className="photo-editor-actions">
            <button
              type="button"
              className="btn cancel-btn"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
