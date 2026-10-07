import React, { useMemo, useState } from 'react';
import { DEFAULT_STANDARD_PROFILE, HAZARD_DATA, PIPE_PROFILES, getDesignCriteria, getPipeProfile } from '../domain/hydraulicStandards';

const ProjectEditorDialog = ({ project, onSave, onClose }) => {
  const info = project?.information || {};
  const [name, setName] = useState(project?.name || 'Yeni Sprinkler Projesi');
  const [hazard, setHazard] = useState(info.tehlikeSinifi || 'Orta Tehlike-1');
  const [system, setSystem] = useState(info.korumaAlani || 'Islak veya Ön Etkili');
  const [pipeProfile, setPipeProfile] = useState(info.pipeProfile || getPipeProfile(info).id);
  const [branchDirection, setBranchDirection] = useState(info.branchDirection || 'horizontal');
  const [coverage, setCoverage] = useState(info.sprinklerKorumaAlani || 12);
  const [kFactor, setKFactor] = useState(info.sprinklerFaktoru || 80);
  const [efficiency, setEfficiency] = useState(info.pompaVerimi || 0.55);
  const [includeCabinet, setIncludeCabinet] = useState(Boolean(info.yanginDolabiDahil));
  const [includeHydrant, setIncludeHydrant] = useState(Boolean(info.hidrantDahil));
  const [cabinetPressure, setCabinetPressure] = useState(info.yanginDolabiGorevBasinci || (info.yanginDolabiDahil ? 4 : ''));
  const [hydrantPressure, setHydrantPressure] = useState(info.hidrantGorevBasinci || (info.hidrantDahil ? 7 : ''));
  const derived = useMemo(() => {
    const design = getDesignCriteria({ standardProfile: DEFAULT_STANDARD_PROFILE, tehlikeSinifi: hazard, korumaAlani: system });
    const pipe = PIPE_PROFILES[pipeProfile];
    return { ...design, c: pipe.c, material: pipe.material, count: Math.ceil(design.area / Number(coverage || 1)) };
  }, [coverage, hazard, pipeProfile, system]);
  const submit = (event) => { event.preventDefault(); onSave({ name, standardProfile: DEFAULT_STANDARD_PROFILE, tehlikeSinifi: hazard, etkinTehlikeSinifi: derived.effectiveHazard, korumaAlani: system, pipeProfile, boruMalzemesi: derived.material, branchDirection, sprinklerKorumaAlani: Number(coverage), sprinklerFaktoru: Number(kFactor), pompaVerimi: Number(efficiency), uygulamaAlani: derived.area, tasarimYogunlugu: derived.density, hazenWilliamsKatsayisi: derived.c, kritikAlanSprinklerSayisi: derived.count, ilaveYanginDolabiDebisi: derived.cabinet, ilaveHidrantDebisi: derived.hydrant, yanginDolabiDahil: includeCabinet, hidrantDahil: includeHydrant, yanginDolabiGorevBasinci: Number(cabinetPressure) || 0, hidrantGorevBasinci: Number(hydrantPressure) || 0, sistemCalismaSuresi: derived.duration }); };
  return <><div className="popup-overlay" onClick={onClose} /><div className="project-dialog"><form onSubmit={submit}>
    <div className="dialog-title"><div><p className="eyebrow">PROJE AYARLARI</p><h3>{project ? 'Proje Bilgilerini Düzenle' : 'Yeni Proje'}</h3></div><button type="button" className="icon-button" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
    <div className="project-form-grid"><div className="form-fields">
      <label>Proje adı<input autoFocus value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Tehlike sınıfı<select value={hazard} onChange={(event) => setHazard(event.target.value)}>{Object.entries(HAZARD_DATA).map(([value, data]) => <option key={value} value={value}>{value}{data.supported ? '' : ' — uzman hesabı gerekli'}</option>)}</select></label>
      <label>Sistem tipi<select value={system} onChange={(event) => setSystem(event.target.value)}><option>Islak veya Ön Etkili</option><option>Kuru veya Değişken</option></select></label>
      <label>Boru profili ve gerçek iç çap serisi<select value={pipeProfile} onChange={(event) => setPipeProfile(event.target.value)}>{Object.values(PIPE_PROFILES).map((value) => <option key={value.id} value={value.id}>{value.label} · C={value.c}</option>)}</select></label>
      <label>Branşman yönü<select value={branchDirection} onChange={(event) => setBranchDirection(event.target.value)}><option value="horizontal">Yatay (X doğrultusu)</option><option value="vertical">Dikey (Y doğrultusu)</option></select></label>
      <div className="inline-fields"><label>Sprinkler alanı (m²)<input type="number" min="1" max={derived.limits.maximumCoverage} step="0.1" value={coverage} onChange={(event) => setCoverage(event.target.value)} /></label><label>K faktörü<input type="number" min="1" value={kFactor} onChange={(event) => setKFactor(event.target.value)} /></label></div>
      <label>Pompa verimi (0–1)<input type="number" min="0.01" max="1" step="0.01" value={efficiency} onChange={(event) => setEfficiency(event.target.value)} /></label>
      <div className="system-inclusions"><span>İlave su ihtiyaçları ve ayrı görev basınçları</span><div className="inclusion-card"><label className="inclusion-check"><input type="checkbox" checked={includeCabinet} onChange={(event) => { const checked = event.target.checked; setIncludeCabinet(checked); if (checked && !cabinetPressure) setCabinetPressure(4); }} /> Yangın dolabı sisteme dahil</label>{includeCabinet && <div className="duty-pressure-field"><label htmlFor="cabinet-pressure">Yangın dolabı görev basıncı</label><div><input id="cabinet-pressure" type="number" min="0.1" step="0.1" required value={cabinetPressure} onChange={(event) => setCabinetPressure(event.target.value)} /><span>bar</span></div><small>BYKHY md. 94: yuvarlak yarı sert hortumlu dolapta 4,0 bar; yassı hortumlu dolapta en az 4,0 bar. Lüle girişindeki gerekli basıncı girin.</small></div>}</div><div className="inclusion-card"><label className="inclusion-check"><input type="checkbox" checked={includeHydrant} onChange={(event) => { const checked = event.target.checked; setIncludeHydrant(checked); if (checked && !hydrantPressure) setHydrantPressure(7); }} /> Hidrant sisteme dahil</label>{includeHydrant && <div className="duty-pressure-field"><label htmlFor="hydrant-pressure">Hidrant görev basıncı</label><div><input id="hydrant-pressure" type="number" min="0.1" step="0.1" required value={hydrantPressure} onChange={(event) => setHydrantPressure(event.target.value)} /><span>bar</span></div><small>BYKHY md. 95’e göre hidrant çıkışında 7,0 bar (700 kPa). Projenin gerekli çıkış basıncını girin.</small></div>}</div><small className="inclusion-note">Bu değerler pompanın ayrı görev noktalarını kontrol etmek için kullanılır; boru kayıpları ve kot farkı ayrıca hidrolik hesapta değerlendirilir.</small></div>
    </div><aside className="calculated-panel"><p className="eyebrow">MEVZUAT PROFİLİ</p><small>BYKHY Ek-8 · TS EN 12845 proje baskısı</small>{!derived.supported && <p className="profile-error">Bu tehlike sınıfı uygulama içinde hesaplanmaz.</p>}<dl><div><dt>Etkin sınıf</dt><dd>{derived.effectiveHazard}</dd></div><div><dt>Uygulama alanı</dt><dd>{derived.area} m²</dd></div><div><dt>Tasarım yoğunluğu</dt><dd>{derived.density} mm/dk</dd></div><div><dt>Kritik sprinkler</dt><dd>{derived.count} adet</dd></div><div><dt>Azami alan / aralık</dt><dd>{derived.limits.maximumCoverage} m² / {derived.limits.maximumSpacing} m</dd></div><div><dt>Hazen-Williams C</dt><dd>{derived.c}</dd></div><div><dt>Yangın dolabı</dt><dd>{includeCabinet ? derived.cabinet : 0} L/dk</dd></div><div><dt>Hidrant</dt><dd>{includeHydrant ? derived.hydrant : 0} L/dk</dd></div><div><dt>Çalışma süresi</dt><dd>{derived.duration} dk</dd></div></dl></aside></div>
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" type="submit">Kaydet ve Çizime Geç</button></div>
  </form></div></>;
};
export default ProjectEditorDialog;
