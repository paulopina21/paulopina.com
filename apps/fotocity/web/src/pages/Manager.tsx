import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkSession, logout, getClients, getClientProducts, getProductPhotos } from '../api'
import { extractSizeFromProductId, parsePhotoSize } from '../utils/photoSizes'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Client {
  nome: string
  data: number
}

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
  // Format: 2025-01-28_22-30_Polaroid8x10 -> 28/01/2025 22:30 - Polaroid 8x10
  const match = produto.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})_?(.*)/)
  if (match) {
    const [, year, month, day, hour, min, size] = match
    const dateStr = `${day}/${month}/${year} ${hour}:${min}`
    return size ? `${dateStr} - ${size.replace(/(\d+x\d+)/, ' $1')}` : dateStr
  }
  return produto
}

export default function Manager() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [sortBy, setSortBy] = useState<'nome' | 'data'>('data')

  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

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
    }
    init()
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSelectClient = async (clientId: string) => {
    if (selectedClient === clientId) {
      setSelectedClient(null)
      setProducts([])
      setSelectedProduct(null)
      setPhotos([])
      return
    }

    setSelectedClient(clientId)
    setSelectedProduct(null)
    setPhotos([])
    setLoadingProducts(true)

    const data = await getClientProducts(clientId)
    setProducts(data)
    setLoadingProducts(false)
  }

  const handleSelectProduct = async (productId: string) => {
    if (selectedProduct === productId) {
      setSelectedProduct(null)
      setPhotos([])
      return
    }

    setSelectedProduct(productId)
    setLoadingPhotos(true)

    const data = await getProductPhotos(selectedClient!, productId)
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
    }
  }

  const sortedClients = [...clients].sort((a, b) => {
    if (sortBy === 'nome') {
      return a.nome.localeCompare(b.nome)
    }
    return b.data - a.data
  })

  if (loading) {
    return (
      <div className="admin-container">
        <p>Carregando...</p>
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

      <div className="admin-container">
        <div className="admin-header">
          <h1>
            {selectedProduct ? (
              <>Fotos do Envio</>
            ) : selectedClient ? (
              <>Envios de {selectedClient}</>
            ) : (
              <>Gerenciador de Clientes</>
            )}
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            {(selectedClient || selectedProduct) && (
              <button className="btn primary" onClick={handleBack}>
                <i className="fas fa-arrow-left"></i> Voltar
              </button>
            )}
            {!selectedClient && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'nome' | 'data')}
                style={{ padding: '8px 12px', borderRadius: 5 }}
              >
                <option value="data">Ordenar por Data</option>
                <option value="nome">Ordenar por Nome</option>
              </select>
            )}
            <button className="btn danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Sair
            </button>
          </div>
        </div>

        {/* Client List */}
        {!selectedClient && (
          <>
            {clients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8 }}>
                <p>Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Ultima Atualizacao</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((client, index) => (
                    <tr
                      key={index}
                      onClick={() => handleSelectClient(client.nome)}
                      style={{ cursor: 'pointer' }}
                      className="clickable-row"
                    >
                      <td>{client.nome}</td>
                      <td>{formatDate(client.data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Product List */}
        {selectedClient && !selectedProduct && (
          <>
            {loadingProducts ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p>Carregando envios...</p>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8 }}>
                <p>Nenhum envio encontrado.</p>
              </div>
            ) : (
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Envio</th>
                    <th>Qtd Fotos</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr
                      key={index}
                      onClick={() => handleSelectProduct(product.produto)}
                      style={{ cursor: 'pointer' }}
                      className="clickable-row"
                    >
                      <td>{formatProductName(product.produto)}</td>
                      <td>{product.qtd}</td>
                      <td>{formatDate(product.data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Photo Grid */}
        {selectedProduct && (
          <>
            {loadingPhotos ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p>Carregando fotos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8 }}>
                <p>Nenhuma foto encontrada.</p>
              </div>
            ) : (
              (() => {
                const sizeStr = extractSizeFromProductId(selectedProduct)
                const sizeInfo = sizeStr ? parsePhotoSize(sizeStr) : null
                const gridClass = sizeInfo?.isPolaroid
                  ? 'photo-grid photo-grid-polaroid'
                  : sizeInfo?.orientation === 'portrait'
                  ? 'photo-grid photo-grid-portrait'
                  : sizeInfo?.orientation === 'landscape'
                  ? 'photo-grid photo-grid-landscape'
                  : 'photo-grid photo-grid-square'

                return (
                  <div className={gridClass}>
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`photo-item ${sizeInfo?.isPolaroid ? 'polaroid-frame' : ''}`}
                        onClick={() => setLightboxPhoto(`${API_BASE}${photo.url}`)}
                      >
                        <img src={`${API_BASE}${photo.url}`} alt={`Foto ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="lightbox" onClick={() => setLightboxPhoto(null)}>
          <img src={lightboxPhoto} alt="Foto ampliada" />
          <button className="lightbox-close">&times;</button>
        </div>
      )}
    </div>
  )
}
