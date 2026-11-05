import { dbConnect, Personel } from './_lib/db.js'
import { oturumGerekli } from './_lib/auth.js'

const GUNCEL_LISTE = [
  "FATMA ÇİMEN",
  "NİZAMETTİN GÖNHAN",
  "AYŞE PEHLİVANOĞLU",
  "SONGÜL KOLUKIRIK",
  "MEHMET GÜNDOĞDU",
  "ÖMER BİNGÖL",
  "ÖZLEM SEZER",
  "CÜNEYT SÜZER",
  "İRFAN GÜVENÇ",
  "ERCAN KÜÇÜKAYLAK",
  "EFEKAN KARTAL",
  "YAŞAR UYAR",
  "MEHMET DAĞDELEN",
  "MEHMET CANKUT",
  "ŞEYMA KARADAĞ",
  "GÜNGÖR SANCAK",
  "MUSTAFA YILMAZ",
  "MUSTAFA YÜKSEL",
  "MEHMET DEMİRBAŞ",
  "YUSUF AKTAŞ",
  "EMRAH DEMİR",
  "DİLEK KAÇMAZ",
  "DAVUT YALÇIN",
  "SERKAN KAYA",
  "MESURE GÜLEÇ",
  "NURSEL DEĞİRMENÇEVİR",
  "YUSUF GÜVENÇ",
  "HÜSEYİN ÇENGEL",
  "ARZU UYAR",
  "TÜLAY ÖZKARA"
]

export default async function handler(req, res) {
  if (!oturumGerekli(req, res)) return

  try {
    await dbConnect()
  } catch (err) {
    console.error('DB baglanti hatasi:', err)
    return res.status(500).json({ mesaj: 'Veritabanı bağlantı hatası' })
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
        const tumu = req.query.tumu === '1'
        const personeller = await Personel.find(tumu ? {} : { aktif: { $ne: false } })
        const sira = isim => { const i = GUNCEL_LISTE.indexOf(isim); return i === -1 ? 9999 : i }
        personeller.sort((x, y) => sira(x.isim_soyad) - sira(y.isim_soyad))
        return res.status(200).json(personeller)
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
      const mevcut = await Personel.find()
      const pasif = [], aktif = [], eklenen = []
      for (const p of mevcut) {
        const olmali = GUNCEL_LISTE.includes(p.isim_soyad)
        if (p.aktif !== olmali) { p.aktif = olmali; await p.save(); (olmali ? aktif : pasif).push(p.isim_soyad) }
      }
      const isimler = mevcut.map(p => p.isim_soyad)
      for (const isim of GUNCEL_LISTE.filter(i => !isimler.includes(i))) {
        await new Personel({ isim_soyad: isim, aktif: true, kayitlar: [] }).save()
        eklenen.push(isim)
      }
      return res.status(200).json({ mesaj: 'Liste senkronize edildi (silme yapılmadı)', pasif, aktif, eklenen })
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
        // Kalıcı silme yok: personel pasife alınır, kayıtları arşivde kalır
        const personel = await Personel.findByIdAndUpdate(id, { aktif: false }, { new: true })
        if (!personel) return res.status(404).json({ mesaj: 'Personel bulunamadı' })
        return res.status(200).json({ mesaj: 'Personel pasife alındı' })
      }
      return res.status(405).json({ mesaj: 'Metot desteklenmiyor' })
    }

    // ── /api/personel/:id/kayit ────────────────────────────────────
    if (slug.length === 2 && slug[1] === 'kayit' && method === 'POST') {
      const personel = await Personel.findById(id)
      if (!personel) return res.status(404).json({ mesaj: 'Personel bulunamadı' })
      // Tek kayıt { tarih, durum, ... } veya çok günlü izin/rapor için { kayitlar: [...] }
      const gelen = Array.isArray(req.body?.kayitlar) ? req.body.kayitlar.slice(0, 400) : [req.body || {}]
      for (const { tarih, durum, saat, aciklama } of gelen) {
        if (!tarih || !durum) continue
        // Aynı tarihe ikinci kayıt girilirse eskisini güncelle (çift kayıt önleme)
        const mevcut = personel.kayitlar.findIndex(k => k.tarih === tarih)
        if (mevcut >= 0) {
          personel.kayitlar[mevcut].durum = durum
          personel.kayitlar[mevcut].saat = saat || 0
          personel.kayitlar[mevcut].aciklama = aciklama || ''
        } else {
          personel.kayitlar.push({ tarih, durum, saat: saat || 0, aciklama: aciklama || '' })
        }
      }
      personel.markModified('kayitlar')
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
