import { dbConnect, Personel } from './_lib/db.js'
import { tokenDogrula } from './_lib/auth.js'
import { herkeseGonder, bugunTR } from './_lib/bildirim.js'
import { getTumTatiller } from '../src/hooks/useTatiller.js'

// Vercel zamanlanmış görevi her iş günü çağırır (vercel.json → crons).
// Hafta sonu ve resmi tatilde bildirim gönderilmez.
export default async function handler(req, res) {
  const ua = String(req.headers['user-agent'] || '')
  const h = String(req.headers.authorization || '')
  const cronMu = ua.includes('vercel-cron') ||
    (process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`)
  const oturumluMu = !!tokenDogrula(h.startsWith('Bearer ') ? h.slice(7) : '')
  if (!cronMu && !oturumluMu) return res.status(401).json({ mesaj: 'Yetkisiz' })

  const bugun = bugunTR()
  if (bugun.haftaGunu === 0 || bugun.haftaGunu === 6)
    return res.status(200).json({ gonderildi: false, neden: 'Hafta sonu' })
  if (getTumTatiller(bugun.yil).includes(bugun.tarih))
    return res.status(200).json({ gonderildi: false, neden: 'Resmi tatil' })

  await dbConnect()
  // Bugün için en az bir kayıt girildiyse ikinci kez rahatsız etme
  const girilmis = await Personel.countDocuments({ aktif: { $ne: false }, 'kayitlar.tarih': bugun.tarih })

  const sonuc = await herkeseGonder({
    baslik: 'Mesai Takip — Günlük Hatırlatma',
    govde: girilmis
      ? `Bugün ${girilmis} kişi için kayıt girildi. Eksik varsa tamamlamayı unutmayın.`
      : 'Bugünün kayıtlarını girmeyi unutmayın. İzinli, raporlu ya da gelmeyen varsa işaretleyin.',
    url: '/',
  })
  return res.status(200).json({ gonderildi: true, tarih: bugun.tarih, girilmis, ...sonuc })
}
