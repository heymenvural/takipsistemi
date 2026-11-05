import mongoose from 'mongoose'
import { dbConnect, Personel } from './_lib/db.js'
import { herkeseGonder, bugunTR } from './_lib/bildirim.js'
import { getTumTatiller } from '../src/hooks/useTatiller.js'

// Günlük hatırlatma — Türkiye saatiyle 13:45.
// Birden fazla tetikleyici çağırır (GitHub zamanlayıcısı + Vercel yedek görevi);
// bildirim GÜNDE YALNIZCA BİR KEZ ve 13:45'TEN ÖNCE ASLA gönderilmez.
const HEDEF_SAAT = 13, HEDEF_DAKIKA = 45

export default async function handler(req, res) {
  const b = bugunTR()
  if (b.haftaGunu === 0 || b.haftaGunu === 6)
    return res.status(200).json({ gonderildi: false, neden: 'Hafta sonu' })
  if (getTumTatiller(b.yil).includes(b.tarih))
    return res.status(200).json({ gonderildi: false, neden: 'Resmi tatil' })
  if (b.saat * 60 + b.dakika < HEDEF_SAAT * 60 + HEDEF_DAKIKA)
    return res.status(200).json({ gonderildi: false, neden: 'Henüz saati gelmedi' })

  await dbConnect()
  // Bugün zaten gönderildiyse tekrar gönderme (atomik kontrol)
  const ayarlar = mongoose.connection.db.collection('ayarlar')
  const kilit = await ayarlar.updateOne(
    { _id: 'son_hatirlatma', tarih: { $ne: b.tarih } },
    { $set: { tarih: b.tarih, zaman: new Date() } },
    { upsert: false }
  )
  if (kilit.matchedCount === 0) {
    const var_mi = await ayarlar.findOne({ _id: 'son_hatirlatma' })
    if (var_mi) return res.status(200).json({ gonderildi: false, neden: 'Bugün zaten gönderildi' })
    try { await ayarlar.insertOne({ _id: 'son_hatirlatma', tarih: b.tarih, zaman: new Date() }) }
    catch { return res.status(200).json({ gonderildi: false, neden: 'Bugün zaten gönderildi' }) }
  }

  const girilmis = await Personel.countDocuments({ aktif: { $ne: false }, 'kayitlar.tarih': b.tarih })
  const sonuc = await herkeseGonder({
    baslik: 'Mesai Takip — Günlük Hatırlatma',
    govde: girilmis
      ? `Bugün ${girilmis} kişi için kayıt girildi. Eksik varsa tamamlamayı unutmayın.`
      : 'Bugünün kayıtlarını girmeyi unutmayın. İzinli, raporlu ya da gelmeyen varsa işaretleyin.',
    url: '/',
  })
  return res.status(200).json({ gonderildi: true, tarih: b.tarih, girilmis, ...sonuc })
}
