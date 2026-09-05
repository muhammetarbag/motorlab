import type { Parameters } from './engine';
export const experiments: {
  id: string;
  title: string;
  question: string;
  settings: Partial<Parameters>;
  angle: number;
  description: string;
  hint: string;
}[] = [
  {
    id: 'rpm',
    title: 'Devir ve piston hızı',
    question: 'RPM yükselirse ne olur?',
    settings: { rpm: 4500 },
    angle: 90,
    description:
      'Devir arttıkça piston aynı stroku daha kısa sürede tamamlar. Geometrisi ve strok uzunluğu değişmez; bir saniyeye daha fazla çevrim sığar.',
    hint: 'Motoru başlat, motor devrini 500 ile 7.000 RPM arasında değiştir. İzleme hızını sabit tut.',
  },
  {
    id: 'compression',
    title: 'Daha küçük yanma odası',
    question: 'Sıkıştırma oranı artarsa?',
    settings: { compression: 13 },
    angle: 360,
    description:
      'Üst ölü noktada pistonun üstünde kalan hacim küçülür. Sıkıştırma basıncı ve ideal Otto verimi artar; gerçek motorda vuruntu sınırı önem kazanır.',
    hint: 'Krankı 360°’de tut. Sıkıştırma oranını değiştirirken piston tepesi ile silindir kapağı arasındaki boşluğu izle.',
  },
  {
    id: 'early',
    title: 'Erken ateşleme',
    question: 'Kıvılcım çok erken oluşursa?',
    settings: { advance: 40 },
    angle: 315,
    description:
      'Yanma, piston hâlâ yukarı çıkarken ilerler. Erken yükselen basınç pistona karşı iş yapar. Bu örnekte tepe basıncı artarken yararlı güç azalır.',
    hint: 'Çok Yavaş hızda başlat. Kıvılcım 320°’de oluşur; piston 360°’ye kadar yukarı çıkmayı sürdürür.',
  },
  {
    id: 'late',
    title: 'Geç ateşleme',
    question: 'Kıvılcım gecikirse?',
    settings: { advance: -10 },
    angle: 360,
    description:
      'Kıvılcım, piston ÜÖN’yi geçtikten sonra oluşur. Enerjinin daha azı faydalı genleşmeye dönüşür; güç ve verim düşebilir, egzoz daha sıcak kalabilir.',
    hint: 'Kıvılcımı 370°’de izle. Basınç tepesinin sağa kaymasını ve güçteki değişimi karşılaştır.',
  },
  {
    id: 'throttle',
    title: 'Motorun nefesini kıs',
    question: 'Gaz kelebeği kapanırsa?',
    settings: { throttle: 5 },
    angle: 90,
    description:
      'Daralan kelebek hava girişini sınırlar. Silindire daha az karışım dolar, emme basıncı ve tork düşer. Kapalı kelebekte rölanti hava geçişi varsayılır.',
    hint: 'Gaz kelebeğini %0–100 arasında değiştir. Mavi parçacıkların sayısını ve emme basıncını izle.',
  },
  {
    id: 'mixture',
    title: 'Zengin mi, fakir mi?',
    question: 'Hava–yakıt oranı neyi değiştirir?',
    settings: { afr: 11 },
    angle: 345,
    description:
      'Küçük oran daha fazla yakıt, yani zengin karışım demektir. Büyük oran fakir karışımdır. Çok zengin karışımda oksijen, çok fakirde yanma kararlılığı sınırlayıcı olur.',
    hint: '11:1, 14,7:1 ve 19:1 değerlerini dene. Yakıt tüketimini, sıcaklığı ve gücü karşılaştır.',
  },
];
export const terms = [
  [
    'ÜÖN ve AÖN',
    'Üst ve alt ölü nokta, pistonun yön değiştirdiği en üst ve en alt konumlardır. Her krank turunda birer kez oluşur.',
  ],
  [
    'Krank açısı ve strok',
    'Bir strok, ÜÖN ile AÖN arasındaki tek yönlü harekettir (180°). Dört strok 720° eder. Burada strok 86 mm, biyel uzunluğu 143 mm’dir.',
  ],
  [
    'Silindir hacmi',
    'Süpürülen hacim Vd = π × çap² × strok / 4. Bu modelde çap ve strok 86 mm; süpürülen hacim yaklaşık 500 cm³. Anlık hacim, buna piston konumuna göre kalan hacmi ekler.',
  ],
  [
    'Sıkıştırma oranı',
    'r = (Vd + Vc) / Vc. Vc, ÜÖN’de kalan yanma odası hacmidir. 10:1 oranında en büyük hacim en küçüğün 10 katıdır.',
  ],
  [
    'Tork',
    'Milin döndürme etkisidir, N·m ile gösterilir. Burada çevrimdeki net basınç–hacim işinden sürtünme çıkarılır: T = Wnet / (4π).',
  ],
  [
    'Güç',
    'İşin yapılma hızıdır. P (kW) = T (N·m) × RPM × 2π / 60.000. Devir artarken tork aynı kalırsa güç artar.',
  ],
  [
    'Ortalama efektif basınç',
    'Çevrimdeki işi, tüm strok boyunca sabit bir basınç üretseydi gereken basınçtır. İndike OEB = ∮p dV / Vd. Anlık ya da tepe basıncı değildir.',
  ],
  [
    'Volümetrik verim',
    'Silindirin referans koşullara göre ne kadar dolabildiğini anlatır. Burada devre bağlı yaklaşık bir dolum katsayısı kullanılır; emme basıncını gaz kelebeği belirler.',
  ],
  [
    'Termal verim',
    'Yararlı işin yakıt enerjisine oranıdır. İdeal Otto üst sınırı η = 1 − 1/r^(γ−1); burada γ = 1,35. Gösterilen tahmini mil verimi ısı ve sürtünme kayıplarını içerir.',
  ],
  [
    'Stokiyometrik hava–yakıt oranı',
    'Bu örnekte benzin için kütlece yaklaşık 14,7:1 kabul edilir: 1 kg yakıta 14,7 kg hava. Gerçek değer yakıtın bileşimine bağlıdır.',
  ],
  [
    'Ateşleme avansı',
    'Pozitif avans ÜÖN’den önce kıvılcım demektir. +15° → 345° krank açısı. −10° → 370°, yani ÜÖN’den 10° sonra. Yanma anlık değildir.',
  ],
  [
    'Vuruntu',
    'Karışımın henüz alev ulaşmamış kısmının kendiliğinden tutuşmasıdır. Yüksek sıkıştırma, yük, sıcaklık ve uygunsuz avans riski artırabilir. Bu uygulama vuruntuyu çözmez; yalnızca nitel bir eğilim gösterir.',
  ],
];
