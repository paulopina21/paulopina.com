import { Routes, Route } from 'react-router-dom'
import Upload from './pages/Upload'
import Login from './pages/Login'
import Manager from './pages/Manager'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Upload />} />
      <Route path="/login" element={<Login />} />
      <Route path="/manager" element={<Manager />} />
    </Routes>
  )
}

export default App
