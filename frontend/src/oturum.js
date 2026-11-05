import axios from 'axios'

// Oturum telefonda kalıcı saklanır (uygulama kapansa da 1 yıl boyunca tekrar şifre sorulmaz)
const ANAHTAR = 'mesai_oturum'

export function oturumAl() {
  try { return JSON.parse(localStorage.getItem(ANAHTAR) || 'null') } catch { return null }
}

export function oturumKaydet(token, ad) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify({ token, ad })) } catch { /* depolama kapalı */ }
}

export function oturumSil() {
  try { localStorage.removeItem(ANAHTAR) } catch { /* yok say */ }
  try { sessionStorage.removeItem('giris') } catch { /* yok say */ }
}

// Tüm API isteklerine oturum anahtarını ekle; oturum geçersizse giriş ekranına dön
axios.interceptors.request.use(cfg => {
  const o = oturumAl()
  if (o?.token && String(cfg.url || '').includes('/api/')) {
    cfg.headers = cfg.headers || {}
    cfg.headers.Authorization = `Bearer ${o.token}`
  }
  return cfg
})

axios.interceptors.response.use(
  r => r,
  err => {
    const url = String(err?.config?.url || '')
    if (err?.response?.status === 401 && url.includes('/api/') && !url.includes('/api/giris')) {
      oturumSil()
      window.location.replace('/')
    }
    return Promise.reject(err)
  }
)
