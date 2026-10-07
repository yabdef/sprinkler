import React from 'react';

const tools = [
  ['select', 'bi-cursor', 'Seç', 'V'],
  ['pipe', 'bi-slash-lg', 'Boru', 'L'],
  ['sprinkler', 'bi-bullseye', 'Sprinkler', 'S'],
  ['pump', 'bi-gear-wide-connected', 'Pompa', 'P'],
];

const CadToolbar = ({ selectedTool, onTool, onHome, onUndo, onRedo, onSave, onExport, onCalculate, canUndo, canRedo, dirty }) => (
  <>
    <header className="cad-titlebar">
      <button className="cad-app-button" onClick={onHome} title="Projeler"><i className="bi bi-droplet-half" /></button>
      <div className="quick-actions">
        <button onClick={onSave} title="Kaydet (Ctrl+S)"><i className="bi bi-floppy" /></button>
        <button onClick={onUndo} disabled={!canUndo} title="Geri al (Ctrl+Z)"><i className="bi bi-arrow-counterclockwise" /></button>
        <button onClick={onRedo} disabled={!canRedo} title="Yinele (Ctrl+Y)"><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="document-name"><strong>Yangın Tesisatı</strong><span>{dirty ? 'Kaydedilmemiş değişiklikler' : 'Kaydedildi'}</span></div>
      <div className="title-actions"><button onClick={onExport}><i className="bi bi-download" /> Yedekle</button><button className="calculate-button" onClick={onCalculate} title="Kritik devre hidrolik ön hesabı"><i className="bi bi-calculator" /> Ön Hesap</button></div>
    </header>
    <nav className="cad-ribbon" aria-label="Çizim araçları">
      <div className="ribbon-group"><span className="ribbon-label">ÇİZİM</span><div className="ribbon-tools">{tools.map(([id, icon, label, key]) => <button key={id} className={selectedTool === id ? 'active' : ''} onClick={() => onTool(id)}><i className={`bi ${icon}`} /><span>{label}<small>{key}</small></span></button>)}</div></div>
      <div className="ribbon-hint"><i className="bi bi-mouse2" /><span>Yakınlaştır: tekerlek<br />Kaydır: orta tuş</span></div>
    </nav>
  </>
);

export default CadToolbar;
