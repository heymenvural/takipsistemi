import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function Profil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [personel, setPersonel] = useState(null)

  useEffect(() => {
    const detayGetir = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/personel/${id}`)
        setPersonel(res.data)
      } catch (error) {
        console.error("Profil çekme hatası", error)
      }
    }
    detayGetir()
  }, [id])

  if (!personel) return <div className="text-center mt-20 font-bold text-slate-500">Yükleniyor...</div>

  const toplamMesai = personel.kayitlar.reduce((toplam, kayit) => toplam + (kayit.saat || 0), 0)
  const toplamIzin = personel.kayitlar.filter(kayit => kayit.durum === 'izinli').length

  // TEKİL PDF OLUŞTURMA FONKSİYONU
  const pdfIndir = () => {
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
    
    doc.setFontSize(18)
    doc.text(tr("PERSONEL MESAI VE IZIN RAPORU"), 14, 22)
    
    doc.setFontSize(11)
    doc.text(tr(`Personel Adi: ${personel.isim_soyad}`), 14, 32)
    doc.text(tr(`Toplam Mesai: ${toplamMesai} Saat`), 14, 38)
    doc.text(tr(`Kullanilan Izin: ${toplamIzin} Gun`), 14, 44)
    doc.text(tr(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), 14, 50)

    const tableColumn = [tr("Tarih"), tr("Durum"), tr("Mesai Saati"), tr("Aciklama")]
    const tableRows = []

    const siraliKayitlar = [...personel.kayitlar].reverse()
    siraliKayitlar.forEach(kayit => {
      tableRows.push([
        tr(kayit.tarih),
        tr(kayit.durum.toUpperCase()),
        tr(kayit.saat > 0 ? `${kayit.saat} Saat` : "-"),
        tr(kayit.aciklama || "-")
      ])
    })

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // İndigo rengi başlık
      styles: { fontSize: 10 }
    })

    doc.save(`${tr(personel.isim_soyad)}_Rapor.pdf`)
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="bg-slate-800 text-white p-4 sticky top-0 shadow-md flex items-center justify-between">
        <div className="flex items-center">
            <button onClick={() => navigate('/')} className="text-2xl mr-4 hover:text-slate-300">⬅</button>
            <h1 className="text-xl font-bold tracking-wide">{personel.isim_soyad}</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto mt-4">
        {/* PDF İndir Butonu */}
        <button 
          onClick={pdfIndir}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-md transition-colors mb-6 flex items-center justify-center gap-2">
          🖨️ Bu Raporu PDF Olarak İndir
        </button>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-md text-center">
            <p className="text-sm opacity-80">Toplam Mesai</p>
            <p className="text-3xl font-bold">{toplamMesai} Saat</p>
          </div>
          <div className="bg-amber-500 text-white p-4 rounded-xl shadow-md text-center">
            <p className="text-sm opacity-80">Kullanılan İzin</p>
            <p className="text-3xl font-bold">{toplamIzin} Gün</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-700 mb-3 border-b border-slate-300 pb-2">Geçmiş Hareketler</h2>
        
        {personel.kayitlar.length === 0 ? (
          <p className="text-center text-slate-500 mt-5">Henüz bir kayıt bulunmuyor.</p>
        ) : (
          <div className="space-y-3">
            {[...personel.kayitlar].reverse().map((kayit, index) => (
              <div key={index} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-slate-400 flex justify-between items-center"
                style={{ borderColor: kayit.durum === 'mesai' ? '#4f46e5' : kayit.durum === 'izinli' ? '#f59e0b' : '#10b981' }}>
                <div>
                  <p className="font-bold text-slate-800">{kayit.tarih}</p>
                  <p className="text-sm text-slate-500 uppercase">{kayit.durum} {kayit.aciklama && `- ${kayit.aciklama}`}</p>
                </div>
                {kayit.durum === 'mesai' && (
                  <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded font-bold text-sm">
                    +{kayit.saat} Saat
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Profil