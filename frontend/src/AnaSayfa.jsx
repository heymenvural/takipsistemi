import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getTumTatiller } from './hooks/useTatiller'

const API = import.meta.env.VITE_API_URL || ''

const DURUM_RENK = {
  geldi:    { bg: '#e8f8f0', text: '#16a34a', dot: '#22c55e', label: 'Geldi' },
  izinli:   { bg: '#fff7ed', text: '#d97706', dot: '#f59e0b', label: 'İzinli' },
  mesai:    { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6', label: 'Mesai' },
  bekliyor: { bg: '#f8fafc', text: '#94a3b8', dot: '#cbd5e1', label: 'Girilmedi' },
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('')
}

function getAvatarColor(name) {
  const colors = [
    { bg: '#e0f2fe', text: '#0369a1' },
    { bg: '#fce7f3', text: '#be185d' },
    { bg: '#ede9fe', text: '#7c3aed' },
    { bg: '#dcfce7', text: '#15803d' },
    { bg: '#fff7ed', text: '#c2410c' },
    { bg: '#f0fdf4', text: '#166534' },
    { bg: '#fef9c3', text: '#854d0e' },
    { bg: '#f0f9ff', text: '#0c4a6e' },
  ]
  let hash = 0
  for (let c of name) hash += c.charCodeAt(0)
  return colors[hash % colors.length]
}

function getBugunkuDurum(kayitlar) {
  const bugun = new Date().toLocaleDateString('tr-TR')
  const bugunKayit = kayitlar.find(k => k.tarih === bugun)
  return bugunKayit ? bugunKayit.durum : 'bekliyor'
}

export default function AnaSayfa() {
  const [personeller, setPersoneller] = useState([])
  const [acikId, setAcikId] = useState(null)
  const [modalPersonel, setModalPersonel] = useState(null)
  const [modalTip, setModalTip] = useState(null)
  const [saat, setSaat] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [basari, setBasari] = useState(null)
  const [arama, setArama] = useState('')
  const navigate = useNavigate()

  const bugunTarih = new Date().toLocaleDateString('tr-TR')
  const bugunYil = new Date().getFullYear()
  const tatiller = getTumTatiller(bugunYil)
  const bugunTatilMi = tatiller.includes(bugunTarih)

  useEffect(() => {
    veriGetir()
    // Service Worker kaydet
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const veriGetir = async () => {
    try {
      const res = await axios.get(`${API}/api/personel`)
      setPersoneller(res.data)
    } catch (err) {
      console.error('Veri çekme hatası:', err)
    }
  }

  const modalAc = (personel, tip) => {
    setModalPersonel(personel)
    setModalTip(tip)
    setSaat('')
    setAciklama('')
  }

  const modalKapat = () => {
    setModalPersonel(null)
    setModalTip(null)
  }

  const kayitEkle = async () => {
    if (!modalPersonel) return
    setYukleniyor(true)
    try {
      await axios.post(`${API}/api/personel/${modalPersonel._id}/kayit`, {
        tarih: bugunTarih,
        durum: modalTip,
        saat: modalTip === 'mesai' ? Number(saat) : 0,
        aciklama,
      })
      setBasari(modalPersonel.isim_soyad)
      modalKapat()
      veriGetir()
      setTimeout(() => setBasari(null), 3000)
    } catch {
      alert('Kayıt eklenirken hata oluştu.')
    } finally {
      setYukleniyor(false)
    }
  }

  const topluRaporIndir = () => {
    if (!personeller.length) return
    const tr = t => {
      if (!t) return ''
      return String(t)
        .replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u')
        .replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i')
        .replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c')
    }
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(tr('TUM PERSONEL GENEL OZET RAPORU'), 14, 22)
    doc.setFontSize(11)
    doc.text(tr(`Rapor Tarihi: ${bugunTarih}`), 14, 30)
    const rows = personeller.map(p => {
      const toplamMesai = p.kayitlar.reduce((t, k) => t + (k.saat || 0), 0)
      const toplamIzin = p.kayitlar.filter(k => k.durum === 'izinli').length
      return [tr(p.isim_soyad), toplamMesai > 0 ? `${toplamMesai} Saat` : '-', toplamIzin > 0 ? `${toplamIzin} Gun` : '-']
    })
    autoTable(doc, {
      head: [[tr('Ad Soyad'), tr('Toplam Mesai'), tr('Kullanilan Izin')]],
      body: rows, startY: 38, theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 10 },
    })
    doc.save(`Personel_Ozet_${bugunTarih}.pdf`)
  }

  const filtrelenmisPersoneller = personeller.filter(p =>
    p.isim_soyad.toLowerCase().includes(arama.toLowerCase())
  )

  const bugunGirilenSayisi = personeller.filter(p => getBugunkuDurum(p.kayitlar) !== 'bekliyor').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.3px' }}>Mesai Takip</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {bugunTatilMi && <span style={{ marginLeft: 6, background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '1px 6px', fontSize: 11 }}>🎉 Resmi Tatil</span>}
          </div>
        </div>
        <button onClick={topluRaporIndir} style={{
          background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#475569',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          📑 PDF Rapor
        </button>
      </header>

      {/* ÖZET KARTLAR */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Toplam', value: personeller.length, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Bugün Girilen', value: bugunGirilenSayisi, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Bekleyen', value: personeller.length - bugunGirilenSayisi, color: '#d97706', bg: '#fef9c3' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ARAMA */}
      <div style={{ padding: '12px 16px 0' }}>
        <input
          type="text"
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="🔍 Personel ara..."
          style={{
            width: '100%', background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '11px 14px', fontSize: 14,
            color: '#0f172a', boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      {/* BAŞARI MESAJI */}
      {basari && (
        <div style={{
          margin: '12px 16px 0', background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#15803d',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ✅ <strong>{basari}</strong> kaydı başarıyla eklendi
        </div>
      )}

      {/* PERSONEL LİSTESİ */}
      <main style={{ padding: '12px 16px 80px' }}>
        {filtrelenmisPersoneller.length === 0 && arama ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 32 }}>
            "{arama}" için sonuç bulunamadı
          </div>
        ) : (
          filtrelenmisPersoneller.map(p => {
            const durum = getBugunkuDurum(p.kayitlar)
            const renkObj = DURUM_RENK[durum]
            const avatarRenk = getAvatarColor(p.isim_soyad)
            const acik = acikId === p._id
            return (
              <div key={p._id} style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 14, marginBottom: 10, overflow: 'hidden',
              }}>
                <div
                  onClick={() => setAcikId(acik ? null : p._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer' }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: avatarRenk.bg, color: avatarRenk.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                  }}>
                    {getInitials(p.isim_soyad)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.isim_soyad}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: renkObj.dot, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: renkObj.text }}>{renkObj.label}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 18, color: '#94a3b8',
                    transform: acik ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s', display: 'inline-block',
                  }}>⌄</span>
                </div>

                {acik && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px 14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      {[
                        { tip: 'geldi', label: '✓ Geldi', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
                        { tip: 'izinli', label: '☀ İzinli', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
                        { tip: 'mesai', label: '⏱ Mesai', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                      ].map(b => (
                        <button key={b.tip} onClick={() => modalAc(p, b.tip)} style={{
                          background: b.bg, border: `1px solid ${b.border}`,
                          borderRadius: 10, padding: '10px 0', fontSize: 13,
                          fontWeight: 500, color: b.color, cursor: 'pointer',
                        }}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => navigate(`/profil/${p._id}`)} style={{
                      width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 10, padding: '10px 0', fontSize: 13,
                      fontWeight: 500, color: '#475569', cursor: 'pointer',
                    }}>
                      📊 Detaylı Profil & Rapor
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>

      {/* MODAL */}
      {modalPersonel && (
        <div
          onClick={e => e.target === e.currentTarget && modalKapat()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
            zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 480, padding: '20px 20px 36px',
            animation: 'slideUp 0.25s ease',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{modalPersonel.isim_soyad}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>

            {modalTip === 'mesai' ? (
              <>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 500 }}>Mesai Saati</label>
                <input type="number" value={saat} onChange={e => setSaat(e.target.value)} placeholder="Örn: 3"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 12, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 500 }}>Açıklama (opsiyonel)</label>
                <input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="Örn: Hafta sonu çalışması"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 16, boxSizing: 'border-box' }} />
                <button onClick={kayitEkle} disabled={yukleniyor || !saat} style={{
                  width: '100%', background: saat ? '#3b82f6' : '#e2e8f0', border: 'none', borderRadius: 12,
                  padding: '13px', fontSize: 15, fontWeight: 600, color: saat ? '#fff' : '#94a3b8',
                  cursor: saat ? 'pointer' : 'not-allowed', marginBottom: 8,
                }}>
                  {yukleniyor ? 'Kaydediliyor...' : '💾 Mesaiyi Kaydet'}
                </button>
              </>
            ) : modalTip === 'izinli' ? (
              <>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 500 }}>Açıklama (opsiyonel)</label>
                <input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="Örn: Yıllık izin, Mazeret izni..."
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 16, boxSizing: 'border-box' }} />
                <button onClick={kayitEkle} disabled={yukleniyor} style={{
                  width: '100%', background: '#d97706', border: 'none', borderRadius: 12,
                  padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 8,
                }}>
                  {yukleniyor ? 'Kaydediliyor...' : '☀ İzinli Olarak Kaydet'}
                </button>
              </>
            ) : (
              <button onClick={kayitEkle} disabled={yukleniyor} style={{
                width: '100%', background: '#16a34a', border: 'none', borderRadius: 12,
                padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 8,
              }}>
                {yukleniyor ? 'Kaydediliyor...' : '✓ Geldi Olarak Kaydet'}
              </button>
            )}

            <button onClick={modalKapat} style={{
              width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer',
            }}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  )
}