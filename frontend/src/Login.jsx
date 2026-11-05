import { useState } from 'react'
import axios from 'axios'
import { oturumKaydet } from './oturum'

export default function Login({ onGiris }) {
  const [kullanici, setKullanici] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)

  const girisYap = async () => {
    setYukleniyor(true)
    try {
      const res = await axios.post('/api/giris', { kullanici: kullanici.trim(), sifre })
      oturumKaydet(res.data.token, res.data.ad)
      onGiris(res.data.ad)
    } catch {
      setHata(true)
      setYukleniyor(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') girisYap()
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* LOGO / BAŞLIK */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
          }}>👥</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#0f172a' }}>Mesai Takip</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Bir kez giriş yapmanız yeterli</div>
        </div>

        {/* FORM KARTI */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 16, padding: '24px 20px',
        }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 6 }}>
              Kullanıcı Adı
            </label>
            <input
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              value={kullanici}
              onChange={e => { setKullanici(e.target.value); setHata(false) }}
              onKeyDown={handleKeyDown}
              placeholder="Kullanıcı adınız"
              style={{
                width: '100%', background: '#f8fafc',
                border: `1px solid ${hata ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 10, padding: '11px 14px', fontSize: 14,
                color: '#0f172a', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 6 }}>
              Şifre
            </label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={sifre}
              onChange={e => { setSifre(e.target.value); setHata(false) }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={{
                width: '100%', background: '#f8fafc',
                border: `1px solid ${hata ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 10, padding: '11px 14px', fontSize: 14,
                color: '#0f172a', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {hata && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fecaca',
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
              color: '#dc2626', marginBottom: 16, textAlign: 'center',
            }}>
              ❌ Kullanıcı adı veya şifre hatalı
            </div>
          )}

          <button
            onClick={girisYap}
            disabled={yukleniyor || !kullanici || !sifre}
            style={{
              width: '100%',
              background: kullanici && sifre ? '#6366f1' : '#e2e8f0',
              border: 'none', borderRadius: 12, padding: '13px',
              fontSize: 15, fontWeight: 600,
              color: kullanici && sifre ? '#fff' : '#94a3b8',
              cursor: kullanici && sifre ? 'pointer' : 'not-allowed',
            }}
          >
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </div>
      </div>
    </div>
  )
}