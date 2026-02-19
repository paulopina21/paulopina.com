import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkSession, logout, getClients, getClientProducts, getProductPhotos, Client } from '../api'
import { extractSizeFromProductId, parsePhotoSize, PHOTO_SIZES } from '../utils/photoSizes'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Product {
  produto: string
  data: number
  qtd: number
}

interface Photo {
  key: string
  url: string
  data: number
  copies: number
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const nn = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${nn}`
}

function formatProductName(produto: string): string {
  const match = produto.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})_?(.*)/)
  if (match) {
    const [, year, month, day, hour, min, size] = match
    const dateStr = `${day}/${month}/${year} ${hour}:${min}`
    return size ? `${dateStr} - ${size.replace(/(\d+x\d+)/, ' $1')}` : dateStr
  }
  return produto
}

function isOlderThan3Months(timestamp: number): boolean {
  const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000)
  return timestamp < threeMonthsAgo
}

function getWhatsAppUrl(telefone: string): string {
  const digits = telefone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

// Download a single file
async function downloadSingleFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error('Download failed')
  const blob = await response.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

// Download multiple files as ZIP (flat structure)
async function downloadAsZip(
  photos: Photo[],
  zipName: string,
  onProgress: (current: number, total: number) => void
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (let i = 0; i < photos.length; i++) {
    onProgress(i + 1, photos.length)
    const photo = photos[i]
    const response = await fetch(`${API_BASE}${photo.url}`, { credentials: 'include' })
    if (!response.ok) continue
    const blob = await response.blob()
    const ext = photo.key.split('.').pop() || 'jpg'
    const copies = photo.copies || 1
    const copiesLabel = copies === 1 ? '1 cópia' : `${copies} cópias`
    zip.file(`Foto ${i + 1} (${copiesLabel}).${ext}`, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `${zipName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

// Format product name for folder (filesystem-safe)
function formatProductFolder(produto: string): string {
  const match = produto.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})_?(.*)/)
  if (match) {
    const [, year, month, day, hour, min, size] = match
    const dateStr = `${day}-${month}-${year}_${hour}h${min}`
    return size ? `${dateStr}_${size}` : dateStr
  }
  return produto.replace(/[/:*?"<>|]/g, '-')
}

// Download client photos organized by product folders
async function downloadClientAsZip(
  products: { produto: string; photos: Photo[] }[],
  zipName: string,
  onProgress: (current: number, total: number) => void
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // Count total photos
  const totalPhotos = products.reduce((sum, p) => sum + p.photos.length, 0)
  let processed = 0

  for (const product of products) {
    const folderName = formatProductFolder(product.produto)
    const folder = zip.folder(folderName)
    if (!folder) continue

    for (let i = 0; i < product.photos.length; i++) {
      processed++
      onProgress(processed, totalPhotos)
      const photo = product.photos[i]
      const response = await fetch(`${API_BASE}${photo.url}`, { credentials: 'include' })
      if (!response.ok) continue
      const blob = await response.blob()
      const ext = photo.key.split('.').pop() || 'jpg'
      const copies = photo.copies || 1
      const copiesLabel = copies === 1 ? '1 cópia' : `${copies} cópias`
      folder.file(`Foto ${i + 1} (${copiesLabel}).${ext}`, blob)
    }
  }

  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `${zipName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

export default function Manager() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [sortBy, setSortBy] = useState<'nome' | 'data'>('data')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [sizeFilter, setSizeFilter] = useState('')
  const [productDateFilter, setProductDateFilter] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)

  // Link generator state
  const [showLinkGenerator, setShowLinkGenerator] = useState(false)
  const [linkSize, setLinkSize] = useState('')
  const [linkMin, setLinkMin] = useState('')
  const [linkMax, setLinkMax] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  // Download state
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })

  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const loggedIn = await checkSession()
      if (!loggedIn) {
        navigate('/login')
        return
      }

      const data = await getClients()
      setClients(data)
      setLoading(false)

      // Check URL parameters for direct navigation
      const params = new URLSearchParams(window.location.search)
      const clientParam = params.get('client')
      const productParam = params.get('product')

      if (clientParam) {
        const client = data.find(c => c.email === clientParam)
        if (client) {
          setSelectedClient(client)
          setLoadingProducts(true)
          const products = await getClientProducts(client.email)
          setProducts(products)
          setLoadingProducts(false)

          if (productParam) {
            const product = products.find(p => p.produto === productParam)
            if (product) {
              setSelectedProduct(productParam)
              setLoadingPhotos(true)
              const photos = await getProductPhotos(client.email, productParam)
              setPhotos(photos)
              setLoadingPhotos(false)
            }
          }
        }
        window.history.replaceState({}, '', '/manager')
      }
    }
    init()
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleGoHome = () => {
    setSelectedClient(null)
    setSelectedProduct(null)
    setProducts([])
    setPhotos([])
    setSelectedClientIds(new Set())
    setSelectedProductIds(new Set())
  }

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c =>
        c.email.toLowerCase().includes(term) ||
        c.nome.toLowerCase().includes(term) ||
        c.telefone.includes(term)
      )
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter).getTime()
      const nextDay = filterDate + 24 * 60 * 60 * 1000
      result = result.filter(c => c.data >= filterDate && c.data < nextDay)
    }

    if (sortBy === 'nome') {
      result.sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email))
    } else {
      result.sort((a, b) => b.data - a.data)
    }

    return result
  }, [clients, searchTerm, dateFilter, sortBy])

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (sizeFilter) {
      result = result.filter(p => {
        const size = extractSizeFromProductId(p.produto)
        return size?.toLowerCase().includes(sizeFilter.toLowerCase())
      })
    }

    if (productDateFilter) {
      const filterDate = new Date(productDateFilter).getTime()
      const nextDay = filterDate + 24 * 60 * 60 * 1000
      result = result.filter(p => p.data >= filterDate && p.data < nextDay)
    }

    return result.sort((a, b) => b.data - a.data)
  }, [products, sizeFilter, productDateFilter])

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client)
    setSelectedProduct(null)
    setPhotos([])
    setLoadingProducts(true)
    setSelectedProductIds(new Set())

    const data = await getClientProducts(client.email)
    setProducts(data)
    setLoadingProducts(false)
  }

  const handleSelectProduct = async (productId: string) => {
    setSelectedProduct(productId)
    setLoadingPhotos(true)

    const data = await getProductPhotos(selectedClient!.email, productId)
    setPhotos(data)
    setLoadingPhotos(false)
  }

  const handleBack = () => {
    if (selectedProduct) {
      setSelectedProduct(null)
      setPhotos([])
    } else if (selectedClient) {
      setSelectedClient(null)
      setProducts([])
      setSelectedProductIds(new Set())
    }
  }

  // Client selection
  const toggleClientSelection = (email: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(selectedClientIds)
    if (newSet.has(email)) {
      newSet.delete(email)
    } else {
      newSet.add(email)
    }
    setSelectedClientIds(newSet)
  }

  const selectOldClients = () => {
    const oldClients = filteredClients.filter(c => isOlderThan3Months(c.data))
    setSelectedClientIds(new Set(oldClients.map(c => c.email)))
  }

  const clearClientSelection = () => {
    setSelectedClientIds(new Set())
  }

  // Product selection
  const toggleProductSelection = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(selectedProductIds)
    if (newSet.has(productId)) {
      newSet.delete(productId)
    } else {
      newSet.add(productId)
    }
    setSelectedProductIds(newSet)
  }

  const selectOldProducts = () => {
    const oldProducts = filteredProducts.filter(p => isOlderThan3Months(p.data))
    setSelectedProductIds(new Set(oldProducts.map(p => p.produto)))
  }

  const clearProductSelection = () => {
    setSelectedProductIds(new Set())
  }

  // Download operations
  const handleDownloadClientPhotos = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation()
    if (downloading) return

    setDownloading(true)
    setDownloadProgress({ current: 0, total: 0 })

    try {
      const prods = await getClientProducts(client.email)
      const productsWithPhotos: { produto: string; photos: Photo[] }[] = []
      let totalPhotos = 0

      for (const prod of prods) {
        const photos = await getProductPhotos(client.email, prod.produto)
        if (photos.length > 0) {
          productsWithPhotos.push({ produto: prod.produto, photos })
          totalPhotos += photos.length
        }
      }

      if (totalPhotos === 0) {
        alert('Nenhuma foto encontrada')
        return
      }

      if (totalPhotos === 1) {
        const photo = productsWithPhotos[0].photos[0]
        const ext = photo.key.split('.').pop() || 'jpg'
        await downloadSingleFile(`${API_BASE}${photo.url}`, `${client.nome || client.email}.${ext}`)
      } else {
        // Download organized by folders
        await downloadClientAsZip(productsWithPhotos, client.nome || client.email, (current, total) => {
          setDownloadProgress({ current, total })
        })
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Erro ao baixar fotos')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadProductPhotos = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (downloading) return

    setDownloading(true)
    setDownloadProgress({ current: 0, total: 0 })

    try {
      const photos = await getProductPhotos(selectedClient!.email, productId)

      if (photos.length === 0) {
        alert('Nenhuma foto encontrada')
        return
      }

      const zipName = `${selectedClient!.nome || selectedClient!.email}_${formatProductName(productId).replace(/[/:]/g, '-')}`

      if (photos.length === 1) {
        const photo = photos[0]
        const ext = photo.key.split('.').pop() || 'jpg'
        await downloadSingleFile(`${API_BASE}${photo.url}`, `${zipName}.${ext}`)
      } else {
        await downloadAsZip(photos, zipName, (current, total) => {
          setDownloadProgress({ current, total })
        })
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Erro ao baixar fotos')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadAllCurrentPhotos = async () => {
    if (downloading) return

    setDownloading(true)
    setDownloadProgress({ current: 0, total: 0 })

    try {
      if (photos.length === 0) {
        alert('Nenhuma foto encontrada')
        return
      }

      const zipName = `${selectedClient!.nome || selectedClient!.email}_${formatProductName(selectedProduct!).replace(/[/:]/g, '-')}`

      if (photos.length === 1) {
        const photo = photos[0]
        const ext = photo.key.split('.').pop() || 'jpg'
        await downloadSingleFile(`${API_BASE}${photo.url}`, `${zipName}.${ext}`)
      } else {
        await downloadAsZip(photos, zipName, (current, total) => {
          setDownloadProgress({ current, total })
        })
      }
    } catch (err) {
      console.error('Download error:', err)
      alert('Erro ao baixar fotos')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPhoto = async (photo: Photo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (downloading) return

    setDownloading(true)

    try {
      const filename = photo.key.split('/').pop() || 'photo.jpg'
      await downloadSingleFile(`${API_BASE}${photo.url}`, filename)
    } catch (err) {
      console.error('Download error:', err)
      alert('Erro ao baixar foto')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <p>Carregando...</p>
      </div>
    )
  }

  const sizeStr = selectedProduct ? extractSizeFromProductId(selectedProduct) : null
  const sizeInfo = sizeStr ? parsePhotoSize(sizeStr) : null

  const getPhotoItemSize = () => {
    const count = photos.length
    if (count <= 4) return 'large'
    if (count <= 12) return 'medium'
    return 'small'
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
        <img
          src="https://cdn.iset.io/assets/73325/imagens/logo-foto-city.png"
          alt="FotoCity Logo"
          onClick={handleGoHome}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* Download Progress Overlay */}
      {downloading && (
        <div className="download-overlay">
          <div className="download-modal">
            <div className="download-spinner"></div>
            <p>
              {downloadProgress.total > 0
                ? `Baixando ${downloadProgress.current} de ${downloadProgress.total} fotos...`
                : 'Preparando download...'}
            </p>
          </div>
        </div>
      )}

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-title">
            {selectedProduct ? (() => {
              const totalCopies = photos.reduce((sum, p) => sum + (p.copies || 1), 0)
              const hasCopies = totalCopies > photos.length
              return (
                <>
                  <h1>
                    {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'} do Envio
                    {hasCopies && <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666' }}> ({totalCopies} impressões)</span>}
                  </h1>
                  <span className="admin-subtitle">{formatProductName(selectedProduct)}</span>
                </>
              )
            })() : selectedClient ? (
              <>
                <h1>{selectedClient.nome || selectedClient.email}</h1>
                <span className="admin-subtitle">
                  ({selectedClient.email})
                  {selectedClient.telefone && (
                    <a
                      href={getWhatsAppUrl(selectedClient.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-link"
                      title="Abrir WhatsApp"
                    >
                      <i className="fab fa-whatsapp"></i>
                    </a>
                  )}
                </span>
              </>
            ) : (
              <h1>Gerenciador de Clientes</h1>
            )}
          </div>
          <div className="admin-actions">
            {selectedProduct && (
              <button className="btn primary" onClick={handleDownloadAllCurrentPhotos} disabled={downloading}>
                <i className="fas fa-download"></i> Baixar Todas
              </button>
            )}
            {(selectedClient || selectedProduct) && (
              <button className="btn primary" onClick={handleBack}>
                <i className="fas fa-arrow-left"></i> Voltar
              </button>
            )}
            {!selectedClient && (
              <button className="btn primary" onClick={() => setShowLinkGenerator(true)}>
                <i className="fas fa-link"></i> Gerar Link
              </button>
            )}
            <button className="btn danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Sair
            </button>
          </div>
        </div>

        {/* Client List View */}
        {!selectedClient && (
          <>
            {/* Filters */}
            <div className="admin-filters">
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="filter-input"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'nome' | 'data')}
                className="filter-select"
              >
                <option value="data">Ordenar por Data</option>
                <option value="nome">Ordenar por Nome</option>
              </select>
            </div>

            {/* Selection Actions */}
            <div className="admin-selection-bar">
              <div className="selection-info">
                {selectedClientIds.size > 0 && (
                  <span>{selectedClientIds.size} selecionado(s)</span>
                )}
              </div>
              <div className="selection-actions">
                <button className="btn-small" onClick={selectOldClients}>
                  Selecionar Antigos (+3 meses)
                </button>
                {selectedClientIds.size > 0 && (
                  <button className="btn-small" onClick={clearClientSelection}>
                    Limpar Seleção
                  </button>
                )}
              </div>
            </div>

            {/* Client Table */}
            {filteredClients.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <table className="client-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Última Atualização</th>
                    <th style={{ width: 120 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.email}
                      className={`clickable-row ${isOlderThan3Months(client.data) ? 'old-item' : ''}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      <td onClick={(e) => toggleClientSelection(client.email, e)}>
                        <input
                          type="checkbox"
                          checked={selectedClientIds.has(client.email)}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <div className="client-info">
                          <strong>{client.nome || '-'}</strong>
                          <span className="client-email">{client.email}</span>
                        </div>
                      </td>
                      <td>{client.telefone || '-'}</td>
                      <td>{formatDate(client.data)}</td>
                      <td className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={(e) => handleDownloadClientPhotos(client, e)}
                          title="Baixar todas as fotos"
                          disabled={downloading}
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button
                          className="btn-icon primary"
                          onClick={(e) => { e.stopPropagation(); handleSelectClient(client) }}
                          title="Ver envios"
                        >
                          <i className="fas fa-images"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Products List View */}
        {selectedClient && !selectedProduct && (
          <>
            {/* Filters */}
            <div className="admin-filters">
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os tamanhos</option>
                {PHOTO_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <input
                type="date"
                value={productDateFilter}
                onChange={(e) => setProductDateFilter(e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Selection Actions */}
            <div className="admin-selection-bar">
              <div className="selection-info">
                {selectedProductIds.size > 0 && (
                  <span>{selectedProductIds.size} selecionado(s)</span>
                )}
              </div>
              <div className="selection-actions">
                <button className="btn-small" onClick={selectOldProducts}>
                  Selecionar Antigos (+3 meses)
                </button>
                {selectedProductIds.size > 0 && (
                  <button className="btn-small" onClick={clearProductSelection}>
                    Limpar Seleção
                  </button>
                )}
              </div>
            </div>

            {loadingProducts ? (
              <div className="loading-state">
                <p>Carregando envios...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum envio encontrado.</p>
              </div>
            ) : (
              <table className="client-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Envio</th>
                    <th>Qtd Fotos</th>
                    <th>Data</th>
                    <th style={{ width: 120 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.produto}
                      className={`clickable-row ${isOlderThan3Months(product.data) ? 'old-item' : ''}`}
                      onClick={() => handleSelectProduct(product.produto)}
                    >
                      <td onClick={(e) => toggleProductSelection(product.produto, e)}>
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(product.produto)}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{formatProductName(product.produto)}</td>
                      <td>{product.qtd}</td>
                      <td>{formatDate(product.data)}</td>
                      <td className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={(e) => handleDownloadProductPhotos(product.produto, e)}
                          title="Baixar fotos"
                          disabled={downloading}
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button
                          className="btn-icon primary"
                          onClick={(e) => { e.stopPropagation(); handleSelectProduct(product.produto) }}
                          title="Ver fotos"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Photo Grid View */}
        {selectedProduct && (
          <>
            {loadingPhotos ? (
              <div className="loading-state">
                <p>Carregando fotos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma foto encontrada.</p>
              </div>
            ) : (
              <div className={`photo-grid photo-grid-${getPhotoItemSize()} ${sizeInfo?.isPolaroid ? 'photo-grid-polaroid' : sizeInfo?.orientation === 'portrait' ? 'photo-grid-portrait' : sizeInfo?.orientation === 'landscape' ? 'photo-grid-landscape' : 'photo-grid-square'}`}>
                {photos.map((photo, index) => (
                  <div
                    key={photo.key}
                    className={`photo-item ${sizeInfo?.isPolaroid ? 'polaroid-frame' : ''}`}
                    onClick={() => setLightboxPhoto(photo)}
                  >
                    <img
                      src={`${API_BASE}${photo.url}`}
                      alt={`Foto ${index + 1}`}
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        const parent = img.parentElement
                        if (parent) {
                          // Set aspect ratio from actual image dimensions
                          parent.style.aspectRatio = `${img.naturalWidth}/${img.naturalHeight}`
                          const resEl = parent.querySelector('.photo-resolution')
                          if (resEl) {
                            resEl.textContent = `${img.naturalWidth} x ${img.naturalHeight}px`
                          }
                        }
                      }}
                    />
                    {photo.copies > 1 && (
                      <div className="copies-badge">
                        <i className="fas fa-copy"></i> {photo.copies}x
                      </div>
                    )}
                    <div className="photo-info">
                      <span className="photo-resolution">Carregando...</span>
                    </div>
                    <button
                      className="photo-download-btn"
                      onClick={(e) => handleDownloadPhoto(photo, e)}
                      title="Baixar foto"
                      disabled={downloading}
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Link Generator Modal */}
      {showLinkGenerator && (() => {
        const baseUrl = 'https://envios.fotocity.com.br/'
        const queryParts: string[] = []
        if (linkSize) queryParts.push(`tamanho=${encodeURIComponent(linkSize)}`)
        if (linkMin) queryParts.push(`min=${linkMin}`)
        if (linkMax) queryParts.push(`max=${linkMax}`)
        const generatedUrl = queryParts.length > 0 ? `${baseUrl}?${queryParts.join('&')}` : baseUrl

        const handleCopy = () => {
          navigator.clipboard.writeText(generatedUrl)
          setLinkCopied(true)
          setTimeout(() => setLinkCopied(false), 2000)
        }

        return (
          <div className="download-overlay" onClick={() => setShowLinkGenerator(false)}>
            <div className="download-modal" style={{ maxWidth: 460, padding: '30px' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 20 }}>Gerar Link para Envios</h3>

              <div className="link-generator-form">
                <div className="form-item">
                  <label>Tamanho das Fotos</label>
                  <select value={linkSize} onChange={(e) => setLinkSize(e.target.value)}>
                    <option value="">Qualquer tamanho</option>
                    {PHOTO_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="link-generator-row">
                  <div className="form-item">
                    <label>Mínimo de fotos</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Sem limite"
                      value={linkMin}
                      onChange={(e) => setLinkMin(e.target.value)}
                    />
                  </div>
                  <div className="form-item">
                    <label>Máximo de fotos</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Sem limite"
                      value={linkMax}
                      onChange={(e) => setLinkMax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="link-url-preview">
                  <span className="link-url-text">{generatedUrl}</span>
                  <button className={`link-copy-btn ${linkCopied ? 'link-copied' : ''}`} onClick={handleCopy}>
                    <i className={`fas ${linkCopied ? 'fa-check' : 'fa-copy'}`}></i>
                    {linkCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button className="btn" onClick={() => setShowLinkGenerator(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="lightbox" onClick={() => setLightboxPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={`${API_BASE}${lightboxPhoto.url}`} alt="Foto ampliada" />
            {lightboxPhoto.copies > 1 && (
              <div className="lightbox-copies-badge">
                <i className="fas fa-copy"></i> {lightboxPhoto.copies} cópias
              </div>
            )}
            <div className="lightbox-actions">
              <button
                className="btn primary"
                onClick={() => handleDownloadPhoto(lightboxPhoto)}
                disabled={downloading}
              >
                <i className="fas fa-download"></i> Baixar
              </button>
              <button className="btn" onClick={() => setLightboxPhoto(null)}>
                Fechar
              </button>
            </div>
          </div>
          <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>&times;</button>
        </div>
      )}
    </div>
  )
}
