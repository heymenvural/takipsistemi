import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AnaSayfa from './AnaSayfa'
import Profil from './Profil'
import Login from './Login'

function App() {
  const [girisYapildi, setGirisYapildi] = useState(
    sessionStorage.getItem('giris') === 'true'
  )

  if (!girisYapildi) {
    return <Login onGiris={() => setGirisYapildi(true)} />
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnaSayfa />} />
        <Route path="/profil/:id" element={<Profil />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App