import React, { useMemo, useState } from 'react';
import { PIPE_PROFILES, getEquivalentLengthFactor } from '../domain/hydraulicStandards';

const fittingLengths = {
  '90° dirsek': { '1"': 0.6, '11/4"': 0.9, '11/2"': 1.2, '2"': 1.5, '21/2"': 1.8, '3"': 2.1, '4"': 3.1, '5"': 3.7, '6"': 4.3, '8"': 5.5, '10"': 6.7, '12"': 8.2 },
  'İstavroz / Te (90° dönüş)': { '1"': 1.5, '11/4"': 1.8, '11/2"': 2.4, '2"': 3.1, '21/2"': 3.7, '3"': 4.6, '4"': 6.1, '5"': 7.62, '6"': 9.2, '8"': 10.7, '10"': 15.2, '12"': 18.3 },
  'Kelebek vana': { '1"': 0, '11/4"': 0, '11/2"': 0, '2"': 1.8, '21/2"': 2.1, '3"': 3.1, '4"': 3.7, '5"': 2.7, '6"': 3.1, '8"': 3.7, '10"': 5.8, '12"': 6.4 },
  'Sürgülü vana': { '1"': 0, '11/4"': 0, '11/2"': 0, '2"': 0.3, '21/2"': 0.3, '3"': 0.3, '4"': 0.6, '5"': 0.6, '6"': 0.9, '8"': 1.2, '10"': 1.5, '12"': 1.8 },
  'Çek vana': { '1"': 1.5, '11/4"': 2.1, '11/2"': 2.8, '2"': 3.4, '21/2"': 4.3, '3"': 4.9, '4"': 6.7, '5"': 8.2, '6"': 9.8, '8"': 13.7, '10"': 16.8, '12"': 19.8 },
  'Alarm vanası': { '1"': 0, '11/4"': 0, '11/2"': 0, '2"': 0, '21/2"': 0, '3"': 0, '4"': 8.5, '5"': 0, '6"': 9.2, '8"': 12.5, '10"': 0, '12"': 0 },
};

const CadPipeDialog = ({ line, pipeProfileId = 'STEEL_WET', onClose, onSave, onDelete }) => {
  const profile = PIPE_PROFILES[pipeProfileId] || PIPE_PROFILES.STEEL_WET;
  const diameters = Object.keys(profile.sizes);
  const planLength = Math.hypot(line.points[2] - line.points[0], line.points[3] - line.points[1]);
  const [length, setLength] = useState(String(Number(line.data?.length) > 0 ? line.data.length : Math.round(planLength)));
  const [startElevation, setStartElevation] = useState(String(line.data?.startElevation ?? 0));
  const [endElevation, setEndElevation] = useState(String(line.data?.endElevation ?? line.data?.height ?? 0));
  const [diameter, setDiameter] = useState(profile.sizes[line.data?.diameter] ? line.data.diameter : diameters[0]);
  const [diameterMode, setDiameterMode] = useState(line.data?.diameterMode === 'auto' ? 'auto' : 'manual');
  const [fittings, setFittings] = useState(() => {
    const stored = line.data?.fittings || {};
    if (stored['Te (90° dönüş)'] && !stored['İstavroz / Te (90° dönüş)']) {
      return { ...stored, 'İstavroz / Te (90° dönüş)': stored['Te (90° dönüş)'] };
    }
    return stored;
  });
  const equivalentLength = useMemo(() => Object.entries(fittings).reduce((sum, [name, count]) => sum + (fittingLengths[name]?.[diameter] || 0) * Number(count || 0), 0), [diameter, fittings]);
  const correctedEquivalentLength = equivalentLength * getEquivalentLengthFactor(profile.c);
  return <><div className="popup-overlay" onClick={onClose} /><div className="pipe-dialog"><div className="dialog-title"><div><p className="eyebrow">BORU #{line.id}</p><h3>Boru Bilgileri</h3></div><button className="icon-button" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
    <p className="field-note">Çizim boyu: {planLength.toFixed(0)} cm. Kotlar borunun çizim başlangıç ve bitiş noktalarına göre mutlak değerdir. Otomatik çap, borunun beslediği sprinkler sayısına göre ön seçim yapar; hidrolik hesap sonucu ayrıca kontrol edilmelidir.</p>
    <div className="inline-fields pipe-geometry-fields"><label>Boru boyu (cm)<input autoFocus type="number" min="0.1" step="0.1" value={length} onChange={(event) => setLength(event.target.value)} /></label><label>Başlangıç kotu (cm)<input type="number" step="0.1" value={startElevation} onChange={(event) => setStartElevation(event.target.value)} /></label><label>Bitiş kotu (cm)<input type="number" step="0.1" value={endElevation} onChange={(event) => setEndElevation(event.target.value)} /></label><label>Çaplandırma<select value={diameterMode} onChange={(event) => setDiameterMode(event.target.value)}><option value="auto">Otomatik</option><option value="manual">Manuel</option></select></label><label>Çap (inç)<select value={diameter} disabled={diameterMode === 'auto'} onChange={(event) => { setDiameter(event.target.value); setDiameterMode('manual'); }}>{diameters.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <div className="fitting-section"><div><strong>Fittings ve vanalar</strong><span>Tablo: {equivalentLength.toFixed(2)} m · C={profile.c} düzeltmeli: {correctedEquivalentLength.toFixed(2)} m</span></div><div className="fitting-grid">{Object.keys(fittingLengths).map((name) => <label key={name}>{name}<input type="number" min="0" disabled={!fittingLengths[name][diameter]} title={!fittingLengths[name][diameter] ? 'Kaynak tabloda bu çap için değer bulunmuyor.' : ''} value={fittings[name] ?? ''} placeholder="0" onChange={(event) => setFittings({ ...fittings, [name]: event.target.value })} /></label>)}</div></div>
    <div className="dialog-actions"><button className="danger-button" onClick={() => onDelete(line.id)}><i className="bi bi-trash3" /> Sil</button><span /><button className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" onClick={() => onSave({ ...line.data, length: Number(length) || 0, planLength, startElevation: Number(startElevation) || 0, endElevation: Number(endElevation) || 0, height: (Number(endElevation) || 0) - (Number(startElevation) || 0), diameter, diameterMode, pipeProfile: profile.id, fittings: Object.fromEntries(Object.entries(fittings).map(([name, count]) => [name, Number(count) || 0])), equivalentLength })}>Kaydet</button></div>
  </div></>;
};
export default CadPipeDialog;
