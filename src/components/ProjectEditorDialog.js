import React, { useMemo, useState } from 'react';

const hazardData = {
  'Düşük Tehlike': { wet: 84, dry: 90, density: 2.25, dryDensity: 5, cabinet: 100, hydrant: 400, duration: 30 },
  'Orta Tehlike-1': { wet: 72, dry: 90, density: 5, cabinet: 100, hydrant: 400, duration: 60 },
  'Orta Tehlike-2': { wet: 144, dry: 180, density: 5, cabinet: 100, hydrant: 400, duration: 60 },
  'Orta Tehlike-3': { wet: 216, dry: 270, density: 5, cabinet: 100, hydrant: 1000, duration: 60 },
  'Orta Tehlike-4': { wet: 360, dry: 325, density: 5, dryDensity: 7.7, cabinet: 100, hydrant: 1000, duration: 60 },
  'Yüksek Tehlike-1': { wet: 260, dry: 325, density: 7.7, cabinet: 200, hydrant: 1500, duration: 90 },
  'Yüksek Tehlike-2': { wet: 260, dry: 325, density: 10, cabinet: 200, hydrant: 1500, duration: 90 },
  'Yüksek Tehlike-3': { wet: 260, dry: 325, density: 12.5, cabinet: 200, hydrant: 1500, duration: 90 },
};
const materials = { 'Siyah çelik boru (ıslak veya baskın)': 120, 'Siyah çelik boru (kuru veya ön etkili)': 100, 'Galvaniz boru': 120, 'Dikişsiz döküm veya düktil demir': 100, 'İçi çimento kaplı düktil demir': 140, 'Plastik': 150, 'Bakır veya paslanmaz çelik': 150 };
const supportedMaterials = new Set(['Siyah çelik boru (ıslak veya baskın)', 'Siyah çelik boru (kuru veya ön etkili)', 'Galvaniz boru']);

const ProjectEditorDialog = ({ project, onSave, onClose }) => {
  const info = project?.information || {};
  const [name, setName] = useState(project?.name || 'Yeni Sprinkler Projesi');
  const [hazard, setHazard] = useState(info.tehlikeSinifi || 'Orta Tehlike-1');
  const [system, setSystem] = useState(info.korumaAlani || 'Islak veya Ön Etkili');
  const [material, setMaterial] = useState(info.boruMalzemesi || 'Siyah çelik boru (ıslak veya baskın)');
  const [coverage, setCoverage] = useState(info.sprinklerKorumaAlani || 12);
  const [kFactor, setKFactor] = useState(info.sprinklerFaktoru || 80);
  const [efficiency, setEfficiency] = useState(info.pompaVerimi || 0.55);
  const [includeCabinet, setIncludeCabinet] = useState(Boolean(info.yanginDolabiDahil));
  const [includeHydrant, setIncludeHydrant] = useState(Boolean(info.hidrantDahil));
  const derived = useMemo(() => {
    const row = hazardData[hazard];
    const wet = system.startsWith('Islak');
    const area = wet ? row.wet : row.dry;
    return { area, density: wet ? row.density : (row.dryDensity || row.density), c: materials[material], count: Math.ceil(area / Number(coverage || 1)), cabinet: row.cabinet, hydrant: row.hydrant, duration: row.duration };
  }, [coverage, hazard, material, system]);
  const submit = (event) => { event.preventDefault(); onSave({ name, tehlikeSinifi: hazard, korumaAlani: system, boruMalzemesi: material, sprinklerKorumaAlani: Number(coverage), sprinklerFaktoru: Number(kFactor), pompaVerimi: Number(efficiency), uygulamaAlani: derived.area, tasarimYogunlugu: derived.density, hazenWilliamsKatsayisi: derived.c, kritikAlanSprinklerSayisi: derived.count, ilaveYanginDolabiDebisi: derived.cabinet, ilaveHidrantDebisi: derived.hydrant, yanginDolabiDahil: includeCabinet, hidrantDahil: includeHydrant, sistemCalismaSuresi: derived.duration }); };
  return <><div className="popup-overlay" onClick={onClose} /><div className="project-dialog"><form onSubmit={submit}>
    <div className="dialog-title"><div><p className="eyebrow">PROJE AYARLARI</p><h3>{project ? 'Proje Bilgilerini Düzenle' : 'Yeni Proje'}</h3></div><button type="button" className="icon-button" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
    <div className="project-form-grid"><div className="form-fields">
      <label>Proje adı<input autoFocus value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Tehlike sınıfı<select value={hazard} onChange={(event) => setHazard(event.target.value)}>{Object.keys(hazardData).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Sistem tipi<select value={system} onChange={(event) => setSystem(event.target.value)}><option>Islak veya Ön Etkili</option><option>Kuru veya Değişken</option></select></label>
      <label>Boru malzemesi<select value={material} onChange={(event) => setMaterial(event.target.value)}>{Object.keys(materials).map((value) => <option key={value} disabled={!supportedMaterials.has(value)}>{value}{supportedMaterials.has(value) ? '' : ' — iç çap tablosu gerekli'}</option>)}</select></label>
      <div className="inline-fields"><label>Sprinkler alanı (m²)<input type="number" min="1" step="0.1" value={coverage} onChange={(event) => setCoverage(event.target.value)} /></label><label>K faktörü<input type="number" min="1" value={kFactor} onChange={(event) => setKFactor(event.target.value)} /></label></div>
      <label>Pompa verimi (0–1)<input type="number" min="0.01" max="1" step="0.01" value={efficiency} onChange={(event) => setEfficiency(event.target.value)} /></label>
      <div className="system-inclusions"><span>İlave su ihtiyaçları</span><label><input type="checkbox" checked={includeCabinet} onChange={(event) => setIncludeCabinet(event.target.checked)} /> Yangın dolabı sisteme dahil</label><label><input type="checkbox" checked={includeHydrant} onChange={(event) => setIncludeHydrant(event.target.checked)} /> Hidrant sisteme dahil</label></div>
    </div><aside className="calculated-panel"><p className="eyebrow">ÖN HESAP PARAMETRELERİ</p><small>BYKHY Ek-8 tasarım girdileri</small><dl><div><dt>Uygulama alanı</dt><dd>{derived.area} m²</dd></div><div><dt>Tasarım yoğunluğu</dt><dd>{derived.density} mm/dk</dd></div><div><dt>Kritik sprinkler</dt><dd>{derived.count} adet</dd></div><div><dt>Hazen-Williams C</dt><dd>{derived.c}</dd></div><div><dt>Yangın dolabı</dt><dd>{includeCabinet ? derived.cabinet : 0} L/dk</dd></div><div><dt>Hidrant</dt><dd>{includeHydrant ? derived.hydrant : 0} L/dk</dd></div><div><dt>Çalışma süresi</dt><dd>{derived.duration} dk</dd></div></dl></aside></div>
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" type="submit">Kaydet ve Çizime Geç</button></div>
  </form></div></>;
};
export default ProjectEditorDialog;
