import { useState, useEffect } from 'react'
import axios from 'axios'

// Base64 (URL-safe) → Uint8Array (tarayıcının istediği anahtar biçimi)
function anahtarDonustur(b64) {
  const dolgu = '='.repeat((4 - (b64.length % 4)) % 4)
  const ham = atob((b64 + dolgu).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...ham].map(c => c.charCodeAt(0)))
}

const iosMu = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const anaEkrandanMi = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function Hatirlatici({ yer = 'sayfa' }) {
  // durum: yukleniyor | desteklenmiyor | ios-ekle | reddedildi | kapali | acik
  const [durum, setDurum] = useState('yukleniyor')
  const [mesgul, setMesgul] = useState(false)
  const [bilgi, setBilgi] = useState('')
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    kontrolEt()
    // Bir yerde açılınca/kapanınca diğer kopya da güncellensin
    const yenile = () => kontrolEt()
    window.addEventListener('hatirlatici-degisti', yenile)
    return () => window.removeEventListener('hatirlatici-degisti', yenile)
  }, [])

  const bildir = () => window.dispatchEvent(new Event('hatirlatici-degisti'))

  const kontrolEt = async () => {
    const destek = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!destek) { setDurum(iosMu() && !anaEkrandanMi() ? 'ios-ekle' : 'desteklenmiyor'); return }
    if (Notification.permission === 'denied') { setDurum('reddedildi'); return }
    try {
      const kayit = await navigator.serviceWorker.register('/sw.js')
      const abonelik = await kayit.pushManager.getSubscription()
      if (abonelik && Notification.permission === 'granted') {
        // Sunucudaki kaydı tazele (cihaz değiştiyse vs.)
        axios.post('/api/bildirim?islem=abone', { abonelik: abonelik.toJSON() }).catch(() => {})
        setDurum('acik')
      } else setDurum('kapali')
    } catch { setDurum('kapali') }
  }

  const ac = async () => {
    setMesgul(true); setBilgi('')
    try {
      const izin = await Notification.requestPermission()
      if (izin !== 'granted') { setDurum(izin === 'denied' ? 'reddedildi' : 'kapali'); return }
      const kayit = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const { data } = await axios.get('/api/bildirim?islem=anahtar')
      let abonelik = await kayit.pushManager.getSubscription()
      if (!abonelik) {
        abonelik = await kayit.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: anahtarDonustur(data.publicKey),
        })
      }
      await axios.post('/api/bildirim?islem=abone', { abonelik: abonelik.toJSON() })
      await axios.post('/api/bildirim?islem=test').catch(() => {})
      setBilgi('✅ Hatırlatma açıldı. Her iş günü 13:45\'te bildirim gelecek.')
      setDurum('yeni-acildi')
      setTimeout(() => { setBilgi(''); setDurum('acik'); bildir() }, 4000)
    } catch (e) {
      console.error(e)
      setBilgi('Açılamadı, lütfen tekrar deneyin.')
    } finally { setMesgul(false) }
  }

  const kapat = async () => {
    setMesgul(true)
    try {
      const kayit = await navigator.serviceWorker.getRegistration('/sw.js') || await navigator.serviceWorker.ready
      const abonelik = await kayit?.pushManager.getSubscription()
      if (abonelik) {
        await axios.post('/api/bildirim?islem=iptal', { endpoint: abonelik.endpoint }).catch(() => {})
        await abonelik.unsubscribe()
      }
      setMenu(false); setDurum('kapali'); bildir()
    } finally { setMesgul(false) }
  }

  const deneme = async () => {
    setMesgul(true)
    try {
      const { data } = await axios.post('/api/bildirim?islem=test')
      setBilgi(data.basarili ? 'Deneme bildirimi gönderildi ✅' : 'Bu telefon kayıtlı görünmüyor, hatırlatıcıyı yeniden açın.')
      if (!data.basarili) { setMenu(false); setDurum('kapali'); bildir() }
    } catch { setBilgi('Gönderilemedi.') }
    finally { setMesgul(false) }
  }

  if (durum === 'yukleniyor' || durum === 'desteklenmiyor') return null

  // ── BAŞLIK ZİLİ: sadece hatırlatma açıkken görünür ──
  if (yer === 'baslik') {
    if (durum !== 'acik') return null
    return (
      <>
        <button onClick={() => { setBilgi(''); setMenu(true) }} aria-label="Hatırlatma ayarları" style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
          width: 40, height: 38, fontSize: 17, cursor: 'pointer', flexShrink: 0,
        }}>🔔</button>
        {menu && (
          <div onClick={e => e.target === e.currentTarget && setMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 36px' }}>
              <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 18px' }} />
              <div style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>🔔 Günlük Hatırlatma</div>
              <div style={{ fontSize: 15, color: '#475569', marginBottom: 18, lineHeight: 1.5 }}>
                Açık. Hafta içi her gün saat <strong>13:45</strong>'te telefonunuza bildirim gelir. Hafta sonu ve resmi tatillerde gelmez.
              </div>
              {bilgi && <div style={{ fontSize: 14, color: '#166534', background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>{bilgi}</div>}
              <button onClick={deneme} disabled={mesgul} style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 500, color: '#334155', cursor: 'pointer', marginBottom: 8 }}>
                {mesgul ? '...' : 'Deneme bildirimi gönder'}
              </button>
              <button onClick={kapat} disabled={mesgul} style={{ width: '100%', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 500, color: '#dc2626', cursor: 'pointer', marginBottom: 8 }}>
                Hatırlatmayı kapat
              </button>
              <button onClick={() => setMenu(false)} style={{ width: '100%', background: '#6366f1', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Tamam
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── SAYFA KARTI ──
  const kutu = (bg, border, color, icerik) => (
    <div style={{ margin: '10px 16px 0', background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px', fontSize: 14, color }}>
      {icerik}
    </div>
  )

  if (durum === 'ios-ekle') return kutu('#fff7ed', '#fed7aa', '#9a3412', (
    <>🔔 <strong>Günlük hatırlatma için:</strong> Safari'de alttaki <strong>Paylaş</strong> düğmesine basın → <strong>Ana Ekrana Ekle</strong>. Sonra uygulamayı ana ekrandaki simgeden açın.</>
  ))

  if (durum === 'reddedildi') return kutu('#fef2f2', '#fecaca', '#991b1b', (
    <>🔕 Bildirim izni kapalı. Telefonun <strong>Ayarlar → Bildirimler</strong> bölümünden bu siteye izin verin, sonra sayfayı yenileyin.</>
  ))

  if (durum === 'acik') return null
  if (durum === 'yeni-acildi') return kutu('#f0fdf4', '#bbf7d0', '#166534', bilgi)

  // kapali
  return (
    <div style={{ margin: '10px 16px 0' }}>
      <button onClick={ac} disabled={mesgul} style={{
        width: '100%', background: '#6366f1', border: 'none', borderRadius: 14,
        padding: '16px', fontSize: 16, fontWeight: 600, color: '#fff', cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
      }}>
        {mesgul ? 'Açılıyor...' : '🔔 Günlük Hatırlatmayı Aç'}
      </button>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, textAlign: 'center' }}>
        Her iş günü saat 13:45'te "kayıtları girin" diye telefona bildirim gelir
      </div>
      {bilgi && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4, textAlign: 'center' }}>{bilgi}</div>}
    </div>
  )
}
