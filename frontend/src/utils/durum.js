import { getTumTatiller } from '../hooks/useTatiller'

// ─── DURUM TANIMLARI (tek merkez) ───────────────────────────────────
export const DURUMLAR = {
  geldi:   { label: 'Geldi',   bg: '#dcfce7', text: '#15803d', border: '#86efac', dot: '#22c55e', takvim: '#16a34a' },
  izinli:  { label: 'İzinli',  bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316', takvim: '#f97316' },
  raporlu: { label: 'Raporlu', bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8', dot: '#ec4899', takvim: '#db2777' },
  gelmedi: { label: 'Gelmedi', bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444', takvim: '#dc2626' },
  mesai:   { label: 'Mesai',   bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', takvim: '#7c3aed' },
  otomatik:{ label: 'Geldi',   bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#4ade80', takvim: '#4ade80' },
  bekliyor:{ label: 'Girilmedi', bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0', dot: '#cbd5e1', takvim: null },
}

// Modal / butonlarda gösterilecek seçenekler
export const DURUM_SECENEKLERI = [
  { val: 'geldi',   label: '✓ Geldi' },
  { val: 'izinli',  label: '☀ İzinli' },
  { val: 'raporlu', label: '🏥 Raporlu' },
  { val: 'gelmedi', label: '✗ Gelmedi' },
  { val: 'mesai',   label: '⏱ Mesai' },
]

// Otomatik "Geldi" bu tarihten itibaren uygulanır (öncesindeki boş günler boş kalır)
export const BASLANGIC = new Date(2026, 10, 2) // 2 Kasım 2026

export const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
export const GUN_ADLARI = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']

// ─── TARİH YARDIMCILARI ─────────────────────────────────────────────
export function tarihStr(gun, ay, yil) {
  // GG.AA.YYYY
  return `${String(gun).padStart(2, '0')}.${String(ay + 1).padStart(2, '0')}.${yil}`
}

export function bugunStr() {
  const b = new Date()
  return tarihStr(b.getDate(), b.getMonth(), b.getFullYear())
}

export function haftaSonuMu(gun, ay, yil) {
  const g = new Date(yil, ay, gun).getDay()
  return g === 0 || g === 6 // Pazar veya Cumartesi
}

export function tatilMi(gun, ay, yil) {
  const t = tarihStr(gun, ay, yil)
  return getTumTatiller(yil).some(x => {
    const p = x.split('.')
    return parseInt(p[0]) === gun && parseInt(p[1]) - 1 === ay && parseInt(p[2]) === yil
  }) || t === '' // güvenlik
}

export function gelecekMi(gun, ay, yil) {
  const b = new Date()
  const bugun = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return new Date(yil, ay, gun) > bugun
}

// Kayıt tarihini (GG.AA.YYYY, "8.7.2026" gibi padsizleri de tolere eder) parse et
export function kayitTarihEsit(kayitTarih, gun, ay, yil) {
  const p = String(kayitTarih).split('.')
  if (p.length !== 3) return false
  return parseInt(p[0]) === gun && parseInt(p[1]) - 1 === ay && parseInt(p[2]) === yil
}

// ─── EFEKTİF DURUM: otomatik "geldi" mantığının tek merkezi ────────
// Kural:
//  - O güne girilmiş bir kayıt varsa → o kaydın durumu
//  - Kayıt yoksa:
//      · gelecekteki gün → null (boş)
//      · hafta sonu (Cmt/Paz) → null (boş, kullanıcı isterse elle girer)
//      · resmi tatil → 'tatil'
//      · hafta içi geçmiş/bugün → 'otomatik' (otomatik geldi)
export function efektifDurum(kayitlar, gun, ay, yil) {
  const kayit = (kayitlar || []).find(k => kayitTarihEsit(k.tarih, gun, ay, yil))
  if (kayit) return { tip: kayit.durum, kayit, otomatik: false }
  if (tatilMi(gun, ay, yil)) return { tip: 'tatil', kayit: null, otomatik: false }
  if (gelecekMi(gun, ay, yil)) return { tip: null, kayit: null, otomatik: false }
  if (haftaSonuMu(gun, ay, yil)) return { tip: null, kayit: null, otomatik: false }
  if (new Date(yil, ay, gun) < BASLANGIC) return { tip: null, kayit: null, otomatik: false }
  return { tip: 'geldi', kayit: null, otomatik: true } // otomatik geldi
}

// Bir ayın gün gün dökümü (rapor ve takvim için)
export function ayDokumu(kayitlar, ay, yil) {
  const sonGun = new Date(yil, ay + 1, 0).getDate()
  const satirlar = []
  for (let gun = 1; gun <= sonGun; gun++) {
    const d = efektifDurum(kayitlar, gun, ay, yil)
    satirlar.push({
      gun,
      tarih: tarihStr(gun, ay, yil),
      gunAdi: GUN_ADLARI[new Date(yil, ay, gun).getDay()],
      haftaSonu: haftaSonuMu(gun, ay, yil),
      tatil: tatilMi(gun, ay, yil),
      gelecek: gelecekMi(gun, ay, yil),
      ...d,
    })
  }
  return satirlar
}

// Aylık özet sayıları
export function ayOzeti(kayitlar, ay, yil) {
  const dokum = ayDokumu(kayitlar, ay, yil)
  const ozet = { geldi: 0, izinli: 0, raporlu: 0, gelmedi: 0, mesaiGun: 0, mesaiSaat: 0, tatil: 0 }
  const tarihler = { izinli: [], raporlu: [], gelmedi: [], mesai: [] }
  dokum.forEach(s => {
    if (s.tip === 'geldi') ozet.geldi++
    else if (s.tip === 'izinli') { ozet.izinli++; tarihler.izinli.push(s.gun) }
    else if (s.tip === 'raporlu') { ozet.raporlu++; tarihler.raporlu.push(s.gun) }
    else if (s.tip === 'gelmedi') { ozet.gelmedi++; tarihler.gelmedi.push(s.gun) }
    else if (s.tip === 'mesai') {
      ozet.mesaiGun++
      ozet.mesaiSaat += s.kayit?.saat || 0
      tarihler.mesai.push({ gun: s.gun, saat: s.kayit?.saat || 0 })
    }
    else if (s.tip === 'tatil') ozet.tatil++
  })
  return { ozet, tarihler, dokum }
}

// ─── ÇOK GÜNLÜ İZİN / RAPOR ─────────────────────────────────────────
// Takvim günü sayılır (hafta sonu da süreye dahil), ama kayıt yalnızca
// hafta içi ve resmi tatil olmayan günlere yazılır.
// Örn. Pazartesi + 8 gün → Pzt–Cum (5) + Cmt–Paz (sayılır, yazılmaz) + Pzt (1) = 6 kayıt
export function cokGunluAralik(baslangicTarih, gunSayisi) {
  const p = String(baslangicTarih).split('.').map(Number)
  const bas = new Date(p[2], p[1] - 1, p[0])
  const n = Math.max(1, Math.min(365, parseInt(gunSayisi) || 1))
  const isGunleri = []
  let bitis = bas
  for (let i = 0; i < n; i++) {
    const d = new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() + i)
    bitis = d
    const g = d.getDate(), a = d.getMonth(), y = d.getFullYear()
    if (!haftaSonuMu(g, a, y) && !tatilMi(g, a, y)) isGunleri.push(tarihStr(g, a, y))
  }
  return {
    isGunleri,
    baslangic: tarihStr(bas.getDate(), bas.getMonth(), bas.getFullYear()),
    bitis: tarihStr(bitis.getDate(), bitis.getMonth(), bitis.getFullYear()),
    donus: (() => { // işe dönüş: bitişten sonraki ilk iş günü
      let d = new Date(bitis.getFullYear(), bitis.getMonth(), bitis.getDate() + 1)
      while (haftaSonuMu(d.getDate(), d.getMonth(), d.getFullYear()) || tatilMi(d.getDate(), d.getMonth(), d.getFullYear()))
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      return tarihStr(d.getDate(), d.getMonth(), d.getFullYear())
    })(),
    gun: n,
  }
}

// Açıklamaya yazılacak özet: "8 günlük yıllık izin (06.11.2026 – 13.11.2026)"
export function cokGunluAciklama(durum, aralik, ekAciklama) {
  const tur = durum === 'raporlu' ? 'rapor' : 'izin'
  const ek = (ekAciklama || '').trim()
  const bas = aralik.gun > 1 ? `${aralik.gun} günlük ${tur} (${aralik.baslangic} – ${aralik.bitis})` : ''
  return [ek, bas].filter(Boolean).join(' · ')
}
