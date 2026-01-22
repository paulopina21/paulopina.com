import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkSession, logout, getClients } from '../api'

interface Client {
  nome: string
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

export default function Manager() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [sortBy, setSortBy] = useState<'nome' | 'data'>('data')
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
          <h1>Gerenciador de Clientes</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'nome' | 'data')}
              style={{ padding: '8px 12px', borderRadius: 5 }}
            >
              <option value="data">Ordenar por Data</option>
              <option value="nome">Ordenar por Nome</option>
            </select>
            <button className="btn danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Sair
            </button>
          </div>
        </div>

        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 8 }}>
            <p>Nenhum cliente encontrado.</p>
            <p style={{ color: '#666', marginTop: 10 }}>
              Nota: O armazenamento R2 precisa ser habilitado no Cloudflare para listar os clientes.
            </p>
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
                <tr key={index}>
                  <td>{client.nome}</td>
                  <td>{formatDate(client.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
