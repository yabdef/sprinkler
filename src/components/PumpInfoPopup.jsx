import React, { useState } from 'react';

const PumpInfoPopup = ({ project, onClose, onDelete, onSave }) => {
  const info = project.information || {};
  const [fields, setFields] = useState({
    pompaVerimi: String(info.pompaVerimi ?? 0.55),
    pompaAnmaDebisi: String(info.pompaAnmaDebisi || ''),
    pompaAnmaBasinci: String(info.pompaAnmaBasinci || ''),
    pompaKapaliVanaBasinci: String(info.pompaKapaliVanaBasinci || ''),
    pompaYuzde150Basinci: String(info.pompaYuzde150Basinci || ''),
  });
  const update = (key, value) => setFields((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    const updatedProject = {
      ...project,
      information: {
        ...project.information,
        ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Number(value) || 0])),
      }
    };
    onSave(updatedProject);
    onClose();
  };

  return (
    <>
    <div className="popup-overlay" onClick={onClose}></div>
    <div className="popup-container">
      <div className="popup-content">
        <h3 className="popup-header">Pompa Bilgileri</h3>
        <div className="popup-body pump-curve-fields">
          <p className="field-note">Seçilen pompanın eğri noktalarını girin. BYKHY kontrolü kapalı vana basıncını ve %150 debideki basıncı ayrıca doğrular.</p>
          <label>Pompa verimi (0–1)<input type="number" value={fields.pompaVerimi} onChange={(event) => update('pompaVerimi', event.target.value)} step="0.01" min="0.01" max="1" /></label>
          <label>Anma debisi (L/dk)<input type="number" value={fields.pompaAnmaDebisi} onChange={(event) => update('pompaAnmaDebisi', event.target.value)} min="0" step="1" /></label>
          <label>Anma basıncı (bar)<input type="number" value={fields.pompaAnmaBasinci} onChange={(event) => update('pompaAnmaBasinci', event.target.value)} min="0" step="0.01" /></label>
          <label>Kapalı vana basıncı (bar)<input type="number" value={fields.pompaKapaliVanaBasinci} onChange={(event) => update('pompaKapaliVanaBasinci', event.target.value)} min="0" step="0.01" /></label>
          <label>%150 debide basınç (bar)<input type="number" value={fields.pompaYuzde150Basinci} onChange={(event) => update('pompaYuzde150Basinci', event.target.value)} min="0" step="0.01" /></label>
        </div>
        <div className="popup-button-container">
          <button onClick={handleSave} className="popup-button-save">Kaydet</button>
          <button onClick={onClose} className="popup-button-cancel"><i className="bi bi-x-lg"></i></button>
          <button onClick={onDelete} className="popup-button-delete">Sil</button>
        </div>
      </div>
    </div>
    </>
  );
};

export default PumpInfoPopup;
