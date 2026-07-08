# Mesai Takip Sistemi — Railway → Vercel Geçiş Talimatları

## Bu pakette ne var?

| Dosya | Durum | Açıklama |
|---|---|---|
| `frontend/api/_lib/db.js` | YENİ | Serverless için önbellekli Mongoose bağlantısı + şema (yeni durumlar: raporlu, gelmedi) |
| `frontend/api/personel/[[...slug]].js` | YENİ | Express backend'in tamamının yerini alan tek serverless fonksiyon (9 endpoint) |
| `frontend/vercel.json` | YENİ | React Router için SPA yönlendirmesi (sayfa yenilenince 404 olmaması için) |
| `frontend/package.json` | GÜNCEL | `mongoose` bağımlılığı eklendi |
| `frontend/src/utils/durum.js` | YENİ | Otomatik "geldi" mantığının tek merkezi + durum tanımları |
| `frontend/src/utils/pdf.js` | YENİ | Türkçe karakter destekli yeni PDF raporları |
| `frontend/src/fonts/*.js` | YENİ | Roboto fontları (sadece PDF üretilirken yüklenir, siteyi yavaşlatmaz) |
| `frontend/src/AnaSayfa.jsx` | GÜNCEL | 5 durum butonu, otomatik geldi, ay seçimli toplu PDF |
| `frontend/src/Profil.jsx` | GÜNCEL | Yeni takvim, aylık özet kartları, aylık kişisel PDF |
| `.gitignore` | GÜNCEL | **Eskisi UTF-16 kodlamalıydı ve çalışmıyordu** — bu yüzden .env GitHub'a gitmişti |

VERİTABANINA DOKUNULMUYOR — mevcut tüm kayıtlar aynen kalıyor. Yeni durumlar
(raporlu, gelmedi) şemaya eklendi, eski kayıtlar etkilenmez.

---

## ADIM 0 — ÖNCE GÜVENLİK (ÇOK ÖNEMLİ!)

`backend/.env` dosyan MongoDB şifrenle birlikte HERKESE AÇIK GitHub reposunda
duruyor. Dosyayı silsen bile git geçmişinde kalır. Tek gerçek çözüm şifreyi
değiştirmek:

1. MongoDB Atlas → Database Access → kullanıcının yanındaki **Edit** → **Edit Password** → yeni güçlü bir şifre üret → **Update User**
2. Yeni bağlantı string'ini not al (eskisiyle aynı, sadece şifre kısmı değişik)
3. Railway'de MONGO_URI'yi HEMEN güncelleme — zaten Railway'i kapatacağız, yeni string'i Vercel'e gireceğiz (Adım 3)

Not: Şifreyi değiştirdiğin an eski backend (Railway) veritabanına bağlanamaz
olur. Bu yüzden Adım 0 ile Adım 4'ü aynı oturumda arka arkaya yap ki sistem
uzun süre kapalı kalmasın.

---

## ADIM 1 — Dosyaları kopyala

1. Bu paketteki `frontend/` klasörünü kendi repondaki `frontend/` üzerine kopyala (üzerine yazmayı onayla)
2. Paketteki `.gitignore`'u reponun köküne kopyala (eskisinin üzerine)
3. `.env`'i git'ten çıkar (dosya diskte kalır, sadece git takibinden çıkar):
   ```
   git rm --cached backend/.env
   ```

## ADIM 2 — Bağımlılıkları yükle ve yerelde dene

```
cd frontend
npm install
npm run build
```
Build hatasız bitmeli. (Yerelde tam test için `npx vercel dev` kullanabilirsin
— artık backend ayrı çalışmadığı için `npm run dev` API'ye erişemez; vercel dev
hem frontend'i hem serverless fonksiyonları birlikte çalıştırır.)

## ADIM 3 — Vercel ayarları

Vercel dashboard → takipsistemi projesi → **Settings → Environment Variables**:

1. **EKLE:** `MONGO_URI` = yeni şifreli MongoDB Atlas bağlantı string'in
   (Production + Preview + Development üçünü de işaretle)
2. **SİL:** `VITE_API_URL` (artık API aynı domainde, gerek yok)
3. `VITE_LOGIN_*` değişkenleri şimdilik kalsın (giriş sistemi onları kullanıyor)

Settings → General → Root Directory `frontend` olarak kalmalı (zaten öyle).

## ADIM 4 — Deploy

```
git add .
git commit -m "Backend Vercel serverless'a tasindi, raporlu/gelmedi durumlari ve yeni PDF raporlari eklendi"
git push
```

Vercel otomatik deploy eder. Deploy bitince test et:
- `https://takipsistemi-nine.vercel.app/api/personel` → personel listesi JSON dönmeli
- Ana sayfada liste görünmeli, herkes "Geldi (otomatik)" olmalı (hafta içiyse)
- Bir profile gir → takvimde hafta içi günler açık yeşil olmalı
- PDF butonlarından ay seçip rapor indir → Türkçe karakterler düzgün olmalı

## ADIM 5 — Railway'i kapat

Her şey çalıştıktan sonra Railway dashboard → proje → Settings → **Delete Project**.
İstersen repodaki `backend/` klasörünü de silebilirsin (artık kullanılmıyor);
referans olarak tutmak istersen zararı yok, Vercel ona bakmıyor.

---

## Yeni sistem nasıl çalışıyor?

**Otomatik "Geldi":** Hafta içi (Pzt–Cum), resmi tatil olmayan ve hakkında
kayıt girilmemiş her geçmiş gün otomatik "Geldi" sayılır. Veritabanına kayıt
YAZILMAZ — ekranda ve raporda hesaplanır. Yani sadece istisnaları girmen
yeterli: izin, rapor, gelmedi, mesai. Cumartesi/Pazar boş kalır; istersen
takvimden tıklayıp elle mesai vb. girebilirsin.

**Durumu değiştirme:** Takvimde herhangi bir geçmiş güne tıkla → durum seç →
kaydet. Otomatik "Geldi" görünen bir günü "İzinli" yaparsan artık o kayıt
geçerli olur. Aynı tarihe ikinci kez kayıt girersen eskisi güncellenir (çift
kayıt oluşmaz — bu backend'e eklendi).

**PDF raporlar:**
- *Kişisel:* Profil sayfasında takvimde hangi ay açıksa PDF o ayı basar.
  Ayın her günü satır satır: tarih, gün adı, durum, mesai saati, açıklama.
  Altında aylık özet ve Düzenleyen/Onaylayan imza alanları.
- *Toplu:* Ana sayfa → PDF → ay/yıl seç. Her personel için geldi sayısı ve
  izinli/raporlu/gelmedi/mesai durumlarının ayın hangi günlerinde olduğu.
- Kurum adını değiştirmek için: `frontend/src/utils/pdf.js` dosyasının en
  üstündeki `KURUM_ADI` sabitini düzenle.

**Resmi tatiller:** 2025–2026 tanımlı. 2027 dini bayramlarını zamanı gelince
`frontend/src/hooks/useTatiller.js` dosyasına eklemen gerekecek.
