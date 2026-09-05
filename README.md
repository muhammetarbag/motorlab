# Motorlab

Tek silindirli dört zamanlı benzinli motoru keşfetmek için Türkçe, etkileşimli eğitim uygulaması.

## Kullanım

- **Motoru Başlat / Duraklat:** animasyonu kontrol eder.
- **Krank açısı:** 0–720° arasında elle döndürür; tüm parçalar ve grafik aynı açıyı kullanır.
- **Adım Adım:** Sonraki Aşama düğmesi dört zamanın orta noktalarına ilerler.
- **Öğrenme Modu:** 10 parçayı seçerek açıklamasını okuma ve çevrimi izleme.
- **Deney Modu:** 5 parametre, 6 hazır deney, ateşleme karşılaştırması ve sıkıştırma kartları.
- **Supap zamanlaması:** örnek erken açılma, geç kapanma ve 40° bindirme.
- **Teknik Detay:** kavramlar, model varsayımları ve kaynaklar.
- **Grafikler:** krank açısına göre basınç ve P–V diyagramı, anlık işaretçi.

## Yerel çalıştırma

Node.js 24 veya üstü gerekir.

```sh
npm ci
npm run dev
```

Terminalde yazılan yerel adresi aç. Statik üretim çıktısı `npm run build` sonrasında `dist/client` altındadır.

```sh
npm run test
npm run typecheck
npm run lint
npm run build:pages
```

## Model ve sınırları

86 mm çap, 86 mm strok, 143 mm biyel; yaklaşık 500 cm³ süpürülen hacim. Gerçek biyel–krank kinematiği ile piston konumu hesaplanır. Aynı model görüntüde, anlık hacimde ve grafiklerde kullanılır. Sıkıştırma oranı değişirken ÜÖN'de kalan hacim değişir.

Tek bölgeli ideal gaz yaklaşımı, γ = 1,35 ve 1° krank açısı adımları kullanılır. Yanma yaklaşık bir ısı salım fonksiyonu ile zamana yayılır. Kapalı fazlarda sıkıştırma/genleşme ve ısı salımı sıcaklığı belirler. Çevrim işi P–V integraliyle, tork ve güç yaklaşık sürtünme çıkarılarak hesaplanır. Yakıt alt ısıl değeri 44 MJ/kg, yoğunluğu 0,745 kg/L kabul edilir.

- Renkli parçacıklar ve alev eğitim görselleridir; CFD hesabı değildir.
- Isı kaybı, dolum ve sürtünme katsayıları gerçek motora kalibre edilmemiştir.
- RPM bir ayar noktasıdır. Yük altında ivmelenme ve stop etme çözülmez.
- Gösterim gerçek zamana göre normalde 60 kat yavaşlatılır. Hız düğmeleri yalnızca izleme hızını değiştirir; motor sonuçlarını değiştirmez.
- Kapalı kelebeğin rölanti hava geçişi vardır. Yakıt kesme stratejisi modellenmez.
- Negatif tork seçilen devri sürdürmek için dışarıdan iş gerektiği anlamına gelir.
- Örnek supap zamanlaması açıksa hareketler bindirmeyi gösterir. Basınç hesabı temel 180° supap zamanlarını korur; bindirmenin gaz dinamiği modellenmez.
- Vuruntu yalnızca nitel bir eğilimdir. Oktan sayısı, gerçek vuruntu, emisyon ve motor kontrolü hesaplanmaz.
- İdeal Otto verimi ile tahmini mil verimi ayrı gösterilir.

## Doğrulama

`tests/engine.test.ts`: çevrim sınırları, sabit biyel uzunluğu, görüntü/model senkronu, hacim oranı, supaplar ve bindirme, avans/yanma başlangıcı, basınç sürekliliği, güç–tork–yakıt enerji dengesi, altı deneyin eğilimleri, 32 uç parametre birleşimi ve grafik interpolasyonu.

İsteğe bağlı WebMCP arayüzü destekleyen tarayıcılarda `configure_engine_lab` aracı kaydolur. Girdi, kayıt, eylem ve temizlik sözleşmesi sahte bağlamda test edilir; gerçek WebMCP tarayıcısı testi değildir.

`npm run typecheck`, `npm run lint` ve statik üretim derlemesi CI'da zorunludur. Masaüstü/mobil yerleşimler responsive CSS ile sağlanır. Hareket başlangıçta duraklatılmıştır; klavye ile seçim, kaydırıcılar ve hız kontrolü desteklenir.

## GitHub Pages

`main` dalına gönderildiğinde GitHub Actions testleri, tür denetimini ve lint kontrolünü çalıştırır; yalnızca başarılı statik çıktı GitHub Pages'e gönderilir. Depoda Pages kaynağı **GitHub Actions** olmalıdır. `PAGES_BASE_PATH` depo adından otomatik belirlenir. Pages çıktısı `dist/client/<depo-adı>/` içinden yüklenir; yerel Pages derlemesi `dist/client/motorlab/` üretir. Çalışan uygulama sunucu, API anahtarı veya harici veri servisi gerektirmez.

## Kaynaklar

- [NASA Glenn — Engine Thermodynamic Analysis](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/engine-thermodynamic-analysis/)
- [X-Engineer — Piston kinematic analysis](https://x-engineer.org/kinematic-analysis-piston/)
- [Honda — Variable Timing Control and valve overlap](https://www.hondainfocenter.com/Shared-Technologies/Engines/DOHC-i-VTEC-with-Variable-Timing-Control-VTC/)
- [Bosch — Oxygen sensors and stoichiometric ratio](https://www.boschautoparts.ca/documents/647135/1488055/Oxygen%20Sensors%20From%20Bosch.pdf)
