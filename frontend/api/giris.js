import { girisKontrol, tokenOlustur, tokenDogrula } from './_lib/auth.js'

export default async function handler(req, res) {
  // Oturum hâlâ geçerli mi? (uygulama açılışında kontrol)
  if (req.method === 'GET') {
    const h = req.headers.authorization || ''
    const veri = tokenDogrula(h.startsWith('Bearer ') ? h.slice(7) : '')
    if (!veri) return res.status(401).json({ gecerli: false })
    return res.status(200).json({ gecerli: true, ad: veri.ad })
  }

  if (req.method !== 'POST') return res.status(405).json({ mesaj: 'Metot desteklenmiyor' })

  const { kullanici, sifre } = req.body || {}
  // Kaba kuvvet denemelerini yavaşlat
  await new Promise(r => setTimeout(r, 400))
  const u = girisKontrol(kullanici, sifre)
  if (!u) return res.status(401).json({ mesaj: 'Kullanıcı adı veya şifre hatalı' })

  return res.status(200).json({ token: tokenOlustur(u.k, u.ad), ad: u.ad })
}
