import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { DURUMLAR, DURUM_SECENEKLERI, AYLAR, efektifDurum, bugunStr, tarihStr, cokGunluAralik, cokGunluAciklama } from './utils/durum'
import { topluAylikRapor } from './utils/pdf'
import { getTumTatiller } from './hooks/useTatiller'
import Hatirlatici from './Hatirlatici'
import GunSayisiSecici from './GunSayisiSecici'

const API = '' // API aynı sitede; eski Railway adresi (VITE_API_URL) artık kullanılmıyor

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

export default function AnaSayfa() {
  const [personeller, setPersoneller] = useState([])
  const [acikId, setAcikId] = useState(null)
  const [modalPersonel, setModalPersonel] = useState(null)
  const [modalTip, setModalTip] = useState(null)
  const [saat, setSaat] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [gunSayisi, setGunSayisi] = useState(1)
  // Seçili gün (ana sayfada günler arası geçiş)
  const [secili, setSecili] = useState(() => { const b = new Date(); return new Date(b.getFullYear(), b.getMonth(), b.getDate()) })
  const [yon, setYon] = useState(0)
  const [dokunus, setDokunus] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [basari, setBasari] = useState(null)
  const [arama, setArama] = useState('')
  const [ekipModal, setEkipModal] = useState(false)
  const [yeniIsim, setYeniIsim] = useState('')
  const [ekipYukleniyor, setEkipYukleniyor] = useState(false)
  // PDF rapor ay seçimi
  const [raporModal, setRaporModal] = useState(false)
  const [raporAy, setRaporAy] = useState(new Date().getMonth())
  const [raporYil, setRaporYil] = useState(new Date().getFullYear())
  const [raporYukleniyor, setRaporYukleniyor] = useState(false)
  const navigate = useNavigate()

  // "bugun" artık seçili günü temsil eder; ekranın tamamı seçili güne göre çalışır
  const bugun = secili
  const bugunTarih = tarihStr(secili.getDate(), secili.getMonth(), secili.getFullYear())
  const gercekBugunMu = bugunTarih === bugunStr()
  const tatiller = getTumTatiller(bugun.getFullYear())
  const bugunTatilMi = tatiller.includes(bugunTarih)
  const haftaSonuSecili = secili.getDay() === 0 || secili.getDay() === 6

  const gunDegistir = (n) => {
    const d = new Date(secili.getFullYear(), secili.getMonth(), secili.getDate() + n)
    const b = new Date(); const bugun0 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    if (d > bugun0) return
    setYon(n); setSecili(d); setAcikId(null)
  }
  const bugune = () => {
    const b = new Date()
    setYon(1); setSecili(new Date(b.getFullYear(), b.getMonth(), b.getDate())); setAcikId(null)
  }
  // Parmakla sağa/sola kaydırarak gün değiştir
  const dokunBasla = e => setDokunus({ x: e.touches[0].clientX, y: e.touches[0].clientY })
  const dokunBitir = e => {
    if (!dokunus) return
    const dx = e.changedTouches[0].clientX - dokunus.x
    const dy = e.changedTouches[0].clientY - dokunus.y
    setDokunus(null)
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) gunDegistir(dx > 0 ? -1 : 1)
  }

  useEffect(() => {
    veriGetir()
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
    setGunSayisi(1)
  }

  const modalKapat = () => {
    setModalPersonel(null)
    setModalTip(null)
  }

  const kayitEkle = async () => {
    if (!modalPersonel) return
    setYukleniyor(true)
    try {
      const cokGunlu = (modalTip === 'izinli' || modalTip === 'raporlu') && gunSayisi > 1
      if (cokGunlu) {
        const aralik = cokGunluAralik(bugunTarih, gunSayisi)
        const not = cokGunluAciklama(modalTip, aralik, aciklama)
        await axios.post(`${API}/api/personel/${modalPersonel._id}/kayit`, {
          kayitlar: aralik.isGunleri.map(t => ({ tarih: t, durum: modalTip, saat: 0, aciklama: not })),
        })
      } else {
        await axios.post(`${API}/api/personel/${modalPersonel._id}/kayit`, {
          tarih: bugunTarih,
          durum: modalTip,
          saat: modalTip === 'mesai' ? Number(saat) : 0,
          aciklama,
        })
      }
      try { navigator.vibrate?.(30) } catch { /* yok */ }
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

  const personelEkle = async () => {
    if (!yeniIsim.trim()) return
    setEkipYukleniyor(true)
    try {
      await axios.post(`${API}/api/personel`, { isim_soyad: yeniIsim })
      setYeniIsim('')
      veriGetir()
    } catch { alert('Personel eklenirken hata oluştu.') }
    finally { setEkipYukleniyor(false) }
  }

  const personelSil = async (pid, isim) => {
    if (!window.confirm(`${isim} kişisini listeden çıkarmak istiyor musunuz? (Eski kayıtları arşivde saklanır)`)) return
    try {
      await axios.delete(`${API}/api/personel/${pid}`)
      veriGetir()
    } catch { alert('Silme sırasında hata oluştu.') }
  }

  const topluRaporIndir = async () => {
    if (!personeller.length) return
    setRaporYukleniyor(true)
    try {
      await topluAylikRapor(personeller, raporAy, raporYil)
      setRaporModal(false)
    } catch (e) {
      console.error(e)
      alert('Rapor oluşturulurken hata oluştu.')
    } finally {
      setRaporYukleniyor(false)
    }
  }

  const filtrelenmisPersoneller = personeller.filter(p =>
    p.isim_soyad.toLowerCase().includes(arama.toLowerCase())
  )

  // Bugünkü efektif durum (otomatik geldi dahil)
  const bugunDurum = (kayitlar) =>
    efektifDurum(kayitlar, bugun.getDate(), bugun.getMonth(), bugun.getFullYear())

  const gunSayac = { geldi: 0, izinli: 0, raporlu: 0, gelmedi: 0, mesai: 0 }
  personeller.forEach(p => { const t = bugunDurum(p.kayitlar).tip; if (t in gunSayac) gunSayac[t]++ })

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.3px' }}>Mesai Takip</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
            Buharkent Belediyesi
          </div>
        </div>
        <Hatirlatici yer="baslik" />
        <button onClick={() => setRaporModal(true)} style={{
          background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '8px 12px', fontSize: 13, fontWeight: 500, color: '#475569',
          cursor: 'pointer', flexShrink: 0,
        }}>
          📑 PDF
        </button>
        <button onClick={() => setEkipModal(true)} style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
          padding: '8px 12px', fontSize: 13, fontWeight: 500, color: '#15803d',
          cursor: 'pointer', flexShrink: 0,
        }}>
          👤 Ekip
        </button>
      </header>

      {/* GÜN GEZGİNİ */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => gunDegistir(-1)} aria-label="Önceki gün" style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 24, color: '#475569', cursor: 'pointer', flexShrink: 0 }}>‹</button>
          <div key={bugunTarih} style={{ flex: 1, textAlign: 'center', animation: 'tarihGir .25s ease' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#0f172a' }}>
              {bugun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: 13, color: gercekBugunMu ? '#6366f1' : '#94a3b8', marginTop: 1, fontWeight: gercekBugunMu ? 600 : 400 }}>
              {gercekBugunMu ? 'Bugün · ' : ''}{bugun.toLocaleDateString('tr-TR', { weekday: 'long' })}
              {bugunTatilMi && ' · 🎉 Resmi Tatil'}
            </div>
          </div>
          <button onClick={() => gunDegistir(1)} disabled={gercekBugunMu} aria-label="Sonraki gün" style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: gercekBugunMu ? '#fff' : '#f8fafc', fontSize: 24, color: gercekBugunMu ? '#e2e8f0' : '#475569', cursor: gercekBugunMu ? 'default' : 'pointer', flexShrink: 0 }}>›</button>
        </div>
        {!gercekBugunMu && (
          <button onClick={bugune} style={{ display: 'block', margin: '8px auto 0', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', animation: 'tarihGir .25s ease' }}>
            ↩ Bugüne dön
          </button>
        )}
      </div>

      {/* GÜNÜN TABLOSU */}
      <div key={'ozet-' + bugunTarih} style={{ padding: '12px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, animation: 'tarihGir .3s ease' }}>
        {[
          { k: 'geldi', label: 'Geldi' },
          { k: 'izinli', label: 'İzinli' },
          { k: 'raporlu', label: 'Raporlu' },
          { k: 'gelmedi', label: 'Gelmedi' },
        ].map(x => {
          const r = DURUMLAR[x.k]
          return (
            <div key={x.k} style={{ background: r.bg, borderRadius: 12, padding: '10px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: r.text }}>{gunSayac[x.k]}</div>
              <div style={{ fontSize: 11, color: r.text, opacity: 0.85, marginTop: 1 }}>{x.label}</div>
            </div>
          )
        })}
      </div>
      {gunSayac.mesai > 0 && (
        <div style={{ margin: '8px 16px 0', fontSize: 12, color: DURUMLAR.mesai.text, textAlign: 'center' }}>⏱ {gunSayac.mesai} kişi mesaide</div>
      )}
      {haftaSonuSecili && (
        <div style={{ margin: '8px 16px 0', fontSize: 12, color: '#64748b', textAlign: 'center' }}>Hafta sonu — sadece girdiğiniz kayıtlar görünür</div>
      )}
      <style>{`
        @keyframes tarihGir { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        @keyframes satirGir { from { opacity: 0; transform: translateX(var(--kay, 0px)) } to { opacity: 1; transform: none } }
        @keyframes tostGir { from { opacity: 0; transform: translateY(-8px) scale(.98) } to { opacity: 1; transform: none } }
      `}</style>

      {/* GÜNLÜK HATIRLATMA */}
      <Hatirlatici />

      {/* BİLGİ NOTU */}
      <div style={{ margin: '10px 16px 0', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#4338ca' }}>
        💡 Kayıt girmediğiniz kişiler <strong>Geldi</strong> sayılır. Sadece izin, rapor, gelmedi ve mesaiyi girmeniz yeterli. Günler arasında geçmek için okları kullanın ya da ekranı sağa/sola kaydırın.
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
          display: 'flex', alignItems: 'center', gap: 8, animation: 'tostGir .25s ease',
        }}>
          ✅ <strong>{basari}</strong> kaydı başarıyla eklendi
        </div>
      )}

      {/* PERSONEL LİSTESİ */}
      <main key={'liste-' + bugunTarih} onTouchStart={dokunBasla} onTouchEnd={dokunBitir} style={{ padding: '12px 16px 80px', minHeight: '50vh' }}>
        {filtrelenmisPersoneller.length === 0 && arama ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 32 }}>
            "{arama}" için sonuç bulunamadı
          </div>
        ) : (
          filtrelenmisPersoneller.map((p, sira) => {
            const d = bugunDurum(p.kayitlar)
            const gosterTip = d.tip === 'tatil' ? 'bekliyor' : (d.tip || 'bekliyor')
            const renkObj = d.otomatik ? DURUMLAR.otomatik : (DURUMLAR[gosterTip] || DURUMLAR.bekliyor)
            const etiket = d.tip === 'tatil' ? 'Resmi Tatil'
              : d.otomatik ? 'Geldi'
              : !d.tip && haftaSonuSecili ? 'Hafta sonu'
              : renkObj.label
            const not = d.kayit?.aciklama
            const avatarRenk = getAvatarColor(p.isim_soyad)
            const acik = acikId === p._id
            return (
              <div key={p._id} style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 14, marginBottom: 10, overflow: 'hidden',
                '--kay': `${yon * 18}px`,
                animation: `satirGir .28s ease ${Math.min(sira, 14) * 18}ms both`,
                transition: 'box-shadow .2s',
                boxShadow: acik ? '0 6px 20px rgba(15,23,42,0.08)' : 'none',
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
                      <span style={{ fontSize: 12, color: renkObj.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{etiket}{not ? ` · ${not}` : ''}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 18, color: '#94a3b8',
                    transform: acik ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s', display: 'inline-block',
                  }}>⌄</span>
                </div>

                {acik && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px 14px', animation: 'tarihGir .2s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      {DURUM_SECENEKLERI.map(b => {
                        const r = DURUMLAR[b.val]
                        return (
                          <button key={b.val} onClick={() => modalAc(p, b.val)} style={{
                            background: r.bg, border: `1px solid ${r.border}`,
                            borderRadius: 10, padding: '10px 0', fontSize: 13,
                            fontWeight: 500, color: r.text, cursor: 'pointer',
                          }}>
                            {b.label}
                          </button>
                        )
                      })}
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

      {/* KAYIT MODAL */}
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
            animation: 'slideUp 0.25s ease', maxHeight: '92vh', overflowY: 'auto',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{modalPersonel.isim_soyad}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              {bugun.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} — {DURUMLAR[modalTip]?.label}
            </div>

            {(modalTip === 'izinli' || modalTip === 'raporlu') && (
              <GunSayisiSecici durum={modalTip} baslangic={bugunTarih} deger={gunSayisi} onChange={setGunSayisi} />
            )}

            {modalTip === 'mesai' && (
              <>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 500 }}>Mesai Saati</label>
                <input type="number" value={saat} onChange={e => setSaat(e.target.value)} placeholder="Örn: 3"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 12, boxSizing: 'border-box' }} />
              </>
            )}

            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 500 }}>Açıklama (opsiyonel)</label>
            <input type="text" value={aciklama} onChange={e => setAciklama(e.target.value)}
              placeholder={modalTip === 'izinli' ? 'Örn: Yıllık izin, Mazeret izni...' : modalTip === 'raporlu' ? 'Örn: 3 günlük istirahat raporu' : 'Açıklama...'}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={kayitEkle} disabled={yukleniyor || (modalTip === 'mesai' && !saat)} style={{
              width: '100%',
              background: (modalTip === 'mesai' && !saat) ? '#e2e8f0' : DURUMLAR[modalTip]?.dot || '#6366f1',
              border: 'none', borderRadius: 12,
              padding: '13px', fontSize: 15, fontWeight: 600,
              color: (modalTip === 'mesai' && !saat) ? '#94a3b8' : '#fff',
              cursor: (modalTip === 'mesai' && !saat) ? 'not-allowed' : 'pointer', marginBottom: 8,
            }}>
              {yukleniyor ? 'Kaydediliyor...' : (modalTip === 'izinli' || modalTip === 'raporlu') && gunSayisi > 1
                ? `💾 ${gunSayisi} Gün ${DURUMLAR[modalTip]?.label} Kaydet`
                : `💾 ${DURUMLAR[modalTip]?.label} Olarak Kaydet`}
            </button>

            <button onClick={modalKapat} style={{
              width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer',
            }}>Vazgeç</button>
          </div>
        </div>
      )}

      {/* PDF RAPOR AY SEÇİM MODAL */}
      {raporModal && (
        <div onClick={e => e.target === e.currentTarget && setRaporModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 36px', animation: 'slideUp 0.25s ease', maxHeight: '92vh', overflowY: 'auto' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Toplu Aylık Rapor</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Rapor dönemini seç</div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 16 }}>
              <select value={raporAy} onChange={e => setRaporAy(Number(e.target.value))}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a' }}>
                {AYLAR.map((a, i) => <option key={a} value={i}>{a}</option>)}
              </select>
              <select value={raporYil} onChange={e => setRaporYil(Number(e.target.value))}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a' }}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button onClick={topluRaporIndir} disabled={raporYukleniyor} style={{
              width: '100%', background: '#4f46e5', border: 'none', borderRadius: 12,
              padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 8,
            }}>
              {raporYukleniyor ? 'Rapor hazırlanıyor...' : '📑 PDF İndir'}
            </button>
            <button onClick={() => setRaporModal(false)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>Vazgeç</button>
          </div>
        </div>
      )}

      {/* EKİP DÜZENLE MODAL */}
      {ekipModal && (
        <div onClick={e => e.target === e.currentTarget && setEkipModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 36px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Ekibi Düzenle</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>{personeller.length} kişi</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text" value={yeniIsim} onChange={e => setYeniIsim(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && personelEkle()}
                placeholder="Yeni personel adı soyadı..."
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#0f172a', outline: 'none' }}
              />
              <button onClick={personelEkle} disabled={ekipYukleniyor || !yeniIsim.trim()} style={{
                background: yeniIsim.trim() ? '#6366f1' : '#e2e8f0', border: 'none', borderRadius: 10,
                padding: '10px 16px', fontSize: 13, fontWeight: 600,
                color: yeniIsim.trim() ? '#fff' : '#94a3b8', cursor: yeniIsim.trim() ? 'pointer' : 'not-allowed',
              }}>+ Ekle</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {personeller.map(p => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{p.isim_soyad}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.kayitlar.length} kayıt</div>
                  <button onClick={() => personelSil(p._id, p.isim_soyad)} style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer' }}>🗑️</button>
                </div>
              ))}
            </div>

            <button onClick={() => setEkipModal(false)} style={{ marginTop: 16, width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  )
}
