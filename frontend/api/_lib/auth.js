import crypto from 'crypto'

// İmza anahtarı ayrı bir ortam değişkeni gerektirmesin diye sunucuda zaten gizli duran
// MONGO_URI'den türetilir. (İstenirse AUTH_SECRET tanımlanarak değiştirilebilir.)
function anahtar() {
  return crypto.createHash('sha256')
    .update(String(process.env.AUTH_SECRET || process.env.MONGO_URI || '') + '|takip-oturum-v1')
    .digest()
}

const b64 = s => Buffer.from(s).toString('base64url')

// Kullanıcılar Vercel ortam değişkenlerinden okunur (sunucu tarafında; sitenin koduna gömülmez)
export function kullanicilar() {
  const e = process.env
  const liste = [
    { k: e.LOGIN_USER || e.VITE_LOGIN_USER, s: e.LOGIN_PASS || e.VITE_LOGIN_PASS, ad: 'Mesud Vural' },
    { k: e.LOGIN_USER_2 || e.VITE_LOGIN_USER_2, s: e.LOGIN_PASS_2 || e.VITE_LOGIN_PASS_2, ad: 'Mehmet Erol' },
  ]
  return liste.filter(x => x.k && x.s)
}

function esit(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function girisKontrol(kullanici, sifre) {
  const k = String(kullanici || '').trim().toLowerCase()
  return kullanicilar().find(u => esit(u.k.toLowerCase(), k) && esit(u.s, sifre || '')) || null
}

const BIR_YIL = 365 * 24 * 60 * 60 * 1000

export function tokenOlustur(kullanici, ad) {
  const govde = b64(JSON.stringify({ u: kullanici, ad, exp: Date.now() + BIR_YIL }))
  const imza = crypto.createHmac('sha256', anahtar()).update(govde).digest('base64url')
  return `${govde}.${imza}`
}

export function tokenDogrula(token) {
  if (!token || !token.includes('.')) return null
  const [govde, imza] = token.split('.')
  const beklenen = crypto.createHmac('sha256', anahtar()).update(govde).digest('base64url')
  if (!esit(imza, beklenen)) return null
  try {
    const veri = JSON.parse(Buffer.from(govde, 'base64url').toString())
    if (!veri.exp || veri.exp < Date.now()) return null
    return veri
  } catch { return null }
}

// İstekten oturumu çıkar; yoksa 401 döner ve null verir
export function oturumGerekli(req, res) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const veri = tokenDogrula(token)
  if (!veri) {
    res.status(401).json({ mesaj: 'Oturum gerekli' })
    return null
  }
  return veri
}
