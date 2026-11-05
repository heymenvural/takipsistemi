import { cokGunluAralik } from './utils/durum'

const kisa = t => t.slice(0, 5) // 06.11.2026 → 06.11

// İzinli / Raporlu için "kaç gün?" seçici — büyük dokunmatik butonlar ve canlı önizleme
export default function GunSayisiSecici({ durum, baslangic, deger, onChange }) {
  const n = Math.max(1, parseInt(deger) || 1)
  const aralik = cokGunluAralik(baslangic, n)
  const tur = durum === 'raporlu' ? 'Rapor' : 'İzin'
  const renk = durum === 'raporlu'
    ? { bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d' }
    : { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' }
  const hafta = n - aralik.isGunleri.length

  const btn = {
    width: 52, height: 52, borderRadius: 14, border: `1px solid ${renk.border}`,
    background: '#fff', fontSize: 26, fontWeight: 600, color: renk.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none',
  }

  return (
    <div style={{ background: renk.bg, border: `1px solid ${renk.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: renk.text, fontWeight: 600, marginBottom: 10 }}>{tur} kaç gün?</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
        <button type="button" style={btn} onClick={() => onChange(Math.max(1, n - 1))} aria-label="Azalt">−</button>
        <div style={{ minWidth: 90, textAlign: 'center' }}>
          <div key={n} style={{ fontSize: 34, fontWeight: 700, color: renk.text, lineHeight: 1, animation: 'sayiPop .18s ease' }}>{n}</div>
          <div style={{ fontSize: 12, color: renk.text, opacity: 0.8, marginTop: 2 }}>gün</div>
        </div>
        <button type="button" style={btn} onClick={() => onChange(Math.min(365, n + 1))} aria-label="Artır">+</button>
      </div>

      {/* Hızlı seçim */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        {[1, 2, 3, 5, 7, 10, 14].map(v => (
          <button key={v} type="button" onClick={() => onChange(v)} style={{
            minWidth: 38, height: 32, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${v === n ? renk.text : renk.border}`,
            background: v === n ? renk.text : '#fff', color: v === n ? '#fff' : renk.text,
            transition: 'all .15s',
          }}>{v}</button>
        ))}
      </div>

      {n > 1 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#334155', background: '#fff', borderRadius: 10, padding: '10px 12px', lineHeight: 1.55 }}>
          📅 <strong>{kisa(aralik.baslangic)} – {kisa(aralik.bitis)}</strong> arası
          <br />✓ <strong>{aralik.isGunleri.length}</strong> iş günü işaretlenecek
          {hafta > 0 && <><br />◦ {hafta} gün hafta sonu/tatil (süreye dahil, işaretlenmez)</>}
          <br />↩ İşe dönüş: <strong>{kisa(aralik.donus)}</strong>
        </div>
      )}
      <style>{`@keyframes sayiPop { from { transform: scale(.7); opacity: .3 } to { transform: scale(1); opacity: 1 } }`}</style>
    </div>
  )
}
