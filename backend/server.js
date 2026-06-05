const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Bağlantısı Başarılı! 🍃"))
  .catch((err) => console.log("MongoDB Bağlantı Hatası: ", err));

const personelRotalari = require('./routes/personel');
app.use('/api/personel', personelRotalari);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda ayaklandı! 🚀`);
});