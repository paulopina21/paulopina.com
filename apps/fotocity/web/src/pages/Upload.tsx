import { useState, useRef, useCallback, useEffect } from 'react'
import {
  PolaroidEditor,
  PolaroidEditState,
  renderPolaroid,
  loadFonts,
} from '../components/PolaroidEditor'

const PHOTO_SIZES = [
  '8x8', 'Polaroid 8x10', '9x12', '10x10', '10x15', '13x18',
  '15x15', '15x20', '20x20', '20x25', '20x30', '25x25', '30x30', '30x40', '30x42'
]

// API base - usa a API do Worker (R2) em produção ou proxy local em dev
const API_BASE = import.meta.env.VITE_API_URL || ''
const WEBHOOK_URL = 'https://n8n.fotocity.com.br/webhook/envio-fotos'

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
  const [success, setSuccess] = useState(false)

  const [photoSize, setPhotoSize] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whats, setWhats] = useState('')

  // Polaroid editor state
  const [polaroidEdits, setPolaroidEdits] = useState<Map<number, PolaroidEditState>>(new Map())
  const [polaroidPreviews, setPolaroidPreviews] = useState<Map<number, string>>(new Map())
  const [editingIndex, setEditingIndex] = useState<number>(-1)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const params = new URLSearchParams(window.location.search)
  const minImages = params.get('min') ? parseInt(params.get('min')!) : null
  const maxImages = params.get('max') ? parseInt(params.get('max')!) : null
  const defaultSize = params.get('tamanho') || ''

  // Check if Polaroid mode is active
  const isPolaroidMode = (photoSize || defaultSize) === 'Polaroid 8x10'

  // Load fonts when Polaroid mode is activated
  useEffect(() => {
    if (isPolaroidMode) {
      loadFonts()
    }
  }, [isPolaroidMode])

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return

    const incoming = Array.from(newFiles)

    if (maxImages && (files.length + incoming.length) > maxImages) {
      showMessage(`Voce so pode enviar ate ${maxImages} imagens.`, 'error')
      return
    }

    const newPreviews: string[] = []
    incoming.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === incoming.length) {
          setPreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })

    setFiles(prev => [...prev, ...incoming])
  }, [files.length, maxImages])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
    // Also remove polaroid edits for this index and shift others
    setPolaroidEdits(prev => {
      const newEdits = new Map<number, PolaroidEditState>()
      prev.forEach((value, key) => {
        if (key < index) {
          newEdits.set(key, value)
        } else if (key > index) {
          newEdits.set(key - 1, value)
        }
      })
      return newEdits
    })
    setPolaroidPreviews(prev => {
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
    setPolaroidEdits(new Map())
    setPolaroidPreviews(new Map())
    setShowForm(false)
    showMessage('Todas as imagens foram removidas.', 'success')
  }

  // Handle opening the Polaroid editor
  const handleEditPolaroid = (index: number) => {
    if (isPolaroidMode) {
      setEditingIndex(index)
    }
  }

  // Handle saving Polaroid edits
  const handleSavePolaroid = (state: PolaroidEditState, previewDataUrl: string) => {
    setPolaroidEdits(prev => new Map(prev).set(editingIndex, state))
    setPolaroidPreviews(prev => new Map(prev).set(editingIndex, previewDataUrl))
    setEditingIndex(-1)
  }

  // Handle canceling Polaroid edit
  const handleCancelPolaroid = () => {
    setEditingIndex(-1)
  }

  const canProceed = files.length > 0 &&
    (minImages === null || files.length >= minImages) &&
    (maxImages === null || files.length <= maxImages)

  const canSubmit = nome.trim().length > 1 &&
    /.+@.+\..+/.test(email.trim()) &&
    whats.replace(/\D/g, '').length >= 10

  const getProductId = () => {
    const base = getToday()
    const sel = (photoSize || defaultSize).replace(/\s+/g, '').replace(/[^a-zA-Z0-9x-]/g, '')
    return sel ? `${base}_${sel}` : base
  }

  const handleSubmit = async () => {
    if (!canSubmit || uploading) return

    setUploading(true)

    const clientId = email.trim()
    const productId = getProductId()

    try {
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        let fileToUpload: File | Blob = files[i]

        // If in Polaroid mode and this file has edits, render the final image
        if (isPolaroidMode && polaroidEdits.has(i)) {
          const editState = polaroidEdits.get(i)!
          const polaroidBlob = await renderPolaroid(previews[i], editState)
          fileToUpload = new File([polaroidBlob], `polaroid_${i}.jpg`, { type: 'image/jpeg' })
        }

        const formData = new FormData()
        formData.append('id_cliente', clientId)
        formData.append('id_produto', productId)
        formData.append('img_file', fileToUpload)
        formData.append('action', 'add_image')

        await fetch(`${API_BASE}/api/photos`, {
          method: 'POST',
          body: formData,
        })
      }

      // Send webhook
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim(),
            telefone: whats.trim(),
            numero_fotos: files.length,
            apiBase: API_BASE,
          }),
        })
      } catch {
        // Webhook errors are not critical
      }

      setSuccess(true)
      setFiles([])
      setPreviews([])
      setPolaroidEdits(new Map())
      setPolaroidPreviews(new Map())
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

        <div className={`image-count ${minImages && files.length < minImages ? 'warn' : ''}`}>
          Imagens adicionadas: {files.length}
          {minImages !== null && maxImages !== null && ` (minimo ${minImages} / maximo ${maxImages})`}
          {minImages !== null && maxImages === null && ` (minimo ${minImages})`}
          {minImages === null && maxImages !== null && ` (maximo ${maxImages})`}
        </div>

        {/* Polaroid mode hint */}
        {isPolaroidMode && files.length > 0 && (
          <div className="polaroid-hint">
            <i className="fas fa-info-circle"></i>
            <span>
              Clique em cada foto para posicionar e adicionar legenda.
              {polaroidEdits.size > 0 && (
                <strong> ({polaroidEdits.size}/{files.length} editadas)</strong>
              )}
            </span>
          </div>
        )}

        <div className="preview-grid">
          {previews.map((preview, index) => (
            <div
              key={index}
              className={`preview-item ${isPolaroidMode ? 'polaroid' : ''}`}
              onClick={() => handleEditPolaroid(index)}
              style={{ cursor: isPolaroidMode ? 'pointer' : 'default' }}
            >
              <img
                src={polaroidPreviews.get(index) || preview}
                alt={`Preview ${index + 1}`}
              />
              {isPolaroidMode && !polaroidEdits.has(index) && (
                <div className="edit-overlay">
                  <i className="fas fa-edit"></i>
                  <span>Editar</span>
                </div>
              )}
              {isPolaroidMode && polaroidEdits.has(index) && (
                <span className="edit-badge edited">Editado</span>
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
          ))}
        </div>

        {/* Polaroid Editor Modal */}
        {editingIndex >= 0 && isPolaroidMode && (
          <PolaroidEditor
            preview={previews[editingIndex]}
            editState={polaroidEdits.get(editingIndex) || null}
            onSave={handleSavePolaroid}
            onCancel={handleCancelPolaroid}
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
              href="https://wa.me/5511999999999"
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
      </div>
    </div>
  )
}
