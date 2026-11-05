import webpush from 'web-push'
import mongoose from 'mongoose'

// Bildirim anahtarları (VAPID) ilk kullanımda üretilip veritabanında saklanır;
// böylece Vercel'e ek ortam değişkeni girmek gerekmez.
export async function vapidHazirla() {
  const ayarlar = mongoose.connection.db.collection('ayarlar')
  let kayit = await ayarlar.findOne({ _id: 'vapid' })
  if (!kayit) {
    const k = webpush.generateVAPIDKeys()
    kayit = { _id: 'vapid', publicKey: k.publicKey, privateKey: k.privateKey }
    try { await ayarlar.insertOne(kayit) } catch { kayit = await ayarlar.findOne({ _id: 'vapid' }) }
  }
  webpush.setVapidDetails('https://takipsistemi-nine.vercel.app', kayit.publicKey, kayit.privateKey)
  return kayit.publicKey
}

export function abonelikler() {
  return mongoose.connection.db.collection('abonelikler')
}

// Tüm (veya bir kullanıcının) cihazlarına bildirim gönder; geçersiz abonelikleri temizle
export async function herkeseGonder(icerik, filtre = {}) {
  await vapidHazirla()
  const liste = await abonelikler().find(filtre).toArray()
  let basarili = 0
  for (const a of liste) {
    try {
      await webpush.sendNotification(a.abonelik, JSON.stringify(icerik), { TTL: 6 * 60 * 60 })
      basarili++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await abonelikler().deleteOne({ _id: a._id })
    }
  }
  return { toplam: liste.length, basarili }
}

// Türkiye saatine göre bugünün tarihi (GG.AA.YYYY) ve haftanın günü
export function bugunTR() {
  const p = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const al = t => p.find(x => x.type === t)?.value
  const tarih = `${al('day')}.${al('month')}.${al('year')}`
  const [g, a, y] = tarih.split('.').map(Number)
  return { tarih, gun: g, ay: a - 1, yil: y, haftaGunu: new Date(y, a - 1, g).getDay(),
    saat: Number(al('hour')), dakika: Number(al('minute')) }
}
