# Yol Uyarı

Radar, EDS, ortalama hız koridoru, trafik kontrolü, kaza ve doğa olaylarına karşı sesli uyarı veren,
hedef seçip sesli yol tarifi alabildiğin sürüş uygulaması. Telefonda web sitesi olarak ya da Android uygulaması (APK) olarak çalışır.

- Web: **https://earas1439.github.io/yol-uyari/**
- APK: deponun **Releases** bölümü

## Özellikler

| | |
|---|---|
| Radar / EDS / ortalama hız koridoru | OpenStreetMap + haftalık güncellenen Türkiye listesi (`data/radars-tr.json`) + kullanıcı bildirimleri |
| Ortalama hız takibi | Koridora girince ortalaman ekranda görünür, sınırı aşarsan uyarır, çıkışta sonucu söyler |
| Yol hız sınırı | Bulunduğun yolun sınırı hız göstergesinin köşesinde; 5 km/s'ten fazla aşınca uyarır |
| Hedef + yol tarifi | Adres arama veya haritaya uzun basma; Türkçe sesli tarif, rotadan çıkınca yeniden hesaplama |
| Hava durumu | Sis, buzlanma, kar, kuvvetli yağış, fırtına, kuvvetli rüzgâr (Open-Meteo) |
| Deprem | Son 24 saatte 200 km içindeki M4+ depremler (USGS); 120 km içinde M4.5+ olursa sesli uyarı |
| Bildirim + oylama | Herkes bildirir, "Hâlâ orada / Yok" ile doğrular (Firebase bağlıysa herkes görür) |
| Ses | Uyarıdan önce bip; APK'da müzik açıksa sesi kısıp konuşur, ekran kapalıyken de çalışır |

## Depo yapısı

```
index.html, manifest.json, icon-*.png   Uygulamanın kendisi (GitHub Pages bunu yayınlar)
data/radars-tr.json                     Türkiye radar listesi (otomatik güncellenir)
app/                                    Android uygulaması (arayüzü web adresinden yükler)
tools/build_radar_data.py               Radar listesini OpenStreetMap'ten üretir
firebase/                               Firestore güvenlik kuralları ve temizlik fonksiyonu
.github/workflows/build-apk.yml         APK'yı derler, Releases'a koyar
.github/workflows/update-radars.yml     Radar listesini her pazartesi yeniler
```

## APK'yı alma

1. **Actions** sekmesi → solda **APK Derle** → **Run workflow** → **Run workflow**.
2. 8–12 dakika sonra yeşil tik çıkar. Deponun ana sayfasında sağda **Releases** → en üstteki sürüm → **yol-uyari.apk**.
3. Telefonda bu sayfayı açıp APK'yı indir ve kur ("Bilinmeyen kaynaklara izin ver" sorulursa izin ver).

Uygulama arayüzü web adresinden yüklediği için, web'deki her güncelleme uygulamaya da kendiliğinden gelir.
APK'yı yeniden kurman yalnızca `app/` klasörü değişince gerekir. Tüm sürümler aynı anahtarla imzalandığı için
yeni APK eskisinin üzerine kurulur, ayarların kaybolmaz.

**Xiaomi / Redmi / POCO telefonlarda** ekran kapalıyken uyarıların kesilmemesi için:
Ayarlar → Uygulamalar → Yol Uyarı → **Pil tasarrufu: Kısıtlama yok** ve **Otomatik başlatma: açık**.
Diğer markalarda: Ayarlar → Pil → Yol Uyarı → Kısıtlanmamış.

## Türkiye radar listesi

İlk seferde: **Actions** → **Radar Listesini Güncelle** → **Run workflow**. Sonra her pazartesi kendiliğinden yenilenir.

## Firebase (bildirimlerin herkese gitmesi için)

1. https://console.firebase.google.com → **Proje oluştur** (Analytics gerekmez).
2. **Build → Authentication → Başlayın → Sign-in method → Anonim → Etkinleştir → Kaydet**.
   Aynı yerde **Settings → Yetkili alan adları → Alan adı ekle**: `earas1439.github.io`.
3. **Build → Firestore Database → Veritabanı oluştur** → konum `eur3 (Europe)` → **Üretim modunda başlat**.
   Sonra **Kurallar** sekmesine `firebase/firestore.rules` dosyasının içeriğini yapıştır → **Yayınla**.
4. **Proje ayarları (dişli) → Genel → Uygulamalarınız → Web (</>)** → takma ad yaz → **Uygulamayı kaydet**.
   Çıkan `firebaseConfig = { ... }` bloğunu kopyala.
5. `index.html` içinde `const FIREBASE_CONFIG = null;` satırını şununla değiştir:
   `const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };`

Bu değerler gizli değildir; erişimi güvenlik kuralları korur.

## Kendi sunucuna / ücretli servise geçiş

Ücretsiz açık servisler kullanılıyor: harita karoları (OpenStreetMap), arama (Nominatim), rota (OSRM demo),
radar ve hız sınırı sorguları (Overpass), hava (Open-Meteo), deprem (USGS). Kişisel kullanım için yeterli;
çok kullanıcıya açılınca harita için MapTiler/Stadia, rota ve arama için kendi OSRM/Nominatim sunucun veya
Mapbox/HERE gibi ücretli bir servis gerekir. Adresler `index.html` içinde tek yerde tanımlı.

## Hukuk

Bazı ülkeler radar uyarısını kısıtlar veya yasaklar (ör. Fransa'da kesin konum yerine bölge — uygulamadaki
"Bölge modu"; Almanya ve İsviçre'de sürüşte kullanım yasak). Hız sınırlarına her zaman uyun.

## Sonraki adım: Android Auto

Araç ekranı desteği ayrı bir Android (Kotlin) modülü ister ve Google'ın Android Auto kurallarına göre
yalnızca belirli şablonlarla (ör. yer listesi, uyarı kartı) çalışır; tam harita ancak onaylı navigasyon
uygulamalarına açıktır. Mağaza dışı kurulan APK'ların Android Auto'da görünmesi için Android Auto'da
geliştirici modunda "Bilinmeyen kaynaklar" açılmalıdır.
