import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AnaSayfa from './AnaSayfa'
import Profil from './Profil'
import Login from './Login'

function KarsilamaEkrani({ onBitti }) {
  const [asama, setAsama] = useState(0) // 0: giriyor, 1: görünür, 2: çıkıyor

  useEffect(() => {
    const t1 = setTimeout(() => setAsama(1), 100)
    const t2 = setTimeout(() => setAsama(2), 2200)
    const t3 = setTimeout(() => onBitti(), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      opacity: asama === 0 ? 0 : asama === 1 ? 1 : 0,
      transition: asama === 0 ? 'opacity 0.6s ease' : 'opacity 0.6s ease',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* İKON */}
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 8,
        transform: asama === 1 ? 'scale(1)' : 'scale(0.8)',
        transition: 'transform 0.5s ease',
      }}>
        👥
      </div>

      {/* METİN */}
      <div style={{
        textAlign: 'center',
        transform: asama === 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'transform 0.5s ease 0.1s',
      }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8, letterSpacing: '0.5px' }}>
          HOŞ GELDİNİZ
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px' }}>
          Sayın Mesud Vural
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
          Mesai Takip Sistemi
        </div>
      </div>

      {/* ALT NOKTA ANİMASYONU */}
      <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

function App() {
  const [girisYapildi, setGirisYapildi] = useState(
    sessionStorage.getItem('giris') === 'true'
  )
  const [karsilamaGoster, setKarsilamaGoster] = useState(false)

  const handleGiris = () => {
    setKarsilamaGoster(true)
  }

  const handleKarsilamaBitti = () => {
    setKarsilamaGoster(false)
    setGirisYapildi(true)
  }

  if (karsilamaGoster) {
    return <KarsilamaEkrani onBitti={handleKarsilamaBitti} />
  }

  if (!girisYapildi) {
    return <Login onGiris={handleGiris} />
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