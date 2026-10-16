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
| Harita takibi | Araç ortada, gidiş yönü yukarı (pusulayla kuzey-yukarıya geçilir), hıza göre yakınlaşır; elle kaydırınca "Ortala" düğmesi |
| Bildirim + oylama | Radar, kaza, yol çalışması, kontrol, doğa olayı; "Hâlâ orada / Yok" ile doğrulama |
| Yönetim paneli | `alanadin.com/admin`: istatistikler, haritadan nokta ekleme/silme, CSV içe aktarma, kullanıcı engelleme, toplu bildirim, uygulama ayarları |
| Çevrimdışı harita | Ülke, il, ilçe, mahalle, ekrandaki alan ya da rota boyunca harita indirilir; internet yokken uygulama ve harita açılır |
| Trafik yoğunluğu | Kullanıcıların anonim hız verisinden yoğunluk çizgileri ve "ileride yoğun trafik" uyarısı; TomTom anahtarıyla tüm dünyada canlı trafik |
| Arka plan bildirimi | Uygulama arka plandayken uyarılar ve duyurular telefon bildirimi olarak gelir |
| Ses | Uyarıdan önce bip; APK'da müzik açıksa sesi kısıp konuşur, ekran kapalıyken de çalışır |

## Depo yapısı

```
index.html, app.js, sw.js, lib/         Uygulamanın kendisi
admin/                                  Yönetim paneli
api/                                    Sunucu (PHP): index.php uygulama, admin.php panel, lib.php ortak
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

## Kendi hostingine kurulum (önerilen sunucu)

Bildirimlerin herkese gitmesi için bir sunucu gerekir. En basit yol: herhangi bir PHP hosting
(cPanel'li paylaşımlı hosting yeterli; PHP 7.4+ ve SQLite olması yeter, neredeyse hepsinde var).

**Tek dosyayla kurulum (en kolayı):**
1. `dist/kurulum.php` dosyasını (ya da Releases'taki en yeni "Hosting kurulum dosyası"nı) hostingde
   `public_html` klasörüne yükle.
2. Tarayıcıda `https://alanadin.com/kurulum.php` aç. Sunucu kontrol edilir; **Kur**'a bas.
3. Dosyalar, veritabanı ve güncel radar listesi kurulur, kurulum dosyası kendini siler.
   Güncelleme için aynı işlemi tekrarla ("yeniden kur"); bildirimler silinmez.

**Elle kurulum:**
1. Hostingin dosya yöneticisinde `public_html` (veya bir alt klasör) içine şunları yükle:
   `index.html`, `app.js`, `sw.js`, `manifest.json`, iki ikon ve `lib/`, `data/`, `api/`, `admin/` klasörleri.
   Yönetici hesabı için ardından `kurulum.php` ile kurulum yap (elle kurulumda `api/config.php` gerekir).
2. Tarayıcıda `https://alanadin.com/api/?action=ping` aç. `{"ok":true,...}` görüyorsan sunucu hazır.
3. `https://alanadin.com/` adresini aç. Başlangıç ekranında **"Canlı mod (kendi sunucun)"** yazmalı.
   Uygulama sunucuyu kendisi bulur, ayar gerekmez.

- Veritabanı ilk istekte `api/data/yoluyari.sqlite` olarak kendiliğinden oluşur. MySQL istersen
  `api/config.example.php` dosyasını `config.php` adıyla kopyalayıp doldur.
- Sayfayı GitHub Pages'te tutup sunucuyu başka yerde çalıştırmak da olur: `app.js` içinde
  `const API_URL = 'https://alanadin.com/api/';` yaz.
- APK'nın arayüzü yüklediği adres `app/lib/main.dart` içindeki `kAppUrl`. Siteyi kendi alan adına
  taşırsan bu satırı da değiştir.
- Spam koruması: aynı cihaz/IP saatte en fazla 20 bildirim, 120 oy. Aynı yere aynı tür ikinci bildirim
  yeni nokta açmaz, mevcut noktayı onaylar. 3 "yok" oyu fazlası olan nokta gizlenir ve silinir.
- Radar listesi GitHub'da her hafta güncellenir; uygulama hosting'deki kopyayla GitHub'dakinden
  hangisi yeniyse onu kullanır.

**Render.com ve benzerleri:** Depodaki `Dockerfile` ile çalışır. Ancak ücretsiz planda sunucu 15 dakika
kullanılmayınca uyur (ilk istek ~1 dk gecikir) ve disk kalıcı olmadığı için veriler silinir. Sürekli
kullanım için ücretli plan + kalıcı disk ya da MySQL gerekir. Bu yüzden paylaşımlı PHP hosting daha
ucuz ve sorunsuzdur.

