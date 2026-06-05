const express = require('express');
const router = express.Router();
const Personel = require('../models/Personel');

// 1. TÜM PERSONELİ VE KAYITLARINI GETİR (Ana ekran için)
router.get('/', async (req, res) => {
    try {
        const personeller = await Personel.find();
        res.status(200).json(personeller);
    } catch (err) {
        res.status(500).json({ mesaj: "Personel getirilirken hata oluştu", hata: err });
    }
});

// 2. TEK BİR PERSONELİN DETAYINI GETİR (Profil ekranı için)
router.get('/:id', async (req, res) => {
    try {
        const personel = await Personel.findById(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        res.status(200).json(personel);
    } catch (err) {
        res.status(500).json({ mesaj: "Hata oluştu", hata: err });
    }
});

// 3. PERSONELE GÜNLÜK KAYIT EKLE (Mesai, İzin vb.)
router.post('/:id/kayit', async (req, res) => {
    try {
        const { tarih, durum, saat, aciklama } = req.body;
        
        const personel = await Personel.findById(req.params.id);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });

        // Yeni kaydı personelin kayıtlar dizisine ekle
        personel.kayitlar.push({ tarih, durum, saat, aciklama });
        await personel.save();

        res.status(200).json({ mesaj: "Kayıt başarıyla eklendi!", personel });
    } catch (err) {
        res.status(500).json({ mesaj: "Kayıt eklenirken hata oluştu", hata: err });
    }
});

// 4. OTOMATİK LİSTE KURULUMU (İlk 20 kişiyi tek seferde veritabanına basmak için)
router.get('/kurulum/baslat', async (req, res) => {
    const HAZIR_LISTE = [
        "FATMA ÇİMEN", "NİZAMETTİN GÖNHAN", "AYŞE PEHLİVANOĞLU", "NURSEL DEĞİRMENÇEVİR",
        "HÜSEYİN ÇENGEL", "SONGÜL KOLUKIRIK", "DAVUT YALÇIN", "MEHMET GÜNDOĞDU",
        "DİLEK KAÇMAZ", "MÜJGAN DİKMEN", "MEHMET DAĞDELEN", "ÖZLEM SEZER",
        "CÜNEYT SÜZER", "İRFAN GÜVENÇ", "YUSUF GÜVENÇ", "ERCAN KÜÇÜKAYLAK",
        "EFEKAN KARTAL", "YAŞAR UYAR", "GÜLÇİN KURT", "ÖMER BİNGÖL"
    ];

    try {
        // Önce veritabanı boş mu diye kontrol edelim (mükerrer kayıt olmasın)
        const mevcutPersonel = await Personel.countDocuments();
        if (mevcutPersonel > 0) {
            return res.status(400).json({ mesaj: "Veritabanı zaten dolu, kurulum yapmaya gerek yok." });
        }

        // Listeyi MongoDB formatına çevir ve kaydet
        const eklenecekler = HAZIR_LISTE.map(isim => ({ isim_soyad: isim, kayitlar: [] }));
        await Personel.insertMany(eklenecekler);

        res.status(201).json({ mesaj: "20 kişilik hazır liste veritabanına başarıyla eklendi!" });
    } catch (err) {
        res.status(500).json({ mesaj: "Kurulum sırasında hata oluştu", hata: err });
    }
});

module.exports = router;