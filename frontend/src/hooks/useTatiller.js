// Türkiye Resmi Tatilleri
// Tarih formatı: "GG.AA.YYYY" (tr-TR formatıyla uyumlu)

export function getTatiller(yil) {
  return [
    `01.01.${yil}`, // Yılbaşı
    `23.04.${yil}`, // Ulusal Egemenlik ve Çocuk Bayramı
    `01.05.${yil}`, // Emek ve Dayanışma Günü
    `19.05.${yil}`, // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    `15.07.${yil}`, // Demokrasi ve Millî Birlik Günü
    `30.08.${yil}`, // Zafer Bayramı
    `29.10.${yil}`, // Cumhuriyet Bayramı
  ]
}

// Ramazan ve Kurban Bayramı yıldan yıla değiştiği için
// bunları manuel ekleyebilirsin veya bir API'den çekebiliriz
export const DINI_TATILLER_2025 = [
  '30.03.2025', '31.03.2025', '01.04.2025', // Ramazan Bayramı
  '05.06.2025', '06.06.2025', '07.06.2025', '08.06.2025', // Kurban Bayramı
]

export const DINI_TATILLER_2026 = [
  '20.03.2026', '21.03.2026', '22.03.2026', // Ramazan Bayramı
  '27.05.2026', '28.05.2026', '29.05.2026', '30.05.2026', // Kurban Bayramı
]

export function getTumTatiller(yil) {
  const resmi = getTatiller(yil)
  const dini = yil === 2025 ? DINI_TATILLER_2025 : yil === 2026 ? DINI_TATILLER_2026 : []
  return [...resmi, ...dini]
}