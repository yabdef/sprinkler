import React, { useMemo, useState } from 'react';

const diameters = ['1"', '11/4"', '11/2"', '2"', '21/2"', '3"', '4"', '5"', '6"', '8"', '10"', '12"'];
const fittingLengths = {
  '90° dirsek': { '1"': 0.6, '11/4"': 0.9, '11/2"': 1.2, '2"': 1.5, '21/2"': 1.8, '3"': 2.1, '4"': 3.1, '5"': 3.7, '6"': 4.3, '8"': 5.5, '10"': 6.7, '12"': 8.2 },
  'İstavroz / Te (90° dönüş)': { '1"': 1.5, '11/4"': 1.8, '11/2"': 2.4, '2"': 3.1, '21/2"': 3.7, '3"': 4.6, '4"': 6.1, '5"': 7.62, '6"': 9.2, '8"': 10.7, '10"': 15.2, '12"': 18.3 },
  'Kelebek vana': { '1"': 0, '11/4"': 0, '11/2"': 0, '2"': 1.8, '21/2"': 2.1, '3"': 3.1, '4"': 3.7, '5"': 2.7, '6"': 3.1, '8"': 3.7, '10"': 5.8, '12"': 6.4 },
  'Sürgülü vana': { '1"': 0, '11/4"': 0, '11/2"': 0, '2"': 0.3, '21/2"': 0.3, '3"': 0.3, '4"': 0.6, '5"': 0.6, '6"': 0.9, '8"': 1.2, '10"': 1.5, '12"': 1.8 },
  'Çek vana': { '1"': 1.5, '11/4"': 2.1, '11/2"': 2.8, '2"': 3.4, '21/2"': 4.3, '3"': 4.9, '4"': 6.7, '5"': 8.2, '6"': 9.8, '8"': 13.7, '10"': 16.8, '12"': 19.8 },
  'Alarm vanası': { '1"': 0, '11/4"': 0, '11/2"': 0, '2"': 0, '21/2"': 0, '3"': 0, '4"': 8.5, '5"': 0, '6"': 9.2, '8"': 12.5, '10"': 0, '12"': 0 },
};

const CadPipeDialog = ({ line, onClose, onSave, onDelete }) => {
  const [length, setLength] = useState(String(line.data?.length ?? 0));
  const [height, setHeight] = useState(String(line.data?.height ?? 0));
  const [diameter, setDiameter] = useState(line.data?.diameter || '1"');
  const [fittings, setFittings] = useState(() => {
    const stored = line.data?.fittings || {};
    if (stored['Te (90° dönüş)'] && !stored['İstavroz / Te (90° dönüş)']) {
      return { ...stored, 'İstavroz / Te (90° dönüş)': stored['Te (90° dönüş)'] };
    }
    return stored;
  });
  const equivalentLength = useMemo(() => Object.entries(fittings).reduce((sum, [name, count]) => sum + (fittingLengths[name]?.[diameter] || 0) * Number(count || 0), 0), [diameter, fittings]);
  return <><div className="popup-overlay" onClick={onClose} /><div className="pipe-dialog"><div className="dialog-title"><div><p className="eyebrow">BORU #{line.id}</p><h3>Boru Bilgileri</h3></div><button className="icon-button" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
    <div className="inline-fields"><label>Uzunluk (cm)<input autoFocus type="number" min="0" value={length} onChange={(event) => setLength(event.target.value)} /></label><label>Kot farkı (cm)<input type="number" value={height} onChange={(event) => setHeight(event.target.value)} /></label><label>Çap (inç)<select value={diameter} onChange={(event) => setDiameter(event.target.value)}>{diameters.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <div className="fitting-section"><div><strong>Fittings ve vanalar</strong><span>Eşdeğer uzunluk: {equivalentLength.toFixed(2)} m</span></div><div className="fitting-grid">{Object.keys(fittingLengths).map((name) => <label key={name}>{name}<input type="number" min="0" disabled={!fittingLengths[name][diameter]} title={!fittingLengths[name][diameter] ? 'Kaynak tabloda bu çap için değer bulunmuyor.' : ''} value={fittings[name] ?? ''} placeholder="0" onChange={(event) => setFittings({ ...fittings, [name]: event.target.value })} /></label>)}</div></div>
    <div className="dialog-actions"><button className="danger-button" onClick={() => onDelete(line.id)}><i className="bi bi-trash3" /> Sil</button><span /><button className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" onClick={() => onSave({ ...line.data, length: Number(length) || 0, height: Number(height) || 0, diameter, fittings: Object.fromEntries(Object.entries(fittings).map(([name, count]) => [name, Number(count) || 0])), equivalentLength })}>Kaydet</button></div>
  </div></>;
};
export default CadPipeDialog;
