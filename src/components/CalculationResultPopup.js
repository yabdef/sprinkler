import React, { useState } from 'react';
import { downloadCalculationWorkbook } from '../services/calculationWorkbook';

const format = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
const Metric = ({ label, value, unit }) => <div className="result-metric"><span>{label}</span><strong>{format(value)} <small>{unit}</small></strong></div>;

const CalculationResultPopup = ({ result, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  if (!result) return null;
  const errors = result.errors || [];

  const download = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadCalculationWorkbook(result);
    } catch (error) {
      setDownloadError(`Excel dosyası oluşturulamadı: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return <><div className="popup-overlay" onClick={onClose} /><div className="popup-container result-dialog"><div className="popup-content">
    <div className="dialog-title"><div><p className="eyebrow">HİDROLİK ÖN HESAP</p><h3>{errors.length ? 'Çizimi kontrol edin' : 'Ön Hesap ve Hesap Föyü'}</h3></div><button className="icon-button" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
    {errors.length ? <><ul className="error-list">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul><button className="primary-button full-button" onClick={onClose}>Kapat</button></> : <>
      <p className="calculation-warning"><i className="bi bi-info-circle" /> {result.standard} esaslarıyla hazırlanmış {result.scope.toLocaleLowerCase('tr-TR')}dır. Nihai proje ve pompa seçimi yetkili mühendis tarafından doğrulanmalıdır.</p>
      <div className="result-grid"><Metric label="Toplam tasarım debisi" value={result.pompaDebisi} unit="L/dk" /><Metric label="Toplam tasarım debisi" value={result.pompaDebisiM3} unit="m³/h" /><Metric label="Sprinkler hattı basıncı" value={result.pompaBasinci} unit="bar" /><Metric label="Verim dahil güç" value={result.gercekPompaGucu} unit="kW" /><Metric label="Depo hacmi" value={result.depoHacmi} unit="m³" /><Metric label="Hesaba giren sprinkler" value={result.criteria.calculatedCount} unit="adet" /></div>

      <section className="calculation-sheet-preview">
        <div className="sheet-heading"><div><span>HESAP FÖYÜ ÖNİZLEMESİ</span><strong>Kritik devre basınç kaybı</strong></div><small>Q = K√P · Hazen–Williams · statik kot</small></div>
        <div className="criteria-strip"><span><small>Tehlike</small>{result.criteria.hazard}</span><span><small>Yoğunluk</small>{format(result.criteria.density)} L/dk·m²</span><span><small>Operasyon alanı</small>{format(result.criteria.operationArea)} m²</span><span><small>Asgari sprinkler</small>{format(result.criteria.baseFlow)} L/dk / {format(result.criteria.minimumPressure)} bar</span></div>
        <div className="calculation-table-wrap"><table className="calculation-table"><thead><tr><th>No</th><th>Boru</th><th>Cins</th><th>Debi<br /><small>L/dk</small></th><th>Çap</th><th>İç çap<br /><small>mm</small></th><th>Toplam L<br /><small>m</small></th><th>Birim kayıp<br /><small>bar/m</small></th><th>Sürtünme<br /><small>bar</small></th><th>Statik<br /><small>bar</small></th><th>Çıkış P<br /><small>bar</small></th><th>Hız<br /><small>m/s</small></th><th>Kontrol</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.pipeId}><td>{row.order}</td><td>#{row.pipeId}</td><td>{row.kind}</td><td>{format(row.flow)}</td><td>{row.diameter}</td><td>{format(row.insideDiameter, 1)}</td><td>{format(row.totalLength)}</td><td>{format(row.unitLoss, 4)}</td><td>{format(row.frictionLoss, 4)}</td><td>{format(row.staticLoss, 4)}</td><td>{format(row.outletPressure, 3)}</td><td>{format(row.velocity, 2)}</td><td><span className={row.status === 'Uygun' ? 'status-ok' : 'status-alert'}>{row.status}</span></td></tr>)}</tbody></table></div>
      </section>

      {result.warnings.length > 0 && <details className="calculation-notes"><summary>Kontrol notları ({result.warnings.length})</summary><ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
      {downloadError && <p className="download-error">{downloadError}</p>}
      <div className="result-actions"><button className="secondary-button" onClick={onClose}>Kapat</button><button className="primary-button" onClick={download} disabled={downloading}><i className="bi bi-file-earmark-excel" /> {downloading ? 'Excel hazırlanıyor…' : 'Excel olarak indir'}</button></div>
    </>}
  </div></div></>;
};

export default CalculationResultPopup;
