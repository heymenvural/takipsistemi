import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AYLAR, ayOzeti, tarihStr, bugunStr } from './durum'

// Rapor başlığında görünecek kurum adı — dilediğin gibi değiştir
export const KURUM_ADI = 'MESAİ TAKİP SİSTEMİ'

// Türkçe karakter destekli fontlar sadece PDF üretilirken yüklenir (lazy)
async function docOlustur() {
  const [{ default: normal }, { default: bold }] = await Promise.all([
    import('../fonts/robotoNormal.js'),
    import('../fonts/robotoBold.js'),
  ])
  const doc = new jsPDF()
  doc.addFileToVFS('Roboto-Regular.ttf', normal)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto', 'normal')
  return doc
}

function durumEtiketi(s) {
  if (s.tip === 'geldi') return s.otomatik ? 'Geldi' : 'Geldi'
  if (s.tip === 'izinli') return 'İzinli'
  if (s.tip === 'raporlu') return 'Raporlu'
  if (s.tip === 'gelmedi') return 'Gelmedi'
  if (s.tip === 'mesai') return 'Mesai'
  if (s.tip === 'tatil') return 'Resmî Tatil'
  if (s.haftaSonu) return 'Hafta Sonu'
  if (s.gelecek) return ''
  return '—'
}

function durumRengi(s) {
  if (s.tip === 'izinli') return [255, 247, 237]
  if (s.tip === 'raporlu') return [253, 242, 248]
  if (s.tip === 'gelmedi') return [254, 242, 242]
  if (s.tip === 'mesai') return [239, 246, 255]
  if (s.tip === 'tatil') return [254, 249, 195]
  if (s.haftaSonu) return [248, 250, 252]
  return null
}

// ─── KİŞİSEL AYLIK RAPOR (gün gün tam döküm) ───────────────────────
export async function kisiselAylikRapor(personel, ay, yil) {
  const doc = await docOlustur()
  const { ozet, dokum } = ayOzeti(personel.kayitlar, ay, yil)

  // Başlık
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(14)
  doc.text(KURUM_ADI, 105, 16, { align: 'center' })
  doc.setFontSize(12)
  doc.text('PERSONEL AYLIK PUANTAJ RAPORU', 105, 23, { align: 'center' })

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.text(`Personel : ${personel.isim_soyad}`, 14, 33)
  doc.text(`Dönem    : ${AYLAR[ay]} ${yil}`, 14, 39)
  doc.text(`Rapor Tarihi : ${bugunStr()}`, 196, 33, { align: 'right' })

  // Gün gün tablo
  const rows = dokum.map(s => [
    s.tarih,
    s.gunAdi,
    durumEtiketi(s),
    s.tip === 'mesai' && s.kayit?.saat ? `${s.kayit.saat} saat` : '',
    s.kayit?.aciklama || '',
  ])

  autoTable(doc, {
    head: [['Tarih', 'Gün', 'Durum', 'Mesai', 'Açıklama']],
    body: rows,
    startY: 44,
    theme: 'grid',
    styles: { font: 'Roboto', fontSize: 8, cellPadding: 1.6 },
    headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: [79, 70, 229], fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 24 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const renk = durumRengi(dokum[data.row.index])
        if (renk) data.cell.styles.fillColor = renk
      }
    },
  })

  // Özet
  let y = doc.lastAutoTable.finalY + 8
  if (y > 250) { doc.addPage(); y = 20 }
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.text('AYLIK ÖZET', 14, y)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  const ozetSatirlar = [
    `Geldi: ${ozet.geldi} gün`,
    `İzinli: ${ozet.izinli} gün`,
    `Raporlu: ${ozet.raporlu} gün`,
    `Gelmedi: ${ozet.gelmedi} gün`,
    `Mesai: ${ozet.mesaiGun} gün / ${ozet.mesaiSaat} saat`,
    `Resmî Tatil: ${ozet.tatil} gün`,
  ]
  doc.text(ozetSatirlar.join('     '), 14, y + 6)

  // İmza alanları
  y += 22
  if (y > 265) { doc.addPage(); y = 30 }
  doc.setFontSize(9)
  doc.text('Düzenleyen', 40, y, { align: 'center' })
  doc.text('Onaylayan', 160, y, { align: 'center' })
  doc.line(20, y + 14, 60, y + 14)
  doc.line(140, y + 14, 180, y + 14)

  doc.save(`${personel.isim_soyad.replace(/\s+/g, '_')}_${AYLAR[ay]}_${yil}_Puantaj.pdf`)
}

// ─── TOPLU AYLIK RAPOR (tüm personel + tarih dökümleri) ────────────
export async function topluAylikRapor(personeller, ay, yil) {
  const doc = await docOlustur()

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(14)
  doc.text(KURUM_ADI, 105, 16, { align: 'center' })
  doc.setFontSize(12)
  doc.text('TÜM PERSONEL AYLIK ÖZET RAPORU', 105, 23, { align: 'center' })

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.text(`Dönem : ${AYLAR[ay]} ${yil}`, 14, 32)
  doc.text(`Rapor Tarihi : ${bugunStr()}`, 196, 32, { align: 'right' })

  const gunListe = arr => arr.length ? arr.map(g => String(g).padStart(2, '0')).join(', ') : '—'
  const mesaiListe = arr => arr.length
    ? arr.map(m => `${String(m.gun).padStart(2, '0')} (${m.saat}s)`).join(', ')
    : '—'

  const rows = personeller.map(p => {
    const { ozet, tarihler } = ayOzeti(p.kayitlar, ay, yil)
    return [
      p.isim_soyad,
      String(ozet.geldi),
      ozet.izinli ? `${ozet.izinli} — ${gunListe(tarihler.izinli)}` : '—',
      ozet.raporlu ? `${ozet.raporlu} — ${gunListe(tarihler.raporlu)}` : '—',
      ozet.gelmedi ? `${ozet.gelmedi} — ${gunListe(tarihler.gelmedi)}` : '—',
      ozet.mesaiSaat ? `${ozet.mesaiSaat} saat — ${mesaiListe(tarihler.mesai)}` : '—',
    ]
  })

  autoTable(doc, {
    head: [['Ad Soyad', 'Geldi', `İzinli (gün)`, `Raporlu (gün)`, `Gelmedi (gün)`, `Mesai`]],
    body: rows,
    startY: 38,
    theme: 'grid',
    styles: { font: 'Roboto', fontSize: 7.5, cellPadding: 1.6, valign: 'middle' },
    headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: [79, 70, 229], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 13, halign: 'center' },
    },
  })

  // Dipnot: tarih sütunlarındaki sayılar ilgili ayın günleridir
  let y = doc.lastAutoTable.finalY + 6
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Not: Parantez içindeki sayılar ${AYLAR[ay]} ayının günlerini belirtir. Kayıt girilmemiş hafta içi günler "Geldi" olarak sayılmıştır.`, 14, y)
  doc.setTextColor(0)

  // İmza
  y += 16
  if (y > 265) { doc.addPage(); y = 30 }
  doc.setFontSize(9)
  doc.text('Düzenleyen', 40, y, { align: 'center' })
  doc.text('Onaylayan', 160, y, { align: 'center' })
  doc.line(20, y + 14, 60, y + 14)
  doc.line(140, y + 14, 180, y + 14)

  doc.save(`Personel_Ozet_${AYLAR[ay]}_${yil}.pdf`)
}
