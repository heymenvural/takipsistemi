const express = require('express');
const router = express.Router();
const Personel = require('../models/Personel');

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
];

// 1. TÜM PERSONELİ VE KAYITLARINI GETİR
router.get('/', async (req, res) => {
    try {
        const personeller = await Personel.find();
        // Listedeki sıraya göre sırala
        const siralanmis = GUNCEL_LISTE
            .map(isim => personeller.find(p => p.isim_soyad === isim))
            .filter(Boolean);
        // Listede olmayan ama veritabanında olanları sona ekle
        const listeyeGirmeyenler = personeller.filter(p => !GUNCEL_LISTE.includes(p.isim_soyad));
        res.status(200).json([...siralanmis, ...listeyeGirmeyenler]);
    } catch (err) {
        res.status(500).json({ mesaj: "Personel getirilirken hata oluştu", hata: err });
    }
});

// 2. TEK BİR PERSONELİN DETAYINI GETİR
router.get('/:id', async (req, res) => {
    try {
        const personel = await Personel.findById(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        res.status(200).json(personel);
    } catch (err) {
        res.status(500).json({ mesaj: "Hata oluştu", hata: err });
    }
});

// 3. YENİ PERSONEL EKLE
router.post('/', async (req, res) => {
    try {
        const { isim_soyad } = req.body;
        if (!isim_soyad || !isim_soyad.trim())
            return res.status(400).json({ mesaj: "İsim boş olamaz" });
        const yeni = new Personel({ isim_soyad: isim_soyad.trim().toUpperCase(), kayitlar: [] });
        await yeni.save();
        res.status(201).json({ mesaj: "Personel eklendi!", personel: yeni });
    } catch (err) {
        res.status(500).json({ mesaj: "Personel eklenirken hata oluştu", hata: err });
    }
});

// 4. PERSONEL SİL
router.delete('/:id', async (req, res) => {
    try {
        const personel = await Personel.findByIdAndDelete(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        res.status(200).json({ mesaj: "Personel silindi!" });
    } catch (err) {
        res.status(500).json({ mesaj: "Personel silinirken hata oluştu", hata: err });
    }
});

// 5. LİSTEYİ SENKRONİZE ET (Eski listeden yeniye geçiş)
router.post('/senkronize/baslat', async (req, res) => {
    try {
        const mevcutPersoneller = await Personel.find();

        // Listede olmayanları sil
        const silinecekler = mevcutPersoneller.filter(p => !GUNCEL_LISTE.includes(p.isim_soyad));
        for (const p of silinecekler) {
            await Personel.findByIdAndDelete(p._id);
        }

        // Listede olup veritabanında olmayanları ekle
        const mevcutIsimler = mevcutPersoneller.map(p => p.isim_soyad);
        const eklenecekler = GUNCEL_LISTE.filter(isim => !mevcutIsimler.includes(isim));
        for (const isim of eklenecekler) {
            await new Personel({ isim_soyad: isim, kayitlar: [] }).save();
        }

        res.status(200).json({
            mesaj: "Liste senkronize edildi!",
            silinen: silinecekler.map(p => p.isim_soyad),
            eklenen: eklenecekler
        });
    } catch (err) {
        res.status(500).json({ mesaj: "Senkronizasyon sırasında hata oluştu", hata: err });
    }
});

// 6. PERSONELE GÜNLÜK KAYIT EKLE
router.post('/:id/kayit', async (req, res) => {
    try {
        const { tarih, durum, saat, aciklama } = req.body;
        const personel = await Personel.findById(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        personel.kayitlar.push({ tarih, durum, saat, aciklama });
        await personel.save();
        res.status(200).json({ mesaj: "Kayıt başarıyla eklendi!", personel });
    } catch (err) {
        res.status(500).json({ mesaj: "Kayıt eklenirken hata oluştu", hata: err });
    }
});

// 7. KAYIT GÜNCELLE
router.put('/:id/kayit/:index', async (req, res) => {
    try {
        const { durum, saat, aciklama } = req.body;
        const personel = await Personel.findById(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        const index = parseInt(req.params.index);
        if (index < 0 || index >= personel.kayitlar.length)
            return res.status(404).json({ mesaj: "Kayıt bulunamadı" });
        personel.kayitlar[index].durum = durum;
        personel.kayitlar[index].saat = saat || 0;
        personel.kayitlar[index].aciklama = aciklama || '';
        personel.markModified('kayitlar');
        await personel.save();
        res.status(200).json({ mesaj: "Kayıt güncellendi!", personel });
    } catch (err) {
        res.status(500).json({ mesaj: "Kayıt güncellenirken hata oluştu", hata: err });
    }
});

// 8. KAYIT SİL
router.delete('/:id/kayit/:index', async (req, res) => {
    try {
        const personel = await Personel.findById(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        const index = parseInt(req.params.index);
        if (index < 0 || index >= personel.kayitlar.length)
            return res.status(404).json({ mesaj: "Kayıt bulunamadı" });
        personel.kayitlar.splice(index, 1);
        personel.markModified('kayitlar');
        await personel.save();
        res.status(200).json({ mesaj: "Kayıt silindi!", personel });
    } catch (err) {
        res.status(500).json({ mesaj: "Kayıt silinirken hata oluştu", hata: err });
    }
});

// 9. OTOMATİK LİSTE KURULUMU
router.get('/kurulum/baslat', async (req, res) => {
    try {
        const mevcutPersonel = await Personel.countDocuments();
        if (mevcutPersonel > 0)
            return res.status(400).json({ mesaj: "Veritabanı zaten dolu." });
        const eklenecekler = GUNCEL_LISTE.map(isim => ({ isim_soyad: isim, kayitlar: [] }));
        await Personel.insertMany(eklenecekler);
        res.status(201).json({ mesaj: "Liste veritabanına eklendi!" });
    } catch (err) {
        res.status(500).json({ mesaj: "Kurulum sırasında hata oluştu", hata: err });
    }
});

module.exports = router;