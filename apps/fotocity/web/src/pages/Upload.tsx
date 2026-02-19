import { useState, useRef, useCallback, useEffect } from 'react'
import { PhotoEditor, PhotoEditState, renderPhoto, getDefaultEditState } from '../components/PhotoEditor'
import { PHOTO_SIZES, parsePhotoSize, PhotoSizeInfo } from '../utils/photoSizes'
import { processImageFile, isHeicFile } from '../utils/imageUtils'

// Version for debugging
const APP_VERSION = '1.0.5'

// API base - usa a API do Worker (R2) em produção ou proxy local em dev
const API_BASE = import.meta.env.VITE_API_URL || ''
const WEBHOOK_URL = 'https://n8n.fotocity.com.br/webhook/envio-fotos'
const WHATSAPP_SUPPORT = '5511957323619'

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

function getToday(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const nn = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}_${hh}-${nn}`
}

export default function Upload() {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, status: '' })
  const [success, setSuccess] = useState(false)

  const [photoSize, setPhotoSize] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whats, setWhats] = useState('')

  // Photo editor state
  const [photoEdits, setPhotoEdits] = useState<Map<number, PhotoEditState>>(new Map())
  const [photoPreviews, setPhotoPreviews] = useState<Map<number, string>>(new Map())
  const [editingIndex, setEditingIndex] = useState<number>(-1)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const params = new URLSearchParams(window.location.search)
  const minImages = params.get('min') ? parseInt(params.get('min')!) : null
  const maxImages = params.get('max') ? parseInt(params.get('max')!) : null
  const defaultSize = params.get('tamanho') || ''
  const lockedSize = params.get('tamanho') || ''

  // Get current selected size info
  const currentSize = photoSize || defaultSize
  const sizeInfo: PhotoSizeInfo | null = currentSize ? parsePhotoSize(currentSize) : null
  const isPolaroidMode = sizeInfo?.isPolaroid ?? false
  const hasSelectedSize = !!sizeInfo

  // Calculate total photos considering copies
  const getTotalPhotos = () => {
    let total = 0
    for (let i = 0; i < files.length; i++) {
      const editState = photoEdits.get(i)
      total += editState?.copies || 1
    }
    return total
  }
  const totalPhotos = getTotalPhotos()

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')

  const handleFiles = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles) return

    const incoming = Array.from(newFiles)

    if (maxImages && (files.length + incoming.length) > maxImages) {
      showMessage(`Voce so pode enviar ate ${maxImages} imagens.`, 'error')
      return
    }

    // Check if any HEIC files need conversion
    const hasHeic = incoming.some(isHeicFile)
    if (hasHeic) {
      setProcessing(true)
      setProcessingStatus('Processando imagens...')
    }

    try {
      const processedFiles: File[] = []
      const newPreviews: string[] = []

      for (const file of incoming) {
        if (isHeicFile(file)) {
          setProcessingStatus(`Convertendo ${file.name}...`)
        }

        const { file: processedFile, dataUrl } = await processImageFile(file)
        processedFiles.push(processedFile)
        newPreviews.push(dataUrl)
      }

      setFiles(prev => [...prev, ...processedFiles])
      setPreviews(prev => [...prev, ...newPreviews])
    } catch (error) {
      console.error('Error processing files:', error)
      showMessage('Erro ao processar imagem. Tente outro formato.', 'error')
    } finally {
      setProcessing(false)
      setProcessingStatus('')
    }
  }, [files.length, maxImages])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
    // Also remove edits for this index and shift others
    setPhotoEdits(prev => {
      const newEdits = new Map<number, PhotoEditState>()
      prev.forEach((value, key) => {
        if (key < index) {
          newEdits.set(key, value)
        } else if (key > index) {
          newEdits.set(key - 1, value)
        }
      })
      return newEdits
    })
    setPhotoPreviews(prev => {
      const newPreviews = new Map<number, string>()
      prev.forEach((value, key) => {
        if (key < index) {
          newPreviews.set(key, value)
        } else if (key > index) {
          newPreviews.set(key - 1, value)
        }
      })
      return newPreviews
    })
  }

  const removeAll = () => {
    setFiles([])
    setPreviews([])
    setPhotoEdits(new Map())
    setPhotoPreviews(new Map())
    setShowForm(false)
    showMessage('Todas as imagens foram removidas.', 'success')
  }

  // Clear edits when size changes
  useEffect(() => {
    if (photoEdits.size > 0 || photoPreviews.size > 0) {
      setPhotoEdits(new Map())
      setPhotoPreviews(new Map())
    }
  }, [currentSize])

  // Handle opening the photo editor
  const handleEditPhoto = (index: number) => {
    if (hasSelectedSize) {
      setEditingIndex(index)
    }
  }

  // Handle saving photo edits
  const handleSavePhoto = (state: PhotoEditState, previewDataUrl: string) => {
    setPhotoEdits(prev => new Map(prev).set(editingIndex, state))
    setPhotoPreviews(prev => new Map(prev).set(editingIndex, previewDataUrl))
    setEditingIndex(-1)
  }

  // Handle canceling photo edit
  const handleCancelEdit = () => {
    setEditingIndex(-1)
  }

  const canProceed = files.length > 0 &&
    (minImages === null || totalPhotos >= minImages) &&
    (maxImages === null || totalPhotos <= maxImages)

  const canSubmit = nome.trim().length > 1 &&
    /.+@.+\..+/.test(email.trim()) &&
    whats.replace(/\D/g, '').length >= 10

  const getProductId = () => {
    const base = getToday()
    const sel = (photoSize || defaultSize).replace(/\s+/g, '').replace(/[^a-zA-Z0-9x-]/g, '')
    return sel ? `${base}_${sel}` : base
  }

  const handleSubmit = async () => {
    if (!canSubmit || uploading || !sizeInfo) return

    setUploading(true)
    setUploadProgress({ current: 0, total: files.length, status: 'Preparando...' })

    const clientId = email.trim()
    const productId = getProductId()

    try {
      // Upload each file once with copies as metadata
      let totalCopies = 0
      for (let i = 0; i < files.length; i++) {
        const editState = photoEdits.get(i)
        const copies = editState?.copies || 1
        totalCopies += copies

        // Update progress - processing
        setUploadProgress({
          current: i + 1,
          total: files.length,
          status: `Processando foto ${i + 1} de ${files.length}...`
        })

        // ALWAYS render photos to correct print size with upscaling if needed
        // Use existing edit state or create default one
        const isRectangular = sizeInfo.orientation !== 'square' && !sizeInfo.isPolaroid
        const finalEditState = editState || getDefaultEditState(sizeInfo.isPolaroid, isRectangular)

        const photoBlob = await renderPhoto(previews[i], finalEditState, sizeInfo, true)
        const fileToUpload = new File([photoBlob], `photo_${i}.jpg`, { type: 'image/jpeg' })

        // Update progress - uploading
        setUploadProgress({
          current: i + 1,
          total: files.length,
          status: `Enviando foto ${i + 1} de ${files.length}...`
        })

        // Upload file once with copies metadata
        const formData = new FormData()
        formData.append('id_cliente', clientId)
        formData.append('id_produto', productId)
        formData.append('img_file', fileToUpload)
        formData.append('action', 'add_image')
        formData.append('copies', String(copies))

        // Save client metadata on first upload
        if (i === 0) {
          formData.append('nome', nome.trim())
          formData.append('telefone', whats.trim())
        }

        await fetch(`${API_BASE}/api/photos`, {
          method: 'POST',
          body: formData,
        })
      }

      // Send webhook with album URL
      const albumUrl = `https://fotocity.paulopina.com/manager?client=${encodeURIComponent(clientId)}&product=${encodeURIComponent(productId)}`
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim(),
            telefone: whats.trim(),
            numero_fotos: totalCopies,
            url_album: albumUrl,
          }),
        })
      } catch {
        // Webhook errors are not critical
      }

      setSuccess(true)
      setFiles([])
      setPreviews([])
      setPhotoEdits(new Map())
      setPhotoPreviews(new Map())
    } catch (err) {
      showMessage('Erro ao enviar fotos. Tente novamente.', 'error')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div>
        <div className="fc-topbar">
          <div className="social-links">
            <a href="https://www.instagram.com/fotocityoficial/" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://www.facebook.com/fotocitygrafica/" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook"></i>
            </a>
          </div>
        </div>
        <div className="fc-header">
          <img src="https://cdn.iset.io/assets/73325/imagens/logo-foto-city.png" alt="FotoCity Logo" />
        </div>
        <div className="upload-container">
          <div className="success-title">Fotos enviadas com sucesso!</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="fc-topbar">
        <div className="social-links">
          <a href="https://www.instagram.com/fotocityoficial/" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://www.facebook.com/fotocitygrafica/" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook"></i>
          </a>
        </div>
      </div>

      <div className="fc-header">
        <img src="https://cdn.iset.io/assets/73325/imagens/logo-foto-city.png" alt="FotoCity Logo" />
      </div>

      {/* Processing overlay for HEIC conversion */}
      {processing && (
        <div className="download-overlay">
          <div className="download-modal">
            <div className="download-spinner"></div>
            <p>{processingStatus || 'Processando...'}</p>
          </div>
        </div>
      )}

      {/* Upload progress overlay */}
      {uploading && (
        <div className="download-overlay">
          <div className="download-modal">
            <div className="download-spinner"></div>
            <h3 style={{ marginBottom: 10 }}>Enviando fotos...</h3>
            <p>{uploadProgress.status}</p>
            {uploadProgress.total > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                {uploadProgress.current} / {uploadProgress.total}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="upload-container">
        <div
          className="upload-box"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
        >
          <span>
            <i className="fas fa-cloud-upload-alt"></i> Clique ou arraste suas fotos aqui
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.HEIC,.raw"
            multiple
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = '' // Reset para permitir selecionar os mesmos arquivos novamente
            }}
            style={{ display: 'none' }}
          />
        </div>

        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        <div className={`image-count ${(minImages && totalPhotos < minImages) || (maxImages && totalPhotos > maxImages) ? 'warn' : ''}`}>
          {totalPhotos === files.length ? (
            <>Fotos: {totalPhotos}</>
          ) : (
            <>{files.length} imagens = <strong>{totalPhotos} fotos</strong> (com cópias)</>
          )}
          {minImages !== null && maxImages !== null && (
            <span className="limits-info"> • Limite: {minImages} a {maxImages} fotos</span>
          )}
          {minImages !== null && maxImages === null && (
            <span className="limits-info"> • Mínimo: {minImages} fotos</span>
          )}
          {minImages === null && maxImages !== null && (
            <span className="limits-info"> • Máximo: {maxImages} fotos</span>
          )}
        </div>

        {/* Edit hint when size is selected */}
        {hasSelectedSize && files.length > 0 && (
          <div className={`photo-edit-hint ${isPolaroidMode ? 'polaroid' : ''}`}>
            <i className="fas fa-info-circle"></i>
            <span>
              {isPolaroidMode
                ? 'Clique em cada foto para posicionar, adicionar filtros e legenda.'
                : 'Clique em cada foto para posicionar e adicionar filtros.'}
              {photoEdits.size > 0 && (
                <strong> ({photoEdits.size}/{files.length} editadas)</strong>
              )}
            </span>
          </div>
        )}

        <div className={`preview-grid ${sizeInfo ? `preview-grid-${sizeInfo.isPolaroid ? 'polaroid' : sizeInfo.orientation}` : ''}`}>
          {previews.map((preview, index) => {
            const editState = photoEdits.get(index)
            const isEdited = hasSelectedSize && editState
            // Use edited orientation if available, otherwise fall back to sizeInfo
            const photoOrientation = editState?.orientation || sizeInfo?.orientation || 'portrait'
            const itemClass = isPolaroidMode
              ? 'preview-item polaroid'
              : sizeInfo
              ? `preview-item preview-item-${photoOrientation}`
              : 'preview-item'

            return (
              <div
                key={index}
                className={`${itemClass} ${hasSelectedSize ? 'editable' : ''}`}
                onClick={() => handleEditPhoto(index)}
                style={{ cursor: hasSelectedSize ? 'pointer' : 'default' }}
              >
                <img
                  src={photoPreviews.get(index) || preview}
                  alt={`Preview ${index + 1}`}
                  style={editState?.filter && !photoPreviews.has(index) ? { filter: editState.filter.css } : undefined}
                />
                {isPolaroidMode && (
                  <div className={`polaroid-caption ${!editState?.caption ? 'empty' : ''}`}
                       style={editState?.font ? { fontFamily: `'${editState.font.family}', cursive` } : undefined}>
                    {editState?.caption || 'Sem legenda'}
                  </div>
                )}
                {hasSelectedSize && !isEdited && (
                  <div className="edit-overlay">
                    <i className="fas fa-edit"></i>
                    <span>Editar</span>
                  </div>
                )}
                {isEdited && (
                  <div className="edit-check">
                    <i className="fas fa-check"></i>
                  </div>
                )}
                {/* Copies badge */}
                {(editState?.copies || 1) > 1 && (
                  <div className="copies-badge">
                    <i className="fas fa-copy"></i>
                    <span>{editState?.copies}</span>
                  </div>
                )}
                <div
                  className="delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  &times;
                </div>
              </div>
            )
          })}
        </div>

        {/* Photo Editor Modal */}
        {editingIndex >= 0 && sizeInfo && (
          <PhotoEditor
            preview={previews[editingIndex]}
            sizeInfo={sizeInfo}
            editState={photoEdits.get(editingIndex) || null}
            onSave={handleSavePhoto}
            onCancel={handleCancelEdit}
          />
        )}

        {!showForm && (
          <div className="btn-foot">
            <button className="btn danger" onClick={removeAll}>
              <i className="fas fa-trash"></i> Excluir Todas
            </button>
            <button
              className={`btn primary ${!canProceed ? 'disabled' : ''}`}
              disabled={!canProceed}
              onClick={() => setShowForm(true)}
            >
              <i className="fas fa-check-circle"></i> CONCLUIR ENVIO DE FOTOS
            </button>
            <a
              href={`https://wa.me/${WHATSAPP_SUPPORT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn whats"
            >
              <i className="fab fa-whatsapp"></i> Suporte via WhatsApp
            </a>
          </div>
        )}

        {showForm && (
          <div className="finalize-form">
            <div className="form-grid">
              <div className="form-item">
                <label htmlFor="photo-size">Tamanho das Fotos</label>
                <select
                  id="photo-size"
                  value={photoSize || defaultSize}
                  onChange={(e) => setPhotoSize(e.target.value)}
                  disabled={!!lockedSize}
                >
                  <option value="">SELECIONE O TAMANHO</option>
                  {PHOTO_SIZES.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="form-item">
                <label htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-item">
                <label htmlFor="whats">WhatsApp</label>
                <input
                  id="whats"
                  type="tel"
                  placeholder="(11) 91234-5678"
                  value={whats}
                  onChange={(e) => setWhats(formatPhoneBR(e.target.value))}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                className={`btn green ${!canSubmit || uploading ? 'disabled' : ''}`}
                disabled={!canSubmit || uploading}
                onClick={handleSubmit}
              >
                <i className="fas fa-paper-plane"></i>
                {uploading ? 'Enviando... aguarde' : 'CONCLUIR ENVIO DE FOTOS'}
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="btn-foot" style={{ marginTop: 15 }}>
            <button className="btn danger" onClick={removeAll}>
              <i className="fas fa-trash"></i> Excluir Todas
            </button>
          </div>
        )}

        {/* Version footer */}
        <div style={{ textAlign: 'center', marginTop: 30, padding: 10, color: '#999', fontSize: 12 }}>
          <span>v{APP_VERSION}</span>
          <span style={{ margin: '0 10px' }}>|</span>
          <a
            href={`https://wa.me/${WHATSAPP_SUPPORT}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#25d366', textDecoration: 'none' }}
          >
            <i className="fab fa-whatsapp"></i> Suporte
          </a>
        </div>
      </div>
    </div>
  )
}
