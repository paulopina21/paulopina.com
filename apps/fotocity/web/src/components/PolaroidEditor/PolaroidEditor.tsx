import { useState, useEffect, useCallback } from 'react'
import { PolaroidEditorProps, PolaroidEditState } from './types'
import { FONTS, COLORS, DEFAULT_FONT, DEFAULT_COLOR, loadFonts } from './fonts'
import { renderPreview } from './canvasUtils'
import PolaroidPreview from './PolaroidPreview'
import CaptionEditor from './CaptionEditor'

export default function PolaroidEditor({
  preview,
  editState,
  onSave,
  onCancel,
}: PolaroidEditorProps) {
  const [state, setState] = useState<PolaroidEditState>(() =>
    editState || {
      zoom: 1,
      panX: 0,
      panY: 0,
      caption: '',
      font: DEFAULT_FONT,
      color: DEFAULT_COLOR,
    }
  )
  const [fontsReady, setFontsReady] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load fonts when component mounts
  useEffect(() => {
    loadFonts().then(() => setFontsReady(true))
  }, [])

  const handleStateChange = useCallback((newState: PolaroidEditState) => {
    setState(newState)
  }, [])

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      zoom: parseFloat(e.target.value),
    }))
  }, [])

  const handleResetZoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0,
    }))
  }, [])

  const handleCaptionChange = useCallback((caption: string) => {
    setState(prev => ({ ...prev, caption }))
  }, [])

  const handleFontChange = useCallback((font: typeof FONTS[0]) => {
    setState(prev => ({ ...prev, font }))
  }, [])

  const handleColorChange = useCallback((color: typeof COLORS[0]) => {
    setState(prev => ({ ...prev, color }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const previewDataUrl = await renderPreview(preview, state)
      onSave(state, previewDataUrl)
    } catch (err) {
      console.error('Error saving polaroid:', err)
    } finally {
      setSaving(false)
    }
  }, [preview, state, onSave])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="polaroid-editor-overlay" onClick={onCancel}>
      <div className="polaroid-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="polaroid-editor-header">
          <h2>Editor Polaroid</h2>
          <button className="close-btn" onClick={onCancel} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="polaroid-editor-content">
          <div className="polaroid-editor-preview">
            {fontsReady && (
              <PolaroidPreview
                imageSrc={preview}
                editState={state}
                onChange={handleStateChange}
              />
            )}
          </div>

          <div className="polaroid-editor-controls">
            <div className="zoom-control">
              <label htmlFor="zoom-slider">
                Zoom: {Math.round(state.zoom * 100)}%
              </label>
              <div className="zoom-slider-container">
                <input
                  id="zoom-slider"
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

            <CaptionEditor
              caption={state.caption}
              font={state.font}
              color={state.color}
              onCaptionChange={handleCaptionChange}
              onFontChange={handleFontChange}
              onColorChange={handleColorChange}
            />
          </div>
        </div>

        <div className="polaroid-editor-footer">
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
  )
}
