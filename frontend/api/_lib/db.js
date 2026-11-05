import mongoose from 'mongoose'

// Vercel serverless: bağlantıyı global'de önbelleğe al,
// her istekte yeniden bağlanmayı önle (soğuk başlatma dışında)
let cached = globalThis._mongooseCache
if (!cached) {
  cached = globalThis._mongooseCache = { conn: null, promise: null }
}

export async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    // Panele yapıştırırken oluşan hataları temizle: "MONGO_URI=" öneki, tırnak, boşluk, satır sonu
    const uri = String(process.env.MONGO_URI || '')
      .trim()
      .replace(/^MONGO_URI\s*=\s*/i, '')
      .replace(/^['"]|['"]$/g, '')
      .split(/\s+/)[0]
    if (!uri) throw new Error('MONGO_URI tanımlı değil')
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    })
  }
  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }
  return cached.conn
}

// --- Şema (backend/models/Personel.js ile birebir aynı, sadece enum genişletildi) ---
const GunlukKayitSchema = new mongoose.Schema({
  tarih: { type: String, required: true },
  durum: {
    type: String,
    enum: ['geldi', 'izinli', 'mesai', 'bekliyor', 'raporlu', 'gelmedi'],
    default: 'bekliyor',
  },
  saat: { type: Number, default: 0 },
  aciklama: { type: String, default: '' },
}, { _id: false })

const PersonelSchema = new mongoose.Schema({
  isim_soyad: { type: String, required: true, trim: true },
  aktif: { type: Boolean, default: true },
  kayitlar: [GunlukKayitSchema],
}, { timestamps: true })

// Serverless'ta model iki kez tanımlanmasın diye guard
export const Personel = mongoose.models.Personel || mongoose.model('Personel', PersonelSchema)
