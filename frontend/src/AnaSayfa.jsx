import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function AnaSayfa() {
  const [personeller, setPersoneller] = useState([])
  const [mesaiAcanId, setMesaiAcanId] = useState(null)
  const [saat, setSaat] = useState('')
  const [aciklama, setAciklama] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    veriGetir()
  }, [])

  const veriGetir = async () => {
    try {
      const res = await axios.get('/api/personel')
      setPersoneller(res.data)
    } catch (error) {
      console.error("Veri çekme hatası:", error)
    }
  }

  const kayitEkle = async (id, durum) => {
    try {
      const tarih = new Date().toLocaleDateString('tr-TR')
      const body = {
        tarih: tarih,
        durum: durum,
        saat: durum === 'mesai' ? Number(saat) : 0,
        aciklama: aciklama
      }
      await axios.post(`/api/personel/${id}/kayit`, body)
      alert("✅ Kayıt başarıyla eklendi!")
      setMesaiAcanId(null)
      setSaat('')
      setAciklama('')
      veriGetir() 
    } catch (error) {
      alert("❌ Kayıt eklenirken hata oluştu.")
    }
  }

  // --- TOPLU PDF RAPORU OLUŞTURMA FONKSİYONU ---
  const topluRaporIndir = () => {
    if (personeller.length === 0) {
      alert("Listede personel bulunmuyor!");
      return;
    }

    // TÜRKÇE KARAKTER DÖNÜŞTÜRÜCÜ
    const tr = (text) => {
      if (!text) return "";
      return text.toString()
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c');
    };

    const doc = new jsPDF()
    
    // PDF Başlıkları
    doc.setFontSize(18)
    doc.text(tr("TUM PERSONEL GENEL OZET RAPORU"), 14, 22)
    doc.setFontSize(11)
    doc.text(tr(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), 14, 30)

    // Tablo Sütunları
    const tableColumn = [tr("Ad, Soyad"), tr("Toplam Mesai Saati"), tr("Kullanilan Izin Gunu")]
    const tableRows = []

    // Her personelin matematiksel özetini hesapla ve tabloya ekle
    personeller.forEach(p => {
      const toplamMesai = p.kayitlar.reduce((toplam, kayit) => toplam + (kayit.saat || 0), 0)
      const toplamIzin = p.kayitlar.filter(kayit => kayit.durum === 'izinli').length

      tableRows.push([
        tr(p.isim_soyad),
        tr(toplamMesai > 0 ? `${toplamMesai} Saat` : "-"),
        tr(toplamIzin > 0 ? `${toplamIzin} Gun` : "-")
      ])
    })

    // autoTable Kullanımı
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Zümrüt Yeşili
      styles: { fontSize: 10 }
    })

    // Bilgisayara/Telefona İndir
    doc.save(`Toplu_Personel_Ozeti_${new Date().toLocaleDateString('tr-TR')}.pdf`)
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="bg-slate-800 text-white p-4 sticky top-0 shadow-lg z-10 flex justify-center items-center">
        <h1 className="text-xl font-bold tracking-wide">👥 MESAİ TAKİP SİSTEMİ</h1>
      </header>

      <main className="p-4 max-w-md mx-auto mt-2">
        
        {/* TOPLU RAPOR BUTONU */}
        <button 
          onClick={topluRaporIndir}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold shadow-md transition-colors mb-6 flex items-center justify-center gap-2">
          📑 Tüm Personel Özet Raporunu PDF İndir
        </button>

        <div className="space-y-4">
          {personeller.map(p => (
            <div key={p._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-slate-700">{p.isim_soyad}</h2>
                <button 
                  onClick={() => navigate(`/profil/${p._id}`)} 
                  className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-200 transition-colors">
                  Detay ➔
                </button>
              </div>

              <div className="flex gap-2 mb-2">
                <button onClick={() => kayitEkle(p._id, 'geldi')} className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold active:bg-emerald-600 transition-colors">Geldi</button>
                <button onClick={() => kayitEkle(p._id, 'izinli')} className="flex-1 bg-amber-500 text-white py-2 rounded-lg font-semibold active:bg-amber-600 transition-colors">İzinli</button>
                <button onClick={() => setMesaiAcanId(mesaiAcanId === p._id ? null : p._id)} className="flex-1 bg-indigo-500 text-white py-2 rounded-lg font-semibold active:bg-indigo-600 transition-colors">Mesai</button>
              </div>

              {mesaiAcanId === p._id && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <label className="block text-sm text-indigo-900 font-semibold mb-1">Mesai Saati:</label>
                  <input type="number" value={saat} onChange={(e) => setSaat(e.target.value)} className="w-full p-2 border border-indigo-200 rounded mb-3 focus:outline-none" placeholder="Örn: 3" />
                  <label className="block text-sm text-indigo-900 font-semibold mb-1">Açıklama (Opsiyonel):</label>
                  <input type="text" value={aciklama} onChange={(e) => setAciklama(e.target.value)} className="w-full p-2 border border-indigo-200 rounded mb-4 focus:outline-none" placeholder="Örn: Hafta sonu çalışması" />
                  <button onClick={() => kayitEkle(p._id, 'mesai')} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-md">💾 Mesaiyi Kaydet</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default AnaSayfa