## Firebase (alternatif sunucu)

1. https://console.firebase.google.com → **Proje oluştur** (Analytics gerekmez).
2. **Build → Authentication → Başlayın → Sign-in method → Anonim → Etkinleştir → Kaydet**.
   Aynı yerde **Settings → Yetkili alan adları → Alan adı ekle**: `earas1439.github.io`.
3. **Build → Firestore Database → Veritabanı oluştur** → konum `eur3 (Europe)` → **Üretim modunda başlat**.
   Sonra **Kurallar** sekmesine `firebase/firestore.rules` dosyasının içeriğini yapıştır → **Yayınla**.
4. **Proje ayarları (dişli) → Genel → Uygulamalarınız → Web (</>)** → takma ad yaz → **Uygulamayı kaydet**.
   Çıkan `firebaseConfig = { ... }` bloğunu kopyala.
5. `app.js` içinde `const FIREBASE_CONFIG = null;` satırını şununla değiştir:
   `const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };`

Bu değerler gizli değildir; erişimi güvenlik kuralları korur.

## Çevrimdışı harita

OpenStreetMap'in ücretsiz harita sunucusu toplu indirmeye izin vermez. Bu yüzden uygulama kendi harita dosyasını kullanır:

1. GitHub'da **Actions → Türkiye Haritasını Üret → Run workflow**. Protomaps'in OpenStreetMap'ten ürettiği güncel dünya
   haritasından Türkiye kesilir ve **Releases**'a `harita` etiketiyle konur (ayrıntı 14'te birkaç yüz MB; her ayın 1'inde yenilenir).
2. Yönetim panelinde **Ayarlar → Harita dosyası → Sunucuya indir / güncelle**. Dosya parça parça hostingdeki `tiles/turkiye.pmtiles`'a iner.
   (İstersen Releases'tan indirip dosya yöneticisiyle `tiles/` klasörüne kendin de yükleyebilirsin.)
3. Uygulama bu dosyayı görünce haritayı ondan çizer. Kullanıcı **Ayarlar → Çevrimdışı haritalar → Bölge indir** ile
   ülke/il/ilçe/mahalle arar ya da ekrandaki alanı veya aktif rotayı seçer, ayrıntı düzeyini belirleyip indirir.
   Gezilen yerler de otomatik saklanır. İnternet yokken uygulama ve indirilen haritalar açılır; radar uyarıları, hız sınırı ve
   son alınan bildirimler çalışır. Rota hesabı ve adres araması için internet gerekir.

## Trafik yoğunluğu

- Uygulamayı kullananlar anonim hız verisi gönderir (kimlik yok; konum, hız, yön). Sunucu son 10 dakikayı yol parçası bazında
  hesaplar: yeşil akıcı, turuncu yoğun, kırmızı çok yoğun. Sürüşte önünde çok yoğun trafik varsa "2 kilometre sonra yoğun trafik" uyarısı verir.
  Bu veri ancak kullanıcıların geçtiği yollarda oluşur.
- Tüm yollar ve tüm dünya için: panelde **Ayarlar → TomTom API anahtarı** gir (developer.tomtom.com, ücretsiz plan). Uygulamadaki trafik
  düğmesi TomTom'un canlı trafik katmanını da gösterir. Anahtarı TomTom panelinden kendi alan adına kısıtla.

## Yönetim paneli

Kurulumdan sonra `https://alanadin.com/admin/` adresinden, kurulumda belirlediğin kullanıcı adı ve şifreyle girilir.

- **Özet:** aktif nokta sayıları, son 14 günün bildirim grafiği, çevrimiçi ve aktif kullanıcılar.
- **Harita:** haritaya tıklayıp nokta ekle (radar, EDS, kontrol, kaza, yol çalışması…); noktaya tıklayıp düzenle, sürükleyip taşı, sil.
  Yöneticinin eklediği noktalar "doğrulanmış" görünür ve kullanıcı oylarıyla gizlenmez.
- **Uyarı noktaları:** liste, filtre, toplu silme, CSV ile toplu içe aktarma (ör. elindeki EDS listesi).
- **Kullanıcılar:** uygulama kayıt istemez; her telefon bir cihaz kimliğiyle görünür. Kötüye kullananı engelle, bildirimlerini sil.
- **Toplu bildirim:** herkese ya da haritada seçtiğin bölgeye duyuru gönder; açık uygulamalarda sesli okunur, arka plandaki APK'da telefon bildirimi olur.
- **Ayarlar:** bildirimi aç/kapat, bildirilebilecek türler, açılış duyurusu, güncelleme aralığı, spam sınırları, bildirim süreleri, yönetici şifresi.

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
