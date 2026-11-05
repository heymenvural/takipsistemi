import { dbConnect, Personel } from './_lib/db.js'

const GUNCEL_LISTE = [
  "FATMA ÇİMEN",
  "NİZAMETTİN GÖNHAN",
  "AYŞE PEHLİVANOĞLU",
  "SONGÜL KOLUKIRIK",
  "MEHMET GÜNDOĞDU",
  "MEHMET DAĞDELEN",
  "ÖZLEM SEZER",
  "CÜNEYT SÜZER",
  "İRFAN GÜVENÇ",
  "ERCAN KÜÇÜKAYLAK",
  "EFEKAN KARTAL",
  "YAŞAR UYAR",
  "ÖMER BİNGÖL",
  "MEHMET CANKUT",
  "ŞEYMA KARADAĞ",
  "GÜNGÖR SANCAK",
  "MUSTAFA YILMAZ",
  "MUSTAFA YÜKSEL",
  "MEHMET DEMİRBAŞ",
  "YUSUF AKTAŞ",
  "OSMAN DOĞAN",
  "SERKAN KAYA",
  "DAVUT YALÇIN"
]

export default async function handler(req, res) {
  try {
    await dbConnect()
  } catch (err) {
    // Teşhis: şifreyi göstermeden hangi adrese bağlanılmaya çalışıldığını ve sunucu durumlarını döndür
    const uri = String(process.env.MONGO_URI || '')
    const host = (uri.split('@')[1] || '').split('/')[0]
    const kullanici = (uri.split('://')[1] || '').split(':')[0].replace(/^MONGO_URI=/i, '')
    const sunucular = err?.reason?.servers
      ? [...err.reason.servers.entries()].map(([h, d]) => ({ h, tip: d.type, hata: d.error ? String(d.error.message || d.error).slice(0, 200) : null }))
      : null
    return res.status(500).json({ mesaj: 'Veritabanı bağlantı hatası', hata: String(err), host, kullanici, sunucular })
  }

  // vercel.json: /api/personel/:path* → /api/personel?path=...
  const ham = req.query.path
  const slug = (Array.isArray(ham) ? ham.join('/') : (ham || ''))
    .split('/').filter(Boolean)
  const method = req.method

  try {
    // ── /api/personel ──────────────────────────────────────────────
    if (slug.length === 0) {
      if (method === 'GET') {
        const personeller = await Personel.find()
        const siralanmis = GUNCEL_LISTE
          .map(isim => personeller.find(p => p.isim_soyad === isim))
          .filter(Boolean)
        const listeyeGirmeyenler = personeller.filter(p => !GUNCEL_LISTE.includes(p.isim_soyad))
        return res.status(200).json([...siralanmis, ...listeyeGirmeyenler])
      }
      if (method === 'POST') {
        const { isim_soyad } = req.body || {}
        if (!isim_soyad || !isim_soyad.trim())
          return res.status(400).json({ mesaj: 'İsim boş olamaz' })
        const yeni = new Personel({ isim_soyad: isim_soyad.trim().toUpperCase(), kayitlar: [] })
        await yeni.save()
        return res.status(201).json({ mesaj: 'Personel eklendi!', personel: yeni })
      }
      return res.status(405).json({ mesaj: 'Metot desteklenmiyor' })
    }

    // ── /api/personel/senkronize/baslat ────────────────────────────
    if (slug[0] === 'senkronize' && slug[1] === 'baslat') {
      const mevcutPersoneller = await Personel.find()
      const silinecekler = mevcutPersoneller.filter(p => !GUNCEL_LISTE.includes(p.isim_soyad))
      for (const p of silinecekler) await Personel.findByIdAndDelete(p._id)
      const mevcutIsimler = mevcutPersoneller.map(p => p.isim_soyad)
      const eklenecekler = GUNCEL_LISTE.filter(isim => !mevcutIsimler.includes(isim))
      for (const isim of eklenecekler) await new Personel({ isim_soyad: isim, kayitlar: [] }).save()
      return res.status(200).json({
        mesaj: 'Liste senkronize edildi!',
        silinen: silinecekler.map(p => p.isim_soyad),
        eklenen: eklenecekler,
      })
    }

    // ── /api/personel/kurulum/baslat ───────────────────────────────
    if (slug[0] === 'kurulum' && slug[1] === 'baslat') {
      const mevcutPersonel = await Personel.countDocuments()
      if (mevcutPersonel > 0)
        return res.status(400).json({ mesaj: 'Veritabanı zaten dolu.' })
      const eklenecekler = GUNCEL_LISTE.map(isim => ({ isim_soyad: isim, kayitlar: [] }))
      await Personel.insertMany(eklenecekler)
      return res.status(201).json({ mesaj: 'Liste veritabanına eklendi!' })
    }

    // ── /api/personel/:id ──────────────────────────────────────────
    const id = slug[0]

    if (slug.length === 1) {
      if (method === 'GET') {
        const personel = await Personel.findById(id)
        if (!personel) return res.status(404).json({ mesaj: 'Personel bulunamadı' })
        return res.status(200).json(personel)
      }
      if (method === 'DELETE') {
        const personel = await Personel.findByIdAndDelete(id)
        if (!personel) return res.status(404).json({ mesaj: 'Personel bulunamadı' })
        return res.status(200).json({ mesaj: 'Personel silindi!' })
      }
      return res.status(405).json({ mesaj: 'Metot desteklenmiyor' })
    }

    // ── /api/personel/:id/kayit ────────────────────────────────────
    if (slug.length === 2 && slug[1] === 'kayit' && method === 'POST') {
      const { tarih, durum, saat, aciklama } = req.body || {}
      const personel = await Personel.findById(id)
      if (!personel) return res.status(404).json({ mesaj: 'Personel bulunamadı' })
      // Aynı tarihe ikinci kayıt girilirse eskisini güncelle (çift kayıt önleme)
      const mevcut = personel.kayitlar.findIndex(k => k.tarih === tarih)
      if (mevcut >= 0) {
        personel.kayitlar[mevcut].durum = durum
        personel.kayitlar[mevcut].saat = saat || 0
        personel.kayitlar[mevcut].aciklama = aciklama || ''
        personel.markModified('kayitlar')
      } else {
        personel.kayitlar.push({ tarih, durum, saat, aciklama })
      }
      await personel.save()
      return res.status(200).json({ mesaj: 'Kayıt başarıyla eklendi!', personel })
    }

    // ── /api/personel/:id/kayit/:index ─────────────────────────────
    if (slug.length === 3 && slug[1] === 'kayit') {
      const personel = await Personel.findById(id)
      if (!personel) return res.status(404).json({ mesaj: 'Personel bulunamadı' })
      const index = parseInt(slug[2])
      if (isNaN(index) || index < 0 || index >= personel.kayitlar.length)
        return res.status(404).json({ mesaj: 'Kayıt bulunamadı' })

      if (method === 'PUT') {
        const { durum, saat, aciklama } = req.body || {}
        personel.kayitlar[index].durum = durum
        personel.kayitlar[index].saat = saat || 0
        personel.kayitlar[index].aciklama = aciklama || ''
        personel.markModified('kayitlar')
        await personel.save()
        return res.status(200).json({ mesaj: 'Kayıt güncellendi!', personel })
      }
      if (method === 'DELETE') {
        personel.kayitlar.splice(index, 1)
        personel.markModified('kayitlar')
        await personel.save()
        return res.status(200).json({ mesaj: 'Kayıt silindi!', personel })
      }
      return res.status(405).json({ mesaj: 'Metot desteklenmiyor' })
    }

    return res.status(404).json({ mesaj: 'Endpoint bulunamadı' })
  } catch (err) {
    return res.status(500).json({ mesaj: 'İşlem sırasında hata oluştu', hata: String(err) })
  }
}
