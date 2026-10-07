# Sprinkler hesabı mühendislik doğrulaması

Son doğrulama: 7 Ekim 2026

## Sonuç

Hesap motoru BYKHY Ek-8/B ve Ek-8/C girdilerini, `Q = K√P`, Hazen-Williams sürtünme kaybını, malzeme/seri bazlı gerçek boru iç çaplarını, mutlak kotları ve sınıf basınç alt sınırlarını uygular. Operasyon alanı seçilen branşman yönünde dikdörtgen adaylar arasından oluşturulur; her aday hidrolik olarak çözülür ve en yüksek besleme basıncı isteyen alan seçilir. Sonuçta boru ve sprinkler düğüm değerleri, ayrı sistem görev noktaları ve pompa eğrisi kontrolleri gösterilir.

Bu kapsam yine de tek başına uygulama projesi onayı veya kesin pompa seçimi için yeterli değildir. Duvarlar, kirişler, tavan engelleri ve yangın bölmeleri modellenmediği için bunların etkisi mühendis tarafından kontrol edilir. Loop/grid, yüksek tehlike, depolama, ESFR/CMSA ve raf içi sistemlerde yazılım hesap üretmez. Yangın dolabı ve hidrant için görev basınçları ayrı girilir; su deposu Ek-8/C ilave debileriyle hesaplanır.

## Esas alınan kaynaklar

