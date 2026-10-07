# Sprinkler Tesisatı

Windows'ta çevrimdışı çalışan, AutoCAD kullanım alışkanlıklarına yakın bir sprinkler çizim ve hidrolik hesap uygulamasıdır. Projeler bilgisayarda yerel olarak saklanır; MongoDB veya ayrı bir sunucu gerekmez.

> **Ön hesap kapsamı:** Hesap motoru BYKHY Ek-8 tasarım girdilerini, `Q = K√P`, Hazen–Williams sürtünme kaybını, statik kotu ve tesisat.org yazısındaki minimum debi adımlarını uygular. Yalnızca pompaya bağlı ağaç tipi ağlar desteklenir; loop/grid ağlar reddedilir. Çıktı nihai uygulama projesi, ruhsat veya mühendis onayı yerine kullanılamaz.

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
4. **Ön Hesap** ile kritik operasyon alanını, boru bazında debi/basınç kaybı tablosunu ve pompa ön boyutlandırmasını görüntüleyin.
5. Sonuç penceresindeki **Excel olarak indir** düğmesiyle renkli hesap föyünü `.xlsx` biçiminde kaydedin.

Proje ayarlarında yangın dolabı ve hidrant seçenekleri ayrı ayrı işaretlenir. İlave debiler yalnızca seçilen sistemler için hesaba katılır; bunların basınç görev noktaları ayrıca pompa eğrisi üzerinde doğrulanmalıdır.

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

Gereksinim: güncel LTS Node.js.

```powershell
npm install
npm start
```

Tarayıcı sürümü `http://localhost:3000` adresinde açılır. Masaüstü uygulamasını üretim derlemesiyle denemek için:

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

- React ve React Konva: arayüz ve çizim alanı
- `localStorage`: yerel proje saklama
- Electron: Windows masaüstü kabuğu
- electron-builder: kurulum ve taşınabilir EXE üretimi

`backend` klasörü önceki MongoDB tabanlı denemeden kalmıştır; güncel uygulama akışında kullanılmaz.
