const express = require('express');
const router = express.Router();
const Personel = require('../models/Personel');

// 1. TÜM PERSONELİ VE KAYITLARINI GETİR
router.get('/', async (req, res) => {
    try {
        const personeller = await Personel.find();
        res.status(200).json(personeller);
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

// 3. PERSONELE GÜNLÜK KAYIT EKLE
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

// 4. KAYIT GÜNCELLE (Düzenleme için)
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

// 5. OTOMATİK LİSTE KURULUMU
router.get('/kurulum/baslat', async (req, res) => {
    const HAZIR_LISTE = [
        "FATMA ÇİMEN", "NİZAMETTİN GÖNHAN", "AYŞE PEHLİVANOĞLU", "NURSEL DEĞİRMENÇEVİR",
        "HÜSEYİN ÇENGEL", "SONGÜL KOLUKIRIK", "DAVUT YALÇIN", "MEHMET GÜNDOĞDU",
        "DİLEK KAÇMAZ", "MÜJGAN DİKMEN", "MEHMET DAĞDELEN", "ÖZLEM SEZER",
        "CÜNEYT SÜZER", "İRFAN GÜVENÇ", "YUSUF GÜVENÇ", "ERCAN KÜÇÜKAYLAK",
        "EFEKAN KARTAL", "YAŞAR UYAR", "GÜLÇİN KURT", "ÖMER BİNGÖL"
    ];
    try {
        const mevcutPersonel = await Personel.countDocuments();
        if (mevcutPersonel > 0)
            return res.status(400).json({ mesaj: "Veritabanı zaten dolu." });
        const eklenecekler = HAZIR_LISTE.map(isim => ({ isim_soyad: isim, kayitlar: [] }));
        await Personel.insertMany(eklenecekler);
        res.status(201).json({ mesaj: "20 kişilik hazır liste eklendi!" });
    } catch (err) {
        res.status(500).json({ mesaj: "Kurulum sırasında hata oluştu", hata: err });
    }
});

module.exports = router;