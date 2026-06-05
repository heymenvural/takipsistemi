import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const API = import.meta.env.VITE_API_URL || ''

const DURUM_RENK = {
  geldi:    { bg: '#dcfce7', text: '#15803d', border: '#86efac', label: 'Geldi',  dot: '#22c55e' },
  izinli:   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: 'İzinli', dot: '#f97316' },
  mesai:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Mesai',  dot: '#3b82f6' },
  bekliyor: { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0', label: 'Girilmedi', dot: '#cbd5e1' },
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

export default function Profil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [personel, setPersonel] = useState(null)

  useEffect(() => {
    const detayGetir = async () => {
      try {
        const res = await axios.get(`${API}/api/personel/${id}`)
        setPersonel(res.data)
      } catch (err) {
        console.error('Profil çekme hatası', err)
      }
    }
    detayGetir()
  }, [id])

  if (!personel) return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", color: '#94a3b8', fontSize: 15,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      Yükleniyor...
    </div>
  )

  const toplamMesai = personel.kayitlar.reduce((t, k) => t + (k.saat || 0), 0)
  const toplamIzin = personel.kayitlar.filter(k => k.durum === 'izinli').length
  const toplamGeldi = personel.kayitlar.filter(k => k.durum === 'geldi').length
  const avatarRenk = getAvatarColor(personel.isim_soyad)
  const siraliKayitlar = [...personel.kayitlar].reverse()

  const pdfIndir = () => {
    const tr = t => {
      if (!t) return ''
      return String(t)
        .replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u')
        .replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i')
        .replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c')
    }
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(tr('PERSONEL MESAI VE IZIN RAPORU'), 14, 22)
    doc.setFontSize(11)
    doc.text(tr(`Personel: ${personel.isim_soyad}`), 14, 32)
    doc.text(tr(`Toplam Mesai: ${toplamMesai} Saat`), 14, 38)
    doc.text(tr(`Kullanilan Izin: ${toplamIzin} Gun`), 14, 44)
    doc.text(tr(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), 14, 50)
    const rows = siraliKayitlar.map(k => [
      tr(k.tarih),
      tr(k.durum.toUpperCase()),
      k.saat > 0 ? `${k.saat} Saat` : '-',
      tr(k.aciklama || '-'),
    ])
    autoTable(doc, {
      head: [[tr('Tarih'), tr('Durum'), tr('Mesai'), tr('Aciklama')]],
      body: rows, startY: 55, theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 10 },
    })
    doc.save(`${tr(personel.isim_soyad)}_Rapor.pdf`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/')} style={{
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          borderRadius: 10, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, color: '#475569', flexShrink: 0,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {personel.isim_soyad}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Kişisel Rapor</div>
        </div>
        <button onClick={pdfIndir} style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '8px 14px', fontSize: 13,
          fontWeight: 500, color: '#1d4ed8', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          🖨️ PDF
        </button>
      </header>

      <main style={{ padding: '16px 16px 80px', maxWidth: 480, margin: '0 auto' }}>

        {/* AVATAR + İSİM */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
          padding: '20px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: avatarRenk.bg, color: avatarRenk.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 600, flexShrink: 0,
          }}>
            {getInitials(personel.isim_soyad)}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#0f172a' }}>{personel.isim_soyad}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              {personel.kayitlar.length} toplam kayıt
            </div>
          </div>
        </div>

        {/* ÖZET KARTLAR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Mesai', value: `${toplamMesai}s`, bg: '#eff6ff', color: '#1d4ed8' },
            { label: 'İzin', value: `${toplamIzin}g`, bg: '#fff7ed', color: '#c2410c' },
            { label: 'Geldi', value: `${toplamGeldi}g`, bg: '#dcfce7', color: '#15803d' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 12, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* GEÇMİŞ HAREKETLERİ */}
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#64748b',
          marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Geçmiş Hareketler
        </div>

        {siraliKayitlar.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
            padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14,
          }}>
            Henüz kayıt bulunmuyor
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {siraliKayitlar.map((kayit, i) => {
              const r = DURUM_RENK[kayit.durum] || DURUM_RENK.bekliyor
              return (
                <div key={i} style={{
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  {/* Durum dot */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: r.bg, border: `1px solid ${r.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, display: 'inline-block' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{kayit.tarih}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {kayit.aciklama ? kayit.aciklama : r.label}
                    </div>
                  </div>
                  <div style={{
                    background: r.bg, border: `1px solid ${r.border}`,
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 12, fontWeight: 600, color: r.text, flexShrink: 0,
                  }}>
                    {kayit.durum === 'mesai' ? `+${kayit.saat}s` : r.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}