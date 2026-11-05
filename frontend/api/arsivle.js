import mongoose from 'mongoose'
import { dbConnect, Personel } from './_lib/db.js'

// TEK SEFERLİK: 02.11.2026 öncesi kayıtları ayrı 'arsiv_kayitlar' koleksiyonuna taşır.
// Kayıtlar silinmez, sadece uygulamadan kaldırılır. İşlem bitince bu dosya kaldırılacak.
const ANAHTAR = '3c5698a2b9056941beb91022'
const MILAT = new Date(2026, 10, 2)

function tarihCoz(t) {
  const p = String(t).split('.').map(Number)
  return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : null
}

export default async function handler(req, res) {
  if (req.query.anahtar !== ANAHTAR) return res.status(404).json({ mesaj: 'Bulunamadı' })
  await dbConnect()
  const arsiv = mongoose.connection.db.collection('arsiv_kayitlar')
  const kuru = req.query.uygula !== '1'
  const ozet = []
  let toplamTasinan = 0, toplamKalan = 0
  for (const p of await Personel.find()) {
    const eski = p.kayitlar.filter(k => { const d = tarihCoz(k.tarih); return d && d < MILAT })
    const yeni = p.kayitlar.filter(k => { const d = tarihCoz(k.tarih); return !d || d >= MILAT })
    toplamTasinan += eski.length; toplamKalan += yeni.length
    if (eski.length) ozet.push(`${p.isim_soyad}: ${eski.length} arşiv, ${yeni.length} kalan`)
    if (!kuru && eski.length) {
      await arsiv.insertOne({
        personelId: p._id, isim_soyad: p.isim_soyad,
        kayitlar: eski.map(k => (k.toObject ? k.toObject() : k)),
        arsivlenme: new Date(), milat: '02.11.2026',
      })
      p.kayitlar = yeni
      p.markModified('kayitlar')
      await p.save()
    }
  }
  return res.status(200).json({ kuru, toplamTasinan, toplamKalan, ozet })
}
