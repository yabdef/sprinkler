import React, { useState } from 'react';

const PumpInfoPopup = ({ project, onClose, onDelete, onSave }) => {
  const [pumpEfficiency, setPumpEfficiency] = useState(project.information.pompaVerimi);

  const handleSave = () => {
    const updatedProject = {
      ...project,
      information: {
        ...project.information,
        pompaVerimi: pumpEfficiency
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
        <div className="popup-body">
          <label>Pompa Verimi (0–1):</label>
          <input
            type="number"
            value={pumpEfficiency}
            onChange={(e) => setPumpEfficiency(parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="1"
          />
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
