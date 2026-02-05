import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkSession, logout, getClients, getClientProducts, getProductPhotos, deleteClient, deleteProduct, Client } from '../api'
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

async function downloadFile(url: string, filename: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

async function downloadAllPhotos(photos: Photo[], prefix: string) {
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const ext = photo.key.split('.').pop() || 'jpg'
    await downloadFile(`${API_BASE}${photo.url}`, `${prefix}_${i + 1}.${ext}`)
    // Small delay to avoid overwhelming the browser
    await new Promise(r => setTimeout(r, 200))
  }
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
  const [deleting, setDeleting] = useState(false)

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
        // Find the client
        const client = data.find(c => c.email === clientParam)
        if (client) {
          setSelectedClient(client)
          setLoadingProducts(true)
          const products = await getClientProducts(client.email)
          setProducts(products)
          setLoadingProducts(false)

          // If product is specified, navigate to photos
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
        // Clear URL parameters after navigation
        window.history.replaceState({}, '', '/manager')
      }
    }
    init()
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c =>
        c.email.toLowerCase().includes(term) ||
        c.nome.toLowerCase().includes(term) ||
        c.telefone.includes(term)
      )
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter).getTime()
      const nextDay = filterDate + 24 * 60 * 60 * 1000
      result = result.filter(c => c.data >= filterDate && c.data < nextDay)
    }

    // Sort
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

  const handleViewProducts = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleSelectClient(client)
  }

  const handleSelectProduct = async (productId: string) => {
    setSelectedProduct(productId)
    setLoadingPhotos(true)

    const data = await getProductPhotos(selectedClient!.email, productId)
    setPhotos(data)
    setLoadingPhotos(false)
  }

  const handleViewPhotos = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleSelectProduct(productId)
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

  const selectAllClients = () => {
    setSelectedClientIds(new Set(filteredClients.map(c => c.email)))
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

  // Delete operations
  const handleDeleteClient = async (email: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja excluir o cliente "${email}" e todas as suas fotos?`)) return

    setDeleting(true)
    await deleteClient(email)
    setClients(prev => prev.filter(c => c.email !== email))
    setSelectedClientIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(email)
      return newSet
    })
    setDeleting(false)
  }

  const handleDeleteSelectedClients = async () => {
    if (selectedClientIds.size === 0) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedClientIds.size} cliente(s) e todas as suas fotos?`)) return

    setDeleting(true)
    for (const email of selectedClientIds) {
      await deleteClient(email)
    }
    setClients(prev => prev.filter(c => !selectedClientIds.has(c.email)))
    setSelectedClientIds(new Set())
    setDeleting(false)
  }

  const handleDeleteProduct = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja excluir este envio e todas as suas fotos?`)) return

    setDeleting(true)
    await deleteProduct(selectedClient!.email, productId)
    setProducts(prev => prev.filter(p => p.produto !== productId))
    setSelectedProductIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(productId)
      return newSet
    })
    setDeleting(false)
  }

  const handleDeleteSelectedProducts = async () => {
    if (selectedProductIds.size === 0) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedProductIds.size} envio(s) e todas as suas fotos?`)) return

    setDeleting(true)
    for (const productId of selectedProductIds) {
      await deleteProduct(selectedClient!.email, productId)
    }
    setProducts(prev => prev.filter(p => !selectedProductIds.has(p.produto)))
    setSelectedProductIds(new Set())
    setDeleting(false)
  }

  // Download operations
  const handleDownloadClientPhotos = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation()
    const prods = await getClientProducts(client.email)
    for (const prod of prods) {
      const photos = await getProductPhotos(client.email, prod.produto)
      await downloadAllPhotos(photos, `${client.nome || client.email}_${prod.produto}`)
    }
  }

  const handleDownloadProductPhotos = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const photos = await getProductPhotos(selectedClient!.email, productId)
    await downloadAllPhotos(photos, `${selectedClient!.nome || selectedClient!.email}_${productId}`)
  }

  const handleDownloadAllCurrentPhotos = async () => {
    await downloadAllPhotos(photos, `${selectedClient!.nome || selectedClient!.email}_${selectedProduct}`)
  }

  const handleDownloadPhoto = async (photo: Photo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const filename = photo.key.split('/').pop() || 'photo.jpg'
    await downloadFile(`${API_BASE}${photo.url}`, filename)
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

  // Calculate image size based on photo count
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
        <img src="https://cdn.iset.io/assets/73325/imagens/logo-foto-city.png" alt="FotoCity Logo" />
      </div>

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-title">
            {selectedProduct ? (
              <>
                <h1>{photos.length} Fotos do Envio</h1>
                <span className="admin-subtitle">{formatProductName(selectedProduct)}</span>
              </>
            ) : selectedClient ? (
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
              <button className="btn primary" onClick={handleDownloadAllCurrentPhotos}>
                <i className="fas fa-download"></i> Baixar Todas
              </button>
            )}
            {(selectedClient || selectedProduct) && (
              <button className="btn primary" onClick={handleBack}>
                <i className="fas fa-arrow-left"></i> Voltar
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
                placeholder="Buscar por email ou telefone..."
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
                <button className="btn-small" onClick={selectAllClients}>
                  Selecionar Todos
                </button>
                <button className="btn-small" onClick={selectOldClients}>
                  Selecionar Antigos (+3 meses)
                </button>
                {selectedClientIds.size > 0 && (
                  <>
                    <button className="btn-small" onClick={clearClientSelection}>
                      Limpar Seleção
                    </button>
                    <button
                      className="btn-small danger"
                      onClick={handleDeleteSelectedClients}
                      disabled={deleting}
                    >
                      <i className="fas fa-trash"></i> Excluir Selecionados
                    </button>
                  </>
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
                    <th style={{ width: 180 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.email}
                      className={`clickable-row ${isOlderThan3Months(client.data) ? 'old-item' : ''}`}
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
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button
                          className="btn-icon primary"
                          onClick={(e) => handleViewProducts(client, e)}
                          title="Ver envios"
                        >
                          <i className="fas fa-images"></i>
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={(e) => handleDeleteClient(client.email, e)}
                          title="Excluir cliente"
                          disabled={deleting}
                        >
                          <i className="fas fa-trash"></i>
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
                  <>
                    <button className="btn-small" onClick={clearProductSelection}>
                      Limpar Seleção
                    </button>
                    <button
                      className="btn-small danger"
                      onClick={handleDeleteSelectedProducts}
                      disabled={deleting}
                    >
                      <i className="fas fa-trash"></i> Excluir Selecionados
                    </button>
                  </>
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
                    <th style={{ width: 180 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.produto}
                      className={`clickable-row ${isOlderThan3Months(product.data) ? 'old-item' : ''}`}
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
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button
                          className="btn-icon primary"
                          onClick={(e) => handleViewPhotos(product.produto, e)}
                          title="Ver fotos"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={(e) => handleDeleteProduct(product.produto, e)}
                          title="Excluir envio"
                          disabled={deleting}
                        >
                          <i className="fas fa-trash"></i>
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
                        const resEl = img.parentElement?.querySelector('.photo-resolution')
                        if (resEl) {
                          resEl.textContent = `${img.naturalWidth} x ${img.naturalHeight}px`
                        }
                      }}
                    />
                    <div className="photo-info">
                      <span className="photo-resolution">Carregando...</span>
                    </div>
                    <button
                      className="photo-download-btn"
                      onClick={(e) => handleDownloadPhoto(photo, e)}
                      title="Baixar foto"
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

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="lightbox" onClick={() => setLightboxPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={`${API_BASE}${lightboxPhoto.url}`} alt="Foto ampliada" />
            <div className="lightbox-actions">
              <button
                className="btn primary"
                onClick={() => handleDownloadPhoto(lightboxPhoto)}
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
