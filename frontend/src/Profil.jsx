import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DURUMLAR, DURUM_SECENEKLERI, AYLAR, efektifDurum, ayOzeti, tarihStr, bugunStr, kayitTarihEsit, gelecekMi } from './utils/durum'
import { kisiselAylikRapor } from './utils/pdf'
import { getTumTatiller } from './hooks/useTatiller'

const API = import.meta.env.VITE_API_URL || ''

const GUNLER = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz']

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

function Takvim({ kayitlar, yil, ay, onGunTikla }) {
  const ilkGun = new Date(yil, ay, 1)
  const sonGun = new Date(yil, ay + 1, 0)
  const baslangicGunu = (ilkGun.getDay() + 6) % 7

  const bugun = new Date()
  const gunler = []
  for (let i = 0; i < baslangicGunu; i++) gunler.push(null)
  for (let i = 1; i <= sonGun.getDate(); i++) gunler.push(i)

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 8 }}>
        {GUNLER.map(g => (
          <div key={g} style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 600, padding: '2px 0' }}>{g}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {gunler.map((gun, i) => {
          if (!gun) return <div key={`bos-${i}`} />
          const d = efektifDurum(kayitlar, gun, ay, yil)
          const bugunMu = bugun.getDate() === gun && bugun.getMonth() === ay && bugun.getFullYear() === yil
          const gelecek = gelecekMi(gun, ay, yil)
          const tatil = d.tip === 'tatil'
          const renkObj = !tatil && d.tip ? (d.otomatik ? DURUMLAR.otomatik : DURUMLAR[d.tip]) : null

          return (
            <div
              key={gun}
              onClick={() => !gelecek && onGunTikla(gun, ay, yil, d.kayit ? d.tip : null)}
              style={{
                aspectRatio: '1', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: bugunMu ? 700 : 500,
                background: tatil ? '#fef9c3' : renkObj ? renkObj.bg : 'transparent',
                color: tatil ? '#854d0e' : renkObj ? renkObj.takvim : bugunMu ? '#6366f1' : gelecek ? '#cbd5e1' : '#64748b',
                border: bugunMu ? '2px solid #6366f1' : '1px solid transparent',
                cursor: gelecek ? 'default' : 'pointer',
                position: 'relative',
                opacity: gelecek ? 0.4 : 1,
              }}
            >
              {gun}
              {tatil && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 7 }}>🎉</span>}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Geldi', bg: DURUMLAR.geldi.bg, color: DURUMLAR.geldi.takvim },
          { label: 'İzinli', bg: DURUMLAR.izinli.bg, color: DURUMLAR.izinli.takvim },
          { label: 'Raporlu', bg: DURUMLAR.raporlu.bg, color: DURUMLAR.raporlu.takvim },
          { label: 'Gelmedi', bg: DURUMLAR.gelmedi.bg, color: DURUMLAR.gelmedi.takvim },
          { label: 'Mesai', bg: DURUMLAR.mesai.bg, color: DURUMLAR.mesai.takvim },
          { label: 'Tatil', bg: '#fef9c3', color: '#854d0e' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}20` }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>{l.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
        💡 Hafta içi boş günler otomatik "Geldi" görünür. Bir güne tıklayarak durumu değiştirebilirsin.
      </div>
    </div>
  )
}

export default function Profil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [personel, setPersonel] = useState(null)
  const [duzenleModal, setDuzenleModal] = useState(null)
  const [yeniDurum, setYeniDurum] = useState('')
  const [yeniSaat, setYeniSaat] = useState('')
  const [yeniAciklama, setYeniAciklama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false)
  const [takvimAy, setTakvimAy] = useState(new Date().getMonth())
  const [takvimYil, setTakvimYil] = useState(new Date().getFullYear())
  const [kayitModal, setKayitModal] = useState(null)
  const [kayitDurum, setKayitDurum] = useState('')
  const [kayitSaat, setKayitSaat] = useState('')
  const [kayitAciklama, setKayitAciklama] = useState('')

  useEffect(() => { detayGetir() }, [id])

  const detayGetir = async () => {
    try {
      const res = await axios.get(`${API}/api/personel/${id}`)
      setPersonel(res.data)
    } catch (err) {
      console.error('Profil çekme hatası', err)
    }
  }

  const gunTikla = (gun, ay, yil, mevcutDurum) => {
    setKayitModal({ tarih: tarihStr(gun, ay, yil), mevcutDurum })
    setKayitDurum(mevcutDurum || '')
    setKayitSaat('')
    setKayitAciklama('')
  }

  const kayitModalKapat = () => setKayitModal(null)

  const kayitEkle = async () => {
    if (!kayitDurum) return
    setYukleniyor(true)
    try {
      await axios.post(`${API}/api/personel/${id}/kayit`, {
        tarih: kayitModal.tarih,
        durum: kayitDurum,
        saat: kayitDurum === 'mesai' ? Number(kayitSaat) : 0,
        aciklama: kayitAciklama,
      })
      kayitModalKapat()
      detayGetir()
    } catch {
      alert('Kayıt eklenirken hata oluştu.')
    } finally {
      setYukleniyor(false)
    }
  }

  const duzenleAc = (kayit, gercekIndex) => {
    setDuzenleModal({ index: gercekIndex, kayit })
    setYeniDurum(kayit.durum)
    setYeniSaat(kayit.saat || '')
    setYeniAciklama(kayit.aciklama || '')
  }

  const duzenleKapat = () => setDuzenleModal(null)

  const kayitSil = async (gercekIndex) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    try {
      await axios.delete(`${API}/api/personel/${id}/kayit/${gercekIndex}`)
      detayGetir()
    } catch {
      alert('Silme sırasında hata oluştu.')
    }
  }

  const kayitGuncelle = async () => {
    if (!duzenleModal) return
    setYukleniyor(true)
    try {
      await axios.put(`${API}/api/personel/${id}/kayit/${duzenleModal.index}`, {
        durum: yeniDurum,
        saat: yeniDurum === 'mesai' ? Number(yeniSaat) : 0,
        aciklama: yeniAciklama,
      })
      duzenleKapat()
      detayGetir()
    } catch {
      alert('Güncelleme sırasında hata oluştu.')
    } finally {
      setYukleniyor(false)
    }
  }

  const ayDegistir = (yon) => {
    let yeniAy = takvimAy + yon
    let yeniYil = takvimYil
    if (yeniAy < 0) { yeniAy = 11; yeniYil-- }
    if (yeniAy > 11) { yeniAy = 0; yeniYil++ }
    setTakvimAy(yeniAy)
    setTakvimYil(yeniYil)
  }

  const pdfIndir = async () => {
    setPdfYukleniyor(true)
    try {
      await kisiselAylikRapor(personel, takvimAy, takvimYil)
    } catch (e) {
      console.error(e)
      alert('Rapor oluşturulurken hata oluştu.')
    } finally {
      setPdfYukleniyor(false)
    }
  }

  if (!personel) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#94a3b8', fontSize: 15 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      Yükleniyor...
    </div>
  )

  // Görüntülenen ayın özeti (takvim ile senkron)
  const { ozet } = ayOzeti(personel.kayitlar, takvimAy, takvimYil)
  const avatarRenk = getAvatarColor(personel.isim_soyad)
  const siraliKayitlar = personel.kayitlar.map((k, i) => ({ ...k, gercekIndex: i })).reverse()
  const bugunTarih = bugunStr()
  const bugun = new Date()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#475569', flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personel.isim_soyad}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Kişisel Rapor</div>
        </div>
        <button onClick={pdfIndir} disabled={pdfYukleniyor} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {pdfYukleniyor ? '⏳...' : `🖨️ ${AYLAR[takvimAy].slice(0,3)} PDF`}
        </button>
      </header>

      <main style={{ padding: '16px 16px 80px', maxWidth: 480, margin: '0 auto' }}>

        {/* AVATAR + BUGÜN KAYIT BUTONU */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarRenk.bg, color: avatarRenk.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(personel.isim_soyad)}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#0f172a' }}>{personel.isim_soyad}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{personel.kayitlar.length} girilmiş kayıt</div>
            </div>
          </div>

          {/* BUGÜN KAYIT EKLE */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Bugün için kayıt ekle — {bugunTarih}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {DURUM_SECENEKLERI.map(b => {
                const r = DURUMLAR[b.val]
                return (
                  <button key={b.val}
                    onClick={() => { setKayitModal({ tarih: bugunTarih, mevcutDurum: null }); setKayitDurum(b.val); setKayitSaat(''); setKayitAciklama('') }}
                    style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 500, color: r.text, cursor: 'pointer' }}>
                    {b.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* AYLIK ÖZET (görüntülenen ay) */}
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{AYLAR[takvimAy]} {takvimYil} özeti</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Geldi', value: ozet.geldi, bg: DURUMLAR.geldi.bg, color: DURUMLAR.geldi.text },
            { label: 'İzin', value: ozet.izinli, bg: DURUMLAR.izinli.bg, color: DURUMLAR.izinli.text },
            { label: 'Rapor', value: ozet.raporlu, bg: DURUMLAR.raporlu.bg, color: DURUMLAR.raporlu.text },
            { label: 'Gelmedi', value: ozet.gelmedi, bg: DURUMLAR.gelmedi.bg, color: DURUMLAR.gelmedi.text },
            { label: 'Mesai', value: `${ozet.mesaiSaat}s`, bg: DURUMLAR.mesai.bg, color: DURUMLAR.mesai.text },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '10px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TAKVİM */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📅 {AYLAR[takvimAy]} {takvimYil}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => ayDegistir(-1)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#475569' }}>‹</button>
            <button onClick={() => ayDegistir(1)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#475569' }}>›</button>
          </div>
        </div>

        <Takvim kayitlar={personel.kayitlar} yil={takvimYil} ay={takvimAy} onGunTikla={gunTikla} />

        {/* GEÇMİŞ HAREKETLERİ (elle girilenler) */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Girilmiş Kayıtlar
        </div>

        {siraliKayitlar.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            Henüz elle girilmiş kayıt yok — hafta içi günler otomatik "Geldi" sayılıyor
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {siraliKayitlar.map((kayit) => {
              const r = DURUMLAR[kayit.durum] || DURUMLAR.bekliyor
              return (
                <div key={kayit.gercekIndex} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, border: `1px solid ${r.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, display: 'inline-block' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{kayit.tarih}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{kayit.aciklama ? kayit.aciklama : r.label}</div>
                  </div>
                  <div style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: r.text, flexShrink: 0 }}>
                    {kayit.durum === 'mesai' ? `+${kayit.saat}s` : r.label}
                  </div>
                  <button onClick={() => duzenleAc(kayit, kayit.gercekIndex)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
                  <button onClick={() => kayitSil(kayit.gercekIndex)} style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}>🗑️</button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* KAYIT EKLE MODAL */}
      {kayitModal && (
        <div onClick={e => e.target === e.currentTarget && kayitModalKapat()} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 36px', animation: 'slideUp 0.25s ease' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Kayıt Ekle</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>{kayitModal.tarih} — {personel.isim_soyad}</div>

            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Durum</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {DURUM_SECENEKLERI.map(d => {
                const r = DURUMLAR[d.val]
                return (
                  <button key={d.val} onClick={() => setKayitDurum(d.val)} style={{
                    background: kayitDurum === d.val ? r.bg : '#f8fafc',
                    border: `2px solid ${kayitDurum === d.val ? r.border : '#e2e8f0'}`,
                    borderRadius: 10, padding: '10px 0', fontSize: 13,
                    fontWeight: 500, color: kayitDurum === d.val ? r.text : '#94a3b8', cursor: 'pointer',
                  }}>{d.label}</button>
                )
              })}
            </div>

            {kayitDurum === 'mesai' && (
              <>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Mesai Saati</div>
                <input type="number" value={kayitSaat} onChange={e => setKayitSaat(e.target.value)} placeholder="Örn: 3"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 12, boxSizing: 'border-box' }} />
              </>
            )}

            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Açıklama (opsiyonel)</div>
            <input type="text" value={kayitAciklama} onChange={e => setKayitAciklama(e.target.value)} placeholder="Açıklama..."
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={kayitEkle} disabled={yukleniyor || !kayitDurum} style={{
              width: '100%', background: kayitDurum ? '#6366f1' : '#e2e8f0', border: 'none', borderRadius: 12,
              padding: '13px', fontSize: 15, fontWeight: 600, color: kayitDurum ? '#fff' : '#94a3b8',
              cursor: kayitDurum ? 'pointer' : 'not-allowed', marginBottom: 8,
            }}>
              {yukleniyor ? 'Kaydediliyor...' : '💾 Kaydet'}
            </button>
            <button onClick={kayitModalKapat} style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>Vazgeç</button>
          </div>
        </div>
      )}

      {/* DÜZENLE MODAL */}
      {duzenleModal && (
        <div onClick={e => e.target === e.currentTarget && duzenleKapat()} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 36px', animation: 'slideUp 0.25s ease' }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Kaydı Düzenle</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>{duzenleModal.kayit.tarih}</div>

            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Durum</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {DURUM_SECENEKLERI.map(d => {
                const r = DURUMLAR[d.val]
                return (
                  <button key={d.val} onClick={() => setYeniDurum(d.val)} style={{
                    background: yeniDurum === d.val ? r.bg : '#f8fafc',
                    border: `2px solid ${yeniDurum === d.val ? r.border : '#e2e8f0'}`,
                    borderRadius: 10, padding: '10px 0', fontSize: 13,
                    fontWeight: 500, color: yeniDurum === d.val ? r.text : '#94a3b8', cursor: 'pointer',
                  }}>{d.label}</button>
                )
              })}
            </div>

            {yeniDurum === 'mesai' && (
              <>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Mesai Saati</div>
                <input type="number" value={yeniSaat} onChange={e => setYeniSaat(e.target.value)} placeholder="Örn: 3"
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 12, boxSizing: 'border-box' }} />
              </>
            )}

            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>Açıklama (opsiyonel)</div>
            <input type="text" value={yeniAciklama} onChange={e => setYeniAciklama(e.target.value)} placeholder="Açıklama..."
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={kayitGuncelle} disabled={yukleniyor} style={{ width: '100%', background: '#6366f1', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 8 }}>
              {yukleniyor ? 'Kaydediliyor...' : '💾 Güncelle'}
            </button>
            <button onClick={duzenleKapat} style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  )
}
