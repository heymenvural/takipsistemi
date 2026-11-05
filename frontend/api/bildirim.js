import { dbConnect } from './_lib/db.js'
import { oturumGerekli } from './_lib/auth.js'
import { vapidHazirla, abonelikler, herkeseGonder } from './_lib/bildirim.js'

// /api/bildirim?islem=anahtar  (GET)  → telefonun abone olması için açık anahtar
// /api/bildirim?islem=abone    (POST) → bu telefonu hatırlatma listesine ekle
// /api/bildirim?islem=iptal    (POST) → bu telefonu listeden çıkar
// /api/bildirim?islem=test     (POST) → bu kullanıcının telefonlarına deneme bildirimi
export default async function handler(req, res) {
  const oturum = oturumGerekli(req, res)
  if (!oturum) return
  await dbConnect()
  const islem = req.query.islem

  try {
    if (islem === 'anahtar' && req.method === 'GET') {
      return res.status(200).json({ publicKey: await vapidHazirla() })
    }

    if (islem === 'abone' && req.method === 'POST') {
      const abonelik = req.body?.abonelik
      if (!abonelik?.endpoint) return res.status(400).json({ mesaj: 'Geçersiz abonelik' })
      await abonelikler().updateOne(
        { 'abonelik.endpoint': abonelik.endpoint },
        { $set: { abonelik, kullanici: oturum.u, guncelleme: new Date() } },
        { upsert: true }
      )
      return res.status(200).json({ mesaj: 'Hatırlatıcı açıldı' })
    }

    if (islem === 'iptal' && req.method === 'POST') {
      const endpoint = req.body?.endpoint
      if (endpoint) await abonelikler().deleteOne({ 'abonelik.endpoint': endpoint })
      return res.status(200).json({ mesaj: 'Hatırlatıcı kapatıldı' })
    }

    if (islem === 'test' && req.method === 'POST') {
      const sonuc = await herkeseGonder(
        { baslik: 'Mesai Takip', govde: 'Deneme bildirimi — hatırlatıcı çalışıyor ✅', url: '/' },
        { kullanici: oturum.u }
      )
      return res.status(200).json(sonuc)
    }

    return res.status(400).json({ mesaj: 'Bilinmeyen işlem' })
  } catch (e) {
    console.error('bildirim hatasi', e)
    return res.status(500).json({ mesaj: 'Bildirim işlemi başarısız' })
  }
}
