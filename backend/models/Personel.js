const mongoose = require('mongoose');

// Personelin günlük hareketlerinin şeması
const GunlukKayitSchema = new mongoose.Schema({
    tarih: { 
        type: String, 
        required: true 
    }, // Örn: "2026-06-05"
    durum: { 
        type: String, 
        enum: ['geldi', 'izinli', 'mesai', 'bekliyor'], 
        default: 'bekliyor' 
    },
    saat: { 
        type: Number, 
        default: 0 
    }, // Mesai varsa kaç saat?
    aciklama: { 
        type: String, 
        default: "" 
    }
}, { _id: false }); // Alt doküman olduğu için ekstra ID üretmesini engelliyoruz

// Ana Personel Şeması
const PersonelSchema = new mongoose.Schema({
    isim_soyad: { 
        type: String, 
        required: true,
        trim: true
    },
    // Personelin tüm hareketleri bu dizinin içinde tutulacak
    kayitlar: [GunlukKayitSchema]
}, { timestamps: true }); // Ne zaman oluşturulduğu/güncellendiği bilgisini otomatik tutar

module.exports = mongoose.model('Personel', PersonelSchema);