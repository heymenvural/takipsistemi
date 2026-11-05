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

export default function Hatirlatici() {
  // durum: yukleniyor | desteklenmiyor | ios-ekle | reddedildi | kapali | acik
  const [durum, setDurum] = useState('yukleniyor')
  const [mesgul, setMesgul] = useState(false)
  const [bilgi, setBilgi] = useState('')

  useEffect(() => { kontrolEt() }, [])

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
      setDurum('acik')
      setBilgi('Hatırlatıcı açıldı. Deneme bildirimi gönderiliyor...')
      await axios.post('/api/bildirim?islem=test')
      setBilgi('Hatırlatıcı açıldı ✅ Bir deneme bildirimi gönderildi.')
    } catch (e) {
      console.error(e)
      setBilgi('Açılamadı, lütfen tekrar deneyin.')
    } finally { setMesgul(false) }
  }

  const deneme = async () => {
    setMesgul(true)
    try {
      const { data } = await axios.post('/api/bildirim?islem=test')
      setBilgi(data.basarili ? 'Deneme bildirimi gönderildi ✅' : 'Bu telefon kayıtlı görünmüyor, hatırlatıcıyı yeniden açın.')
      if (!data.basarili) setDurum('kapali')
    } catch { setBilgi('Gönderilemedi.') }
    finally { setMesgul(false) }
  }

  if (durum === 'yukleniyor' || durum === 'desteklenmiyor') return null

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

  if (durum === 'acik') return kutu('#f0fdf4', '#bbf7d0', '#166534', (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
        🔔 Günlük hatırlatma <strong>açık</strong> — hafta içi her gün saat 16:00 civarı.
        {bilgi && <div style={{ fontSize: 12, marginTop: 4 }}>{bilgi}</div>}
      </div>
      <button onClick={deneme} disabled={mesgul} style={{ background: '#fff', border: '1px solid #86efac', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#166534', cursor: 'pointer', flexShrink: 0 }}>
        {mesgul ? '...' : 'Dene'}
      </button>
    </div>
  ))

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
        Her iş günü "kayıtları girin" diye telefona bildirim gelir
      </div>
      {bilgi && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4, textAlign: 'center' }}>{bilgi}</div>}
    </div>
  )
}
