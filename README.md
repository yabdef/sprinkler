# Sprinkler Tesisatı

Windows'ta çevrimdışı çalışan, AutoCAD kullanım alışkanlıklarına yakın bir sprinkler çizim ve hidrolik hesap uygulamasıdır. Projeler bilgisayarda yerel olarak saklanır; MongoDB veya ayrı bir sunucu gerekmez.

> **Hesap kapsamı:** Hesap motoru BYKHY Ek-8/B ve Ek-8/C girdilerini, `Q = K√P`, Hazen–Williams sürtünme kaybını, mutlak kotları ve TS EN 12845 temelli basınç alt sınırlarını uygular. Kuru düşük tehlike OH1'e, kuru OH4 yüksek tehlike 1'e geçirilir. Operasyon alanı branşman yönünde geometrik olarak kurulur; eksik alan, fazla kapsama, kopuk ağ ve loop/grid ağlarda sonuç üretilmez. Yüksek tehlike, depolama, raf içi, ESFR ve CMSA sistemleri uzman hesabına yönlendirilir.

Ayrıntılı standart karşılaştırması ve düzeltilmesi gereken hesap noktaları için [Mühendislik Doğrulama Raporu](docs/MUHENDISLIK-DOGRULAMA.md) okunmalıdır.

## Annemin bilgisayarında çalıştırma

`release` klasöründeki dosyalardan biri yeterlidir:

- `Sprinkler-Tesisati-...exe`: tek tıklamalı kurulumdur ve masaüstüne kısayol ekler.
- Aynı sürümün `portable` dosyası: kurulum istemeden doğrudan açılır.

Hedef bilgisayarda Node.js, MongoDB veya internet bağlantısı gerekmez. Projeler uygulama içinde otomatik kaydedilir. Bilgisayar değiştirirken üst çubuktaki **Yedekle** düğmesiyle `.sprinkler.json` dosyası alınmalı, yeni bilgisayarda **Proje Aç** ile içe aktarılmalıdır.

## Temel kullanım

1. **Yeni Proje** ile tehlike sınıfını ve tasarım parametrelerini seçin.
2. Şeritteki **Boru**, **Sprinkler** ve **Pompa** araçlarıyla çizimi oluşturun. Her araç, tıklamadan önce yerleşeceği konumu hayalet sembolle gösterir.
3. Boruya veya elemana çift tıklayarak bilgilerini düzenleyin.
4. Proje ayarlarında gerçek boru iç çap profilini ve branşman yönünü seçin. Boru düzenlerken çizim yönündeki kot farkını girin; pozitif değer yükselmeyi, negatif değer alçalmayı ifade eder.
5. **Ön Hesap** ile geometrik kritik operasyon alanını, sprinkler düğüm sonuçlarını, boru kayıplarını ve ayrı pompa görev noktalarını görüntüleyin.
6. Pompa elemanına çift tıklayıp anma, kapalı vana ve %150 debi eğri noktalarını girerek BYKHY pompa karakteristiğini kontrol edin.
7. Sonuç penceresindeki **Excel olarak indir** düğmesiyle hesap föyü, sprinkler sonuçları, görev noktaları ve kontrol notlarını `.xlsx` olarak kaydedin.

Proje ayarlarında yangın dolabı ve hidrant seçenekleri ayrı ayrı işaretlenir. Ek-8/C debileri su kaynağı, depo ve toplam pompa güç ön hesabına katılır; görev basınçları ayrı girilir, toplam pompa görev basıncı bunların en yüksek değeriyle kontrol edilir.

AutoCAD benzeri kontroller:

| İşlem | Kısayol |
| --- | --- |
| Boru çiz | `L` veya `B` |
| Sprinkler ekle | `S` |
| Pompa ekle | `P` |
| Seçim aracı | `V` |
| Son komutu yinele | Çizim alanında sağ tık |
| Nesne uçlarına yakala | `F3` |
| Izgarayı aç/kapat | `F7` |
| Dik çizimi aç/kapat | `F8` |
| Geri al / yinele | `Ctrl+Z` / `Ctrl+Y` |
| Kaydet | `Ctrl+S` |
| İptal | `Esc` |
| Seçili elemanı sil | `Delete` |
| Yakınlaştır | Fare tekerleği |
| Görünümü kaydır | Orta fare tuşu |

Boru çizerken ilk tıklama başlangıç noktasını, ikinci tıklama bitiş noktasını belirler. Yeni boru parçası son uçtan devam eder; çizimi bitirmek için `Esc` kullanılır. Önizlemede uzunluk, açı ve yakalanan bağlantı noktası gösterilir.

Komut satırı ayrıca `BORU`, `SPRINKLER`, `POMPA`, `SİL`, `KAYDET` ve `HESAPLA` komutlarını kabul eder.

## Geliştirme

Gereksinim: Node.js 20.19 veya daha yeni bir LTS sürümü.

```powershell
npm install
npm start
```

Vite geliştirme adresi terminalde gösterilir; varsayılan adres `http://localhost:5173` olur. Masaüstü uygulamasını üretim derlemesiyle denemek için:

```powershell
npm run desktop
```

## Windows EXE üretme

```powershell
npm install
npm run dist:win
```

Kurulum ve taşınabilir EXE dosyaları `release` klasörüne yazılır. Paketleme Windows üzerinde yapılmalıdır.

## Mimari

- React, Vite ve React Konva: arayüz, derleme ve çizim alanı
- Sürümlü `localStorage`: yerel proje saklama, son beş değişikliğin otomatik yedeği ve eski proje göçü
- Electron: Windows masaüstü kabuğu
- electron-builder: kurulum ve taşınabilir EXE üretimi
- ExcelJS: dört sayfalı hidrolik hesap çalışma kitabı

Resmî profil kaynağı: [ÇŞİDB Binaların Yangından Korunması Hakkında Yönetmelik Kılavuzu](https://webdosya.csb.gov.tr/v2/meslekihizmetler/2026/05/Binalar-n-Yang-n-Korunmas-Hakk-nda-Y-netmelik-K-lavuzu-20260507112134.pdf). TS EN 12845'in projede geçerli baskısı ve yerel idare kabulleri yetkili mühendis tarafından ayrıca doğrulanmalıdır.
