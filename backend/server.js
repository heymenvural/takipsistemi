const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Veritabanı Bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Bağlantısı Başarılı! 🍃"))
  .catch((err) => console.log("MongoDB Bağlantı Hatası: ", err));

// Rotaları (API Yollarını) Tanımlama
const personelRotalari = require('./routes/personel');
app.use('/api/personel', personelRotalari); // Tüm istekler buradan geçecek

// Sunucuyu Başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda ayaklandı! 🚀`);
});