- [ÇŞİDB — Binaların Yangından Korunması Hakkında Yönetmelik Kılavuzu, Aralık 2024 yayımı](https://webdosya.csb.gov.tr/v2/meslekihizmetler/2026/05/Binalar-n-Yang-n-Korunmas-Hakk-nda-Y-netmelik-K-lavuzu-20260507112134.pdf)
- [BSI — EN 12845:2015+A2:2026 güncel sürüm kaydı](https://landingpage.bsigroup.com/LandingPage/Undated?UPI=000000000019981306)
- [MMO — Sprinkler tasarımı ve hidrolik hesap eğitimi](https://makina.mmo.org.tr/Egitim/16970)
- [TS EN 12845 yoğunluk ve operasyon alanı özeti](https://selvi.org/en/blog/en12845/en12845-design-density-and-area-of-operation)
- [TS EN 12845 operasyon alanı şekli ve konumu](https://selvi.org/en/blog/en12845/en12845-area-of-operation-shape-and-location)
- [Sprinkler debisi, K faktörü ve minimum basınç](https://selvi.org/en/blog/en12845/en12845-sprinkler-flow-and-k-factor)
- [EN 12845 pompa karakteristiği](https://selvi.org/en/blog/en12845/en12845-pump-performance-characteristics)
- [Kullanıcının belirttiği 2016 tarihli tesisat.org/MMO özeti](https://www.tesisat.org/yangin-tesisat-sprink-tasarimi-hesabi.html)

Tesisat.org yazısı faydalı bir eğitim özetidir; standart baskısı ve madde referansları bulunmadığı için normatif kaynak değildir. Türkiye profili BYKHY ve yürürlükteki TS EN 12845 ile doğrulanmalıdır. NFPA 13 gerekiyorsa ayrı bir hesap profili olarak ele alınmalı, TS EN tablolarıyla karıştırılmamalıdır.

## BYKHY Ek-8/B tasarım değerleri

| Tehlike sınıfı | Yoğunluk (mm/dk) | Islak/ön etkili alan (m²) | Kuru/değişken alan (m²) |
| --- | ---: | ---: | ---: |
| Düşük | 2,25 | 84 | OH1 profili kullanılır |
| OH1 | 5,0 | 72 | 90 |
| OH2 | 5,0 | 144 | 180 |
| OH3 | 5,0 | 216 | 270 |
| OH4 | 5,0 | 360 | Yüksek tehlike 1 profili kullanılır |
| Yüksek tehlike 1 | 7,7 | 260 | 325 |
| Yüksek tehlike 2 | 10,0 | 260 | 325 |
| Yüksek tehlike 3 | 12,5 | 260 | 325 |
| Yüksek tehlike 4 | Yoğun su | Özel tasarım | Özel tasarım |

Depolama ve özel kullanımlar doğrudan TS EN 12845 kapsamında ayrıca değerlendirilmelidir.

Minimum sprinkler basıncı, yoğunluğun gerektirdiği değer ile sınıf alt sınırının büyüğüdür:

- LH: 0,70 bar
- OH: 0,35 bar
- HHP/HHS: 0,50 bar
- Raf içi K115: 1,00 bar
- Raf içi K80: 2,00 bar

## Temel denklemler

```text
qmin = tasarım yoğunluğu × sprinklerin gerçek koruma alanı
Pmin = max[(qmin / K)², sınıf basınç alt sınırı]
Q = K × √P
```

`Q` L/dk, `P` bar, `K` L/dk/√bar birimindedir.

```text
Δp = 6,05 × 10⁵ × L × Q^1,85 / (C^1,85 × d^4,87)
Δpstatik = 0,0981 × Δz
```

Hazen-Williams denkleminde `L` metre, `Q` L/dk, `d` gerçek iç çap olarak mm, sonuç bar alınır. `Δz` akış yönüne göre işaretli metre cinsinden kot farkıdır.

## Uygulanan kontroller

1. `uygulamaAlani` ve sprinkler koruma alanından gerekli operasyon sprinkler sayısı hesaplanır; çizimdeki hidrolik dirence göre kritik sprinklerler seçilir.
2. Düşük tehlike kuru sistem OH1, OH4 kuru sistem yüksek tehlike 1 tasarım değerlerine geçirilir.
3. Sprinkler asgari debisi `yoğunluk × gerçek koruma alanı` ile bulunur; sınıf basınç alt sınırı ile `(q/K)²` değerinin büyüğü uygulanır. Farklı bir standarda ait 49/68 L/dk tabanı bu profile karıştırılmaz.
4. Yangın dolabı ve hidrant debileri yalnızca proje ayarlarında sisteme dahil edildiklerinde Ek-8/C su kaynağı/depo hesabına eklenir; görev basınçları ayrı tutulur.
5. Pompaya bağlı olmayan devreler ile loop/grid ağlar açık hata ile reddedilir.
6. Çelik ve PE100 PN16 gerçek iç çapları, C=120 tabanlı fitting eşdeğer uzunluğunun C düzeltme çarpanı, boru yönündeki kot farkı ve Hazen-Williams C katsayısı boru kaybında kullanılır. Eski mutlak uç kotlu projeler geriye dönük desteklenir.
7. 6 m/s vana ve 10 m/s diğer boru hızı sınırları satır bazında raporlanır.
8. Pompa eğrisi girildiğinde kapalı vana basıncının anma basıncının %140'ını aşmaması ve %150 debide basıncın anma basıncının %65'inden az olmaması denetlenir; görev noktaları eğri üzerinde ayrıca kontrol edilir.
9. Ekran ve `.xlsx` çıktısı boru kayıplarını, sprinkler debi/basınçlarını, görev noktalarını, pompa kontrollerini, standart profilini ve hesap motoru sürümünü içerir.

## Kalan sınırlar

1. Operasyon alanı geometrik seçilir; duvar, kiriş, engel ve yangın bölmesi modeli bulunmadığından mimari uygunluk otomatik doğrulanamaz.
2. Boru kitaplığı kaynak tablodaki çelik seri ile PE100 PN16'yı kapsar. Başka schedule/SDR veya üretici serileri kendi gerçek iç çapları eklenmeden kullanılamaz.
3. Yangın dolabı ve hidrantın boru güzergâhı uygulamada çizilmez; bunların görev basınçları harici hidrolik hesap sonucundan girilir.
4. Yüksek tehlike, depolama, raf içi, ESFR/CMSA ve özel tasarımlar uygulama tarafından engellenir.
5. Son sayısal kabul için lisanslı TS EN metnindeki proje baskısı, onay merciinin kabulleri ve bağımsız hidrolik yazılım karşılaştırması gerekir.

## Sonraki doğrulama sırası

1. Lisanslı TS EN 12845 proje baskısından alınan kabul tablosunu ikinci bir doğrulama veri kümesi olarak testlere ekle.
2. Duvar, kiriş, engel ve yangın bölmesi geometrilerini çizim modeline ekle.
3. Yangın dolabı ve hidrant boru güzergâhlarını ayrı ağlar olarak çizip birlikte çöz.
4. Bağımsız bir hidrolik yazılımın yayımlanabilir örnek veri setiyle sayısal karşılaştırma testi ekle.
